-- Auditoria somente de leitura. Não é uma migration.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '2s';

-- Identidade do ambiente, sem credenciais
SELECT current_database() banco, current_schema() schema, current_setting('server_version') versao, current_setting('TimeZone') fuso_sessao, current_setting('transaction_read_only') somente_leitura, current_setting('transaction_isolation') isolamento, current_timestamp instante;

-- Todas as colunas físicas
SELECT c.relname tabela, a.attnum ordem, a.attname coluna, format_type(a.atttypid,a.atttypmod) tipo, NOT a.attnotnull aceita_null, pg_get_expr(d.adbin,d.adrelid) padrao FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname,a.attnum;

-- Constraints existentes e validação
SELECT c.relname tabela, con.conname nome, con.contype tipo, con.convalidated validada, con.condeferrable adiavel, pg_get_constraintdef(con.oid) definicao FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,con.conname;

-- Índices, inclusive unicidade parcial
SELECT tablename tabela,indexname nome,indexdef definicao FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname;

-- Triggers não internas
SELECT c.relname tabela,t.tgname nome,t.tgenabled habilitada,pg_get_triggerdef(t.oid) definicao FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname;

-- Funções de integridade
SELECT p.proname nome,pg_get_functiondef(p.oid) definicao FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prorettype='trigger'::regtype ORDER BY p.proname;

-- Todas as FKs, por coluna e alvo
SELECT c.relname tabela,con.conname nome,a.attname coluna,ref.relname tabela_alvo,ra.attname coluna_alvo,con.convalidated validada FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_class ref ON ref.oid=con.confrelid CROSS JOIN LATERAL unnest(con.conkey,con.confkey) AS keys(src,dst) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=keys.src JOIN pg_attribute ra ON ra.attrelid=ref.oid AND ra.attnum=keys.dst WHERE n.nspname='public' AND con.contype='f' ORDER BY c.relname,a.attname;

-- Domínios enum
SELECT t.typname nome,array_agg(e.enumlabel::text ORDER BY e.enumsortorder) valores FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname;

-- Linhas atuais: _prisma_migrations
SELECT count(*)::integer quantidade FROM public."_prisma_migrations";

-- Linhas atuais: competencias_recorrencia
SELECT count(*)::integer quantidade FROM public."competencias_recorrencia";

-- Linhas atuais: comprovantes
SELECT count(*)::integer quantidade FROM public."comprovantes";

-- Linhas atuais: configuracoes_recorrencia
SELECT count(*)::integer quantidade FROM public."configuracoes_recorrencia";

-- Linhas atuais: desafios_google
SELECT count(*)::integer quantidade FROM public."desafios_google";

-- Linhas atuais: despesas
SELECT count(*)::integer quantidade FROM public."despesas";

-- Linhas atuais: identidades_google
SELECT count(*)::integer quantidade FROM public."identidades_google";

-- Linhas atuais: membros_republica
SELECT count(*)::integer quantidade FROM public."membros_republica";

-- Linhas atuais: pagamentos
SELECT count(*)::integer quantidade FROM public."pagamentos";

-- Linhas atuais: rateios_despesa
SELECT count(*)::integer quantidade FROM public."rateios_despesa";

-- Linhas atuais: recorrencias_despesa
SELECT count(*)::integer quantidade FROM public."recorrencias_despesa";

-- Linhas atuais: recorrencias_participantes
SELECT count(*)::integer quantidade FROM public."recorrencias_participantes";

-- Linhas atuais: republicas
SELECT count(*)::integer quantidade FROM public."republicas";

-- Linhas atuais: tarefas
SELECT count(*)::integer quantidade FROM public."tarefas";

-- Linhas atuais: usuarios
SELECT count(*)::integer quantidade FROM public."usuarios";

-- C01: nome: ao menos um caractere após o trim ECMAScript
SELECT count(*)::integer AS violacoes FROM public.usuarios WHERE btrim(nome, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) = '';

-- C02: nome: ao menos um caractere após o trim ECMAScript
SELECT count(*)::integer AS violacoes FROM public.republicas WHERE btrim(nome, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) = '';

-- C03: titulo: ao menos um caractere após o trim ECMAScript
SELECT count(*)::integer AS violacoes FROM public.despesas WHERE btrim(titulo, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) = '';

-- C04: categoria: ao menos um caractere após o trim ECMAScript
SELECT count(*)::integer AS violacoes FROM public.despesas WHERE btrim(categoria, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) = '';

-- C05: titulo: ao menos um caractere após o trim ECMAScript
SELECT count(*)::integer AS violacoes FROM public.tarefas WHERE btrim(titulo, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) = '';

