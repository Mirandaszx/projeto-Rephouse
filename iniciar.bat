@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo   RepHouse - Iniciando ambiente Docker
echo ==========================================
echo.

:: Verifica se o Docker esta rodando
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERRO] O Docker Desktop nao parece estar em execucao.
    echo Abra o Docker Desktop, aguarde inicializar e tente novamente.
    pause
    exit /b 1
)

:: Cria o .env automaticamente a partir do .env.example se nao existir
if exist ".env" goto :env_pronto

echo [INFO] Arquivo .env nao encontrado. Criando a partir de .env.example...
copy /y ".env.example" ".env" >nul
if errorlevel 1 (
    echo [ERRO] Nao foi possivel copiar .env.example para .env.
    pause
    exit /b 1
)

:: Gera JWT_SECRET automaticamente se estiver vazio
powershell -NoProfile -Command "$p = (Resolve-Path '.env').Path; $c = [System.IO.File]::ReadAllText($p, [System.Text.UTF8Encoding]::new($false)); if ($c -match '(?m)^JWT_SECRET=\s*$') { $bytes = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); $secret = -join ($bytes | ForEach-Object { $_.ToString('x2') }); $c = [regex]::Replace($c, '(?m)^JWT_SECRET=[ \t]*(\r?)$', { param($m) 'JWT_SECRET=' + $secret + $m.Groups[1].Value }); [System.IO.File]::WriteAllText($p, $c, [System.Text.UTF8Encoding]::new($false)) }"

echo.
echo --- Configuracao inicial do .env (pressione Enter para pular/usar padrao) ---
echo.
echo [1/3] Senha do banco PostgreSQL (usuario: gabrisel - ex: MinhaSenhaForte123)
set "INPUT_PG_PASS="
set /p "INPUT_PG_PASS=      Digite a senha [padrao: troque_por_uma_senha_segura]: "
echo.
echo [2/3] Senha das contas de demonstracao (opcional - para testar login local sem e-mail)
echo       Formato: qualquer senha com 12 a 128 caracteres (ex: DemoRephouse2026!)
set "INPUT_DEMO_PASS="
set /p "INPUT_DEMO_PASS=      Digite a senha (ou Enter para pular): "
echo.
echo [3/3] Envio de e-mail via Resend (opcional - necessario para habilitar o cadastro)
echo       Formato da chave: comeca com "re_" (ex: re_YsiVaTL6_...)
set "INPUT_RESEND_KEY="
set /p "INPUT_RESEND_KEY=      Cole sua RESEND_API_KEY (ou Enter para pular): "
set "INPUT_EMAIL_FROM="
set "INPUT_APP_URL="
if not "%INPUT_RESEND_KEY%"=="" (
    set /p "INPUT_EMAIL_FROM=      E-mail remetente [padrao: onboarding@resend.dev]: "
    set /p "INPUT_APP_URL=      URL publica do site [padrao: http://localhost:5173]: "
)

powershell -NoProfile -Command "$p = (Resolve-Path '.env').Path; $c = [System.IO.File]::ReadAllText($p, [System.Text.UTF8Encoding]::new($false)); if ($env:INPUT_PG_PASS) { $pg = $env:INPUT_PG_PASS; $c = [regex]::Replace($c, '(?m)^POSTGRES_PASSWORD=[^\r\n]*', { param($m) 'POSTGRES_PASSWORD=' + $pg }); $c = [regex]::Replace($c, '(?m)^DATABASE_URL=postgresql://([^:]+):[^@]+@', { param($m) 'DATABASE_URL=postgresql://' + $m.Groups[1].Value + ':' + $pg + '@' }) }; if ($env:INPUT_DEMO_PASS) { $dp = $env:INPUT_DEMO_PASS; $c = [regex]::Replace($c, '(?m)^DEMO_PASSWORD=[^\r\n]*', { param($m) 'DEMO_PASSWORD=' + $dp }) }; if ($env:INPUT_RESEND_KEY) { $rk = $env:INPUT_RESEND_KEY; $ef = if ($env:INPUT_EMAIL_FROM) { $env:INPUT_EMAIL_FROM } else { 'onboarding@resend.dev' }; $au = if ($env:INPUT_APP_URL) { $env:INPUT_APP_URL } else { 'http://localhost:5173' }; $c = [regex]::Replace($c, '(?m)^#?\s*RESEND_API_KEY=[^\r\n]*', { param($m) 'RESEND_API_KEY=' + $rk }); $c = [regex]::Replace($c, '(?m)^#?\s*EMAIL_FROM=[^\r\n]*', { param($m) 'EMAIL_FROM=' + $ef }); $c = [regex]::Replace($c, '(?m)^#?\s*APP_PUBLIC_URL=[^\r\n]*', { param($m) 'APP_PUBLIC_URL=' + $au }) }; [System.IO.File]::WriteAllText($p, $c, [System.Text.UTF8Encoding]::new($false))"
echo.

echo [INFO] Subindo postgres e executando migracoes iniciais...
docker compose up -d --wait postgres
if errorlevel 1 (
    echo [ERRO] Falha ao iniciar o postgres.
    pause
    exit /b 1
)

docker compose --profile manutencao run --rm migracoes
if errorlevel 1 (
    echo [ERRO] Falha ao executar as migracoes iniciais.
    pause
    exit /b 1
)

echo [INFO] Configurando permissoes do banco de dados...
docker compose --profile manutencao run --rm migracoes npm run db:permissoes -- --compose
if errorlevel 1 (
    echo [ERRO] Falha ao configurar permissoes do banco.
    pause
    exit /b 1
)

:env_pronto

echo Subindo postgres, api e frontend...
docker compose up -d --wait postgres api frontend
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao iniciar os containers. Verifique os logs acima.
    pause
    exit /b 1
)

echo.
echo Status dos containers:
docker compose ps

echo.
echo ==========================================
echo   Tudo pronto!
echo   Frontend : http://localhost:5173/login
echo   API      : http://localhost:3000/api/health
echo ==========================================
echo.
pause
