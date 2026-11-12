# Checklist do RepHouse — backend e frontend

Levantamento local em **10/11/2026**, versão **2.1.0**, baseado no código atual e nas evidências registradas. A coluna “backend pronto” indica operação implementada; uma tela ausente não significa ausência da API. Os itens pendentes abaixo organizam o trabalho e não ampliam automaticamente o escopo da apresentação.

## O que já funciona

- [x] Cadastro, login por e-mail/senha, logout e autorização por perfil.
- [x] Criar república, entrar por código e consultar moradores pela interface.
- [x] Visão geral com indicadores, despesas recentes e tarefas pendentes.
- [x] Criar despesas e ratear entre moradores selecionados.
- [x] Registrar pagamentos manuais parciais com comprovante opcional.
- [x] Armazenar comprovantes no PostgreSQL e disponibilizar download protegido pela API.
- [x] Criar, atribuir e concluir tarefas pela interface.
- [x] Consultar indicadores e diretórios de usuários/repúblicas no MASTER.
- [x] Login com a casinha, responsividade e aparência Sistema/Claro/Escuro.
- [x] PostgreSQL com transações, constraints, migrations e preservação de histórico.
- [x] Docker local, OpenAPI, tipos gerados, health/readiness e logs com identificador de requisição.
- [x] Workflow do backend presente; a versão simplificada está alterada localmente.

## Funcionalidades implementadas nas telas

As dez funcionalidades abaixo foram acrescentadas após o levantamento inicial. [Guia de uso e permissões](FUNCIONALIDADES_INTERFACE.md). O levantamento inicial permanece no histórico do Git.

| Item | Backend atual | Frontend atual / trabalho restante |
| --- | --- | --- |
| Meu perfil | `GET/PATCH /api/me`; edição do nome | Implementado em `/republica/perfil`; e-mail somente de consulta. |
| Exclusão da conta | `DELETE /api/me`; exclusão lógica e restrições existentes | Implementada com senha, confirmação explícita, mensagens de restrição e encerramento da sessão no sucesso. |
| Sair ou trocar de república | `/api/republicas/sair` e `/trocar` | Implementado em Configurações, com confirmação e recarga de contexto. O botão “Sair” junto ao perfil continua sendo logout. |
| Administração da república | Edição de nome/endereço, transferência de administração e desativação de vínculo existentes | Dados e transferência em Configurações; desativação em Moradores. A conta e o histórico são preservados. |
| Moradores inativos | Filtro `inativos=true` com autorização | Filtro implementado para administração; vínculos inativos identificados. |
| Edição de despesas | `PATCH /api/despesas/{id}` com regras financeiras | Detalhe pelo título e edição administrativa. Valor e participantes bloqueados após pagamento; API revalida concorrência. |
| Detalhes financeiros | Detalhes de despesas, pagamentos e financeiro pessoal/histórico existentes | Meu financeiro mostra origem, partes, pagamentos, saldos e situação, mesmo sem vínculo ativo. |
| Comprovantes já enviados | Download binário protegido implementado | Botões no detalhe da despesa e financeiro pessoal; download autenticado com nome genérico e bytes conferidos no navegador. |
| Edição de tarefas | `PATCH /api/tarefas/{id}` aceita dados e status conforme autorização | Edição administrativa de título, responsável, descrição e prazo; criação e conclusão preservadas. |
| Ações MASTER | Bloqueio/desbloqueio de contas/repúblicas existentes | Ações nos diretórios, com confirmação; contas excluídas não recebem ação de reativação. |

As ações deverão respeitar os perfis existentes. Nenhum botão deve substituir a autorização do backend. Ao mudar vínculo ou administração, consultar novamente `/api/me` e os dados do contexto.

## Integração e robustez do frontend