-- C06: titulo: ao menos um caractere após o trim ECMAScript
SELECT count(*)::integer AS violacoes FROM public.configuracoes_recorrencia WHERE btrim(titulo, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) = '';

-- C07: categoria: ao menos um caractere após o trim ECMAScript
SELECT count(*)::integer AS violacoes FROM public.configuracoes_recorrencia WHERE btrim(categoria, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279)) = '';

-- C08: descricao: até 5000 unidades UTF-16, mantendo NULL permitido
SELECT count(*)::integer AS violacoes FROM public.tarefas WHERE descricao IS NOT NULL AND (char_length(descricao) + char_length(regexp_replace(descricao, U&'[^\+010000-\+10FFFF]', '', 'g'))) > 5000;

-- C09: versao_token não negativa
SELECT count(*)::integer AS violacoes FROM public.usuarios WHERE versao_token < 0;

-- C10: finalidade exclusao exige versao_token explicitamente não nula e não negativa
SELECT count(*)::integer AS violacoes FROM public.desafios_google WHERE finalidade = 'exclusao' AND (versao_token IS NULL OR versao_token < 0);

-- C11: hash_requisicao: NULL legado ou SHA-256 hexadecimal minúsculo
SELECT count(*)::integer AS violacoes FROM public.pagamentos WHERE hash_requisicao IS NOT NULL AND hash_requisicao !~ '^[a-f0-9]{64}$';

-- C12: hash_requisicao: SHA-256 hexadecimal minúsculo
SELECT count(*)::integer AS violacoes FROM public.recorrencias_despesa WHERE hash_requisicao !~ '^[a-f0-9]{64}$';

-- C13: valor_total: número finito, sem NaN
SELECT count(*)::integer AS violacoes FROM public.despesas WHERE valor_total::text IN ('NaN', 'Infinity', '-Infinity');

-- C14: valor_devido: número finito, sem NaN
SELECT count(*)::integer AS violacoes FROM public.rateios_despesa WHERE valor_devido::text IN ('NaN', 'Infinity', '-Infinity');

-- C15: valor_pago: número finito, sem NaN
SELECT count(*)::integer AS violacoes FROM public.rateios_despesa WHERE valor_pago::text IN ('NaN', 'Infinity', '-Infinity');

-- C16: valor: número finito, sem NaN
SELECT count(*)::integer AS violacoes FROM public.pagamentos WHERE valor::text IN ('NaN', 'Infinity', '-Infinity');

-- C17: valor_total: número finito, sem NaN
SELECT count(*)::integer AS violacoes FROM public.configuracoes_recorrencia WHERE valor_total::text IN ('NaN', 'Infinity', '-Infinity');

-- C18: versao positiva
SELECT count(*)::integer AS violacoes FROM public.configuracoes_recorrencia WHERE versao <= 0;

-- C19: vencimento: data finita, preservando a nulabilidade atual
SELECT count(*)::integer AS violacoes FROM public.despesas WHERE vencimento IS NOT NULL AND NOT isfinite(vencimento);

-- C20: prazo: data finita, preservando a nulabilidade atual
SELECT count(*)::integer AS violacoes FROM public.tarefas WHERE prazo IS NOT NULL AND NOT isfinite(prazo);

-- C21: inicio: data finita, preservando a nulabilidade atual
SELECT count(*)::integer AS violacoes FROM public.recorrencias_despesa WHERE inicio IS NOT NULL AND NOT isfinite(inicio);

-- C22: proxima_competencia: data finita, preservando a nulabilidade atual
SELECT count(*)::integer AS violacoes FROM public.recorrencias_despesa WHERE proxima_competencia IS NOT NULL AND NOT isfinite(proxima_competencia);

-- C23: vigencia: data finita, preservando a nulabilidade atual
SELECT count(*)::integer AS violacoes FROM public.configuracoes_recorrencia WHERE vigencia IS NOT NULL AND NOT isfinite(vigencia);

-- C24: competencia: data finita, preservando a nulabilidade atual
SELECT count(*)::integer AS violacoes FROM public.competencias_recorrencia WHERE competencia IS NOT NULL AND NOT isfinite(competencia);

-- C25: revisada_em e revisada_por_id preenchidos ou ausentes juntos
SELECT count(*)::integer AS violacoes FROM public.competencias_recorrencia WHERE (revisada_em IS NULL) <> (revisada_por_id IS NULL);

-- C26: pausa_motivo limitado aos motivos emitidos pelo gerador
SELECT count(*)::integer AS violacoes FROM public.recorrencias_despesa WHERE pausa_motivo IS NOT NULL AND pausa_motivo NOT IN ('PARTICIPANTES_INATIVOS','REPUBLICA_OU_ADMIN_INATIVO');

