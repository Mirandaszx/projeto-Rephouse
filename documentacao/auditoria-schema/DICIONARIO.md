# Dicionário físico do PostgreSQL

Leitura em 2026-11-18T22:50:58.159Z, banco local `rabbu_mvp`, schema `public`, PostgreSQL `18.6 (Debian 18.6-1.pgdg13+2)`. API confirmada em desenvolvimento. Não contém valores pessoais nem senhas.

São 14 tabelas da aplicação e a tabela técnica `_prisma_migrations`; 108 colunas físicas no total. A nulabilidade e os tipos abaixo vêm do catálogo real, não de inferência do Prisma.

## _prisma_migrations

Metadados do Prisma; 10 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `id` | `character varying(36)` | Não | — | 0 | — |
| `checksum` | `character varying(64)` | Não | — | 0 | — |
| `finished_at` | `timestamp with time zone` | Sim | — | 0 | — |
| `migration_name` | `character varying(255)` | Não | — | 0 | — |
| `logs` | `text` | Sim | — | 10 | — |
| `rolled_back_at` | `timestamp with time zone` | Sim | — | 10 | — |
| `started_at` | `timestamp with time zone` | Não | `now()` | 0 | — |
| `applied_steps_count` | `integer` | Não | `0` | 0 | — |

## competencias_recorrencia

Aplicação; 0 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `recorrencia_id` | `uuid` | Não | — | 0 | `recorrencias_despesa.id` |
| `competencia` | `date` | Não | — | 0 | — |
| `configuracao_id` | `uuid` | Sim | — | 0 | `configuracoes_recorrencia.id` |
| `despesa_id` | `uuid` | Sim | — | 0 | `despesas.id` |
| `estado` | `character varying(24)` | Não | — | 0 | — |
| `motivo` | `character varying(60)` | Sim | — | 0 | — |
| `snapshot` | `jsonb` | Sim | — | 0 | — |
| `revisada_por_id` | `uuid` | Sim | — | 0 | `usuarios.id` |
| `revisada_em` | `timestamp(3) with time zone` | Sim | — | 0 | — |

## comprovantes

Aplicação; 0 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `pagamento_id` | `uuid` | Não | — | 0 | `pagamentos.id` |
| `conteudo` | `bytea` | Não | — | 0 | — |
| `mime_type` | `character varying(100)` | Não | — | 0 | — |
| `tamanho` | `integer` | Não | — | 0 | — |
| `hash_sha256` | `character(64)` | Não | — | 0 | — |
| `criado_em` | `timestamp(3) with time zone` | Não | `CURRENT_TIMESTAMP` | 0 | — |

## configuracoes_recorrencia

Aplicação; 0 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | 0 | — |
| `versao` | `integer` | Não | `nextval('configuracoes_recorrencia_versao_seq'::regclass)` | 0 | — |
| `recorrencia_id` | `uuid` | Não | — | 0 | `recorrencias_despesa.id` |
| `vigencia` | `date` | Não | — | 0 | — |
| `titulo` | `character varying(160)` | Não | — | 0 | — |
| `categoria` | `character varying(80)` | Não | — | 0 | — |
| `valor_total` | `numeric(12,2)` | Não | — | 0 | — |
| `dia_vencimento` | `integer` | Não | — | 0 | — |
| `criada_em` | `timestamp(3) with time zone` | Não | `CURRENT_TIMESTAMP` | 0 | — |

## desafios_google

Aplicação; 0 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | — | 0 | — |
| `nonce_hash` | `character(64)` | Não | — | 0 | — |
| `cookie_hash` | `character(64)` | Não | — | 0 | — |
| `finalidade` | `character varying(20)` | Não | — | 0 | — |
| `usuario_id` | `uuid` | Sim | — | 0 | `usuarios.id` |
| `versao_token` | `integer` | Sim | — | 0 | — |
| `expira_em` | `timestamp(3) with time zone` | Não | — | 0 | — |
| `consumido_em` | `timestamp(3) with time zone` | Sim | — | 0 | — |

## despesas

Aplicação; 1 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | 0 | — |
| `republica_id` | `uuid` | Não | — | 0 | `republicas.id` |
| `criada_por_id` | `uuid` | Não | — | 0 | `usuarios.id` |
| `titulo` | `character varying(160)` | Não | — | 0 | — |
| `categoria` | `character varying(80)` | Não | — | 0 | — |
| `valor_total` | `numeric(12,2)` | Não | — | 0 | — |
| `vencimento` | `date` | Não | — | 0 | — |
| `status` | `"StatusDespesa"` | Não | `'PENDENTE'::"StatusDespesa"` | 0 | — |
| `criada_em` | `timestamp(3) with time zone` | Não | `CURRENT_TIMESTAMP` | 0 | — |

