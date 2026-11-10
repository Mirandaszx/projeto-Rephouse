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

## Funcionalidades para completar nas telas

| Item | Backend atual | Frontend atual / trabalho restante |
| --- | --- | --- |
| Meu perfil | `GET/PATCH /api/me`; edição do nome | Falta página de perfil e formulário de edição. Não presumir alteração de e-mail/senha: a edição atual aceita nome. |
| Exclusão da conta | `DELETE /api/me`; exclusão lógica e restrições existentes | Falta confirmação por senha, explicação das restrições e encerramento da sessão após sucesso. Exclusão já fazia parte do escopo aprovado. |
| Sair ou trocar de república | `/api/republicas/sair` e `/trocar` | Faltam ações, confirmação, mensagens e atualização de `/me`. “Sair” atual é logout da conta. |
| Administração da república | Edição de nome/endereço, transferência de administração e desativação de vínculo existentes | Faltam configurações da casa, transferência e controles de moradores com confirmação. Desativar vínculo não é excluir a conta. |
| Moradores inativos | Filtro `inativos=true` com autorização | Falta filtro restrito aos perfis autorizados. |
| Edição de despesas | `PATCH /api/despesas/{id}` com regras financeiras | Falta abrir detalhe/edição e explicar recusas quando já há pagamento. |
| Detalhes financeiros | Detalhes de despesas, pagamentos e financeiro pessoal/histórico existentes | Falta uma área para consultar rateios e pagamentos anteriores, inclusive após saída/troca. Diferenciar pendente, vencida e paga; a tela atual filtra Todas/Pendentes/Pagas. |
| Comprovantes já enviados | Download binário protegido implementado | Falta ação visual para baixar comprovantes de pagamentos anteriores. O teste atual verifica o download pela API, não por um botão na tela. |
| Edição de tarefas | `PATCH /api/tarefas/{id}` aceita dados e status conforme autorização | A interface cria, conclui e permite reabrir conforme perfil; falta edição de título, responsável, descrição e prazo. |
| Ações MASTER | Bloqueio/desbloqueio de contas/repúblicas e operações por república existentes | As telas atuais consultam; faltam ações, detalhes e confirmações com autorização. |

As ações deverão respeitar os perfis existentes. Nenhum botão deve substituir a autorização do backend. Ao mudar vínculo ou administração, consultar novamente `/api/me` e os dados do contexto.

## Integração e robustez do frontend

- [ ] Centralizar tratamento de erros com `status`, `error.code`, `X-Request-Id` e `Retry-After`; apresentar identificação para suporte e espera em `429`, sem repetição automática de pagamentos.
- [ ] Cobrir expiração/revogação em todas as áreas, inclusive MASTER, além de erros `400`, `403`, `404`, `409` e `503` nos novos fluxos.
- [ ] Reutilizar os tipos de `integracao/api.d.ts` ou derivar tipos do contrato do adaptador; as telas atuais ainda declaram vários formatos manualmente.
- [ ] Preparar consumo paginado da API principal. O adaptador atual devolve arrays até 1.000 registros e retorna `409 FRONT_COLLECTION_LIMIT` acima disso; não ampliar o limite como solução.
- [ ] Conferir sessão e documentação: a interface atual usa `sessionStorage`, enquanto há orientações antigas descrevendo token somente em memória. Registrar uma política coerente antes de alterar esse comportamento.
- [ ] Acrescentar testes de navegador para cada ação nova, verificando permissões e estado persistido.
- [ ] Continuar a revisão de acessibilidade com teclado, foco de modais, leitor de tela, zoom e celular físico. Os testes de tema e contraste selecionado já passaram; não equivalem à auditoria completa.
- [ ] Corrigir os cinco avisos preexistentes de Fast Refresh como melhoria de manutenção.

## Backend: fechamento e validações restantes

- [ ] Conferir o contrato de cada nova tela com as rotas existentes e corrigir divergências demonstradas por testes, preservando a API 2.1.0.
- [ ] Reexecutar a regressão completa ao integrar as próximas funcionalidades. A última evidência registrada do backend tem **138 testes aprovados**; este checklist não executou novamente a suíte.
- [ ] Atualizar o resumo da matriz para a suíte atual do frontend, sem apagar os resultados históricos de 4, 13, 18 e 21 testes.
- [ ] Consolidar documentação de sessão, integração e fluxos realmente disponíveis na interface.
- [ ] Revisar e registrar as mudanças locais; commit e push dependem de pedido específico.
- [ ] Após publicar as mudanças do workflow, verificar sua execução real no GitHub. A aprovação da configuração local não comprova execução remota.
- [ ] Considerar incluir build, tipos e testes ativos do frontend no GitHub Actions. O workflow atual verifica o backend e contrato/tipos; não executa a suíte da interface.

O levantamento não encontrou necessidade de reimplementar autenticação, regras financeiras, banco ou o adaptador para disponibilizar as ações já existentes. A maior parte das lacunas funcionais está nos controles do frontend.

## Itens de outra etapa

- [ ] **Google:** backend implementado com testes controlados; faltam integração no login atual, Client ID configurado e jornada real com contas de teste.
- [ ] **Pix real:** não implementado. O sistema registra pagamentos manualmente; integração com provedor e confirmação automática exigem escopo próprio.
- [ ] **Recuperação/alteração de senha:** não disponível como fluxo da aplicação; requer backend e frontend próprios se for incluída.
- [ ] **Gráfico mensal MASTER:** o contrato atual não fornece série real para o gráfico. Definir dados e contrato caso o grupo decida incluí-lo; não apresentar valores fictícios como reais.

Hospedagem, domínio, HTTPS público, carga, demonstração de recuperação/backup e homologação separada continuam opcionais ou fora da terceira apresentação. Docker e GitHub Actions permanecem.

## Ordem proposta

1. Perfil e exclusão de conta.
2. Saída/troca de república, transferência de administração e gestão de moradores.
3. Detalhes/edição de despesas, histórico pessoal e download de comprovantes.
4. Edição de tarefas e ações MASTER.
5. Padronização de erros, tipos e paginação junto de cada implementação; regressão e roteiro final da apresentação.

Google, Pix e recuperação de senha entram em planejamento separado se forem priorizados pelo grupo.

## Evidências consultadas

- [Interface atual e limites](../interface/README.md).
- [Compatibilidade com o frontend do PR #2](INTEGRACAO_FRONTEND_PR2.md).
- [Matriz do MVP](VALIDACAO_MVP.md).
- [Backend: 138 testes na última verificação registrada](evidencias/validacao-simplificacao-entrega.json).
- [Frontend: 25 testes na última verificação registrada](evidencias/validacao-aparencia.json), sem falhas ou ignorados; build/tipos aprovados, lint sem erros e com cinco avisos preexistentes.

Este levantamento não executou testes, migrações, commit, push ou alterações no banco da equipe. Somente este checklist foi acrescentado.