-- C27: motivo limitado aos motivos emitidos pelo gerador, inclusive após revisão
SELECT count(*)::integer AS violacoes FROM public.competencias_recorrencia WHERE motivo IS NOT NULL AND motivo NOT IN ('PERIODO_NAO_GERADO','PARTICIPANTES_INATIVOS','REPUBLICA_OU_ADMIN_INATIVO');

-- C28: email compatível com a expressão de z.email() instalada
SELECT count(*)::integer AS violacoes FROM public.usuarios WHERE email !~ '^(?:[A-Za-z0-9_''+\-]+\.)*[A-Za-z0-9_''+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$';

-- C29: nome: até 120 unidades UTF-16, sem restringir acentos
SELECT count(*)::integer AS violacoes FROM public.usuarios WHERE nome IS NOT NULL AND (char_length(nome) + char_length(regexp_replace(nome, U&'[^\+010000-\+10FFFF]', '', 'g'))) > 120;

-- C30: nome: até 120 unidades UTF-16, sem restringir acentos
SELECT count(*)::integer AS violacoes FROM public.republicas WHERE nome IS NOT NULL AND (char_length(nome) + char_length(regexp_replace(nome, U&'[^\+010000-\+10FFFF]', '', 'g'))) > 120;

-- C31: titulo: até 160 unidades UTF-16, sem restringir acentos
SELECT count(*)::integer AS violacoes FROM public.despesas WHERE titulo IS NOT NULL AND (char_length(titulo) + char_length(regexp_replace(titulo, U&'[^\+010000-\+10FFFF]', '', 'g'))) > 160;

-- C32: categoria: até 80 unidades UTF-16, sem restringir acentos
SELECT count(*)::integer AS violacoes FROM public.despesas WHERE categoria IS NOT NULL AND (char_length(categoria) + char_length(regexp_replace(categoria, U&'[^\+010000-\+10FFFF]', '', 'g'))) > 80;

-- C33: titulo: até 160 unidades UTF-16, sem restringir acentos
SELECT count(*)::integer AS violacoes FROM public.tarefas WHERE titulo IS NOT NULL AND (char_length(titulo) + char_length(regexp_replace(titulo, U&'[^\+010000-\+10FFFF]', '', 'g'))) > 160;

-- C34: titulo: até 160 unidades UTF-16, sem restringir acentos
SELECT count(*)::integer AS violacoes FROM public.configuracoes_recorrencia WHERE titulo IS NOT NULL AND (char_length(titulo) + char_length(regexp_replace(titulo, U&'[^\+010000-\+10FFFF]', '', 'g'))) > 160;

-- C35: categoria: até 80 unidades UTF-16, sem restringir acentos
SELECT count(*)::integer AS violacoes FROM public.configuracoes_recorrencia WHERE categoria IS NOT NULL AND (char_length(categoria) + char_length(regexp_replace(categoria, U&'[^\+010000-\+10FFFF]', '', 'g'))) > 80;

-- C36: endereco: até 255 unidades UTF-16, sem restringir acentos
SELECT count(*)::integer AS violacoes FROM public.republicas WHERE endereco IS NOT NULL AND (char_length(endereco) + char_length(regexp_replace(endereco, U&'[^\+010000-\+10FFFF]', '', 'g'))) > 255;

-- D01: rateios de outra república
SELECT count(*)::integer AS violacoes FROM public.rateios_despesa rd JOIN public.despesas d ON d.id=rd.despesa_id JOIN public.membros_republica m ON m.id=rd.membro_id WHERE d.republica_id<>m.republica_id;

-- D02: pagamento de membro diferente do rateio
SELECT count(*)::integer AS violacoes FROM public.pagamentos p JOIN public.rateios_despesa r ON r.id=p.rateio_id WHERE p.membro_id<>r.membro_id;

-- D03: tarefa e responsável de repúblicas diferentes
SELECT count(*)::integer AS violacoes FROM public.tarefas t JOIN public.membros_republica m ON m.id=t.responsavel_id WHERE t.republica_id<>m.republica_id;

-- D04: despesa sem rateios, soma divergente ou divisão desigual
SELECT count(*)::integer AS violacoes FROM public.despesas d LEFT JOIN LATERAL (SELECT count(*) n, sum(valor_devido) total, max(valor_devido)-min(valor_devido) diferenca FROM public.rateios_despesa r WHERE r.despesa_id=d.id) s ON true WHERE s.n=0 OR s.total IS DISTINCT FROM d.valor_total OR s.diferenca>0.01;

