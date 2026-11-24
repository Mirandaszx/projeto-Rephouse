#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "=========================================="
echo "  RepHouse - Iniciando ambiente Docker"
echo "=========================================="
echo

# Verifica se o Docker esta rodando
if ! docker info >/dev/null 2>&1; then
    echo "[ERRO] O Docker nao parece estar em execucao."
    echo "Inicie o servico do Docker e tente novamente."
    exit 1
fi

# Cria o .env automaticamente a partir do .env.example se nao existir
if [ ! -f ".env" ]; then
    echo "[INFO] Arquivo .env nao encontrado. Criando a partir de .env.example..."
    if ! cp -f ".env.example" ".env"; then
        echo "[ERRO] Nao foi possivel copiar .env.example para .env."
        exit 1
    fi

    # Gera JWT_SECRET automaticamente se estiver vazio
    if grep -qE '^JWT_SECRET=[[:space:]]*$' ".env"; then
        if command -v openssl >/dev/null 2>&1; then
            JWT_SECRET=$(openssl rand -hex 32)
        else
            JWT_SECRET=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
        fi
        sed -i.bak -E "s|^JWT_SECRET=[[:space:]]*$|JWT_SECRET=${JWT_SECRET}|" ".env" && rm -f ".env.bak"
    fi

    echo
    echo "--- Configuracao inicial do .env (pressione Enter para pular/usar padrao) ---"
    echo
    echo "[1/3] Senha do banco PostgreSQL (usuario: gabrisel - ex: MinhaSenhaForte123)"
    read -r -p "      Digite a senha [padrao: troque_por_uma_senha_segura]: " INPUT_PG_PASS
    echo
    echo "[2/3] Senha das contas de demonstracao (opcional - para testar login local sem e-mail)"
    echo "      Formato: qualquer senha com 12 a 128 caracteres (ex: DemoRephouse2026!)"
    read -r -p "      Digite a senha (ou Enter para pular): " INPUT_DEMO_PASS
    echo
    echo "[3/3] Envio de e-mail via Resend (opcional - necessario para habilitar o cadastro)"
    echo '      Formato da chave: comeca com "re_" (ex: re_YsiVaTL6_...)'
    read -r -p "      Cole sua RESEND_API_KEY (ou Enter para pular): " INPUT_RESEND_KEY

    INPUT_EMAIL_FROM=""
    INPUT_APP_URL=""
    if [ -n "$INPUT_RESEND_KEY" ]; then
        read -r -p "      E-mail remetente [padrao: onboarding@resend.dev]: " INPUT_EMAIL_FROM
        read -r -p "      URL publica do site [padrao: http://localhost:5173]: " INPUT_APP_URL
    fi

    # Atualiza o .env com os valores informados usando awk (evita problemas com caracteres especiais)
    awk -v pg="$INPUT_PG_PASS" \
        -v demo="$INPUT_DEMO_PASS" \
        -v rk="$INPUT_RESEND_KEY" \
        -v ef="${INPUT_EMAIL_FROM:-onboarding@resend.dev}" \
        -v au="${INPUT_APP_URL:-http://localhost:5173}" '
    {
        if (pg != "" && $0 ~ /^POSTGRES_PASSWORD=/) {
            print "POSTGRES_PASSWORD=" pg
        } else if (pg != "" && $0 ~ /^DATABASE_URL=postgresql:\/\/[^:]+:[^@]+@/) {
            sub(/:[^@]+@/, ":" pg "@")
            print
        } else if (demo != "" && $0 ~ /^DEMO_PASSWORD=/) {
            print "DEMO_PASSWORD=" demo
        } else if (rk != "" && $0 ~ /^#?[[:space:]]*RESEND_API_KEY=/) {
            print "RESEND_API_KEY=" rk
        } else if (rk != "" && $0 ~ /^#?[[:space:]]*EMAIL_FROM=/) {
            print "EMAIL_FROM=" ef
        } else if (rk != "" && $0 ~ /^#?[[:space:]]*APP_PUBLIC_URL=/) {
            print "APP_PUBLIC_URL=" au
        } else {
            print
        }
    }' ".env" > ".env.tmp" && mv ".env.tmp" ".env"

    echo
    echo "[INFO] Subindo postgres e executando migracoes iniciais..."
    docker compose up -d --wait postgres
    docker compose --profile manutencao run --rm migracoes

    echo "[INFO] Configurando permissoes do banco de dados..."
    docker compose --profile manutencao run --rm migracoes npm run db:permissoes -- --compose
fi

echo "Subindo postgres, api e frontend..."
docker compose up -d --wait postgres api frontend

echo
echo "Status dos containers:"
docker compose ps

echo
echo "=========================================="
echo "  Tudo pronto!"
echo "  Frontend : http://localhost:5173/login"
echo "  API      : http://localhost:3000/api/health"
echo "=========================================="
echo
