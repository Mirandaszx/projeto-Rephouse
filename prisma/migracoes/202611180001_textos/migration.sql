BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Regras adicionais: nenhum registro é corrigido ou removido.
ALTER TABLE usuarios ADD CONSTRAINT aud_usuarios_nome_conteudo CHECK (btrim(nome, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) <> '') NOT VALID;
ALTER TABLE usuarios VALIDATE CONSTRAINT aud_usuarios_nome_conteudo;

ALTER TABLE republicas ADD CONSTRAINT aud_republicas_nome_conteudo CHECK (btrim(nome, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) <> '') NOT VALID;
ALTER TABLE republicas VALIDATE CONSTRAINT aud_republicas_nome_conteudo;

ALTER TABLE despesas ADD CONSTRAINT aud_despesas_titulo_conteudo CHECK (btrim(titulo, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) <> '') NOT VALID;
ALTER TABLE despesas VALIDATE CONSTRAINT aud_despesas_titulo_conteudo;

ALTER TABLE despesas ADD CONSTRAINT aud_despesas_categoria_conteudo CHECK (btrim(categoria, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) <> '') NOT VALID;
ALTER TABLE despesas VALIDATE CONSTRAINT aud_despesas_categoria_conteudo;

ALTER TABLE tarefas ADD CONSTRAINT aud_tarefas_titulo_conteudo CHECK (btrim(titulo, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) <> '') NOT VALID;
ALTER TABLE tarefas VALIDATE CONSTRAINT aud_tarefas_titulo_conteudo;

ALTER TABLE configuracoes_recorrencia ADD CONSTRAINT aud_configuracoes_recorrencia_titulo_conteudo CHECK (btrim(titulo, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) <> '') NOT VALID;
ALTER TABLE configuracoes_recorrencia VALIDATE CONSTRAINT aud_configuracoes_recorrencia_titulo_conteudo;

ALTER TABLE configuracoes_recorrencia ADD CONSTRAINT aud_configuracoes_recorrencia_categoria_conteudo CHECK (btrim(categoria, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) <> '') NOT VALID;
ALTER TABLE configuracoes_recorrencia VALIDATE CONSTRAINT aud_configuracoes_recorrencia_categoria_conteudo;

ALTER TABLE tarefas ADD CONSTRAINT aud_tarefas_descricao_utf16 CHECK ((char_length(descricao) + char_length(regexp_replace(descricao, U&'[^\+010000-\+10FFFF]', '', 'g'))) <= 5000) NOT VALID;
ALTER TABLE tarefas VALIDATE CONSTRAINT aud_tarefas_descricao_utf16;

ALTER TABLE usuarios ADD CONSTRAINT aud_usuarios_nome_utf16 CHECK ((char_length(nome) + char_length(regexp_replace(nome, U&'[^\+010000-\+10FFFF]', '', 'g'))) <= 120) NOT VALID;
ALTER TABLE usuarios VALIDATE CONSTRAINT aud_usuarios_nome_utf16;

ALTER TABLE republicas ADD CONSTRAINT aud_republicas_nome_utf16 CHECK ((char_length(nome) + char_length(regexp_replace(nome, U&'[^\+010000-\+10FFFF]', '', 'g'))) <= 120) NOT VALID;
ALTER TABLE republicas VALIDATE CONSTRAINT aud_republicas_nome_utf16;

ALTER TABLE despesas ADD CONSTRAINT aud_despesas_titulo_utf16 CHECK ((char_length(titulo) + char_length(regexp_replace(titulo, U&'[^\+010000-\+10FFFF]', '', 'g'))) <= 160) NOT VALID;
ALTER TABLE despesas VALIDATE CONSTRAINT aud_despesas_titulo_utf16;

ALTER TABLE despesas ADD CONSTRAINT aud_despesas_categoria_utf16 CHECK ((char_length(categoria) + char_length(regexp_replace(categoria, U&'[^\+010000-\+10FFFF]', '', 'g'))) <= 80) NOT VALID;
ALTER TABLE despesas VALIDATE CONSTRAINT aud_despesas_categoria_utf16;

ALTER TABLE tarefas ADD CONSTRAINT aud_tarefas_titulo_utf16 CHECK ((char_length(titulo) + char_length(regexp_replace(titulo, U&'[^\+010000-\+10FFFF]', '', 'g'))) <= 160) NOT VALID;
ALTER TABLE tarefas VALIDATE CONSTRAINT aud_tarefas_titulo_utf16;

ALTER TABLE configuracoes_recorrencia ADD CONSTRAINT aud_configuracoes_recorrencia_titulo_utf16 CHECK ((char_length(titulo) + char_length(regexp_replace(titulo, U&'[^\+010000-\+10FFFF]', '', 'g'))) <= 160) NOT VALID;
ALTER TABLE configuracoes_recorrencia VALIDATE CONSTRAINT aud_configuracoes_recorrencia_titulo_utf16;

ALTER TABLE configuracoes_recorrencia ADD CONSTRAINT aud_configuracoes_recorrencia_categoria_utf16 CHECK ((char_length(categoria) + char_length(regexp_replace(categoria, U&'[^\+010000-\+10FFFF]', '', 'g'))) <= 80) NOT VALID;
ALTER TABLE configuracoes_recorrencia VALIDATE CONSTRAINT aud_configuracoes_recorrencia_categoria_utf16;

ALTER TABLE republicas ADD CONSTRAINT aud_republicas_endereco_utf16 CHECK ((char_length(endereco) + char_length(regexp_replace(endereco, U&'[^\+010000-\+10FFFF]', '', 'g'))) <= 255) NOT VALID;
ALTER TABLE republicas VALIDATE CONSTRAINT aud_republicas_endereco_utf16;

COMMIT;