## identidades_google

Aplicação; 0 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `sub` | `character varying(255)` | Não | — | 0 | — |
| `usuario_id` | `uuid` | Não | — | 0 | `usuarios.id` |
| `criada_em` | `timestamp(3) with time zone` | Não | `now()` | 0 | — |

## membros_republica

Aplicação; 1 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | 0 | — |
| `usuario_id` | `uuid` | Não | — | 0 | `usuarios.id` |
| `republica_id` | `uuid` | Não | — | 0 | `republicas.id` |
| `ativo` | `boolean` | Não | `true` | 0 | — |
| `entrou_em` | `timestamp(3) with time zone` | Não | `CURRENT_TIMESTAMP` | 0 | — |

## pagamentos

Aplicação; 1 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | 0 | — |
| `rateio_id` | `uuid` | Não | — | 0 | `rateios_despesa.id` |
| `membro_id` | `uuid` | Não | — | 0 | `membros_republica.id` |
| `valor` | `numeric(12,2)` | Não | — | 0 | — |
| `comprovante_url` | `character varying(500)` | Sim | — | 1 | — |
| `data_pagamento` | `timestamp(3) with time zone` | Não | `CURRENT_TIMESTAMP` | 0 | — |
| `chave_idempotencia` | `uuid` | Não | `gen_random_uuid()` | 0 | — |
| `hash_requisicao` | `character varying(64)` | Sim | — | 0 | — |

## rateios_despesa

Aplicação; 1 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | 0 | — |
| `despesa_id` | `uuid` | Não | — | 0 | `despesas.id` |
| `membro_id` | `uuid` | Não | — | 0 | `membros_republica.id` |
| `valor_devido` | `numeric(12,2)` | Não | — | 0 | — |
| `valor_pago` | `numeric(12,2)` | Não | `0` | 0 | — |
| `status` | `"StatusRateio"` | Não | `'PENDENTE'::"StatusRateio"` | 0 | — |

## recorrencias_despesa

Aplicação; 0 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | 0 | — |
| `republica_id` | `uuid` | Não | — | 0 | `republicas.id` |
| `criada_por_id` | `uuid` | Não | — | 0 | `usuarios.id` |
| `despesa_origem_id` | `uuid` | Sim | — | 0 | `despesas.id` |
| `inicio` | `date` | Não | — | 0 | — |
| `proxima_competencia` | `date` | Não | — | 0 | — |
| `ativa` | `boolean` | Não | `true` | 0 | — |
| `pausa_motivo` | `character varying(60)` | Sim | — | 0 | — |
| `chave_idempotencia` | `uuid` | Não | — | 0 | — |
| `hash_requisicao` | `character(64)` | Não | — | 0 | — |
| `criada_em` | `timestamp(3) with time zone` | Não | `CURRENT_TIMESTAMP` | 0 | — |

## recorrencias_participantes

Aplicação; 0 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `configuracao_id` | `uuid` | Não | — | 0 | `configuracoes_recorrencia.id` |
| `membro_id` | `uuid` | Não | — | 0 | `membros_republica.id` |

## republicas

Aplicação; 1 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | 0 | — |
| `nome` | `character varying(120)` | Não | — | 0 | — |
| `codigo_entrada` | `character varying(32)` | Não | — | 0 | — |
| `admin_id` | `uuid` | Não | — | 0 | `usuarios.id` |
| `ativa` | `boolean` | Não | `true` | 0 | — |
| `criada_em` | `timestamp(3) with time zone` | Não | `CURRENT_TIMESTAMP` | 0 | — |
| `endereco` | `character varying(255)` | Sim | — | 1 | — |

## tarefas

Aplicação; 0 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | 0 | — |
| `republica_id` | `uuid` | Não | — | 0 | `republicas.id` |
| `responsavel_id` | `uuid` | Não | — | 0 | `membros_republica.id` |
| `titulo` | `character varying(160)` | Não | — | 0 | — |
| `descricao` | `text` | Sim | — | 0 | — |
| `prazo` | `date` | Sim | — | 0 | — |
| `status` | `"StatusTarefa"` | Não | `'ABERTA'::"StatusTarefa"` | 0 | — |
| `criada_em` | `timestamp(3) with time zone` | Não | `CURRENT_TIMESTAMP` | 0 | — |

