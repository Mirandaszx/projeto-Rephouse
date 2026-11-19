BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Retira apenas as garantias desta migration; preserva os dados e regras anteriores.
ALTER TABLE usuarios DROP CONSTRAINT aud_usuarios_nome_conteudo;
ALTER TABLE republicas DROP CONSTRAINT aud_republicas_nome_conteudo;
ALTER TABLE despesas DROP CONSTRAINT aud_despesas_titulo_conteudo;
ALTER TABLE despesas DROP CONSTRAINT aud_despesas_categoria_conteudo;
ALTER TABLE tarefas DROP CONSTRAINT aud_tarefas_titulo_conteudo;
ALTER TABLE configuracoes_recorrencia DROP CONSTRAINT aud_configuracoes_recorrencia_titulo_conteudo;
ALTER TABLE configuracoes_recorrencia DROP CONSTRAINT aud_configuracoes_recorrencia_categoria_conteudo;
ALTER TABLE tarefas DROP CONSTRAINT aud_tarefas_descricao_utf16;
ALTER TABLE usuarios DROP CONSTRAINT aud_usuarios_nome_utf16;
ALTER TABLE republicas DROP CONSTRAINT aud_republicas_nome_utf16;
ALTER TABLE despesas DROP CONSTRAINT aud_despesas_titulo_utf16;
ALTER TABLE despesas DROP CONSTRAINT aud_despesas_categoria_utf16;
ALTER TABLE tarefas DROP CONSTRAINT aud_tarefas_titulo_utf16;
ALTER TABLE configuracoes_recorrencia DROP CONSTRAINT aud_configuracoes_recorrencia_titulo_utf16;
ALTER TABLE configuracoes_recorrencia DROP CONSTRAINT aud_configuracoes_recorrencia_categoria_utf16;
ALTER TABLE republicas DROP CONSTRAINT aud_republicas_endereco_utf16;

COMMIT;