-- D05: valor_pago divergente da soma dos pagamentos
SELECT count(*)::integer AS violacoes FROM public.rateios_despesa r WHERE r.valor_pago IS DISTINCT FROM (SELECT coalesce(sum(p.valor),0) FROM public.pagamentos p WHERE p.rateio_id=r.id);

-- D06: status da despesa divergente das parcelas
SELECT count(*)::integer AS violacoes FROM public.despesas d WHERE (d.status='PAGA') IS DISTINCT FROM NOT EXISTS (SELECT 1 FROM public.rateios_despesa r WHERE r.despesa_id=d.id AND r.status<>'PAGO');

-- D07: usuário com mais de um vínculo ativo (linhas excedentes)
SELECT coalesce(sum(n-1),0)::integer AS violacoes FROM (SELECT count(*) n FROM public.membros_republica WHERE ativo GROUP BY usuario_id HAVING count(*)>1) x;

-- D08: conta sem senha e sem identidade Google
SELECT count(*)::integer AS violacoes FROM public.usuarios u WHERE u.senha_hash IS NULL AND NOT EXISTS (SELECT 1 FROM public.identidades_google g WHERE g.usuario_id=u.id);

-- D09: administrador sem perfil ou vínculo coerente (ativo da conta não é exigido aqui)
SELECT count(*)::integer AS violacoes FROM public.republicas r JOIN public.usuarios u ON u.id=r.admin_id WHERE u.tipo_usuario NOT IN ('USUARIO_ADMIN','USUARIO_MASTER') OR NOT EXISTS (SELECT 1 FROM public.membros_republica m WHERE m.usuario_id=u.id AND m.republica_id=r.id AND m.ativo);

-- D10: excluído com dívida, administração ou vínculo ativo
SELECT count(*)::integer AS violacoes FROM public.usuarios u WHERE u.excluido_em IS NOT NULL AND (u.ativo OR EXISTS(SELECT 1 FROM public.republicas r WHERE r.admin_id=u.id) OR EXISTS(SELECT 1 FROM public.membros_republica m WHERE m.usuario_id=u.id AND m.ativo) OR EXISTS(SELECT 1 FROM public.rateios_despesa r JOIN public.membros_republica m ON m.id=r.membro_id WHERE m.usuario_id=u.id AND r.valor_pago<r.valor_devido));

-- D11: configuração recorrente sem participantes ou sem um centavo por participante
SELECT count(*)::integer AS violacoes FROM public.configuracoes_recorrencia c LEFT JOIN LATERAL(SELECT count(*) n FROM public.recorrencias_participantes p WHERE p.configuracao_id=c.id) s ON true WHERE s.n=0 OR c.valor_total<s.n*0.01;

-- D12: participante recorrente de outra república (inatividade histórica é permitida)
SELECT count(*)::integer AS violacoes FROM public.recorrencias_participantes p JOIN public.configuracoes_recorrencia c ON c.id=p.configuracao_id JOIN public.recorrencias_despesa r ON r.id=c.recorrencia_id JOIN public.membros_republica m ON m.id=p.membro_id WHERE r.republica_id<>m.republica_id;

-- D13: comprovante com tamanho, hash ou MIME incoerente
SELECT count(*)::integer AS violacoes FROM public.comprovantes WHERE tamanho NOT BETWEEN 1 AND 5242880 OR tamanho<>octet_length(conteudo) OR hash_sha256<>encode(sha256(conteudo),'hex') OR mime_type NOT IN ('application/pdf','image/png','image/jpeg','image/webp');

-- D14: pagamento legado sem hash (não é violação: preservar NULL)
SELECT count(*)::integer AS quantidade FROM public.pagamentos WHERE hash_requisicao IS NULL;

-- D15: referência legada de comprovante sem conteúdo importado
SELECT count(*)::integer AS quantidade FROM public.pagamentos p WHERE p.comprovante_url IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.comprovantes c WHERE c.pagamento_id=p.id);

-- D16: MASTER ativos (zero não é violação do fluxo inicial; regra de último MASTER é transicional)
SELECT count(*)::integer AS quantidade FROM public.usuarios WHERE tipo_usuario='USUARIO_MASTER' AND ativo AND excluido_em IS NULL;

-- D17: contas atualmente excluídas (não revela reativações passadas)
SELECT count(*)::integer AS quantidade FROM public.usuarios WHERE excluido_em IS NOT NULL;

