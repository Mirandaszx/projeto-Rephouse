# Revisão estrutural e refatoração segura

## Escopo e diagnóstico

Inspeção do checkout local, aplicação 2.2.0. Foram analisados 122 arquivos TypeScript/TSX próprios em `codigo/` e `interface/codigo/`, excluindo código gerado e diretórios de bibliotecas `vendor`/`spell`. A análise dos imports relativos de execução e imports dinâmicos com caminho literal não encontrou ciclos nesse conjunto. Isso não analisa o funcionamento interno das dependências nem substitui testes.

O projeto já é um monólito modular em camadas. Não é necessário trocar arquitetura, instalar bibliotecas ou criar uma camada intermediária para cada chamada. O problema principal está em telas que acumulam carregamento, eventos, formulários e JSX, além de consultas Prisma ainda dentro de alguns serviços.

Medidas anteriores à primeira extração (linhas físicas, não medida de complexidade):

| Arquivo | Linhas | Concentração observada | Prioridade |
| --- | ---: | --- | --- |
| `interface/codigo/novo/Republica.tsx` | 326 | 18 estados, carregamento de cinco recursos, navegação, onboarding, despesas e pagamentos | 1 |
| `interface/codigo/rebuild/Admin.tsx` | 187 | diretório, tabela, filtros, paginação, indicadores, consultas e bloqueios | 3 |
| `interface/codigo/novo/Tasks.tsx` | 174 | 10 estados, carregamento, criação, conclusão, edição e renderização | 3 |
| `codigo/modulos/financeiro/recorrencias.service.ts` | 172 | configuração, geração, consultas, autorização e ciclo agendado | 2 |
| `codigo/modulos/financeiro/financeiro.service.ts` | 145 | despesas, edição, pagamentos, consultas e autorização do comprovante | 2 |
| `interface/codigo/interno/workspace.css` | 424 | estilo comum, páginas e correções de cascata em um mesmo arquivo | 4 |
| `codigo/contratos/openapi.ts` | 274 | composição de contrato de vários módulos | 4 |
| `codigo/comandos/verificar-devops.ts` | 242 | roteiro operacional opcional; não é fluxo diário do produto | 5 |

Arquivos pequenos como `api.ts` (77 linhas), `auth.service.ts` (95) e `republicas.service.ts` (76) não precisam ser divididos apenas pelo número de responsabilidades. Há módulos coesos que devem continuar juntos. Também existem linhas de JSX longas; reduzir linhas sem separar responsabilidades não resolve isso.

## Mapeamento das camadas

**A — UI:** renderização, interação, foco, carregamento, estado de tela e navegação. **B — negócio:** cálculos, validações e decisões. **C — dados/integração:** HTTP, Prisma, PostgreSQL, arquivos, Docker e provedores. Um trecho pode coordenar mais de uma camada; é justamente onde a separação precisa de cuidado.

### Republica.tsx — primeiro alvo

| Função ou trecho atual | Camada | Destino e cuidado |
| --- | --- | --- |
| `pages`, `initials` | A | navegação e apresentação; não autorizam operações |
| `remaining` | B de apresentação | mantém cálculo atual em centavos nesta etapa; não substitui saldo autorizado pelo backend |
| `expired` | A + C | preserva a regra atual de tratar 401, remover sessão e redirecionar; sem unificar com outras regras de erro |
| `Dashboard`, `Home` | C / dados da tela | próximos ao hook de carregamento; mesmos campos e tipos |
| `Republica` e seleção da página | A | mantém export default, rotas, estados de interação e composição |
| `load` dentro do `useEffect` | C + A | hook `useRepublicaData`; mesma ordem de chamadas, `Promise.all`, dependências e descarte de resposta antiga |
| `refresh` | A | acompanha o hook; mantém loading, limpeza do erro e incremento da revisão |
| `open` | A | permanece com o diálogo: limpeza de campos, chave, arquivo e foco |
| `save` | A + B + C | permanece inicialmente: bloquear envio, montar dados, chamar pagamento/despesa/recorrência e fechar somente após sucesso |
| `enterHouse` | A + B + C | preserva trim/uppercase, POST, remoção de `acao` da URL e atualização da conta |
| `logout` | A + C | preserva revogação pela API antes de remover a sessão local |
| estados de carregamento/erro/conta/MASTER | A | continuam compondo a página nas mesmas condições |
| onboarding de criação/entrada | A | candidato posterior a tela própria, preservando o estado ao alternar opções |
| sidebar e dock móvel | A | `RepublicNavigation`, sem mudar nós DOM, classes, links ou atributos de acessibilidade |
| listas, `paid`, permissões de botões | A + B de apresentação | permanecem por enquanto; autorização real continua na API |
| diálogo de despesa/pagamento | A + B + C | extração posterior deve levar estado e handlers juntos; evitar componente com dezenas de parâmetros |

