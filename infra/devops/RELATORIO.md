# Entrega local DevOps — 22/11/2026

Branch: `teste-devops`. Aplicação/contrato: **4.2.0**. Não houve commit, push, publicação de imagens ou execução remota de CI.

## Resultado

A aplicação compilada roda no Kubernetes local do Docker Desktop, com banco próprio, conta limitada e persistência. Elasticsearch, Filebeat e Kibana estão integrados, com autenticação, HTTPS na coleta e dashboard importável. O workflow local foi ampliado com frontend, imagens e scanners.

**Isso não representa aprovação de segurança nem aprovação integral do frontend:** os bloqueios encontrados permanecem visíveis.

| Verificação | Resultado registrado |
|---|---|
| Backend antes das mudanças | 337 aprovados; 0 falhas; 0 ignorados |
| Backend após as mudanças | 338 aprovados; 0 falhas; 0 ignorados |
| Frontend completo | 106 aprovados; 1 falha preexistente de animação |
| Imagens | Usuários limitados, Sharp funcional, Nginx válido e configuração sem credenciais |
| Aplicação compilada | Login, rotas, foto privada, pagamento/comprovante e SSE aprovados |
| Persistência | Tarefa, foto e comprovante preservados após recriar o Pod PostgreSQL |
| Atualização/rollback | Troca efetiva para tag de ensaio do mesmo conteúdo e retorno à tag original, com dados preservados |
| Observabilidade | RequestId pesquisável, coleta retomada com offsets, eventos verificados sem duplicação e dashboard visível |
| Autenticação da observabilidade | Elasticsearch recusa acesso anônimo; Kibana exige login; coletor usa chave limitada |
| Parada/retomada | Somente os namespaces de demonstração; PVCs preservados |
| YAML e Kustomize | Parsing e aplicação no cluster local conferidos |
| GitHub Actions remoto | Não executado nesta etapa |

## Ambiente e evidências

- RepHouse Kubernetes: **http://localhost:5180/login**.
- Kibana: **http://localhost:5601**; dashboard **RepHouse — operação local**.
- Ambiente habitual da equipe continua separado nas portas originais. Seu volume PostgreSQL não foi recriado, migrado ou removido nesta entrega.
- Banco fictício: `rephouse_devops_demo`; namespaces `rephouse-demo` e `rephouse-observabilidade`.
- Imagens identificadas pelo commit e hash das fontes; IDs e usuários registrados em `.devops-local/devops/imagens.json`.
- Credenciais exclusivamente locais em `.devops-local/devops/credenciais.json`, ignorado pelo Git. Não anexar esse arquivo à apresentação.
- Relatórios de aplicação, observabilidade, imagens e recursos em `.devops-local/devops/validacao-*.json` e `recursos.json`.
- Capturas desktop, celular e Kibana em `.devops-local/devops/capturas/`.
- Regressão final: `.devops-local/testes-criticos/2026-11-22T22-32-38.853Z.json`.
- Suíte frontend: `.devops-local/interface/resultado-playwright.json`; logs iniciais em `.devops-local/devops-baseline-frontend.log`.

A primeira amostra de recursos registrou aproximadamente **2,40 GiB** nos Pods da demonstração e **3,69 GiB** no nó, incluindo componentes do cluster. São medidas pontuais, não benchmark ou teste de carga. O Kibana recebeu margem adicional de heap/limite após o ensaio de retomada; a amostra final fica em `recursos.json`.

## Pendências e classificação da primeira execução

### Frontend

`interface/testes-pr2/motion-superficies.spec.ts:195`: o teste de quadros intermediários de entrada/saída continua falhando. Já falhava antes da alteração DevOps. Não foi apagado, ignorado ou flexibilizado; o job frontend deve continuar reprovado enquanto essa falha existir.

### Segredos — Gitleaks

