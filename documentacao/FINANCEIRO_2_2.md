# Financeiro do RepHouse 2.2.0

Esta entrega acrescenta recorrências mensais, avisos de vencimento e consultas individuais calculadas no backend. O registro manual de pagamentos continua abatendo o saldo imediatamente. Confirmação administrativa, Pix, reembolsos e divisão personalizada ficam para etapas posteriores.

## Ativação local no ambiente persistente — 18/11/2026

Após autorização para voltar ao banco persistente, foi criado um backup formato 2 de `rabbu_mvp`, conferido com `pg_restore --list` e SHA-256, antes de aplicar somente `202611170001_evolucao_financeiro`. A comparação de hashes das dez tabelas preexistentes confirmou que todos os registros anteriores permaneceram idênticos, antes e depois da inicialização. Não houve reset, seed ou troca de volume.

O Compose principal serve o frontend em `http://localhost:5173/login` e a API na porta 3000. Health, readiness, perfil, painel, despesas e recorrências responderam 200; painel e despesas foram conferidos no navegador com a conta existente. O frontend temporário da demonstração na porta 5175 foi encerrado para evitar confusão. Senha e vínculo da conta anterior foram preservados.

Backup e evidências operacionais ficam nos diretórios locais ignorados `copias-seguranca/` e `.devops-local/`. As orientações e os resultados abaixo registram a validação original e a demonstração descartável, sem substituir o ambiente persistente. O backup desta ativação foi inspecionado, sem executar restauração sobre o banco existente.

## Regras de negócio

O administrador seleciona participantes fixos para cada recorrência. Novos moradores não entram automaticamente. Cada geração verifica os participantes, a república e o administrador atual. Participante inativo interrompe a geração e pausa a recorrência, sem redistribuir sua parcela.

A primeira competência pode ser o mês atual se o vencimento não passou, ou um mês futuro. Ao configurar repetições de uma conta avulsa existente, o início precisa ser posterior ao mês atual e ao mês do vencimento dessa conta. A original permanece avulsa.

Nos meses seguintes, a conta é gerada no início do mês. Dias inexistentes usam o último dia válido: dia 31 em fevereiro de 2028 resulta em 29/02/2028. Datas civis seguem `APP_TIME_ZONE`, padrão `America/Sao_Paulo`.

Editar cria uma configuração com vigência a partir do próximo mês, nunca anterior ao início da recorrência. Versões e contas anteriores são preservadas. Desativar impede novas contas; não remove pagamentos ou comprovantes. Para retomar após pausa, revise os participantes e salve a recorrência ativa. Competências bloqueadas continuam exigindo revisão separada.

### Interrupções da API

A rotina executa na inicialização e a cada minuto, sem depender de visita à tela. Cada ciclo processa até 50 recorrências, uma competência por recorrência e por transação. Uma pendência longa pode exigir vários ciclos. Não são lançados meses futuros.

Competências anteriores não geradas recebem `PENDENTE_REVISAO`, sem criar dívidas. Ao alcançar o mês atual, a rotina gera a conta se a configuração estiver válida. O administrador revisa os meses anteriores, cadastra uma conta avulsa se necessário e marca a revisão. Essa marcação não altera saldos nem confirma pagamento.

A geração usa o administrador atual como autor da conta automática; o criador da configuração permanece registrado separadamente. Nenhum desses campos indica quem adiantou dinheiro.

## Vencimentos e resumo individual

O mês dos filtros é o mês do **vencimento**, inclusive nas despesas antigas. “Pago dessas contas” considera os pagamentos dessas parcelas em qualquer data. R$ 60,00 devidos com R$ 25,00 pagos resultam em R$ 35,00 pendentes.

Sem competência, o financeiro pessoal mantém o histórico completo. A interface permite escolher o mês ou retornar a todos os meses. O painel mantém os indicadores globais anteriores e acrescenta totais individuais do mês e o saldo individual geral da república atual. Pagamentos realizados pela casa no mês continuam sendo um indicador distinto.

| Situação | Critério com saldo positivo |
| --- | --- |
| Atrasada | Vencimento anterior à referência |
| Vence hoje | Vencimento igual à referência |
| Vence em breve | De amanhã até sete dias depois da referência |
| Em dia | Depois dessa janela |
| Quitada | Saldo zero; prevalece sobre a data de vencimento |

O filtro `PROXIMAS` inclui hoje e os sete dias seguintes. `PENDENTES` inclui tudo que ainda tem saldo. `CASA` considera a conta inteira; `PESSOAL`, a própria parcela. Quitar sua parcela não quita a conta dos outros moradores. Pagamento parcial aparece separadamente do aviso de vencimento.

A API fornece `dataReferencia`, `situacaoVencimento`, `pagamentoParcial` e `valorRestante` nas parcelas. Os totais agregam rateios, evitando multiplicar a obrigação pelo número de pagamentos. Registros e contagem usam os mesmos filtros e transação. Na troca de filtros, a interface oculta os totais da seleção anterior.

## APIs e compatibilidade

