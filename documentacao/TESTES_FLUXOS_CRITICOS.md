# Testes dos fluxos críticos — RepHouse 2.2.0

## Executar

Pré-requisitos: Node.js 24, dependências instaladas com `npm ci` e Docker Desktop em funcionamento. Na raiz:

```powershell
npm run test:completo
```

O comando inicia somente o PostgreSQL do Compose de testes, na porta **5544**, valida banco/usuário/versão e durabilidade, cria um schema exclusivo, aplica as migrations e executa `npm run verificar`. Isso inclui build, contrato, tipos, tipagem, regressão anterior e novos request specs. O OpenAPI e os tipos devem conservar seus hashes. Falha, cancelamento ou teste ignorado resulta em código de saída diferente de zero.

Não é necessário editar `.env`, exportar `DATABASE_URL`, iniciar a API da equipe ou executar seed. A configuração é passada somente aos processos filhos. O banco permitido é `rabbu_mvp_test`, com o usuário exclusivo do Compose em `127.0.0.1:5544` ou `localhost:5544`. Um `TEST_DATABASE_URL` herdado divergente será recusado, sem recorrer à URL da aplicação. O serviço não é encerrado e o volume não é removido ao terminar.

As suítes inferiores `test:db` e `test:integracao` também conferem o destino antes de iniciar. Para preservar compatibilidade com o workflow existente, aceitam adicionalmente `localhost:5432/rabbu_mvp_test`, usuário `rephouse_ci`, exclusivamente quando `GITHUB_ACTIONS=true`. O comando local `test:completo` não aceita essa alternativa.

Relatórios completos ficam em `.devops-local/testes-criticos/<data>.json` e `.log`, fora do versionamento. O JSON informa as etapas, contagens TAP, destino sem senha, hashes e remoção do schema. O [resultado versionado](evidencias/validacao-request-specs.json) contém apenas a síntese local. Uma execução leva alguns minutos, incluindo **um minuto real do agendador**.

## Como a cobertura funciona

As ações dos novos request specs usam `fetch` contra o Express em porta local disponível. Autenticação, Prisma, transações `SERIALIZABLE`, regras e constraints são reais. Preparação de fixtures e consultas de invariantes podem usar SQL/Prisma; não substituem a ação HTTP testada. Falhas de rollback são provocadas por uma constraint real adicionada somente ao schema descartável.

Os casos do agendador iniciam `dist/server.js`, inclusive duas instâncias concorrentes. O IPC do teste emite o sinal normal de encerramento para permitir a mesma jornada no Windows. Não há rota administrativa de testes, relógio falso ou chamada direta ao gerador nesses novos casos.

Google é a única integração externa de identidade: a suíte anterior usa tokens RS256 assinados com chaves controladas e o verificador real. O novo caso de indisponibilidade substitui somente a obtenção externa de chaves e passa pela rota HTTP. Isso não comprova login em navegador com uma conta Google real.

Testes antigos que exercitam serviços diretamente, calendário ou erros com colaboradores simulados continuam na regressão como **cobertura complementar**. Não são apresentados como request specs. Não foram removidos nem enfraquecidos. Não há checkout, gateway, webhooks, envio de e-mail, carga ou E2E de navegador nesta entrega.

## Especificação aprovada e rastreabilidade

Os títulos abaixo representam os `describe`; as frases “quando…, então…” representam os comportamentos dos `it`. Um mesmo teste existente pode cobrir mais de uma frase. As referências indicam o arquivo e, quando necessário, o título do cenário reutilizado. O resultado é registrado separadamente da existência do teste.

Os nomes abreviados das suítes correspondem a `testes/<nome>.test.ts`. Por exemplo, `request-financeiro` aponta para [request-financeiro.test.ts](../testes/request-financeiro.test.ts) e `migration` para [migration.test.ts](../testes/migration.test.ts). Os auxiliares novos ficam em `testes/auxiliares/`; somente preparam HTTP, fixtures e processos, sem substituir regras do domínio.

### Cadastro, autenticação e sessão

