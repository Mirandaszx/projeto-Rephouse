# Auditoria de modelagem — RepHouse

Auditoria somente de leitura em **2026-11-18T22:50:58.159Z**, no PostgreSQL **18.6 (Debian 18.6-1.pgdg13+2)**, banco **rabbu_mvp/public**, ambiente Docker local com API **development**. Nenhuma consulta foi feita em produção. Na leitura inicial não foram criadas migrations nem alterados dados. A implementação aprovada posteriormente, exclusivamente em testes, está em [IMPLEMENTACAO.md](IMPLEMENTACAO.md).

## Inventário e resultado

- [Dicionário completo: cada tabela, coluna, tipo, nulabilidade e FK](DICIONARIO.md).
- [Contagem individual das 36 regras avaliadas e diagnósticos](CONTAGENS.md).
- [SQL exato executado, somente leitura](consultas.sql) e [catálogo/resultado completo](resultado.json).
- [Plano aprovado de migrations por assunto e volta prevista](PLANO.md).

14 tabelas de aplicação, uma tabela técnica de migrations, 108 colunas físicas, 24 FKs declaradas. Nenhuma coluna relacional identificada está sem FK; nenhum dos SELECTs encontrou órfãos. Os checksums das dez migrations aplicadas conferem com os arquivos locais.

A base tem 6 registros de aplicação, distribuídos em 6 tabelas; as outras 8 estão vazias. As contagens não justificam afirmar que o sistema está integralmente validado.

## Tipos e dados que merecem atenção

| Item | Resultado físico | Ação recomendada |
| --- | --- | --- |
| Dinheiro em float/real/double | Não encontrado. Cinco colunas monetárias usam numeric(12,2). | Preservar tipo exato e adicionar defesa explícita contra NaN. |
| Instantes sem fuso | Não encontrado timestamp without time zone. | Preservar timestamptz(3) de criação, pagamento, exclusão e desafio. |
| Datas civis | Vencimento, prazo e competências usam DATE. | Correto: não converter datas civis em instantes; rejeitar datas infinitas. |
| Texto guardando dinheiro/data | Não encontrado como fonte relacional. | Strings monetárias no JSON protegem precisão; não são armazenamento varchar no banco. Snapshot JSON é histórico deliberado. |
| Descrição de tarefa | TEXT sem limite físico de tamanho. | Acrescentar limite equivalente às 5000 unidades UTF-16 aceitas pelo backend/frontend. |
| Metadados de snapshot e campos legados | Snapshot JSON e comprovante_url opcional. | Preservar histórico; não preencher/apagar campos automaticamente. |