| Operação | Endpoint |
| --- | --- |
| Criar com idempotência | `POST /api/recorrencias` |
| Listar e consultar | `GET /api/recorrencias` e `GET /api/recorrencias/{id}` |
| Editar ou desativar | `PATCH /api/recorrencias/{id}` |
| Consultar competências | `GET /api/recorrencias/{id}/competencias` |
| Confirmar revisão, sem alterar dinheiro | `POST /api/recorrencias/{id}/competencias/{competencia}/revisar`, corpo `{}`, resposta `204` |
| Resumo individual agregado | `GET /api/me/financeiro/resumo` |

As rotas de recorrência também possuem variantes MASTER em `/api/master/republicas/{republicaId}/recorrencias`. Consultas pessoais permanecem restritas ao proprietário, mesmo sem vínculo ativo.

`GET /api/despesas` aceita `competencia=YYYY-MM`, `situacao=TODAS|PENDENTES|PROXIMAS|ATRASADAS|PAGAS` e `escopo=CASA|PESSOAL`. `/api/me/financeiro` e seu `/resumo` aceitam competência, situação e `republicaId` opcional. Parâmetros inválidos ou desconhecidos retornam `400`.

O adaptador `/api/front/v1` mantém arrays completos, até 1.000 registros; acima disso retorna `409 FRONT_COLLECTION_LIMIT`, sem truncamento. Aceita somente os filtros documentados, sem `pagina` ou `limite`. A API principal mantém `{dados,paginacao}`.

Criar recorrência exige `Idempotency-Key` UUID e este corpo, com valores e IDs ajustados ao ambiente:

```json
{
  "titulo": "Internet",
  "categoria": "Internet",
  "valorTotal": "120.00",
  "diaVencimento": 10,
  "inicio": "2030-01",
  "membroIds": ["UUID_DO_VINCULO_1", "UUID_DO_VINCULO_2", "UUID_DO_VINCULO_3"]
}
```

Opcionalmente, `despesaOrigemId` referencia uma avulsa da mesma república. Mesma chave e conteúdo retornam a mesma recorrência; conteúdo diferente retorna `409 IDEMPOTENCY_CONFLICT`. As respostas omitem chave, hash e snapshots internos. OpenAPI e tipos são gerados pelos comandos oficiais.

## Banco e validação

A migration `202611170001_evolucao_financeiro` acrescenta quatro tabelas: recorrências, versões, participantes e competências. As tabelas financeiras anteriores são preservadas. Constraints e triggers verificam datas, seleção, escopo e histórico. Recorrência e mês formam uma chave única; cada conta gerada também possui vínculo único.

Geração, rateios e competência são confirmados juntos, com isolamento `SERIALIZABLE`, bloqueio da recorrência e retry limitado. Concorrência e reinicialização não criam uma segunda conta para o mesmo mês. A rotina interrompe novos ciclos durante o encerramento e aguarda o ciclo em andamento antes de desconectar o banco.

Em um terminal exclusivo, usar somente o banco dedicado:

```powershell
docker compose -f interface/docker-compose.test.yml up -d --wait postgres
$env:TEST_DATABASE_URL='postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test'
$env:DATABASE_URL=$env:TEST_DATABASE_URL
npm run db:deploy
npm run verificar
npm --prefix interface run verificar
```

Não executar reset, `db push`, seed financeiro no banco da equipe ou limpeza de volumes. A migration não foi aplicada ao banco da equipe nesta etapa. Sua atualização exige janela coordenada, aplicação de `npm run db:deploy` e inicialização da versão nova; não manter a API antiga criando ou editando contas durante a ativação da rotina nova.

## Demonstração isolada

Com `TEST_DATABASE_URL` configurada, a demonstração cria apenas um schema descartável, com três contas fictícias, uma república, uma conta avulsa parcialmente paga e outra gerada por recorrência. Ana possui a parcela de R$ 60,00 com R$ 25,00 pagos, R$ 35,00 pendentes e um comprovante sintético.

```powershell
$env:DEMO_PASSWORD='EscolhaUmaSenhaFicticiaParaADemo2026!'
npm run financeiro:demo -- --verificar
```

Sem `--verificar`, a API permanece em `http://127.0.0.1:3406`. Em outro terminal:

```powershell
$env:API_PROXY_TARGET='http://127.0.0.1:3406'
npm --prefix interface run dev -- --host 127.0.0.1 --port 5175
```

Abra `http://127.0.0.1:5175/login`. Contas: `admin.aurora@integracao.rephouse.test`, `ana@integracao.rephouse.test` e `bruno@integracao.rephouse.test`; use a senha fictícia definida em `DEMO_PASSWORD`. Confira painel, recorrência em Despesas, financeiro de Ana e download do comprovante. Ctrl+C encerra a demonstração e remove somente seu schema temporário. Esse ambiente não é persistente.

## Evidências e próximas etapas

Os resultados locais desta revisão ficam em `evidencias/validacao-financeiro-2-2.json`. Capturas, logs e arquivos temporários ficam em `.devops-local/`, fora do versionamento. Evidências anteriores permanecem históricas. Não houve CI remota, commit ou push.

A etapa seguinte deve definir confirmação/rejeição de pagamentos e correções do saldo. Divisão personalizada exige revisar as constraints igualitárias; adiantamentos e reembolsos precisam de modelagem própria para evitar dupla contabilização. Linha de atividades, relatórios, CSV, simplificação de dívidas e lembretes externos continuam fora desta entrega.