-- D18: view de vencimento divergente da data de Brasília nesta leitura
SELECT count(*)::integer AS violacoes FROM public.despesas_com_status v JOIN public.despesas d ON d.id=v.id WHERE v.status_calculado IS DISTINCT FROM CASE WHEN d.status='PAGA' THEN 'PAGA' WHEN d.vencimento < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date THEN 'VENCIDA' ELSE 'PENDENTE' END;

-- Órfãos: competencias_recorrencia_configuracao_id_fkey
SELECT count(*)::integer AS violacoes FROM public."competencias_recorrencia" t LEFT JOIN public."configuracoes_recorrencia" r ON t."configuracao_id"=r."id" WHERE t."configuracao_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: competencias_recorrencia_despesa_id_fkey
SELECT count(*)::integer AS violacoes FROM public."competencias_recorrencia" t LEFT JOIN public."despesas" r ON t."despesa_id"=r."id" WHERE t."despesa_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: competencias_recorrencia_recorrencia_id_fkey
SELECT count(*)::integer AS violacoes FROM public."competencias_recorrencia" t LEFT JOIN public."recorrencias_despesa" r ON t."recorrencia_id"=r."id" WHERE t."recorrencia_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: competencias_recorrencia_revisada_por_id_fkey
SELECT count(*)::integer AS violacoes FROM public."competencias_recorrencia" t LEFT JOIN public."usuarios" r ON t."revisada_por_id"=r."id" WHERE t."revisada_por_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: comprovantes_pagamento_id_fkey
SELECT count(*)::integer AS violacoes FROM public."comprovantes" t LEFT JOIN public."pagamentos" r ON t."pagamento_id"=r."id" WHERE t."pagamento_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: configuracoes_recorrencia_recorrencia_id_fkey
SELECT count(*)::integer AS violacoes FROM public."configuracoes_recorrencia" t LEFT JOIN public."recorrencias_despesa" r ON t."recorrencia_id"=r."id" WHERE t."recorrencia_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: desafios_google_usuario_id_fkey
SELECT count(*)::integer AS violacoes FROM public."desafios_google" t LEFT JOIN public."usuarios" r ON t."usuario_id"=r."id" WHERE t."usuario_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: despesas_criada_por_id_fkey
SELECT count(*)::integer AS violacoes FROM public."despesas" t LEFT JOIN public."usuarios" r ON t."criada_por_id"=r."id" WHERE t."criada_por_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: despesas_republica_id_fkey
SELECT count(*)::integer AS violacoes FROM public."despesas" t LEFT JOIN public."republicas" r ON t."republica_id"=r."id" WHERE t."republica_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: identidades_google_usuario_id_fkey
SELECT count(*)::integer AS violacoes FROM public."identidades_google" t LEFT JOIN public."usuarios" r ON t."usuario_id"=r."id" WHERE t."usuario_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: membros_republica_republica_id_fkey
SELECT count(*)::integer AS violacoes FROM public."membros_republica" t LEFT JOIN public."republicas" r ON t."republica_id"=r."id" WHERE t."republica_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: membros_republica_usuario_id_fkey
SELECT count(*)::integer AS violacoes FROM public."membros_republica" t LEFT JOIN public."usuarios" r ON t."usuario_id"=r."id" WHERE t."usuario_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: pagamentos_membro_id_fkey
SELECT count(*)::integer AS violacoes FROM public."pagamentos" t LEFT JOIN public."membros_republica" r ON t."membro_id"=r."id" WHERE t."membro_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: pagamentos_rateio_id_fkey
SELECT count(*)::integer AS violacoes FROM public."pagamentos" t LEFT JOIN public."rateios_despesa" r ON t."rateio_id"=r."id" WHERE t."rateio_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: rateios_despesa_despesa_id_fkey
SELECT count(*)::integer AS violacoes FROM public."rateios_despesa" t LEFT JOIN public."despesas" r ON t."despesa_id"=r."id" WHERE t."despesa_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: rateios_despesa_membro_id_fkey
SELECT count(*)::integer AS violacoes FROM public."rateios_despesa" t LEFT JOIN public."membros_republica" r ON t."membro_id"=r."id" WHERE t."membro_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: recorrencias_despesa_criada_por_id_fkey
SELECT count(*)::integer AS violacoes FROM public."recorrencias_despesa" t LEFT JOIN public."usuarios" r ON t."criada_por_id"=r."id" WHERE t."criada_por_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: recorrencias_despesa_despesa_origem_id_fkey
SELECT count(*)::integer AS violacoes FROM public."recorrencias_despesa" t LEFT JOIN public."despesas" r ON t."despesa_origem_id"=r."id" WHERE t."despesa_origem_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: recorrencias_despesa_republica_id_fkey
SELECT count(*)::integer AS violacoes FROM public."recorrencias_despesa" t LEFT JOIN public."republicas" r ON t."republica_id"=r."id" WHERE t."republica_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: recorrencias_participantes_configuracao_id_fkey
SELECT count(*)::integer AS violacoes FROM public."recorrencias_participantes" t LEFT JOIN public."configuracoes_recorrencia" r ON t."configuracao_id"=r."id" WHERE t."configuracao_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: recorrencias_participantes_membro_id_fkey
SELECT count(*)::integer AS violacoes FROM public."recorrencias_participantes" t LEFT JOIN public."membros_republica" r ON t."membro_id"=r."id" WHERE t."membro_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: republicas_admin_id_fkey
SELECT count(*)::integer AS violacoes FROM public."republicas" t LEFT JOIN public."usuarios" r ON t."admin_id"=r."id" WHERE t."admin_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: tarefas_republica_id_fkey
SELECT count(*)::integer AS violacoes FROM public."tarefas" t LEFT JOIN public."republicas" r ON t."republica_id"=r."id" WHERE t."republica_id" IS NOT NULL AND r."id" IS NULL;