## usuarios

Aplicação; 1 linha(s) no instante da leitura.

| Coluna | Tipo PostgreSQL | Aceita NULL | Padrão | NULLs atuais | Referência |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | Não | `gen_random_uuid()` | 0 | — |
| `nome` | `character varying(120)` | Não | — | 0 | — |
| `email` | `character varying(254)` | Não | — | 0 | — |
| `senha_hash` | `character varying(255)` | Sim | — | 0 | — |
| `tipo_usuario` | `"TipoUsuario"` | Não | `'USUARIO_NORMAL'::"TipoUsuario"` | 0 | — |
| `ativo` | `boolean` | Não | `true` | 0 | — |
| `criado_em` | `timestamp(3) with time zone` | Não | `CURRENT_TIMESTAMP` | 0 | — |
| `versao_token` | `integer` | Não | `0` | 0 | — |
| `excluido_em` | `timestamp(3) with time zone` | Sim | — | 1 | — |

## Enums

- `StatusDespesa`: `PENDENTE`, `PAGA`.
- `StatusRateio`: `PENDENTE`, `PAGO`, `PARCIAL`.
- `StatusTarefa`: `ABERTA`, `CONCLUIDA`.
- `TipoUsuario`: `USUARIO_NORMAL`, `USUARIO_ADMIN`, `USUARIO_MASTER`.

## Foreign keys declaradas

| Origem | Alvo | Órfãos atuais | Validada |
| --- | --- | --- | --- |
| `competencias_recorrencia.configuracao_id` | `configuracoes_recorrencia.id` | 0 | Sim |
| `competencias_recorrencia.despesa_id` | `despesas.id` | 0 | Sim |
| `competencias_recorrencia.recorrencia_id` | `recorrencias_despesa.id` | 0 | Sim |
| `competencias_recorrencia.revisada_por_id` | `usuarios.id` | 0 | Sim |
| `comprovantes.pagamento_id` | `pagamentos.id` | 0 | Sim |
| `configuracoes_recorrencia.recorrencia_id` | `recorrencias_despesa.id` | 0 | Sim |
| `desafios_google.usuario_id` | `usuarios.id` | 0 | Sim |
| `despesas.criada_por_id` | `usuarios.id` | 0 | Sim |
| `despesas.republica_id` | `republicas.id` | 0 | Sim |
| `identidades_google.usuario_id` | `usuarios.id` | 0 | Sim |
| `membros_republica.republica_id` | `republicas.id` | 0 | Sim |
| `membros_republica.usuario_id` | `usuarios.id` | 0 | Sim |
| `pagamentos.membro_id` | `membros_republica.id` | 0 | Sim |
| `pagamentos.rateio_id` | `rateios_despesa.id` | 0 | Sim |
| `rateios_despesa.despesa_id` | `despesas.id` | 0 | Sim |
| `rateios_despesa.membro_id` | `membros_republica.id` | 0 | Sim |
| `recorrencias_despesa.criada_por_id` | `usuarios.id` | 0 | Sim |
| `recorrencias_despesa.despesa_origem_id` | `despesas.id` | 0 | Sim |
| `recorrencias_despesa.republica_id` | `republicas.id` | 0 | Sim |
| `recorrencias_participantes.configuracao_id` | `configuracoes_recorrencia.id` | 0 | Sim |
| `recorrencias_participantes.membro_id` | `membros_republica.id` | 0 | Sim |
| `republicas.admin_id` | `usuarios.id` | 0 | Sim |
| `tarefas.republica_id` | `republicas.id` | 0 | Sim |
| `tarefas.responsavel_id` | `membros_republica.id` | 0 | Sim |

**Referências identificadas sem FK: 0.** Foram conferidas as colunas de relacionamento e os campos terminados em `_id`; os IDs externos Google e hashes não são referências a tabelas internas. IDs no snapshot JSON são informação histórica e não substituem as FKs das colunas relacionais.

## Garantias já instaladas

162 entradas em pg_constraint, incluindo 87 NOT NULL, 15 PKs, 24 FKs, 24 CHECKs, 2 UNIQUEs e 10 constraint triggers. Há ainda 42 índices e 27 triggers de usuário. UNIQUE pode estar representado como índice, como o vínculo ativo parcial; por isso contar somente contype=u não descreve toda a unicidade.

As definições completas, inclusive funções, índices parciais, validação e gatilhos, estão em [resultado.json](resultado.json).