Numeric exato é adequado para valores monetários; NaN é um valor especial admitido pelo tipo. DATE representa data sem hora e não é um erro de fuso. Referências: [tipos numéricos PostgreSQL 18](https://www.postgresql.org/docs/18/datatype-numeric.html) e [datas e horas PostgreSQL 18](https://www.postgresql.org/docs/18/datatype-datetime.html).

## Repetições: o que normalizar e o que preservar

| Dados repetidos | Avaliação |
| --- | --- |
| pagamentos.membro_id deriva de rateio_id | Redundância estrutural real. Já há trigger que exige igualdade; D02=0. Uma remoção futura exige adaptar contratos e histórico; não remover nesta rodada. |
| rateios.valor_pago e status; despesas.status | Agregados/estados derivados. Já são sincronizados e validados no commit. D04–D06=0. Não criar um segundo algoritmo independente nem remover as garantias. |
| configuracoes_recorrencia, despesa gerada e snapshot | Cópias intencionais de configuração/histórico. Alterar configuração futura não pode modificar a conta existente; manter. |
| valor_total e soma dos rateios | Obrigação original e distribuição são entidades diferentes, com igualdade garantida no commit; manter. |
| usuarios.tipo_usuario ADMIN e republicas.admin_id | Sobreposição entre perfil global e papel na casa. Já há validação de administrador/vínculo; MASTER é global. Remodelar papéis seria mudança funcional separada. |
| comprovante_url e comprovantes | Coluna antiga é legado preservado; conteúdo novo vem de comprovantes. D15=0 referências pendentes de importação. Não apagar a coluna ou arquivos por esta auditoria. |

## Validações que o banco já faz

NOT NULL e tamanhos varchar, enums de perfis/situações, unicidade de e-mail/código, uma identidade Google por usuário, uma participação por casa e um vínculo ativo por usuário, uma parcela por membro/despesa, um comprovante por pagamento e uma competência por recorrência já estão protegidos. Pagamentos/recorrências possuem chave de idempotência única.

As 27 triggers instaladas também cobrem rateio igualitário exato, saldo e pagamentos parciais, estados agregados, isolamento entre repúblicas, responsável válido na atribuição, histórico financeiro e métodos de acesso de contas Google. A análise considera suas versões finais, não a primeira definição das migrations.

Não recomendo adicionar FKs ou índices UNIQUE redundantes apenas para substituir uma regra já garantida. Regras entre tabelas e de transição não cabem em um CHECK comum; o PostgreSQL documenta esses limites em [constraints](https://www.postgresql.org/docs/18/ddl-constraints.html).

## Lacunas encontradas

1. Desafio Google de exclusão: a comparação versao_token >= 0 pode virar NULL e não bloquear uma versão ausente. C10 contou zero registros inválidos, mas a expressão foi confirmada por SELECT.
2. Proteção explícita contra NaN nas cinco colunas monetárias. C13–C17=0; a configuração recorrente não deve aceitar valores não financeiros por escrita direta.
3. Textos em branco contendo tabulações/outros espaços: os CHECKs com btrim padrão não equivalem ao trim JavaScript. Configurações recorrentes nem têm CHECK de texto não vazio. C01–C07=0.
4. Limites de texto JS/HTML são em UTF-16; varchar conta pontos de código. C08/C29–C36=0. A futura expressão precisa respeitar essa diferença sem restringir o idioma.
5. Versões, hashes, campos de revisão e motivos de recorrência podem receber validação declarativa adicional; C09/C11/C12/C18/C25–C27=0.
6. O CHECK de e-mail atual é menos preciso que z.email(); C28=0 usando a expressão da dependência instalada. Trata-se da política atual do app, não de promessa de validar todo endereço RFC possível.
7. Correção do diagnóstico: a definição efetivamente capturada usa now() AT TIME ZONE America/Fortaleza, conforme a migration 202610160006. CURRENT_DATE era uma definição anterior já substituída. M08 padroniza para America/Sao_Paulo; D18=0 não prova defeito atual. A fronteira UTC/Brasília é apenas uma demonstração de calendário, não evidência de divergência da view existente.
8. Irreversibilidade da exclusão e proteção do último MASTER são verificadas pelo backend, mas não equivalem aos gatilhos atuais de integridade. Exigem desenho de transições, não UNIQUE/NOT NULL global. A auditoria não consegue contar violações passadas sem histórico de eventos.

## O que deve continuar no backend

JWT/sessão, autorização de quem faz a operação, senha/Google, reconhecimento do MIME por conteúdo, resposta HTTP e tratamento de campos inválidos continuam no backend. Não guardar senha em claro para aplicar tamanho de senha no SQL. A política do hash e existência de método de acesso já são checadas no banco.

Numeric(12,2) pode arredondar uma entrada com mais casas antes de um CHECK avaliá-la; não é possível reconstruir a entrada original com um CHECK após a conversão. O bug de valor com vírgula retornar 500 deve ser corrigido na validação HTTP, mantendo o 400 aprovado.

A identidade do chamador não é dedutível de uma FK. Criar despesa exige autorização transacional mesmo após adicionar constraints; uma tarefa ter responsável válido não prova que quem a criou tinha permissão.

A conexão atual é superusuária: **true**; ignora RLS: **true**. Separar usuário de aplicação e usuário de migrations é uma revisão de permissões posterior; não criar papéis nem alterar credenciais nesta auditoria.

## Tratamento de dados e próximos passos

As 36 contagens retornaram zero. Isso permite planejar as constraints, mas todas as contagens devem ser repetidas no ambiente de destino imediatamente antes de aplicá-las, com proteção contra escritas concorrentes. Se aparecer qualquer violação, interromper e apresentar quantidade e regra: não usar UPDATE, DELETE, truncamento, preenchimento artificial ou fusão de registros para obter aprovação.

Os dados válidos do app e as alterações locais anteriores foram preservados. Os três bugs da rodada de request specs continuam abertos; esta auditoria não altera seus testes ou funcionalidades. O [plano](PLANO.md) foi aprovado posteriormente, incluindo M09. Consulte a [implementação e validação em testes](IMPLEMENTACAO.md); os dados desta leitura original permanecem preservados.
