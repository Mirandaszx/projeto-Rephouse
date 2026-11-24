# Data de término das contas recorrentes

O formulário de despesa oferece **Repetir mensalmente** e **Repetir até (opcional)**. O segundo campo recebe dia, mês e ano. A mesma opção aparece ao configurar repetições futuras de uma despesa avulsa e ao editar uma recorrência.

O término considera o **vencimento** de cada conta, de forma inclusiva. Por exemplo, uma conta que vence no dia 10 e repete até 10/03/2027 inclui março. Se o término for 09/03/2027, a última conta será fevereiro. Dias inexistentes continuam ajustados ao último dia válido do mês, inclusive 29 de fevereiro em anos bissextos.

Deixar o campo vazio mantém a repetição sem prazo. O término não altera despesas, rateios, pagamentos ou comprovantes já registrados. Também não cria uma dívida referente ao período posterior ao limite.

## Contrato e autorização

- `POST /api/recorrencias`: aceita `fim?: string | null` em `YYYY-MM-DD`. A data deve incluir pelo menos o primeiro vencimento. Omitir ou enviar `null` significa sem prazo.
- `PATCH /api/recorrencias/{id}`: omitir `fim` mantém o limite existente; `null` remove o limite. Alterar a data limita as próximas gerações, preservando as despesas existentes. A data não pode anteceder o início da recorrência.
- Respostas de criação, detalhe e listagem incluem `fim` como data civil ou `null`.
- Os adaptadores `/api/front/v1` e as rotas MASTER usam as mesmas regras, sem um segundo gerador ou uma regra própria de autorização.
- O período aceito vai de 1900 a 2199, compatível com o intervalo de competências. Datas inexistentes e valores inválidos recebem `400`; conflito de chave e conteúdo recebe `409`.
- O hash de criação inclui `fim` quando preenchido. Sem término, o cálculo mantém a forma anterior, preservando o reenvio com chaves já existentes. Usuário, sessão, casa e permissão continuam revalidados na transação.

## Geração e encerramento

A varredura existente continua na inicialização e a cada minuto, com bloqueio e transações Serializable. Antes de gerar uma conta ou marcar uma competência não gerada, compara o vencimento ajustado com o limite.

Ao processar o primeiro vencimento que ultrapassaria o limite, desativa a recorrência e não grava uma nova competência. Competências elegíveis anteriores à interrupção continuam sujeitas à revisão existente. Repetir o ciclo ou reiniciar a API não gera contas posteriores ao término.

Uma recorrência pode permanecer marcada como ativa entre a última conta gerada e a varredura da próxima competência; o limite continua visível e será respeitado. Para retomar uma recorrência já desativada, o administrador deve ajustar/remover o término e confirmar a opção de reativação. Remover o término isoladamente não reativa uma recorrência.

## Banco e reversão

A migration adicional `202611220001_recorrencia_data_fim` acrescenta somente `recorrencias_despesa.fim`, do tipo PostgreSQL `date`, opcional. Não modifica migrations anteriores nem atualiza registros históricos. O CHECK exige uma data finita, a partir do início da recorrência e até 31/12/2199.

As permissões de tabela já concedidas à conta limitada cobrem a coluna; não são concedidos novos privilégios. A preparação e a validação usam exclusivamente `rabbu_mvp_test`, em schemas descartáveis.

O arquivo `down.sql` recusa a reversão quando há algum término preenchido. Não apagar nem remover limites configurados para forçar a reversão. Nesse caso, preservar a coluna e usar uma versão compatível com o limite de cobrança. Mesmo sem limites em uso, parar a API antes de uma reversão e não iniciar código que dependa da coluna removida.

## Validação local e ativação

As novas verificações estão nas suítes oficiais:

- `testes/request-recorrencias.test.ts`: HTTP, PostgreSQL, concorrência, repetição, rejeições de entrada, autorização, adaptação MASTER/frontend, alteração e remoção do limite, calendário, reinício da API, preservação financeira e reversão protegida.
- `interface/testes-pr2/financeiro-evolucao.spec.ts`: criação e edição pela interface, persistência do término e remoção do limite, ajuda acessível, foco e capturas em 320, 390 e 1440 px nos temas claro/escuro.

Comandos: `npm run test:completo` e `npm --prefix interface run verificar`.

Resultados locais de 21/11/2026: **327 testes do backend aprovados**, sem falhas ou ignorados, com contrato e tipos sincronizados. Build, tipagem e lint da interface passaram (seis avisos Fast Refresh preexistentes). As seis jornadas financeiras do navegador passaram na repetição integral do arquivo, incluindo criação com data limite, remoção do limite na edição, pagamento parcial e os dois temas. Foram registradas seis novas capturas em `.devops-local/interface/imagens/recorrencia-fim-2026-11-21/` e inspecionadas as versões de 320 px escura e 1440 px clara.

A execução completa da interface encontrou a falha antiga de animação em `motion-superficies.spec.ts:230` e um seletor incorreto no novo teste. O seletor foi corrigido para o nome real do botão, sem alterar o comportamento esperado. Os três casos seguintes da jornada serial, inicialmente não executados, passaram na repetição do arquivo. A consolidação por cenário resulta em **90 aprovados e uma falha conhecida**; não representa uma única execução integral aprovada. Nenhum teste foi removido ou enfraquecido. O detector Impeccable não apontou ocorrências nos dois componentes financeiros revisados.

O [registro completo desta alteração](evidencias/recorrencia-data-fim-2026-11-21.json) separa as tentativas, a regressão final do backend, a execução completa da interface e a repetição das jornadas financeiras.

**Ativada no banco principal local em 21/11/2026**, após autorização explícita do usuário. O backup formato 2 está em `copias-seguranca/2026-11-22T00-42-41-742Z-antes-recorrencia-fim-2161e87c/`, com hash e catálogo conferidos. A data no nome da pasta é UTC; a operação ocorreu em 21/11 no horário local. Não foi executada uma restauração.

O banco `rabbu_mvp` passou de 24 para **25 migrations, sem pendências**. A comparação das 20 tabelas anteriores confirmou os mesmos registros antes de iniciar a nova API, desconsiderando somente a nova coluna opcional na comparação. O volume do PostgreSQL e as configurações de durabilidade ACID foram preservados. A conta da API continua limitada.

A cópia compilada ativa está indicada em `.devops-local/principal-estavel.yml`. Health, readiness, contrato, formulário servido, consultas autenticadas pela API e pelo proxy e conexão SSE foram conferidos. Não foram criadas contas, despesas ou pagamentos de demonstração no principal. O teste inicial de leitura enviou parâmetros de paginação ao adaptador de arrays e recebeu `400`; a verificação foi corrigida para conferir cada contrato, sem mudar a aplicação. Os relatórios registram essa retomada.

A [evidência de ativação](evidencias/ativacao-recorrencia-fim-principal-2026-11-21.json) fica separada dos testes em banco dedicado e das evidências anteriores de notificações. Não houve commit, push ou publicação.