-- Órfãos: tarefas_responsavel_id_fkey
SELECT count(*)::integer AS violacoes FROM public."tarefas" t LEFT JOIN public."membros_republica" r ON t."responsavel_id"=r."id" WHERE t."responsavel_id" IS NOT NULL AND r."id" IS NULL;

-- Views existentes
SELECT viewname nome,definition definicao FROM pg_views WHERE schemaname='public' ORDER BY viewname;

-- NULL por coluna: _prisma_migrations
SELECT count(*) FILTER (WHERE "id" IS NULL)::integer AS "id",count(*) FILTER (WHERE "checksum" IS NULL)::integer AS "checksum",count(*) FILTER (WHERE "finished_at" IS NULL)::integer AS "finished_at",count(*) FILTER (WHERE "migration_name" IS NULL)::integer AS "migration_name",count(*) FILTER (WHERE "logs" IS NULL)::integer AS "logs",count(*) FILTER (WHERE "rolled_back_at" IS NULL)::integer AS "rolled_back_at",count(*) FILTER (WHERE "started_at" IS NULL)::integer AS "started_at",count(*) FILTER (WHERE "applied_steps_count" IS NULL)::integer AS "applied_steps_count" FROM public."_prisma_migrations";

-- NULL por coluna: competencias_recorrencia
SELECT count(*) FILTER (WHERE "recorrencia_id" IS NULL)::integer AS "recorrencia_id",count(*) FILTER (WHERE "competencia" IS NULL)::integer AS "competencia",count(*) FILTER (WHERE "configuracao_id" IS NULL)::integer AS "configuracao_id",count(*) FILTER (WHERE "despesa_id" IS NULL)::integer AS "despesa_id",count(*) FILTER (WHERE "estado" IS NULL)::integer AS "estado",count(*) FILTER (WHERE "motivo" IS NULL)::integer AS "motivo",count(*) FILTER (WHERE "snapshot" IS NULL)::integer AS "snapshot",count(*) FILTER (WHERE "revisada_por_id" IS NULL)::integer AS "revisada_por_id",count(*) FILTER (WHERE "revisada_em" IS NULL)::integer AS "revisada_em" FROM public."competencias_recorrencia";

-- NULL por coluna: comprovantes
SELECT count(*) FILTER (WHERE "pagamento_id" IS NULL)::integer AS "pagamento_id",count(*) FILTER (WHERE "conteudo" IS NULL)::integer AS "conteudo",count(*) FILTER (WHERE "mime_type" IS NULL)::integer AS "mime_type",count(*) FILTER (WHERE "tamanho" IS NULL)::integer AS "tamanho",count(*) FILTER (WHERE "hash_sha256" IS NULL)::integer AS "hash_sha256",count(*) FILTER (WHERE "criado_em" IS NULL)::integer AS "criado_em" FROM public."comprovantes";

-- NULL por coluna: configuracoes_recorrencia
SELECT count(*) FILTER (WHERE "id" IS NULL)::integer AS "id",count(*) FILTER (WHERE "versao" IS NULL)::integer AS "versao",count(*) FILTER (WHERE "recorrencia_id" IS NULL)::integer AS "recorrencia_id",count(*) FILTER (WHERE "vigencia" IS NULL)::integer AS "vigencia",count(*) FILTER (WHERE "titulo" IS NULL)::integer AS "titulo",count(*) FILTER (WHERE "categoria" IS NULL)::integer AS "categoria",count(*) FILTER (WHERE "valor_total" IS NULL)::integer AS "valor_total",count(*) FILTER (WHERE "dia_vencimento" IS NULL)::integer AS "dia_vencimento",count(*) FILTER (WHERE "criada_em" IS NULL)::integer AS "criada_em" FROM public."configuracoes_recorrencia";

