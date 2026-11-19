# Restrições adicionais do PostgreSQL

O plano foi aprovado depois da auditoria de leitura. Foram criadas nove migrations adicionais, cada uma com `migration.sql` e `down.sql`. As dez migrations anteriores permanecem intactas. Aplicação e contrato continuam na versão **2.2.0**.

**Destino da validação:** PostgreSQL 18 de testes, banco `rabbu_mvp_test`, porta local `5544`, usuário exclusivo `rephouse_interface_test`, em schemas criados e removidos pela execução. Nenhuma dessas migrations foi aplicada ao banco persistente da equipe (`rabbu_mvp`). Não houve alterações em dados da equipe, APIs, credenciais ou volumes.

## Arquivos e regras

| Migration em `prisma/migracoes/` | Garantia adicional | Reversão |
| --- | --- | --- |
| `202611180001_textos` | 7 CHECKs para conteúdo após trim ECMAScript e 9 para tamanho UTF-16, incluindo descrição opcional de até 5000 unidades. Acentos e emoji continuam permitidos. | Retira esses 16 CHECKs. |
| `202611180002_email` | Formato de e-mail compatível com a política Zod instalada, congelada no SQL. Normalização e unicidade anteriores permanecem. | Retira somente o CHECK de formato. |
| `202611180003_dinheiro_finito` | Exclui `NaN` das cinco colunas monetárias; mantém `numeric(12,2)` e as regras financeiras anteriores. O tipo com precisão definida já impede infinitos. | Retira esses 5 CHECKs. |
| `202611180004_versoes_auth` | Versão de sessão não negativa; exclusão Google exige versão explicitamente preenchida e não negativa. | Retira esses 2 CHECKs. |
| `202611180005_hashes` | SHA-256 hexadecimal minúsculo nos hashes de requisição; pagamento legado continua aceitando NULL. | Retira esses 2 CHECKs. |
| `202611180006_metadados_recorrencia` | Versão positiva, campos de revisão preenchidos em conjunto e motivos conhecidos. Revisar mantém o motivo original. | Retira esses 4 CHECKs. |
| `202611180007_datas_finitas` | Datas civis finitas nas seis colunas DATE; prazo opcional continua aceitando NULL e históricos não precisam estar no futuro. | Retira esses 6 CHECKs. |
| `202611180008_view_brasilia` | Padroniza o fuso da view para `America/Sao_Paulo`, preservando suas colunas. | Restaura a definição anterior com `America/Fortaleza`. |
| `202611180009_transicoes_usuarios` | Exclusão lógica irreversível e preservação do último MASTER ativo, com substituição válida dentro da mesma transação. | Retira somente os 3 triggers e as 3 funções adicionais. |

Total: **36 CHECKs adicionais**, uma view substituída e três triggers novos. Os CHECKs usam `NOT VALID` seguido de `VALIDATE CONSTRAINT` na mesma transação. Todas as restrições devem estar validadas ao concluir. Uma violação ou espera excessiva por lock aborta a migration; nenhum SQL corrige, preenche, trunca ou remove registros para obter aprovação.

Os CHECKs e triggers customizados não aparecem integralmente no modelo Prisma. O catálogo físico continua sendo a referência dessas garantias. Não foram adicionadas FKs redundantes: as 24 referências identificadas na auditoria já tinham FK.

## Exclusão e último MASTER

Uma conta excluída não pode ter sua data de exclusão removida ou substituída, nem voltar a ficar ativa. As regras anteriores de dívida, vínculo e administração continuam funcionando.

A base pode iniciar sem MASTER. A proteção dispara quando uma operação remove a elegibilidade de um MASTER existente: bloquear, excluir, apagar ou retirar seu perfil. A conferência é diferida até o fim da transação, permitindo cadastrar/promover um substituto antes ou depois de remover o anterior, desde que reste um MASTER ativo no commit.

O trigger de serialização usa a mesma chave de advisory lock administrativa já existente e bloqueia as linhas dos MASTERs elegíveis em ordem de ID. Isso também protege snapshots `REPEATABLE READ`: se um MASTER mudou desde o snapshot, o PostgreSQL pode rejeitar a operação com `40001`, para repetição da transação inteira. O conflito de domínio usa `RH001`, já tratado pela API como `409`. A API mantém suas verificações de autorização.

Essa proteção amplia a serialização de escritas de usuários, inclusive cadastro. Não foi realizado ensaio de carga nesta etapa. A separação entre role de aplicação e role de migrations continua pendente; um superusuário pode remover proteções do schema e não constitui uma fronteira de autorização segura.

## Execução reproduzível

Com Docker Desktop aberto e dependências instaladas, na raiz do projeto:

```powershell
npm run test:completo
```

