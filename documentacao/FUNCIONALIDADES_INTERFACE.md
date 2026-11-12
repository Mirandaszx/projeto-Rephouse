# Gestão pela interface — RepHouse 2.1.0

As telas usam as APIs existentes, sem alterar contratos, migrations ou regras do backend. O proxy local continua encaminhando `/api` ao adaptador `/api/front/v1`; a API principal continua paginada.

## Onde encontrar cada ação

| Área | Caminho | Ações |
| --- | --- | --- |
| Meu perfil | `/republica/perfil` | Consultar e-mail, editar nome e excluir a própria conta com senha e confirmação. |
| Meu financeiro | `/republica/financeiro` | Consultar partes, pagamentos, saldos e comprovantes de todas as repúblicas; registrar pagamento manual de uma dívida anterior. |
| Configurações da república | `/republica/configuracoes` | Consultar dados, editar nome/endereço quando autorizado, transferir administração, sair ou trocar de república. |
| Moradores | `/republica/moradores` | Consultar ativos, incluir inativos e desativar vínculos quando autorizado. O código de convite permanece nesta página. |
| Despesas | `/republica/despesas` | Abrir detalhes pelo título, consultar rateios/pagamentos, baixar comprovantes autorizados e editar a despesa quando autorizado. |
| Tarefas | `/republica/tarefas` | Editar título, responsável, descrição e prazo quando autorizado; manter criação, conclusão e reabertura existentes. |
| MASTER | `/admin` | Consultar diretórios e confirmar bloqueio/desbloqueio de usuários e repúblicas. Contas excluídas não recebem ação de reativação. |

No computador, perfil, financeiro e configurações ficam junto ao perfil na lateral. No celular, têm atalhos identificados no topo; a navegação inferior mantém suas quatro páginas. Sem república, o cabeçalho oferece perfil e financeiro. MASTER também tem acesso ao próprio perfil.

## Permissões e confirmações

- Morador edita seu próprio nome, confirma sua exclusão, consulta seu histórico e pode sair/trocar de casa. Na gestão de tarefas, continua limitado a concluir a própria tarefa.
- Administrador gerencia dados, moradores, despesas e tarefas de sua república. Antes de sair, trocar ou excluir sua conta, precisa transferir a administração para outro morador ativo.
- MASTER bloqueia/desbloqueia contas e repúblicas, com as proteções existentes, inclusive a permanência de outro MASTER ativo. Desbloqueio de conta não recupera tokens revogados; é necessário novo login.
- Transferência, saída, troca, desativação de vínculo, bloqueio/desbloqueio e exclusão usam diálogos de confirmação. Cancelar não envia a operação. Durante o envio, campos e ações ficam desabilitados e Escape não fecha o diálogo.
- Após alterações de vínculo ou administração, a interface consulta novamente o perfil/contexto; botões não substituem a autorização transacional do backend.
- Exclusão lógica requer senha válida, ausência de dívida inclusive de casas anteriores e ausência de administração pendente. Senha de confirmação incorreta mantém a sessão; sessão revogada/expirada volta ao login.

## Financeiro e histórico

Os valores são enviados como strings decimais. Na edição, após o primeiro pagamento, valor total e participantes ficam bloqueados na interface; título, categoria e vencimento continuam editáveis. A API revalida essa regra, inclusive se um pagamento ocorrer durante a edição. Somente os campos financeiros alterados são enviados quando não há histórico.

O financeiro pessoal não depende de vínculo ativo. Ele apresenta o nome da república de origem, vencimento, sua parte, total pago, saldo e pagamentos. Datas civis usam a parte `YYYY-MM-DD`, e horários de pagamento são exibidos no horário de Brasília.

Downloads fazem requisição autenticada, recebem bytes e MIME validados e usam nome genérico `comprovante.ext`. Não colocam o token na URL. Os bytes temporários no navegador são liberados após iniciar o download. A interface oferece o download ao proprietário ou ao administrador autorizado; o backend verifica a permissão novamente. MASTER mantém sua permissão na API.

O registro de pagamento no histórico é manual, com arquivo opcional de até 5 MiB e chave de idempotência mantida para o mesmo envio. Alterar dados ou arquivo gera outra chave; não há repetição automática. Pix continua fora desta etapa.

## Erros e acessibilidade

O cliente HTTP trata `204` sem tentar ler JSON e mantém `status`, `error.code` e `X-Request-Id`. Falhas mostram a mensagem pública e a identificação para suporte; `429` apresenta a espera de `Retry-After` em segundos. Não são registrados tokens, senhas ou arquivos.

Os novos formulários seguem os temas Sistema/Claro/Escuro, usam controles nativos rotulados e foco visível. Diálogos recebem foco inicial em Cancelar e restauram o foco ao fechar. Conteúdo longo pode rolar normalmente. A revisão com leitor de tela e celular físico permanece separada dos testes automatizados.

Perfil e financeiro usam uma área central de até 940 px. A correção de 10/11/2026 impede que o estilo geral do painel os coloque na coluna lateral de 228 px, mesmo quando esse CSS carrega depois. O teste de regressão mede largura e centralização, além de verificar ausência de rolagem horizontal. A versão da porta 5173 também foi conferida com dados exclusivos da API de testes. Detalhes em [validacao-layout-conta.json](evidencias/validacao-layout-conta.json).

## Reproduzir a validação

Com Node.js 24 e dependências instaladas:

```powershell
docker compose -f interface/docker-compose.test.yml up -d --wait postgres
$env:TEST_DATABASE_URL='postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test'
$env:DATABASE_URL=$env:TEST_DATABASE_URL
npm run verificar
npm --prefix interface run verificar
```

Use um terminal exclusivo para esses comandos. A preparação do navegador valida `rabbu_mvp_test`, aplica migrations a um schema descartável e prepara contas fictícias próprias. Sessões de teste são emitidas pelo serviço real na preparação, sem desativar ou aumentar o limitador HTTP. As ações da jornada passam pelo navegador/API; consultas SQL somente de leitura conferem o estado persistido. Tokens ficam apenas em `.devops-local/`, ignorado pelo Git.

`interface/testes-pr2/gestao.spec.ts` acompanha uma jornada sequencial com duas casas e perfis distintos. Capturas novas ficam em `.devops-local/interface/imagens/gestao/`. Os resultados finais ficam em [validacao-gestao-interface.json](evidencias/validacao-gestao-interface.json); evidências anteriores permanecem históricas.

Nenhum seed, reset ou alteração direta no banco da equipe é necessário. Google real, recuperação de senha, paginação das listas atuais, hospedagem e publicação continuam em etapas separadas.