Foram registrados **10 alertas no histórico e 8 nos arquivos candidatos**. A inspeção dos locais apontou segredos deliberadamente fictícios de testes, placeholder de `.env.backend.example` e hashes de OpenAPI/tipos em evidências. Esses achados não demonstraram exposição de uma credencial real do Resend.

Os relatórios estão redigidos. Não foram criadas allowlists amplas, modificações do histórico ou exclusões para obter aprovação. Antes de liberar o job, cada falso positivo deve receber tratamento específico e revisável, preservando detecção de valores reais nesses mesmos arquivos.

### Código — Semgrep

Cinco regras locais executadas, cobrindo código de aplicação do frontend e backend: **0 achados**. Isso não equivale a uma auditoria completa. Os relatórios públicos não precisam carregar trechos de código ou metavariáveis.

### Dependências — Trivy

| Dependência | Instalada | Correção indicada pelo scanner | Achado |
|---|---|---|---|
| body-parser | 2.3.0 | 2.4.0 | CVE-2026-111181 — HIGH |
| effect | 3.20.0 | 3.22.1 | CVE-2026-121707 — HIGH |
| multer | 2.4.0 | 2.5.0 | CVE-2026-113872 — HIGH |

Essas versões foram mantidas na primeira execução acima. A correção posterior atualizou resolução/lockfile e repetiu os testes afetados; seus resultados estão no [relatório de correção das dependências](CORRECOES_DEPENDENCIAS.md). Os resultados iniciais permanecem registrados para comparação.

### Imagens — Trivy

| Imagem | HIGH | CRITICAL | Ocorrências com versão corrigida indicada |
|---|---:|---:|---:|
| API | 59 | 4 | 25 |
| Migrations | 59 | 4 | 25 |
| Frontend | 1 | 0 | 1 |

São ocorrências por pacote/imagem, com sobreposição entre API e migrations; não são 127 CVEs distintas. Há componentes do sistema operacional e ferramentas transitivas além das dependências da aplicação. Parte não possui versão corrigida indicada pelo scanner.

No frontend, o achado é `libxml2` `2.13.9-r2`, com correção indicada `2.13.9-r3` (CVE-2026-86144). Nas imagens Node há, entre outros, pacotes Debian, npm e suas dependências. A próxima correção deve atualizar bases/pacotes, reduzir ferramentas desnecessárias no runtime e reavaliar os resultados, sem suprimir vulnerabilidades indiscriminadamente.

Os jobs de segurança retornam falha diante desses achados. A existência do pipeline não permite declarar o sistema seguro ou liberado para publicação.

## Ajustes encontrados na operação

1. **Imagem local no Kind:** `imagePullPolicy: Never` não permitia usar o espelho integrado do Docker Desktop. `IfNotPresent` foi validado com as imagens construídas localmente, sem registry público.
2. **Certificado Elasticsearch:** a versão 9 exige arquivos SSL sob seu diretório de configuração. O mount foi corrigido, sem desativar a verificação TLS.
3. **Rollback da API:** um 502 transitório foi reproduzido. A drenagem de cinco segundos antes do SIGTERM e a margem de encerramento corrigiram o cenário sem alterar a expectativa do ensaio.
4. **Retomada do Kibana:** o primeiro orçamento de heap foi insuficiente em um reinício. Foi ampliado para 1024 MiB de heap e 1792 MiB de limite do container, mantendo o orçamento do Docker.
5. **Port-forward:** acompanha um Pod específico; substituir o Pod do frontend/Kibana pode exigir reabrir `acessar`. Isso não representa perda do banco ou do dashboard.
6. **Secrets:** aplicação server-side, sem uma cópia dos valores na annotation de client-side apply. Base64 continua não sendo criptografia; este é um ambiente local de demonstração.

## Próxima etapa

Tratar os bloqueios de segurança e a falha de animação com mudanças próprias e regressão. Publicação na internet, domínio, HTTPS público, registry remoto e deploy automático continuam fora desta entrega.

Instruções completas e diagrama: [guia de operação](README.md).