-- NULL por coluna: desafios_google
SELECT count(*) FILTER (WHERE "id" IS NULL)::integer AS "id",count(*) FILTER (WHERE "nonce_hash" IS NULL)::integer AS "nonce_hash",count(*) FILTER (WHERE "cookie_hash" IS NULL)::integer AS "cookie_hash",count(*) FILTER (WHERE "finalidade" IS NULL)::integer AS "finalidade",count(*) FILTER (WHERE "usuario_id" IS NULL)::integer AS "usuario_id",count(*) FILTER (WHERE "versao_token" IS NULL)::integer AS "versao_token",count(*) FILTER (WHERE "expira_em" IS NULL)::integer AS "expira_em",count(*) FILTER (WHERE "consumido_em" IS NULL)::integer AS "consumido_em" FROM public."desafios_google";

-- NULL por coluna: despesas
SELECT count(*) FILTER (WHERE "id" IS NULL)::integer AS "id",count(*) FILTER (WHERE "republica_id" IS NULL)::integer AS "republica_id",count(*) FILTER (WHERE "criada_por_id" IS NULL)::integer AS "criada_por_id",count(*) FILTER (WHERE "titulo" IS NULL)::integer AS "titulo",count(*) FILTER (WHERE "categoria" IS NULL)::integer AS "categoria",count(*) FILTER (WHERE "valor_total" IS NULL)::integer AS "valor_total",count(*) FILTER (WHERE "vencimento" IS NULL)::integer AS "vencimento",count(*) FILTER (WHERE "status" IS NULL)::integer AS "status",count(*) FILTER (WHERE "criada_em" IS NULL)::integer AS "criada_em" FROM public."despesas";

-- NULL por coluna: identidades_google
SELECT count(*) FILTER (WHERE "sub" IS NULL)::integer AS "sub",count(*) FILTER (WHERE "usuario_id" IS NULL)::integer AS "usuario_id",count(*) FILTER (WHERE "criada_em" IS NULL)::integer AS "criada_em" FROM public."identidades_google";

-- NULL por coluna: membros_republica
SELECT count(*) FILTER (WHERE "id" IS NULL)::integer AS "id",count(*) FILTER (WHERE "usuario_id" IS NULL)::integer AS "usuario_id",count(*) FILTER (WHERE "republica_id" IS NULL)::integer AS "republica_id",count(*) FILTER (WHERE "ativo" IS NULL)::integer AS "ativo",count(*) FILTER (WHERE "entrou_em" IS NULL)::integer AS "entrou_em" FROM public."membros_republica";

-- NULL por coluna: pagamentos
SELECT count(*) FILTER (WHERE "id" IS NULL)::integer AS "id",count(*) FILTER (WHERE "rateio_id" IS NULL)::integer AS "rateio_id",count(*) FILTER (WHERE "membro_id" IS NULL)::integer AS "membro_id",count(*) FILTER (WHERE "valor" IS NULL)::integer AS "valor",count(*) FILTER (WHERE "comprovante_url" IS NULL)::integer AS "comprovante_url",count(*) FILTER (WHERE "data_pagamento" IS NULL)::integer AS "data_pagamento",count(*) FILTER (WHERE "chave_idempotencia" IS NULL)::integer AS "chave_idempotencia",count(*) FILTER (WHERE "hash_requisicao" IS NULL)::integer AS "hash_requisicao" FROM public."pagamentos";

-- NULL por coluna: rateios_despesa
SELECT count(*) FILTER (WHERE "id" IS NULL)::integer AS "id",count(*) FILTER (WHERE "despesa_id" IS NULL)::integer AS "despesa_id",count(*) FILTER (WHERE "membro_id" IS NULL)::integer AS "membro_id",count(*) FILTER (WHERE "valor_devido" IS NULL)::integer AS "valor_devido",count(*) FILTER (WHERE "valor_pago" IS NULL)::integer AS "valor_pago",count(*) FILTER (WHERE "status" IS NULL)::integer AS "status" FROM public."rateios_despesa";