- [x] Centralizar tratamento de erros das chamadas pelo cliente HTTP com `status`, `error.code`, `X-Request-Id` e `Retry-After`; sem repetição automática de pagamentos.
- [ ] Cobrir expiração/revogação em todas as áreas, inclusive MASTER, além de erros `400`, `403`, `404`, `409` e `503` nos novos fluxos.
- [ ] Reutilizar os tipos de `integracao/api.d.ts` ou derivar tipos do contrato do adaptador; as telas atuais ainda declaram vários formatos manualmente.
- [ ] Preparar consumo paginado da API principal. O adaptador atual devolve arrays até 1.000 registros e retorna `409 FRONT_COLLECTION_LIMIT` acima disso; não ampliar o limite como solução.
- [ ] Conferir sessão e documentação: a interface atual usa `sessionStorage`, enquanto há orientações antigas descrevendo token somente em memória. Registrar uma política coerente antes de alterar esse comportamento.
- [x] Acrescentar jornadas de navegador para as ações novas, com API real, download e consultas ao PostgreSQL dedicado.
- [ ] Continuar a revisão de acessibilidade com teclado, foco de modais, leitor de tela, zoom e celular físico. Os testes de tema e contraste selecionado já passaram; não equivalem à auditoria completa.
- [ ] Corrigir os cinco avisos preexistentes de Fast Refresh como melhoria de manutenção.

## Backend: fechamento e validações restantes

- [x] Conferir as novas telas com as rotas existentes, preservando a API 2.1.0.
- [x] Reexecutar a regressão do backend nesta implementação: **138 testes aprovados**, sem falhas ou ignorados; contrato e tipos sincronizados.
- [x] Atualizar o resumo da matriz para a suíte atual de 36 testes do frontend, preservando as evidências anteriores.
- [ ] Consolidar documentação de sessão, integração e fluxos realmente disponíveis na interface.
- [ ] Revisar e registrar as mudanças locais; commit e push dependem de pedido específico.
- [ ] Após publicar as mudanças do workflow, verificar sua execução real no GitHub. A aprovação da configuração local não comprova execução remota.
- [ ] Considerar incluir build, tipos e testes ativos do frontend no GitHub Actions. O workflow atual verifica o backend e contrato/tipos; não executa a suíte da interface.

As ações foram acrescentadas reutilizando autenticação, regras financeiras, banco e adaptador existentes. Não houve alteração de APIs, migrations ou versão.

## Itens de outra etapa

- [ ] **Google:** backend implementado com testes controlados; faltam integração no login atual, Client ID configurado e jornada real com contas de teste.
- [ ] **Pix real:** não implementado. O sistema registra pagamentos manualmente; integração com provedor e confirmação automática exigem escopo próprio.
- [ ] **Recuperação/alteração de senha:** não disponível como fluxo da aplicação; requer backend e frontend próprios se for incluída.
- [ ] **Gráfico mensal MASTER:** o contrato atual não fornece série real para o gráfico. Definir dados e contrato caso o grupo decida incluí-lo; não apresentar valores fictícios como reais.

Hospedagem, domínio, HTTPS público, carga, demonstração de recuperação/backup e homologação separada continuam opcionais ou fora da terceira apresentação. Docker e GitHub Actions permanecem.

## Próximas prioridades

1. Paginação das listas atuais e adoção dos tipos gerados nas partes ainda manuais.
2. Revisão adicional de acessibilidade e testes com o grupo.
3. Consolidação da documentação de sessão e verificação remota das próximas mudanças quando autorizada.

Google, Pix e recuperação de senha entram em planejamento separado se forem priorizados pelo grupo.

## Evidências consultadas

- [Interface atual e limites](../interface/README.md).
- [Compatibilidade com o frontend do PR #2](INTEGRACAO_FRONTEND_PR2.md).
- [Matriz do MVP](VALIDACAO_MVP.md).
- [Backend: 138 testes na última verificação registrada](evidencias/validacao-simplificacao-entrega.json).
- [Frontend: 25 testes na última verificação registrada](evidencias/validacao-aparencia.json), sem falhas ou ignorados; build/tipos aprovados, lint sem erros e com cinco avisos preexistentes.
- [Atualização de gestão: 138 testes de backend e 36 de frontend](evidencias/validacao-gestao-interface.json). Os registros acima identificam etapas anteriores.

O levantamento inicial não executou testes nem alterou o banco. A implementação seguinte tem resultados próprios em [validacao-gestao-interface.json](evidencias/validacao-gestao-interface.json), sem substituir as evidências anteriores. O banco da equipe permanece fora dos ensaios.
