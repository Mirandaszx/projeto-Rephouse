# Tarefas compartilhadas e notificações — 4.0.0

Esta entrega é local. Após a validação no PostgreSQL dedicado e autorização posterior do usuário, as migrations `202611200003_tarefas_compartilhadas` e `202611200004_notificacoes` foram aplicadas no principal em 21/11/2026. Naquela ativação, a API passou à compilação 4.0.0, com 23 migrations e nenhuma pendente. O estado atual é 4.1.0, com a expansão de [avisos gerais e Todas](NOTIFICACOES_GERAIS.md); os resultados desta entrega 4.0.0 permanecem históricos. O backup preventivo, a preservação dos dados e volumes, as permissões e as consultas/SSE pelo proxy estão registrados na [evidência de ativação](evidencias/ativacao-notificacoes-principal-2026-11-21.json).

## Tarefas

Qualquer morador ativo cria uma tarefa disponível, omitindo `responsavelId` ou enviando `null`, ou atribui a tarefa ao próprio vínculo. Administrador e MASTER podem atribuir a outro membro ativo da mesma casa. IDs de vínculo não são IDs de usuário.

| Operação | Quem pode |
|---|---|
| Criar disponível ou para si | Morador ativo |
| Assumir disponível | Morador ativo, para o próprio vínculo |
| Editar título, descrição e prazo | Criador enquanto disponível; administrador a qualquer momento |
| Concluir ou reabrir | Responsável ativo ou administrador |
| Liberar aberta | Responsável ativo ou administrador |
| Trocar responsável | Administrador |

Tarefa concluída exige responsável. Uma tarefa de responsável inativo não é liberada automaticamente: a interface sinaliza a redistribuição ao administrador. Conclusões preservam o histórico.

`POST /api/tarefas/{id}/assumir` e `/liberar` recebem `{}`. Assumir concorrentemente resulta em um `200` e um `409 TASK_ALREADY_ASSIGNED`. Repetição pelo responsável atual é `200` sem novo evento. Concluir/reabrir repetidamente o mesmo estado também não produz evento duplicado. `GET /api/tarefas/{id}` consulta o estado atual.

Criação mantém `Idempotency-Key` opcional e o snapshot original. Criador e versão são definidos no servidor; a autorização é revalidada antes de recuperar uma operação anterior. Despesas continuam exigindo administração. Nova chave permite tarefas intencionalmente iguais.

O contrato 4.0.0 torna `responsavelId` anulável. `criadorId` é anulável e os campos de autoria/situação do responsável são opcionais no contrato para aceitar snapshots antigos, sem reescrevê-los. A versão transacional não é um campo de edição pública. Não foi inferido criador de tarefa histórica.

## Avisos dentro do sistema

Tarefas geram eventos de criação, associação, reatribuição, conclusão, liberação e reabertura. São destinados aos moradores ativos e habilitados naquele momento, exceto o autor da ação. Edição apenas textual não dispara aviso. Quem entra depois não recebe eventos retroativos.

Despesas geram aviso individual para parcela com saldo pendente entre hoje e sete dias à frente e outro no dia do vencimento. Se a conta já nasce vencendo hoje, só o aviso de hoje é criado. O calendário usa Brasília. Pagamento parcial mantém o alerta; quitação, mudança de vencimento ou passagem para atraso retiram o aviso financeiro da lista ativa, sem apagar o histórico. Não há lembrete diário de atraso.

O agendador executa na inicialização e a cada minuto, em lotes de até 50 parcelas. Cada parcela é revalidada em transação Serializable. Unicidade por parcela, vencimento e tipo protege reinícios e instâncias concorrentes. Falhas de uma parcela são registradas por código seguro e não impedem as demais. A próxima execução recupera pendências ainda elegíveis; dias passados não são cobrados retroativamente pelo notificador.

Eventos e destinatários são gravados junto com a operação de tarefa; se a transação falha, nenhum aviso sobrevive. A leitura é individual. O painel não marca ao abrir; clicar marca o aviso e abre o destino. “Marcar todas como lidas” atua somente na categoria e no conjunto visível à transação daquela solicitação. Não existem exclusão ou limpeza automática.

Somente avisos do vínculo ativo na república atual aparecem. Bloqueio, saída, troca e exclusão lógica não concedem acesso a dados antigos pelo painel. Consultas financeiras históricas existentes conservam suas próprias regras.

## HTTP e tempo real

Todas as rotas exigem Bearer JWT e também existem em `/api/front/v1`. A listagem de notificações continua paginada no adaptador.

| Método e caminho | Resposta |
|---|---|
| `GET /api/notificacoes?categoria=TAREFAS&pagina=1&limite=20` | `{dados,paginacao}`; categoria também aceita `DESPESAS` |
| `GET /api/notificacoes/nao-lidas` | `{tarefas,despesas,total}` |
| `PATCH /api/notificacoes/{id}/lida` com `{}` | `204`, idempotente para destinatário autorizado |
| `PATCH /api/notificacoes/lidas` com `{categoria}` | `204`, marca a categoria |
| `GET /api/notificacoes/eventos` | Fluxo `text/event-stream` |