-- NULL por coluna: recorrencias_despesa
SELECT count(*) FILTER (WHERE "id" IS NULL)::integer AS "id",count(*) FILTER (WHERE "republica_id" IS NULL)::integer AS "republica_id",count(*) FILTER (WHERE "criada_por_id" IS NULL)::integer AS "criada_por_id",count(*) FILTER (WHERE "despesa_origem_id" IS NULL)::integer AS "despesa_origem_id",count(*) FILTER (WHERE "inicio" IS NULL)::integer AS "inicio",count(*) FILTER (WHERE "proxima_competencia" IS NULL)::integer AS "proxima_competencia",count(*) FILTER (WHERE "ativa" IS NULL)::integer AS "ativa",count(*) FILTER (WHERE "pausa_motivo" IS NULL)::integer AS "pausa_motivo",count(*) FILTER (WHERE "chave_idempotencia" IS NULL)::integer AS "chave_idempotencia",count(*) FILTER (WHERE "hash_requisicao" IS NULL)::integer AS "hash_requisicao",count(*) FILTER (WHERE "criada_em" IS NULL)::integer AS "criada_em" FROM public."recorrencias_despesa";

-- NULL por coluna: recorrencias_participantes
SELECT count(*) FILTER (WHERE "configuracao_id" IS NULL)::integer AS "configuracao_id",count(*) FILTER (WHERE "membro_id" IS NULL)::integer AS "membro_id" FROM public."recorrencias_participantes";

-- NULL por coluna: republicas
SELECT count(*) FILTER (WHERE "id" IS NULL)::integer AS "id",count(*) FILTER (WHERE "nome" IS NULL)::integer AS "nome",count(*) FILTER (WHERE "codigo_entrada" IS NULL)::integer AS "codigo_entrada",count(*) FILTER (WHERE "admin_id" IS NULL)::integer AS "admin_id",count(*) FILTER (WHERE "ativa" IS NULL)::integer AS "ativa",count(*) FILTER (WHERE "criada_em" IS NULL)::integer AS "criada_em",count(*) FILTER (WHERE "endereco" IS NULL)::integer AS "endereco" FROM public."republicas";

-- NULL por coluna: tarefas
SELECT count(*) FILTER (WHERE "id" IS NULL)::integer AS "id",count(*) FILTER (WHERE "republica_id" IS NULL)::integer AS "republica_id",count(*) FILTER (WHERE "responsavel_id" IS NULL)::integer AS "responsavel_id",count(*) FILTER (WHERE "titulo" IS NULL)::integer AS "titulo",count(*) FILTER (WHERE "descricao" IS NULL)::integer AS "descricao",count(*) FILTER (WHERE "prazo" IS NULL)::integer AS "prazo",count(*) FILTER (WHERE "status" IS NULL)::integer AS "status",count(*) FILTER (WHERE "criada_em" IS NULL)::integer AS "criada_em" FROM public."tarefas";

-- NULL por coluna: usuarios
SELECT count(*) FILTER (WHERE "id" IS NULL)::integer AS "id",count(*) FILTER (WHERE "nome" IS NULL)::integer AS "nome",count(*) FILTER (WHERE "email" IS NULL)::integer AS "email",count(*) FILTER (WHERE "senha_hash" IS NULL)::integer AS "senha_hash",count(*) FILTER (WHERE "tipo_usuario" IS NULL)::integer AS "tipo_usuario",count(*) FILTER (WHERE "ativo" IS NULL)::integer AS "ativo",count(*) FILTER (WHERE "criado_em" IS NULL)::integer AS "criado_em",count(*) FILTER (WHERE "versao_token" IS NULL)::integer AS "versao_token",count(*) FILTER (WHERE "excluido_em" IS NULL)::integer AS "excluido_em" FROM public."usuarios";

-- Migrations aplicadas (sem logs internos)
SELECT migration_name nome,checksum,finished_at aplicada_em,rolled_back_at revertida_em FROM public._prisma_migrations ORDER BY migration_name;

-- Expressões puras: NULL em CHECK, numeric NaN e UTF-16, sem inserir dados
SELECT (NULL::integer >= 0) IS NULL AS comparacao_nula, 'NaN'::numeric(12,2) > 0 AS nan_maior_que_zero, char_length('😀') AS pontos_codigo_emoji, (char_length('😀') + char_length(regexp_replace('😀', U&'[^\+010000-\+10FFFF]', '', 'g'))) AS unidades_utf16_emoji;

-- Exemplo fixo da fronteira de data civil, sem alterar o relógio
SELECT ('2030-01-02 01:00:00+00'::timestamptz AT TIME ZONE 'UTC')::date data_utc, ('2030-01-02 01:00:00+00'::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date data_brasilia;

-- Privilégios da conexão atual (sem senhas)
SELECT rolsuper superusuario,rolbypassrls ignora_rls FROM pg_roles WHERE rolname=current_user;

ROLLBACK;