### Administração MASTER

| Função ou trecho | Camada | Proposta posterior |
| --- | --- | --- |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardFooter` | A | manter como um conjunto; preservar atribuição/licença do código adaptado |
| `SectionCards` | A + B de apresentação | indicadores em arquivo próprio, sem fabricar métricas nem alterar os cálculos atuais |
| `normalize` | B de apresentação | normalização da busca, junto do diretório |
| `Directory`, `getRowId`, `firstPage`, filtros e paginação | A + B de apresentação | um módulo de diretório; preservar reset da página e comportamento vazio |
| `Admin`, effect de consultas e confirmação de bloqueio | A + C | separar carregamento de apresentação; mesma autorização e PATCH atual |

### Tarefas

| Função ou trecho | Camada | Proposta posterior |
| --- | --- | --- |
| `Tasks`, filtros, responsáveis, prazo e JSX | A | página e lista; não duplicar autorização do backend |
| effect de carregamento | C + A | hook próprio, preservando a atualização após edição e sessão expirada |
| `changeStatus` | A + C | manter bloqueio, PATCH, atualização local e mensagem como uma operação |
| `createTask` | A + B + C | levar formulário e envio juntos; manter validações atuais e limpeza após sucesso |
| callback de edição | A + C | extrair com o diálogo, sem alterar null/vazio nos campos |

### Financeiro do backend

| Função ou trecho | Camada | Proposta posterior |
| --- | --- | --- |
| `validarSelecao`, `parcelasValidas` | B + consulta C | validação de participantes e rateio; não unificar mensagens diferentes sem decisão funcional |
| `criarDespesaComRateio` | B coordenando C | preservar função pública e atomicidade de despesa + rateios |
| `registrarPagamento`, `pagar` | B coordenando C | operação de pagamento coesa; preservar chave/hash, saldo, transação e imutabilidade |
| `createFinanceiroService.create`, `edit` | B coordenando C | despesas; manter recriação dos rateios na mesma transação |
| `list`, `detail`, `personal`, `personalSummary` | C + autorização B | consultas do módulo; reutilizar o repositório já existente |
| `pay` | B coordenando C | autorização, hash e disputa de chave; não alterar idempotência durante refatoração |
| `receipt` | B + C | autorizar antes de consultar bytes; não separar as duas consultas em transações diferentes |
| `selection` de recorrência | B + C | mesma seleção vigente e mesmas mensagens |
| `materializeRecurring` | B coordenando C | geração por competência; módulo próprio com a transação recebida, sem abrir outra |
| `authorized` | B + C | autorização da recorrência e escopo da república |
| `createRecorrenciasService.list`, `detail`, `occurrences` | C + B | mover Prisma para o repositório sem perder filtros/contagem/ordenação |
| `create`, `edit`, `review` de recorrência | B coordenando C | configuração e revisão; manter snapshots, vigências, idempotência e respostas |
| `processRecurringBatch` | B + C | um item por transação; preservar lotes e independência entre recorrências |
| `startRecurringScheduler` | infraestrutura C | inicialização, timer e parada; separar da configuração sem mudar o ciclo de um minuto |

## Dependências, duplicações e estado compartilhado

- `Republica` busca `/me`, depois casa/dashboard/despesas/membros em paralelo, e distribui os resultados para várias telas. Navegação, filtros e atualização financeira invalidam o mesmo carregamento. Uma extração deve preservar o descarte das respostas de uma página anterior.
- O mesmo `submitting` bloqueia o diálogo financeiro e o onboarding. Dividir os estados sem examinar essa trava pode permitir dois envios ou fechar um formulário durante a gravação.
- `remaining` usa centavos; `gestao/types.ts:balance` retorna reais. A fórmula se parece, mas as unidades diferem por 100. Não substituir uma pela outra de forma mecânica.
- Situação financeira vem prioritariamente do backend, com fallback de apresentação em `financialState`. Unificar cálculos exige testes de data e de pagamento parcial; não mover a autoridade financeira para o navegador.
- O erro 401 é tratado tanto no cliente HTTP quanto em `Republica.expired`. Os comportamentos não são idênticos: o cliente distingue senha incorreta de sessão inválida. Uma refatoração não deve ampliar logout silenciosamente.
- Sessão em `sessionStorage`, navegação por `window.history`, listeners de aparência e preferências de tema são efeitos compartilhados. Não introduzir store global para resolver uma extração local.
- `workspace.css`, `republica.css` e `appearance.css` se sobrepõem. Há teste específico de ordem de carregamento. Separar CSS sem preservar especificidade e ordem pode reproduzir o defeito de largura do perfil/financeiro.
- O financeiro já tem repositories; recorrências ainda faz várias consultas Prisma diretamente no service. Mover essas consultas é útil, desde que use a mesma transação e os mesmos locks.
- `recorrencias.repository.ts` também serializa a resposta pública (`recurringPublic`). A serialização é candidata a arquivo próprio, mas não precisa virar uma abstração genérica.
- `Expense` e `Share` ainda são exportados pela tela `Overview`. O hook mantém esse import somente de tipo para não alterar a interface atual; a extração posterior desses tipos deve preservar os exports de `Overview` por reexportação e evitar que a camada de dados dependa da definição de uma tela.
- `/legado` e `/design-system` ainda são rotas reais. Código antigo não deve ser apagado por parecer duplicado. A revisão não considera `vendor`, `spell`, Prisma gerado ou tipos OpenAPI como alvos de extração manual.

## Estrutura incremental proposta

```text
interface/codigo/novo/
  Republica.tsx                       # export default e composição preservados
  republica/
    useRepublicaData.ts               # primeira extração: carregamento e atualização
    RepublicNavigation.tsx            # segunda extração: lateral e dock existentes
    navigation.ts                     # mesmos links e iniciais, compartilhados pela composição
    # etapas futuras, quando estado e diálogo puderem andar juntos:
    # HouseOnboarding.tsx
    # ExpenseDialog.tsx