SSE usa `fetch` autenticado: não existe JWT em query string. A conexão envia `conectado` e `atualizar` com `{}`; a interface reconcilia os dados pelas consultas HTTP. `sessao-encerrada` encerra a sessão; `contexto-encerrado` reconsulta a casa por navegação; `indisponivel` permite reconexão. Há heartbeat e revalidação de autorização a cada 15 segundos, sem transação aberta durante o fluxo.

O PostgreSQL emite `NOTIFY` sem conteúdo pessoal após o commit. Cada API tem um único cliente `LISTEN`, compartilhado pelos navegadores. O sinal é apenas um convite para verificar a revisão autorizada da própria caixa; atividade em outra casa não é transmitida como aviso. Mudanças financeiras invalidam a revisão quando necessário. Reconexão do listener e heartbeat permitem reconciliar eventos confirmados mesmo que o sinal transitório se perca.

O frontend compartilha uma conexão por aba entre as páginas, reconecta progressivamente até 30 segundos e usa watchdog de 45 segundos. Conexão caída é “Reconectando…”, não uma caixa vazia. Atualização por foco e abertura do painel também consulta o banco. Encerramento do servidor fecha os fluxos antes de drenar requisições.

## Interface e operação

Sino nas telas da casa e no cabeçalho de perfil/financeiro com vínculo. MASTER não recebe um painel global das casas. No desktop o painel fica ancorado ao sino; no celular é um diálogo adaptado à tela. As abas têm teclado, indicadores textuais, foco e fechamento por Escape. Tema e componentes atuais são preservados. A entrada tem até 180 ms; teclado e movimento reduzido usam abertura imediata. Não existe animação permanente do sino.

Em API anterior, a ausência das rotas esconde o sino e mantém o modo anterior de atribuição no formulário de tarefas. Isso permite preservar o principal enquanto a versão nova é validada. Não iniciar a API 4 contra banco sem as duas migrations funcionais.

As permissões novas são SELECT/INSERT em eventos e notificações, além de UPDATE apenas na coluna `lida_em` de notificações. Nenhuma permissão de exclusão é concedida. Regras de vínculo e destinatário também são verificadas por constraints/triggers.

Os arquivos `down.sql` são referências para uma migration compensatória revisada. Recusam reversão se houver histórico novo; não removem eventos, autoria ou tarefas para fazer a versão anterior funcionar. Migrations aplicadas não são editadas.

Na ativação autorizada, a API foi pausada para o dump formato 2, conferido por hash e catálogo. As duas migrations e as permissões foram aplicadas sem seed, reset ou contas de teste. Os campos históricos de 18 tabelas foram comparados antes de reiniciar a API; somente as novas colunas da tarefa ficaram fora da comparação de campos antigos. Não houve novo ensaio de restauração. O override local `.devops-local/principal-estavel.yml` mantém a compilação ativa (atualmente 4.1.0); preserve-o nos reinícios deste checkout:

```powershell
docker compose --env-file .env -f docker-compose.yml -f .devops-local/principal-estavel.yml -p projeto-rephouse up -d --wait postgres api frontend
```

O backup da ativação 4.0.0 fica em `copias-seguranca/2026-11-21T23-23-29-786Z-antes-4-0-0-1ae55300/`, fora do Git. Não execute `down -v`. A compilação e o override anteriores foram preservados localmente para análise; voltar ao código anterior depois de usar tarefas sem responsável exige avaliação de compatibilidade, sem apagar histórico para forçar a reversão.

## Validação

```powershell
npm run test:completo
npm --prefix interface run verificar
```

Os comandos usam PostgreSQL exclusivo de testes na porta 5544 e schemas próprios. Não executar seed, reset ou testes no principal. A suíte de notificações também pode ser selecionada com `npm run test:notificacoes`, configurando explicitamente `TEST_DATABASE_URL` para o destino dedicado.

Request specs cobrem permissões, repetição, concorrência, rollback, isolamento, vencimentos, leitura, SSE entre instâncias e reinício real do processo. Os testes de navegador exercitam os formulários e os avisos contra API/PostgreSQL reais, incluindo duas abas, temas, larguras de 320/390/768/1440 px, teclado e falhas de consulta.

Resultado local em 21/11/2026: **314 testes de backend aprovados**, sem falhas ou ignorados; contrato e tipos sincronizados. No frontend, build, tipagem e lint sem erros (seis avisos anteriores); **88 de 89 testes aprovados**, incluindo os cinco cenários novos. Permanece a falha conhecida de animação em `motion-superficies.spec.ts:195`, sem ignorar ou enfraquecer o teste. Portanto, a suíte completa da interface ainda não está aprovada.

Consulte a [matriz atualizada](VALIDACAO_MVP.md) e a [evidência desta entrega](evidencias/notificacoes-tarefas-2026-11-21.json). As capturas estão em `.devops-local/interface/imagens/notificacoes-2026-11-20/`; a data do diretório identifica a primeira rodada, e as capturas finais foram refeitas na validação atual. Nenhuma execução remota foi realizada.
