# Correções 2.2.1 — criação e reenvio

Esta revisão corrige os três bugs dos request specs. As evidências anteriores continuam históricas; os resultados desta revisão serão registrados separadamente. Não há gateway, novas regras de pagamento ou mudança visual.

## Entradas monetárias

A API continua recebendo dinheiro como string decimal com ponto, por exemplo `"100.00"`. A primeira etapa Zod confere o formato; a segunda só então usa `Decimal` para exigir valor positivo. Vírgula, texto, vazio, zero, negativos, mais de duas casas ou valor acima do limite retornam `400 VALIDATION_ERROR`, sem gravação. A interface pode apresentar `R$ 100,00`; apresentação não é o contrato de transporte.

## Identidade de despesas e tarefas

`POST /api/despesas` e `POST /api/tarefas` aceitam `Idempotency-Key` UUID opcional. As variantes MASTER e o adaptador `/api/front/v1` usam os mesmos serviços.

| Solicitação | Resposta |
| --- | --- |
| Sem header | Criação compatível, sem proteção contra reenvio. |
| Header inválido ou vazio | 400, sem criação. |
| Chave nova | 201, criação e resultado registrados juntos. |
| Mesmo usuário/operação/chave e dados equivalentes | 201, corpo público original, mesmo ID. |
| Mesma identidade com dados ou república diferentes | 409 IDEMPOTENCY_CONFLICT. |
| Chave nova com dados iguais | Outra criação intencional permitida. |

O UUID é público por design: não é token, senha ou autorização. Usuário e república são obtidos/conferidos pelo servidor. Toda chamada revalida a sessão e a autorização dentro da transação, inclusive após transferência ou bloqueio. Uma chave conhecida não revela registros de outro usuário. A mesma chave em outro tipo de operação ou outro usuário tem identidade independente.

O hash usa campos validados, dinheiro com duas casas, datas civis e participantes ordenados. O destino faz parte do hash. A resposta registrada usa a serialização pública, sem segredos ou campos internos. `X-Request-Id` pertence à requisição atual e não é reutilizado do primeiro envio.

A resposta de reenvio representa a **criação original**, mesmo que o registro tenha sido editado ou pago posteriormente. Consulte os endpoints GET para obter o estado atual; o snapshot não substitui despesas, rateios ou pagamentos como fonte dos saldos.

## Transação, migration e conta limitada

A migration adicional `202611200001_idempotencia_criacoes` cria `operacoes_criacao`, com FKs, chave primária composta, checks e preservação do histórico. Negócio, rateios e registro do resultado confirmam ou revertem juntos. O índice único protege concorrência. Colisão específica dessa chave permite uma nova transação; conflitos transitórios continuam usando o retry limitado já existente em `Serializable`. Não há efeitos externos dentro do callback repetível.

A API recebe somente SELECT e INSERT na nova tabela, quando ela existe. O provisionamento mantém compatibilidade com os schemas antigos de testes; não devolve privilégios administrativos à API. Em outros ambientes, a aplicação administrativa aprovada da migration deve ser acompanhada do provisionamento dessas permissões.

Nenhuma migration aplicada anteriormente é editada. O `down.sql` de referência só permite retirar a estrutura se a tabela estiver vazia; com histórico, recusa a operação. Uma reversão futura precisa de migration compensatória que preserve o histórico, sem reset, limpeza ou remoção de registros. Não há expiração nem exclusão automática das chaves.

**Banco principal:** a implementação e a regressão foram feitas no banco dedicado, sem alterar o principal. Depois, o usuário solicitou a execução no principal e autorizou explicitamente as migrations com o backup preparado. Em 20/11/2026 foram aplicadas as nove migrations da auditoria e a nova migration de idempotência no banco local `rabbu_mvp`: vinte aplicadas, zero pendentes, checksums conferidos e nenhuma violação no preflight. As permissões foram atualizadas e a API recriada, preservando PostgreSQL e volumes.

A comparação de contagens e hashes confirmou a preservação de todas as linhas das catorze tabelas de negócio anteriores. Não foram criadas contas ou operações de teste no principal. O backup em `copias-seguranca/2026-11-20T22-09-25-914Z-antes-2-2-1-bcc31f19` tem manifesto formato 2, hash conferido e catálogo do dump validado; não foi realizado novo ensaio de restauração nesta ativação. Os testes continuam exclusivos do banco dedicado na porta 5544 e schemas temporários.

A aplicação está disponível em `http://localhost:5173/login`. Health e readiness retornaram 200, o contrato servido pela API está em 2.2.1 e o proxy do frontend rejeitou acesso sem sessão com 401. Esta ativação foi local, sem commit, push ou CI remota.

## Formulários e falhas de comunicação

Despesa avulsa e tarefa geram uma chave por criação e mantêm uma cópia dos dados enviados apenas em memória. Cliques repetidos e Enter durante envio não geram solicitações adicionais. Pagamentos e recorrências mantêm seus fluxos anteriores.

Uma falha de rede, timeout de 30 segundos ou resposta 5xx deixa o resultado incerto. A interface exibe “Não foi possível confirmar se foi salvo”, bloqueia alterações e oferece **Reenviar solicitação**. O reenvio é manual, com a mesma chave e corpo. Fechar/reabrir o diálogo na mesma tela conserva a tentativa. Uma resposta definitiva de validação libera a correção; sucesso permite outra criação com UUID novo. `IDEMPOTENCY_CONFLICT` não gera nova chave automaticamente.

Não há armazenamento persistente desses formulários. Recarregar a página, navegar para uma tela que desmonta o componente ou fechar a aba perde a tentativa em memória. Nessa situação, consulte a listagem antes de iniciar outra criação. A idempotência no servidor continua válida para quem conservou a chave, inclusive após reinício da API.

## Execução e evidências

```powershell
npm run test:completo
npm --prefix interface run verificar
```

Não é necessário alterar `.env` para executar o comando completo do backend. Docker inicia somente o PostgreSQL dedicado. Build, tipagem, lint, contrato e tipos fazem parte da verificação; os testes HTTP conferem também estado persistido, rollback, concorrência e reinício. Os testes de navegador exercitam a API real e injetam falhas apenas no transporte para reproduzir resposta perdida e entrada rejeitada.

Resultado desta revisão: **285 testes do backend aprovados, zero falhas e zero ignorados**. As verificações adicionais passaram: seis testes de permissões e um de reversão protegida. Build, tipagem e lint do frontend passaram; o lint mantém cinco avisos anteriores. Na suíte completa da interface, foram 70 aprovados e uma falha preexistente em `motion-superficies.spec.ts:192`, sem testes ignorados. Os quatro novos cenários de reenvio também passaram na execução final após os últimos ajustes.

Consulte [o resultado estruturado](evidencias/correcao-bugs-2-2-1.json). Os três bugs estão corrigidos nos cenários executados; a suíte inteira do frontend continua sem aprovação por causa da falha de motion. O teste não foi apagado, ignorado ou afrouxado.