interface/codigo/rebuild/
  Admin.tsx
  # futuro: admin/Directory.tsx, admin/SectionCards.tsx, admin/useAdminData.ts
interface/codigo/novo/
  Tasks.tsx
  # futuro: tarefas/TaskList.tsx, tarefas/TaskDialog.tsx, tarefas/useTasks.ts
codigo/modulos/financeiro/
  financeiro.service.ts               # interface pública preservada
  financeiro.repository.ts
  recorrencias.service.ts             # interface pública preservada
  recorrencias.repository.ts
  # futuro: recorrencias.geracao.ts, recorrencias.agendador.ts,
  #         recorrencias.presentation.ts
```

Os nomes públicos existentes continuam. Nas extrações futuras do backend, o arquivo original poderá reexportar funções como `materializeRecurring`, `processRecurringBatch` e `startRecurringScheduler`; os consumidores não precisarão mudar junto.

## Passos e testes

1. **Base anterior:** executar os testes existentes de navegação, identidade interna e gestão, com API real e schema exclusivo em `127.0.0.1:5544/rabbu_mvp_test`. Esses testes já cobrem a interface pública afetada; não criar testes privados do hook apenas para espelhar a implementação.
2. **Carregamento:** mover somente tipos de dados da tela, `expired`, effect e `refresh` para `useRepublicaData`. Preservar a ordem e as URLs das requisições, dependências, tratamento de erro e limpeza. Rodar tipagem, lint e a mesma seleção de testes.
3. **Navegação:** mover somente configuração dos links, iniciais, lateral e dock. Manter a estrutura DOM, classes, títulos e callbacks. Repetir os testes e executar a verificação completa da interface.
4. **Próxima rodada:** separar o agendador/geração das recorrências, um movimento por vez, com testes HTTP + processo real da API e PostgreSQL. Não misturar esse trabalho com correções de idempotência ou de validação monetária.
5. **Depois:** tarefas e diretório MASTER, uma tela por vez. Se faltar cobertura de um comportamento, caracterizá-lo pela tela/HTTP antes de mover o trecho. Um defeito existente não será transformado em requisito esperado: registrar o comportamento observado separadamente dos testes que já exigem sua correção.
6. **CSS/contrato:** somente após as extrações funcionais, com comparação de capturas e hashes do contrato. Sem trocar tokens, seletores, bibliotecas ou aparência nesta rodada.

As jornadas já existentes de pagamento, comprovante, transferência e MASTER permanecem na regressão. Os oito testes de backend que reproduzem os três defeitos conhecidos não serão apagados, ignorados ou alterados para permitir a refatoração. O último resultado registrado antes desta rodada foi 267 testes, 259 aprovados e oito falhas; é evidência histórica até uma nova execução.

Nenhuma migration, alteração de banco da equipe, dependência nova, commit ou push faz parte desta refatoração. Os resultados desta rodada serão registrados abaixo, separados das evidências anteriores.

## Resultados desta rodada

| Passo | Verificação executada | Resultado |
| --- | --- | --- |
| Base antes da extração | Playwright: `navegacao-fluida.spec.ts modernizacao.spec.ts gestao.spec.ts` | 17 aprovados, zero falhas/ignorados |
| Extração de carregamento | Tipagem, lint e a mesma seleção de Playwright | 17 aprovados, zero falhas/ignorados; tipagem aprovada; lint sem erros |
| Extração de navegação | `npm --prefix interface run verificar` | Build/tipagem aprovados; lint sem erros; 66 testes aprovados e uma falha preexistente, zero ignorados |
| Comparação estática | Parâmetros/corpos de `expired`, `load`, `refresh`, `open`, `save`, `enterHouse`, `logout`; expressões de `remaining`, `pages`, `initials`; callback e dependências do effect | Iguais ao original de HEAD, exceto pela localização; 18 estados preservados no total |

`Republica.tsx` passou de 326 para 264 linhas, com 14 estados locais de interação e quatro estados de carregamento movidos para o hook. Não houve alteração de regras, endereços HTTP, contrato, banco, tokens visuais ou CSS. A navegação extraída não adiciona wrappers HTML. Os formulários financeiros permanecem na composição atual até uma extração posterior com seu estado e seus handlers juntos.

O lint identifica cinco avisos de Fast Refresh em `main.tsx`, que não foi alterado nesta rodada. Não foram suprimidos. Os logs locais são `.devops-local/refatoracao-interface-antes.log`, `.devops-local/refatoracao-interface-dados.log` e `.devops-local/refatoracao-interface-final.log`. A conferência estática está em `.devops-local/refatoracao-equivalencia.json`; ela complementa os testes, não prova equivalência de todo comportamento possível.

### Falha encontrada na verificação completa

O teste `motion-superficies.spec.ts`, cenário de quadros intermediários de saída, falhou por timeout na linha 227: depois de capturar a imagem, o locator por papel já não encontra um diálogo visível. O teste usa relógio simulado. A causa exata ainda não foi estabelecida; não houve mudança da animação, do teste ou do timeout.

O caso foi repetido isoladamente duas vezes no código atual, com duas falhas. Um servidor Vite exclusivo de testes substituiu somente o módulo `Republica.tsx` pelo conteúdo original de HEAD em memória, mantendo o restante do ambiente. Foi conferido por HTTP que esse servidor realmente entregava o módulo original, sem o hook extraído e com a lateral original. O mesmo teste falhou duas vezes nesse controle, no mesmo ponto. O checkout e o servidor principal não foram revertidos.

Assim, esta falha já existia antes das extrações e fica registrada separadamente. As hipóteses verificadas foram: falha anterior (reproduzida no controle original), falha causada somente pela extração (não sustentada pelo controle) e falha exclusiva da carga da suíte (também ocorre isoladamente). Isso não determina ainda se a correção deve ser no teste ou na animação.

Reprodução sem alterar testes, após configurar a URL dedicada:

```powershell
$env:TEST_DATABASE_URL='postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test?schema=public'
npm --prefix interface run test:e2e -- motion-superficies.spec.ts
```

Não há aprovação integral da suíte: `verificar` retornou código 1. O [resultado estruturado](evidencias/refatoracao-segura.json) separa os 17 testes de cada passo, os 66 aprovados da suíte completa e a falha preexistente reproduzida. Health, readiness, login e o módulo atualizado no servidor principal responderam 200. Nenhum teste foi apagado, ignorado ou enfraquecido.