O comando seleciona somente o PostgreSQL dedicado, aplica todas as migrations num schema temporário e executa a verificação oficial. Não usa a URL da aplicação como alternativa, não altera `.env` e não encerra ou remove o volume dos testes. As suítes HTTP e SQL criam seus próprios schemas e os removem ao concluir.

O teste específico está em [schema-hardening.test.ts](../../testes/schema-hardening.test.ts). Ele faz parte de `test:db` e, portanto, de `test:completo`. Não desabilita triggers, não simula transações e não substitui regras financeiras por mocks.

## Ida e volta

O teste de migração cria uma base com registros anteriores, rateios, pagamento parcial e comprovante binário. Para cada assunto, executa ida, volta e ida, comparando todos os registros. Também reverte os nove assuntos em ordem inversa e reaplica em ordem normal. Confere definições anteriores de constraints, funções, índices, triggers e views, além de nenhuma constraint ficar sem validação.

`down.sql` é o SQL de referência da reversão: Prisma não o executa automaticamente. Para uma aplicação futura já concluída, a volta deve ser registrada por uma **nova migration compensatória**, mantendo o histórico original. `prisma migrate resolve` não executa rollback. Não editar migrations já aplicadas nem usar reset para voltar.

Antes de uma aplicação futura em outro ambiente autorizado, repetir as [contagens de preflight](CONTAGENS.md) no destino. Os valores da auditoria inicial são históricos. Se aparecer uma violação, interromper aquele assunto, informar regra e quantidade e decidir com o responsável como tratar o legado. Não alterar dados automaticamente.

## Correção do diagnóstico da view

O relatório inicial dizia que a view usava `CURRENT_DATE`. Isso descrevia uma migration antiga, não a definição capturada no catálogo. `202610160006_migracao_mvp` já a havia mudado para `America/Fortaleza`. O [resultado original](resultado.json) foi preservado; a documentação foi corrigida. M08 padroniza para o fuso de Brasília utilizado pela aplicação, sem apresentar D18=0 como evidência de um defeito atual.

## Resultados e limites

A suíte específica cobre as 36 regras, limites válidos, rollback, legado inválido, ida/volta, formato de e-mail, horários, metadados opcionais, acesso Google sem senha e transições de usuários. Testa bloqueios simultâneos dos dois últimos MASTERs em `READ COMMITTED`, `REPEATABLE READ` e `SERIALIZABLE`.

Para `NaN` em pagamentos, o trigger financeiro anterior já rejeita a tentativa antes do novo CHECK. O teste exige essa rejeição real; não desliga o trigger para forçar a passagem por uma proteção diferente. O CHECK adicional também é conferido no catálogo validado.

As evidências locais e o resultado da regressão estão em [validacao-schema.json](validacao-schema.json). Os [três bugs de request specs](../BUGS_REQUEST_SPECS.md) permanecem abertos e seus testes não foram enfraquecidos. Uma suíte específica aprovada não significa aprovação integral do backend.

Com autorização do usuário, a preparação de `testes/financeiro-migracao.test.ts` passou a selecionar explicitamente `202611170001_evolucao_financeiro`. A fixture aplica somente suas antecessoras antes de criar o histórico e depois executa a migration 2.2. Assim, adicionar migrations posteriores não muda o objeto desse teste. Todas as verificações de registros, saldo parcial e bytes do comprovante foram mantidas. O teste específico passou após o ajuste.

A regressão completa após esse ajuste executou **262 testes: 254 aprovados, 8 falhas e nenhum ignorado ou cancelado**. As oito falhas correspondem aos três bugs de produto já registrados; a falha da preparação do teste de migração foi resolvida. Os 53 testes adicionais do schema passaram. Build, tipagem, contrato e tipos sincronizados também passaram; o schema temporário da execução foi removido.

Não houve commit, push, execução remota da CI ou aplicação destas migrations no banco da equipe.

## Atualização posterior: conta técnica da API

A pendência de separação de roles descrita no diagnóstico foi tratada no Compose principal local, com autorização específica. A API usa `rephouse_api`, sem superusuário, propriedade de objetos ou acesso ao histórico de migrations; o serviço administrativo fica separado e manual. O [guia de permissões](../PERMISSOES_POSTGRESQL.md) delimita as concessões e as configurações alternativas ainda não migradas.

Os cinco testes adicionais de permissões passaram, antes e depois das nove migrations em schemas exclusivos de testes. A regressão posterior teve **267 testes: 259 aprovados, as mesmas 8 falhas e zero ignorados/cancelados**. Os hashes das 15 tabelas do banco da equipe foram preservados, com dez migrations aplicadas e as nove da auditoria ainda pendentes. Resultados próprios em [permissoes-postgresql.json](../evidencias/permissoes-postgresql.json); as contagens anteriores acima permanecem históricas.