Rotas: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/me`.

| ID | Comportamento esperado | Testes |
| --- | --- | --- |
| A01 | Quando o cadastro é válido, então cria NORMAL e retorna sessão, sem república automática. | `request-identidade`, `migration`: cadastro independente |
| A02 | Quando o cliente envia privilégios ou campos inválidos, então retorna 400 sem criar conta. | `request-identidade`: campos ou privilégios inválidos |
| A03 | Quando dois cadastros usam o mesmo e-mail, então existe apenas uma conta; respostas 201 e 409. | `request-identidade`: cadastros concorrentes |
| A04 | Quando a senha está correta, então permite consultar o próprio perfil. | `request-identidade`, `jornadas-integracao`: cadastro, login e perfil |
| A05 | Quando e-mail ou senha são incorretos, então retorna 401 sem revelar qual existe. | `migration`: cadastro independente; `jornadas-integracao`: limite real de autenticação |
| A06 | Quando a conta está bloqueada ou excluída, então impede login por senha. | `request-identidade`: conta bloqueada ou excluída |
| A07 | Quando o token falta, é adulterado ou expirou, então rejeita operações privadas. | `request-identidade`: token ausente, adulterado ou expirado |
| A08 | Quando ocorre logout, então revoga também a segunda sessão da conta; resposta 204 sem corpo. | `request-identidade`: logout e segunda sessão |
| A09 | Quando o limite de autenticação é excedido, então retorna 429 com orientação de espera. | `google`: limitadores; `frontend-compat-db`: alternar namespaces |

### Google e vinculação

Rotas: `/api/auth/metodos`, `/api/auth/google/desafio`, `/api/auth/google` e confirmação em `DELETE /api/me`.

| ID | Comportamento esperado | Testes |
| --- | --- | --- |
| G01 | Quando o primeiro Google é válido, então cria uma única conta NORMAL sem senha local. | `google`: cria NORMAL sem senha |
| G02 | Quando retorna com o mesmo sub, então usa a mesma conta e preserva vínculos, perfil e histórico. | `google`: retorno; e-mail existente e transferência |
| G03 | Quando o e-mail já tem senha, então exige confirmação; senha incorreta não vincula. | `google`: e-mail existente exige senha |
| G04 | Quando assinatura, emissor, destinatário, validade ou e-mail verificado são inválidos, então rejeita. | `google`: rejeita assinatura, validade, público e emissor |
| G05 | Quando nonce, cookie, origem, finalidade ou expiração divergem, então rejeita o desafio. | `google`: rejeita origem, cookie, nonce e finalidade |
| G06 | Quando reutiliza um desafio ou disputa seu consumo, então apenas um uso é aceito. | `google`: concorrência e uso único |
| G07 | Quando primeiros acessos ou vinculações concorrem, então não duplica contas nem identidades. | `google`: concorrência e vinculação concorrente |
| G08 | Quando já existe outra identidade, então retorna conflito sem fusão automática. | `google`: e-mail existente exige senha |
| G09 | Quando a conta está bloqueada ou excluída, então Google não a reativa. | `google`: bloqueio e exclusão |
| G10 | Quando a obtenção externa de chaves falha, então HTTP retorna 503 sem consumir desafio nem criar conta ou expor segredos. | `request-google` |
| G11 | Quando Google não está configurado, então login por senha continua disponível. | `google`: sem configuração |

### Perfil e exclusão lógica

Rotas: `GET/PATCH/DELETE /api/me`.

| ID | Comportamento esperado | Testes |
| --- | --- | --- |
| P01 | Quando altera o nome válido, então muda somente o próprio perfil; IDs, e-mail e privilégios injetados são rejeitados. | `request-identidade`: alteração de nome |
| P02 | Quando confirma exclusão sem dívida nem administração, então encerra a conta, preserva registros e revoga acesso. | `migration`: exclusão lógica; `jornadas-integracao`: exclusão lógica |
| P03 | Quando senha ou confirmação Google são inválidas, então preserva a conta. | `migration`: exclusão lógica; `google`: exclusão exige Google próprio |
| P04 | Quando há dívida atual ou antiga, então impede exclusão. | `request-financeiro`: dívida antiga; `google`: conta com dívida após saída |
| P05 | Quando ainda administra uma casa, então exige transferência antes da exclusão. | `migration`: exclusão bloqueia administração; `google`: restrição de administração |
| P06 | Quando é o último MASTER, então impede exclusão. | `migration`: último MASTER; `google`: último MASTER |
| P07 | Quando exclusão e nova dívida concorrem, então não deixa conta excluída com dívida. | `migration`: excluir conta concorrente com nova dívida |
| P08 | Quando a conta é excluída, então conserva pagamentos/comprovantes e impede reativação pela API. | `migration`: exclusão lógica preserva pagamento |

### Vínculos e administração da república

Rotas: `/api/republicas/*`, `/api/membros`, `/api/membros/{id}`.

| ID | Comportamento esperado | Testes |
| --- | --- | --- |
| R01 | Quando cria uma casa sem vínculo atual, então vira administrador e recebe código. | `request-identidade`; `migration`: entrada por código |
| R02 | Quando criações ou entradas concorrem, então mantém uma casa criada e no máximo um vínculo ativo. | `request-identidade`: duas criações; duas entradas |
| R03 | Quando o código é válido, então vincula à casa correta. | `jornadas-integracao`: entrada e moradores |
| R04 | Quando o código é inválido ou a casa está bloqueada, então não cria vínculo. | `request-identidade`: código inválido ou casa bloqueada |
| R05 | Quando a troca é inválida, então reverte a saída e preserva o vínculo anterior. | `request-identidade`; `jornadas-integracao`: troca inválida |
| R06 | Quando sai ou troca, então mantém histórico e dívidas, sem acesso às operações da casa antiga. | `request-financeiro`: dívida antiga; `migration`: troca com dívida |
| R07 | Quando o administrador tenta sair ou ser desativado, então exige transferência. | `migration`: exclusão bloqueia administração; `jornadas-integracao`: transferência |
| R08 | Quando transfere administração, então atualiza os poderes de ambos sem novo login. | `jornadas-integracao`: transferência atualiza perfis |
| R09 | Quando o substituto é externo ou inativo, então retorna 404. | `migration`: transferência externa; `request-identidade`: substituto inativo |
| R10 | Quando transferência e desativação concorrem, então preserva administrador com vínculo ativo. | `request-identidade`: transferência concorrente |
| R11 | Quando NORMAL tenta editar casa, desativar vínculo ou consultar inativos, então retorna 403. | `request-identidade`; `jornadas-integracao`; `frontend-compat-db` |
| R12 | Quando consulta moradores, então lista e contagem ficam restritas ao contexto autorizado. | `migration`: paginação; `jornadas-integracao`: moradores paginados |

### Despesas, centavos e edição

Rotas: `/api/despesas`, `/api/despesas/{id}`.

| ID | Comportamento esperado | Testes |
| --- | --- | --- |
| D01 | Quando cria despesa válida como administrador, então grava conta e parcelas juntas. | `request-financeiro`: divisão por três |
| D02 | Quando divide 100,00 por três, então gera 33,34 + 33,33 + 33,33. | `request-financeiro`: divisão por três |
| D03 | Quando o valor é zero, negativo, excessivo ou inválido, então retorna 400 sem escrita. | `request-financeiro`: valor ou participantes inválidos; **BUG-03 para vírgula** |
| D04 | Quando a seleção é vazia, duplicada, externa, inativa ou não permite um centavo por pessoa, então rejeita sem escrita. | `request-financeiro`: entradas inválidas, subcasos independentes |
| D05 | Quando NORMAL tenta criar ou editar, então retorna 403. | `request-financeiro`; `migration`: edição antes/depois do pagamento |
| D06 | Quando ainda não há pagamento, então pode recalcular valor/participantes sem perder centavos. | `migration`: edição antes/depois do pagamento |
| D07 | Quando existe pagamento, então bloqueia valor/participantes e permite metadados autorizados. | `request-financeiro`: parcela paga e conta pendente |
| D08 | Quando edição e pagamento concorrem, então mantém total, parcela e histórico consistentes. | `migration`: pagamento concorrente com edição |
| D09 | Quando PostgreSQL rejeita uma parcela, então reverte também a despesa do POST. | `request-financeiro`: constraint real rejeita rateios |
| D10 | Quando pertence a outra casa, então consulta/edição retornam 404. Moradores da própria casa podem consultar a conta compartilhada. | `request-financeiro`; `migration`: edição e isolamento |

### Pagamentos manuais e idempotência

Rota: `POST /api/pagamentos`. Não processa dinheiro externamente.

| ID | Comportamento esperado | Testes |
| --- | --- | --- |
| F01 | Quando paga parcialmente a própria parcela, então abate o saldo imediatamente; 60,00 − 25,00 = 35,00. | `request-financeiro`: parcela de 60,00 |
| F02 | Quando paga o restante, então quita a parcela; a casa continua pendente se outras parcelas estão abertas. | `request-financeiro`: parcela paga e conta pendente |
| F03 | Quando o pagamento é zero, negativo ou sem chave válida, então retorna 400 sem movimentação. | `request-financeiro`: pagamento inválido |
| F04 | Quando excede o saldo, então retorna 409 sem movimentação. | `request-financeiro`: pagamento inválido |
| F05 | Quando repete chave/dados/arquivo, inclusive simultaneamente, então retorna o mesmo pagamento. | `request-financeiro`: parcial e comprovante simultâneos |
| F06 | Quando muda dados ou arquivo com a mesma chave, então retorna 409. | `request-financeiro`: parcial e comprovante simultâneos |
| F07 | Quando chaves distintas disputam saldo insuficiente para ambas, então respostas são 201/409 e a dívida não é ultrapassada. | `request-financeiro`: duas chaves disputam saldo |
| F08 | Quando tenta pagar parcela alheia, inclusive ADMIN ou MASTER, então retorna 404. | `request-financeiro`: pagamento inválido ou alheio |
| F09 | Quando a parcela é própria de vínculo anterior, então permite pagar mantendo o histórico. | `request-financeiro`: dívida antiga |
| F10 | Quando a república está bloqueada, então retorna 403 sem alterar saldo. | `request-financeiro`: república bloqueada |

### Comprovantes

Rotas: pagamento multipart e `/api/pagamentos/{id}/comprovante`.

| ID | Comportamento esperado | Testes |
| --- | --- | --- |
| C01 | Quando envia PDF válido, então grava pagamento e bytes juntos; rejeição real do comprovante reverte ambos e o saldo. | `request-financeiro`: comprovante simultâneo; PostgreSQL rejeita comprovante |
| C02 | Quando o arquivo é vazio, falso, GIF não permitido ou maior que 5 MiB, então rejeita sem pagamento. | `request-financeiro`: arquivo vazio, falso ou excessivo |
| C03 | Quando PDF tem exatamente 5 MiB, então aceita. | `request-financeiro`: exatamente 5 MiB |
| C04 | Quando a sessão é inválida, então retorna 401 antes de analisar o arquivo inválido. | `request-financeiro`: revogação antes do upload |
| C05 | Quando dois uploads reais aguardam conteúdo, então terceiro recebe 429/Retry-After; ao desconectar, libera vagas. | `request-financeiro`: dois uploads reais |
| C06 | Quando proprietário, administrador da origem ou MASTER baixa, então recebe MIME, tamanho, headers e bytes originais. | `request-financeiro`: comprovante simultâneo |
| C07 | Quando pessoa sem permissão tenta baixar, então retorna 404. | `request-financeiro`: comprovante simultâneo |
| C08 | Quando muda vínculo, administração ou ocorre exclusão, então conserva o arquivo e aplica a autorização atual. | `request-financeiro`: transfere administração, sai e exclui; `request-recorrencias`: reinício |
| C09 | Quando retorna JSON financeiro, então expõe somente URL protegida/metadados públicos, sem bytes ou caminhos físicos. | `request-financeiro`: comprovante simultâneo; `migration`: headers e URLs públicas |

### Recorrências e competências

Rotas: `/api/recorrencias`, detalhes, competências e revisão. Geração é trabalho do processo, não uma rota.

| ID | Comportamento esperado | Testes |
| --- | --- | --- |
| E01 | Quando cria para o mês atual válido, então gera uma despesa e rateios exatos. | `request-recorrencias`: criação atual simultânea |
| E02 | Quando o início é futuro, então não antecipa cobrança; início passado ou inválido retorna 400. | `request-recorrencias`: início futuro/passado |
| E03 | Quando o vencimento atual já passou, então retorna 400. | `request-recorrencias`: início inválido; ver limite temporal abaixo |
| E04 | Quando repete ou disputa criação com a mesma chave, então não duplica; dados diferentes retornam 409. | `request-recorrencias`: criação atual simultânea |
| E05 | Quando edita configuração, então a nova vigência é futura e a conta gerada não muda. | `request-recorrencias`: edição/desativação |
| E06 | Quando desativa, então preserva contas, parcelas e registros anteriores. | `request-recorrencias`: edição/desativação; `financeiro-evolucao-db`: preservação histórica complementar |
| E07 | Quando entra morador novo, então não entra automaticamente nos participantes. | `request-recorrencias`: ciclo real de um minuto |
| E08 | Quando um participante fica inativo, então pausa sem redistribuir; outra recorrência válida continua. | `request-recorrencias`: ciclo real de um minuto |
| E09 | Quando retorna após interrupção, então sinaliza mês antigo sem cobrança e gera o mês atual válido. | `request-recorrencias`: retorno após interrupção |
| E10 | Quando revisa competência pendente, inclusive repetidamente, então não cria cobrança nem altera saldos. | `request-recorrencias`: retorno após interrupção |
| E11 | Quando há transferência, então a geração usa o administrador atual; antigo administrador perde revisão. | `request-recorrencias`: retorno após interrupção |
| E12 | Quando duas instâncias ou reinício geram a mesma competência, então há uma despesa, sem duplicar pagamento/comprovante. | `request-recorrencias`: duas instâncias e reinício |
| E13 | Quando não tem permissão ou pertence a outra casa, então não administra a recorrência. | `request-recorrencias`: edição/desativação |
| E14 | Quando transforma avulsa em recorrência futura, então preserva a original sem duplicá-la. | `request-recorrencias`: conta avulsa |

### Resumo, vencimentos e histórico

Rotas: `/api/dashboard`, `/api/me/financeiro`, `/api/me/financeiro/resumo` e filtros de `/api/despesas`.

| ID | Comportamento esperado | Testes |
| --- | --- | --- |
| S01 | Quando consulta uma parcela de 60,00 com 25,00 pagos, então saldo é 35,00. | `request-recorrencias`: mês de vencimento |
| S02 | Quando seleciona competência, então usa vencimento; pagamento de outro mês continua abatendo a mesma conta. | `request-recorrencias`: mês de vencimento |
| S03 | Quando filtra situação, competência e paginação, então registros e contagem correspondem ao conjunto autorizado. | `request-recorrencias`: vencimentos e paginação; `migration`: paginação |
| S04 | Quando a parcela está paga e a casa pendente, então distingue PESSOAL de CASA. | `request-recorrencias`: mês de vencimento |
| S05 | Quando vence ontem, hoje, em sete ou oito dias, então aplica os quatro avisos e a janela inclusiva correta. | `request-recorrencias`: vencimentos e paginação |
| S06 | Quando sai/troca de casa, então conserva somente o próprio histórico; ID pessoal alheio retorna 404. | `request-recorrencias`: mês de vencimento; `migration`: troca com dívida |
| S07 | Quando consulta o painel mensal, então separa pagamentos realizados no mês e saldo pessoal, inclusive nas fronteiras de Brasília. | `migration`: edição e limites mensais; dashboard com ex-moradores |

### Tarefas

Rotas: `/api/tarefas` e `/api/tarefas/{id}`.

| ID | Comportamento esperado | Testes |
| --- | --- | --- |
| T01 | Quando administrador cria tarefa para membro ativo da casa, então grava e lista. | `request-identidade`: conclusão e edição |
| T02 | Quando responsável é externo ou inativo, então retorna 400 sem alterar a tarefa. | `request-identidade`: administrador edita tarefa; `jornadas-integracao`: tarefas |
| T03 | Quando o responsável conclui sua tarefa ou repete a conclusão, então mantém uma tarefa concluída. | `request-identidade`: repete conclusão |
| T04 | Quando tenta concluir tarefa alheia, então retorna 403; outra casa retorna 404. | `request-identidade`: repete conclusão |
| T05 | Quando NORMAL tenta criar ou editar conteúdo administrativo, então retorna 403. | `migration`: responsável conclui tarefas; `jornadas-integracao`: tarefas |
| T06 | Quando administrador edita título, responsável e prazo, então persiste corretamente. | `request-identidade`: administrador edita tarefa |

### MASTER, paginação e compatibilidade

Rotas: `/api/master/*` e `/api/front/v1/*`.

| ID | Comportamento esperado | Testes |
| --- | --- | --- |
| M01 | Quando MASTER consulta diretórios e contexto explícito, então recebe dados autorizados/paginados. | `migration`: MASTER global e paginação; `frontend-compat-db` |
| M02 | Quando NORMAL/ADMIN acessa famílias MASTER, então retorna 403 sem alterações. | `migration`: todas as famílias MASTER; `frontend-compat-db` |
| M03 | Quando bloqueia/desbloqueia usuário, então sessões antigas continuam inválidas. | `jornadas-integracao`: bloqueia e recupera acesso |
| M04 | Quando bloqueia casa, então impede operações protegidas. | `request-financeiro`: república bloqueada; `migration`: MASTER global |
| M05 | Quando bloqueia o último MASTER, inclusive concorrentemente, então mantém um ativo. | `migration`: último MASTER e bloqueios concorrentes |
| H01 | Quando pagina, então ordenação/totais são estáveis e restritos ao contexto; página vazia retorna 200. | `migration`: paginação; `request-recorrencias`: filtros |
| H02 | Quando parâmetros são inválidos, então retorna 400. | `request-recorrencias`: filtros; `jornadas-integracao`: página inválida |
| H03 | Quando alterna namespaces, então não contorna autenticação, autorização ou idempotência financeira. | `frontend-compat-db`; `request-recorrencias`: compatibilidade |
| H04 | Quando retorna 204, então não há corpo; erros preservam envelope, requestId e privacidade. | `request-spec`/`contrato` compartilhados; `request-google`; `integracao-http` complementar |

### Criação intencional e reenvio — nova expectativa aprovada

Rotas: `POST /api/despesas` e `POST /api/tarefas`. Testes: `request-idempotencia.test.ts`.

| ID | Comportamento esperado | Situação |
| --- | --- | --- |
| I01 | Quando repete a mesma chave/dados, então devolve o mesmo ID e mantém um registro. | Falha preservada, BUG-01/02 |
| I02 | Quando envia simultaneamente a mesma chave/dados, então grava um registro. | Falha preservada, BUG-01/02 |
| I03 | Quando muda dados usando a mesma chave, então retorna 409 sem nova gravação. | Falha preservada, BUG-01/02 |
| I04 | Quando usa chave nova com dados iguais, então cria outro registro intencionalmente. | Coberto nas duas rotas |

## Limites da evidência

- Fevereiro, ano bissexto e viradas específicas são cobertos pelos testes existentes de calendário e de banco com data controlada. Os novos processos reais conferem o calendário do mês efetivo, incluindo o ajuste do dia 31, sem apresentar os casos de calendário como request specs.
- No primeiro dia do mês, não existe um vencimento anterior dentro do próprio mês. O subcaso de vencimento atual já passado só pode ser observado do segundo dia em diante; isso não é simulado nem tratado como prova de execução naquele dia. A evidência desta entrega foi obtida em 18/11/2026.
- Casos positivos de MIME nesta ampliação usam PDF; GIF/falso/vazio/excesso são rejeições reais. A aceitação individual de PNG/JPEG/WEBP pelo HTTP permanece uma ampliação identificada, sem alegar que um PDF valida todos os formatos.
- Os testes preservados de concorrência financeira verificam os resultados válidos associados à ordem das transações. Não se aceita um 500 ou 503 arbitrário para esconder conflito de integridade.
- Cancelamento visual do Google e telas reais dependem de navegador/provedor e não fazem parte desta cobertura HTTP. Nenhum E2E novo foi autorizado ou executado.
- Resultado remoto não foi executado. Ao publicar futuramente, as falhas preservadas também deverão impedir aprovação da verificação; não devem receber skip para liberar CI.

## Bugs e conclusão

Resultado local final em **18/11/2026**: **209 testes, 201 aprovados, 8 falhas, nenhum ignorado ou cancelado**. A regressão anterior de 151 testes permaneceu aprovada. A ampliação acrescentou 58 testes contabilizados no TAP, incluindo o agrupador; 50 passaram. Build, tipagem, contrato e tipos passaram. A API compilada gerou no ciclo real de um minuto, reiniciou sem duplicação e preservou comprovantes. Os schemas temporários foram removidos e os volumes preservados.

Consulte [BUGS_REQUEST_SPECS.md](BUGS_REQUEST_SPECS.md). A existência e execução da cobertura não significam aprovação do backend. Correções do produto precisam de uma etapa própria, preservando esses testes como regressão.
