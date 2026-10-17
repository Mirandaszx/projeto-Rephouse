export type paths = {
    "/api/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Autenticar por e-mail e senha
         * @description Acesso público. Token de uma hora. Contas bloqueadas ou excluídas não autenticam. Ao expirar, faça login novamente; não há refresh token.
         */
        post: operations["post__api_auth_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Invalidar todos os tokens da conta
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        post: operations["post__api_auth_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cadastrar conta independente
         * @description Acesso público. Sempre cria NORMAL; campos de privilégio são rejeitados. O e-mail é normalizado. E-mail já utilizado, inclusive por conta excluída, retorna 409. Cadastro e login compartilham limite de 20 tentativas por IP a cada 15 minutos.
         */
        post: operations["post__api_auth_register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar indicadores da república
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Inclui dívida de ex-moradores. O mês segue APP_TIME_ZONE, padrão horário de Brasília (America/Sao_Paulo); todos os indicadores usam a mesma transação.
         */
        get: operations["get__api_dashboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/despesas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar despesas e rateios
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Escopo da república autorizada. Listagem paginada. Resposta paginada: dados e paginacao. Página além do resultado retorna dados vazio. Parâmetros inválidos ou desconhecidos retornam 400.
         */
        get: operations["get__api_despesas"];
        put?: never;
        /**
         * Criar despesa com rateio igual entre selecionados
         * @description Perfis: USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Participantes ativos da mesma república. Sobra de centavos distribuída por ordem dos IDs. Um participante assume o valor inteiro.
         */
        post: operations["post__api_despesas"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/despesas/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar despesa com pagamentos dos rateios
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        get: operations["get__api_despesas_id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Editar despesa
         * @description Perfis: USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Valor e participantes ficam bloqueados após o primeiro pagamento (409 FINANCIAL_HISTORY_LOCKED). Título, categoria e vencimento podem ser editados.
         */
        patch: operations["patch__api_despesas_id"];
        trace?: never;
    };
    "/api/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Verificar o processo HTTP
         * @description Acesso público.
         */
        get: operations["get__api_health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/master/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar indicadores globais
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        get: operations["get__api_master_dashboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/master/republicas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar repúblicas globalmente
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Resposta paginada: dados e paginacao. Página além do resultado retorna dados vazio. Parâmetros inválidos ou desconhecidos retornam 400.
         */
        get: operations["get__api_master_republicas"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/master/republicas/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Bloquear ou desbloquear república
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        patch: operations["patch__api_master_republicas_id_status"];
        trace?: never;
    };
    "/api/master/republicas/{republicaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar república pelo contexto MASTER
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        get: operations["get__api_master_republicas_republicaId"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Editar república pelo contexto MASTER
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        patch: operations["patch__api_master_republicas_republicaId"];
        trace?: never;
    };
    "/api/master/republicas/{republicaId}/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar indicadores da república
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Inclui dívida de ex-moradores. O mês segue APP_TIME_ZONE, padrão horário de Brasília (America/Sao_Paulo); todos os indicadores usam a mesma transação.
         */
        get: operations["get__api_master_republicas_republicaId_dashboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/master/republicas/{republicaId}/despesas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar despesas e rateios
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Escopo da república autorizada. Listagem paginada. Resposta paginada: dados e paginacao. Página além do resultado retorna dados vazio. Parâmetros inválidos ou desconhecidos retornam 400.
         */
        get: operations["get__api_master_republicas_republicaId_despesas"];
        put?: never;
        /**
         * Criar despesa com rateio igual entre selecionados
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Participantes ativos da mesma república. Sobra de centavos distribuída por ordem dos IDs. Um participante assume o valor inteiro.
         */
        post: operations["post__api_master_republicas_republicaId_despesas"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/master/republicas/{republicaId}/despesas/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar despesa com pagamentos dos rateios
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        get: operations["get__api_master_republicas_republicaId_despesas_id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Editar despesa
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Valor e participantes ficam bloqueados após o primeiro pagamento (409 FINANCIAL_HISTORY_LOCKED). Título, categoria e vencimento podem ser editados.
         */
        patch: operations["patch__api_master_republicas_republicaId_despesas_id"];
        trace?: never;
    };
    "/api/master/republicas/{republicaId}/membros": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar membros pelo contexto MASTER
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Resposta paginada: dados e paginacao. Página além do resultado retorna dados vazio. Parâmetros inválidos ou desconhecidos retornam 400.
         */
        get: operations["get__api_master_republicas_republicaId_membros"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/master/republicas/{republicaId}/membros/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Desativar vínculo pelo contexto MASTER
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        patch: operations["patch__api_master_republicas_republicaId_membros_id"];
        trace?: never;
    };
    "/api/master/republicas/{republicaId}/tarefas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar tarefas
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Resposta paginada: dados e paginacao. Página além do resultado retorna dados vazio. Parâmetros inválidos ou desconhecidos retornam 400.
         */
        get: operations["get__api_master_republicas_republicaId_tarefas"];
        put?: never;
        /**
         * Criar tarefa para membro ativo
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        post: operations["post__api_master_republicas_republicaId_tarefas"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/master/republicas/{republicaId}/tarefas/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Editar ou concluir tarefa
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios. ADMIN e MASTER gerenciam. Morador só pode enviar status=CONCLUIDA para uma tarefa atribuída a seu vínculo ativo.
         */
        patch: operations["patch__api_master_republicas_republicaId_tarefas_id"];
        trace?: never;
    };
    "/api/master/republicas/{republicaId}/transferir-admin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Transferir administração pelo contexto MASTER
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        post: operations["post__api_master_republicas_republicaId_transferir_admin"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/master/usuarios": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar usuários globalmente
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Resposta paginada: dados e paginacao. Página além do resultado retorna dados vazio. Parâmetros inválidos ou desconhecidos retornam 400.
         */
        get: operations["get__api_master_usuarios"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/master/usuarios/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Bloquear ou desbloquear conta
         * @description Perfis: USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Revoga tokens anteriores também após desbloqueio. Conta excluída não pode ser reativada; o último MASTER ativo não pode ser bloqueado.
         */
        patch: operations["patch__api_master_usuarios_id_status"];
        trace?: never;
    };
    "/api/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar conta e vínculo atual
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        get: operations["get__api_me"];
        put?: never;
        post?: never;
        /**
         * Excluir logicamente a própria conta
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Confirma a senha. 409: OUTSTANDING_DEBT, TRANSFER_ADMIN_REQUIRED ou LAST_MASTER. Preserva histórico e e-mail; encerra vínculos e revoga tokens. Conta excluída não pode ser reativada.
         */
        delete: operations["delete__api_me"];
        options?: never;
        head?: never;
        /**
         * Editar o próprio nome
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        patch: operations["patch__api_me"];
        trace?: never;
    };
    "/api/me/financeiro": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar os próprios rateios atuais e antigos
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. A saída da república mantém acesso somente ao próprio histórico, sem consultar os demais moradores. Resposta paginada: dados e paginacao. Página além do resultado retorna dados vazio. Parâmetros inválidos ou desconhecidos retornam 400.
         */
        get: operations["get__api_me_financeiro"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/financeiro/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar um rateio próprio
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        get: operations["get__api_me_financeiro_id"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/membros": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar membros
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. inativos=true inclui vínculos históricos e exige administrador da república ou MASTER. Resposta paginada: dados e paginacao. Página além do resultado retorna dados vazio. Parâmetros inválidos ou desconhecidos retornam 400.
         */
        get: operations["get__api_membros"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/membros/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Desativar vínculo de morador
         * @description Perfis: USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Não apaga o histórico. O administrador atual precisa transferir sua responsabilidade antes.
         */
        patch: operations["patch__api_membros_id"];
        trace?: never;
    };
    "/api/openapi.json": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Obter o contrato OpenAPI
         * @description Acesso público.
         */
        get: operations["get__api_openapi_json"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/pagamentos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Registrar pagamento parcial ou integral
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Somente proprietário do rateio, inclusive após sair da república. Saldo não pode ser ultrapassado. Idempotency-Key UUID obrigatório: repetir o mesmo conteúdo retorna o mesmo pagamento (201); mudar valor, rateio ou arquivo retorna 409. Não movimenta dinheiro e não possui estorno, edição ou exclusão nesta entrega.
         */
        post: operations["post__api_pagamentos"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/pagamentos/{id}/comprovante": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Baixar comprovante privado
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Proprietário do pagamento, administrador da república de origem ou MASTER. Conteúdo armazenado no PostgreSQL. Ausência de comprovante ou falta de acesso retorna 404.
         */
        get: operations["get__api_pagamentos_id_comprovante"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Verificar conexão ao PostgreSQL
         * @description Acesso público. Consulta SELECT 1; responde em até dois segundos, sem detalhes da conexão.
         */
        get: operations["get__api_ready"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/republicas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Criar república e assumir a administração
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Exige ausência de vínculo ativo. Promove para ADMIN e cria o vínculo na mesma transação; MASTER mantém o perfil.
         */
        post: operations["post__api_republicas"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/republicas/atual": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consultar república atual
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        get: operations["get__api_republicas_atual"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Editar nome e endereço da república
         * @description Perfis: USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        patch: operations["patch__api_republicas_atual"];
        trace?: never;
    };
    "/api/republicas/entrar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Entrar por código
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Exige ausência de vínculo ativo. Reentrar reutiliza o vínculo histórico.
         */
        post: operations["post__api_republicas_entrar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/republicas/sair": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sair preservando dívidas e histórico
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Administrador deve transferir a responsabilidade antes. Dívidas não impedem a saída.
         */
        post: operations["post__api_republicas_sair"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/republicas/transferir-admin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Transferir administração explicitamente
         * @description Perfis: USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Substituto precisa ser outro membro ativo da mesma república, com conta ativa.
         */
        post: operations["post__api_republicas_transferir_admin"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/republicas/trocar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Trocar de república atomicamente
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Exige vínculo atual. Código inválido reverte a saída anterior. Dívidas permanecem no histórico próprio; administrador transfere sua responsabilidade primeiro.
         */
        post: operations["post__api_republicas_trocar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tarefas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Listar tarefas
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. Resposta paginada: dados e paginacao. Página além do resultado retorna dados vazio. Parâmetros inválidos ou desconhecidos retornam 400.
         */
        get: operations["get__api_tarefas"];
        put?: never;
        /**
         * Criar tarefa para membro ativo
         * @description Perfis: USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios.
         */
        post: operations["post__api_tarefas"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tarefas/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Editar ou concluir tarefa
         * @description Perfis: USUARIO_NORMAL, USUARIO_ADMIN, USUARIO_MASTER. Conta ativa e token vigente obrigatórios. ADMIN e MASTER gerenciam. Morador só pode enviar status=CONCLUIDA para uma tarefa atribuída a seu vínculo ativo.
         */
        patch: operations["patch__api_tarefas_id"];
        trace?: never;
    };
};
export type webhooks = Record<string, never>;
export type components = {
    schemas: {
        Cadastro: {
            /** Format: email */
            email: string;
            nome: string;
            senha: string;
        };
        CodigoEntrada: {
            /** @description Espaços nas pontas são removidos e letras são convertidas para maiúsculas. */
            codigoEntrada: string;
        };
        CriarDespesa: {
            categoria: string;
            /** @description IDs de vínculos de membros ativos da mesma república; não são IDs de usuários. */
            membroIds: string[];
            titulo: string;
            /** @description Valor positivo em reais. Envie string com ponto decimal, sem separador de milhares. */
            valorTotal: string;
            /**
             * Format: date
             * @description Data sem horário: YYYY-MM-DD.
             */
            vencimento: string;
        };
        CriarRepublica: {
            endereco?: string;
            nome: string;
        };
        CriarTarefa: {
            descricao?: string;
            prazo?: string | null;
            /** Format: uuid */
            responsavelId: string;
            titulo: string;
        };
        Despesa: {
            categoria: string;
            /** Format: date-time */
            criadaEm: string;
            /** Format: uuid */
            criadaPorId: string;
            /** Format: uuid */
            id: string;
            rateios: components["schemas"]["Rateio"][];
            /** Format: uuid */
            republicaId: string;
            /** @enum {unknown} */
            status: "PENDENTE" | "PAGA";
            /** @enum {unknown} */
            statusCalculado: "PENDENTE" | "PAGA" | "VENCIDA";
            titulo: string;
            /** @description Valor monetário em reais, com duas casas decimais. */
            valorTotal: string;
            /**
             * Format: date-time
             * @description Data civil serializada à meia-noite UTC. Considere a parte YYYY-MM-DD, sem convertê-la para o fuso local.
             */
            vencimento: string;
        };
        DespesaResumo: {
            categoria: string;
            /** Format: date-time */
            criadaEm: string;
            /** Format: uuid */
            criadaPorId: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            republicaId: string;
            /** @enum {unknown} */
            status: "PENDENTE" | "PAGA";
            /** @enum {unknown} */
            statusCalculado: "PENDENTE" | "PAGA" | "VENCIDA";
            titulo: string;
            /** @description Valor monetário em reais, com duas casas decimais. */
            valorTotal: string;
            /**
             * Format: date-time
             * @description Data civil serializada à meia-noite UTC. Considere a parte YYYY-MM-DD, sem convertê-la para o fuso local.
             */
            vencimento: string;
        };
        EditarDespesa: {
            categoria?: string;
            /** @description IDs de vínculos de membros ativos da mesma república; não são IDs de usuários. */
            membroIds?: string[];
            titulo?: string;
            /** @description Valor positivo em reais. Envie string com ponto decimal, sem separador de milhares. */
            valorTotal?: string;
            /**
             * Format: date
             * @description Data sem horário: YYYY-MM-DD.
             */
            vencimento?: string;
        };
        EditarRepublica: {
            endereco?: string | null;
            nome?: string;
        };
        EditarTarefa: {
            descricao?: string;
            prazo?: string | null;
            /** Format: uuid */
            responsavelId?: string;
            /** @enum {unknown} */
            status?: "ABERTA" | "CONCLUIDA";
            titulo?: string;
        };
        Error: {
            error: {
                code: string;
                message: string;
            };
        };
        Login: {
            /** Format: email */
            email: string;
            senha: string;
        };
        Membro: {
            ativo: boolean;
            /** Format: date-time */
            entrouEm: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            republicaId: string;
            /** Format: uuid */
            usuarioId: string;
        };
        MembroListado: {
            ativo: boolean;
            /** Format: date-time */
            entrouEm: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            republicaId: string;
            usuario: {
                /** Format: email */
                email: string;
                /** Format: uuid */
                id: string;
                nome: string;
            };
            /** Format: uuid */
            usuarioId: string;
        };
        MinhaConta: {
            ativo: boolean;
            /** Format: date-time */
            criadoEm: string;
            /** Format: email */
            email: string;
            /** Format: uuid */
            id: string;
            membro: {
                ativo: boolean;
                /** Format: date-time */
                entrouEm: string;
                /** Format: uuid */
                id: string;
                republica: components["schemas"]["Republica"];
                /** Format: uuid */
                republicaId: string;
                /** Format: uuid */
                usuarioId: string;
            } | null;
            nome: string;
            /** @enum {unknown} */
            tipoUsuario: "USUARIO_NORMAL" | "USUARIO_ADMIN" | "USUARIO_MASTER";
        };
        Pagamento: {
            comprovanteUrl: string | null;
            /** Format: date-time */
            dataPagamento: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            membroId: string;
            /** Format: uuid */
            rateioId: string;
            /** @description Valor monetário em reais, com duas casas decimais. */
            valor: string;
        };
        Painel: {
            moradoresAtivos: number;
            proximasContas: components["schemas"]["DespesaResumo"][];
            tarefasAbertas: number;
            /** @description Valor monetário em reais, com duas casas decimais. */
            totalPagoNoMes: string;
            /** @description Valor monetário em reais, com duas casas decimais. */
            totalPendente: string;
        };
        PainelMaster: {
            moradoresAtivos: number;
            proximasContas: components["schemas"]["DespesaResumo"][];
            republicas: number;
            tarefasAbertas: number;
            /** @description Valor monetário em reais, com duas casas decimais. */
            totalPagoNoMes: string;
            /** @description Valor monetário em reais, com duas casas decimais. */
            totalPendente: string;
            usuarios: number;
        };
        Rateio: {
            /** Format: uuid */
            despesaId: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            membroId: string;
            pagamentos?: components["schemas"]["Pagamento"][];
            /** @enum {unknown} */
            status: "PENDENTE" | "PARCIAL" | "PAGO";
            /** @description Valor monetário em reais, com duas casas decimais. */
            valorDevido: string;
            /** @description Valor monetário em reais, com duas casas decimais. */
            valorPago: string;
        };
        RateioPessoal: {
            despesa: {
                categoria: string;
                /** Format: uuid */
                id: string;
                republica: {
                    /** Format: uuid */
                    id: string;
                    nome: string;
                };
                titulo: string;
                /**
                 * Format: date-time
                 * @description Data civil serializada à meia-noite UTC. Considere a parte YYYY-MM-DD, sem convertê-la para o fuso local.
                 */
                vencimento: string;
            };
            /** Format: uuid */
            despesaId: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            membroId: string;
            pagamentos: components["schemas"]["Pagamento"][];
            /** @enum {unknown} */
            status: "PENDENTE" | "PARCIAL" | "PAGO";
            /** @description Valor monetário em reais, com duas casas decimais. */
            valorDevido: string;
            /** @description Valor monetário em reais, com duas casas decimais. */
            valorPago: string;
        };
        RegistrarPagamento: {
            /** Format: uuid */
            rateioId: string;
            /** @description Valor positivo em reais. Envie string com ponto decimal, sem separador de milhares. */
            valor: string;
        };
        Republica: {
            /** Format: uuid */
            adminId: string;
            ativa: boolean;
            codigoEntrada: string;
            /** Format: date-time */
            criadaEm: string;
            endereco: string | null;
            /** Format: uuid */
            id: string;
            nome: string;
        };
        Sessao: {
            /** @description Bearer JWT válido por uma hora. */
            token: string;
            usuario: components["schemas"]["Usuario"];
        };
        Tarefa: {
            /** Format: date-time */
            criadaEm: string;
            descricao: string | null;
            /** Format: uuid */
            id: string;
            prazo: string | null;
            /** Format: uuid */
            republicaId: string;
            /** Format: uuid */
            responsavelId: string;
            /** @enum {unknown} */
            status: "ABERTA" | "CONCLUIDA";
            titulo: string;
        };
        Usuario: {
            ativo: boolean;
            /** Format: date-time */
            criadoEm: string;
            /** Format: email */
            email: string;
            /** Format: uuid */
            id: string;
            nome: string;
            /** @enum {unknown} */
            tipoUsuario: "USUARIO_NORMAL" | "USUARIO_ADMIN" | "USUARIO_MASTER";
        };
        UsuarioMaster: {
            ativo: boolean;
            /** Format: date-time */
            criadoEm: string;
            /** Format: email */
            email: string;
            excluidoEm: string | null;
            /** Format: uuid */
            id: string;
            nome: string;
            /** @enum {unknown} */
            tipoUsuario: "USUARIO_NORMAL" | "USUARIO_ADMIN" | "USUARIO_MASTER";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
};
export type $defs = Record<string, never>;
export interface operations {
    post__api_auth_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "email": "ana@demo.rephouse.test",
                 *       "senha": "SuaSenhaDeTeste123!"
                 *     }
                 */
                "application/json": components["schemas"]["Login"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "token": "JWT_RECEBIDO_DA_API",
                     *       "usuario": {
                     *         "id": "de000000-0000-4000-8000-000100000004",
                     *         "nome": "Ana Moradora",
                     *         "email": "ana@demo.rephouse.test",
                     *         "tipoUsuario": "USUARIO_NORMAL",
                     *         "ativo": true,
                     *         "criadoEm": "2026-10-16T12:00:00.000Z"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Sessao"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Credenciais incorretas ou conta indisponível. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INVALID_CREDENTIALS",
                     *         "message": "E-mail ou senha inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Aguarde antes de tentar novamente. */
            429: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "TOO_MANY_REQUESTS",
                     *         "message": "Aguarde antes de tentar novamente."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_auth_logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída, sem corpo de resposta. */
            204: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_auth_register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "nome": "Ana Moradora",
                 *       "email": "ana@demo.rephouse.test",
                 *       "senha": "SuaSenhaDeTeste123!"
                 *     }
                 */
                "application/json": components["schemas"]["Cadastro"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            201: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "token": "JWT_RECEBIDO_DA_API",
                     *       "usuario": {
                     *         "id": "de000000-0000-4000-8000-000100000004",
                     *         "nome": "Ana Moradora",
                     *         "email": "ana@demo.rephouse.test",
                     *         "tipoUsuario": "USUARIO_NORMAL",
                     *         "ativo": true,
                     *         "criadoEm": "2026-10-16T12:00:00.000Z"
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Sessao"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Aguarde antes de tentar novamente. */
            429: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "TOO_MANY_REQUESTS",
                     *         "message": "Aguarde antes de tentar novamente."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_dashboard: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "totalPendente": "50.00",
                     *       "totalPagoNoMes": "40.00",
                     *       "tarefasAbertas": 1,
                     *       "moradoresAtivos": 2,
                     *       "proximasContas": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000400000001",
                     *           "republicaId": "de000000-0000-4000-8000-000200000001",
                     *           "criadaPorId": "de000000-0000-4000-8000-000100000002",
                     *           "titulo": "Internet — Demonstração",
                     *           "categoria": "INTERNET",
                     *           "valorTotal": "90.00",
                     *           "vencimento": "2026-10-26T00:00:00.000Z",
                     *           "status": "PENDENTE",
                     *           "criadaEm": "2026-10-16T12:00:00.000Z",
                     *           "statusCalculado": "PENDENTE"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Painel"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_despesas: {
        parameters: {
            query?: {
                limite?: number;
                pagina?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "dados": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000400000001",
                     *           "republicaId": "de000000-0000-4000-8000-000200000001",
                     *           "criadaPorId": "de000000-0000-4000-8000-000100000002",
                     *           "titulo": "Internet — Demonstração",
                     *           "categoria": "INTERNET",
                     *           "valorTotal": "90.00",
                     *           "vencimento": "2026-10-26T00:00:00.000Z",
                     *           "status": "PENDENTE",
                     *           "criadaEm": "2026-10-16T12:00:00.000Z",
                     *           "statusCalculado": "PENDENTE",
                     *           "rateios": [
                     *             {
                     *               "id": "de000000-0000-4000-8000-000500000001",
                     *               "despesaId": "de000000-0000-4000-8000-000400000001",
                     *               "membroId": "de000000-0000-4000-8000-000300000001",
                     *               "valorDevido": "30.00",
                     *               "valorPago": "30.00",
                     *               "status": "PAGO"
                     *             },
                     *             {
                     *               "id": "de000000-0000-4000-8000-000500000002",
                     *               "despesaId": "de000000-0000-4000-8000-000400000001",
                     *               "membroId": "de000000-0000-4000-8000-000300000002",
                     *               "valorDevido": "30.00",
                     *               "valorPago": "10.00",
                     *               "status": "PARCIAL"
                     *             },
                     *             {
                     *               "id": "de000000-0000-4000-8000-000500000003",
                     *               "despesaId": "de000000-0000-4000-8000-000400000001",
                     *               "membroId": "de000000-0000-4000-8000-000300000003",
                     *               "valorDevido": "30.00",
                     *               "valorPago": "0.00",
                     *               "status": "PENDENTE"
                     *             }
                     *           ]
                     *         }
                     *       ],
                     *       "paginacao": {
                     *         "pagina": 1,
                     *         "limite": 20,
                     *         "totalItens": 1,
                     *         "totalPaginas": 1
                     *       }
                     *     }
                     */
                    "application/json": {
                        dados: components["schemas"]["Despesa"][];
                        paginacao: {
                            limite: number;
                            pagina: number;
                            totalItens: number;
                            totalPaginas: number;
                        };
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_despesas: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "titulo": "Internet",
                 *       "categoria": "INTERNET",
                 *       "valorTotal": "90.00",
                 *       "vencimento": "2026-10-26",
                 *       "membroIds": [
                 *         "de000000-0000-4000-8000-000300000001",
                 *         "de000000-0000-4000-8000-000300000002",
                 *         "de000000-0000-4000-8000-000300000003"
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["CriarDespesa"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            201: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000400000001",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "criadaPorId": "de000000-0000-4000-8000-000100000002",
                     *       "titulo": "Internet — Demonstração",
                     *       "categoria": "INTERNET",
                     *       "valorTotal": "90.00",
                     *       "vencimento": "2026-10-26T00:00:00.000Z",
                     *       "status": "PENDENTE",
                     *       "criadaEm": "2026-10-16T12:00:00.000Z",
                     *       "statusCalculado": "PENDENTE",
                     *       "rateios": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000001",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000001",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "0.00",
                     *           "status": "PENDENTE"
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000002",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000002",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "0.00",
                     *           "status": "PENDENTE"
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000003",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000003",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "0.00",
                     *           "status": "PENDENTE"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Despesa"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_despesas_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000400000001",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "criadaPorId": "de000000-0000-4000-8000-000100000002",
                     *       "titulo": "Internet — Demonstração",
                     *       "categoria": "INTERNET",
                     *       "valorTotal": "90.00",
                     *       "vencimento": "2026-10-26T00:00:00.000Z",
                     *       "status": "PENDENTE",
                     *       "criadaEm": "2026-10-16T12:00:00.000Z",
                     *       "statusCalculado": "PENDENTE",
                     *       "rateios": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000001",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000001",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "30.00",
                     *           "status": "PAGO",
                     *           "pagamentos": [
                     *             {
                     *               "id": "de000000-0000-4000-8000-000600000001",
                     *               "rateioId": "de000000-0000-4000-8000-000500000001",
                     *               "membroId": "de000000-0000-4000-8000-000300000001",
                     *               "valor": "30.00",
                     *               "comprovanteUrl": null,
                     *               "dataPagamento": "2026-10-16T12:00:00.000Z"
                     *             }
                     *           ]
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000002",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000002",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "10.00",
                     *           "status": "PARCIAL",
                     *           "pagamentos": [
                     *             {
                     *               "id": "de000000-0000-4000-8000-000600000002",
                     *               "rateioId": "de000000-0000-4000-8000-000500000002",
                     *               "membroId": "de000000-0000-4000-8000-000300000002",
                     *               "valor": "10.00",
                     *               "comprovanteUrl": null,
                     *               "dataPagamento": "2026-10-16T12:00:00.000Z"
                     *             }
                     *           ]
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000003",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000003",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "0.00",
                     *           "status": "PENDENTE",
                     *           "pagamentos": []
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Despesa"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    patch__api_despesas_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "titulo": "Internet atualizada"
                 *     }
                 */
                "application/json": components["schemas"]["EditarDespesa"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000400000001",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "criadaPorId": "de000000-0000-4000-8000-000100000002",
                     *       "titulo": "Internet atualizada",
                     *       "categoria": "INTERNET",
                     *       "valorTotal": "90.00",
                     *       "vencimento": "2026-10-26T00:00:00.000Z",
                     *       "status": "PENDENTE",
                     *       "criadaEm": "2026-10-16T12:00:00.000Z",
                     *       "statusCalculado": "PENDENTE",
                     *       "rateios": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000001",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000001",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "30.00",
                     *           "status": "PAGO"
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000002",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000002",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "10.00",
                     *           "status": "PARCIAL"
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000003",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000003",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "0.00",
                     *           "status": "PENDENTE"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Despesa"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "status": "ok"
                     *     }
                     */
                    "application/json": {
                        /** @constant */
                        status: "ok";
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_master_dashboard: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "totalPendente": "50.00",
                     *       "totalPagoNoMes": "100.00",
                     *       "tarefasAbertas": 1,
                     *       "moradoresAtivos": 2,
                     *       "proximasContas": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000400000001",
                     *           "republicaId": "de000000-0000-4000-8000-000200000001",
                     *           "criadaPorId": "de000000-0000-4000-8000-000100000002",
                     *           "titulo": "Internet — Demonstração",
                     *           "categoria": "INTERNET",
                     *           "valorTotal": "90.00",
                     *           "vencimento": "2026-10-26T00:00:00.000Z",
                     *           "status": "PENDENTE",
                     *           "criadaEm": "2026-10-16T12:00:00.000Z",
                     *           "statusCalculado": "PENDENTE"
                     *         }
                     *       ],
                     *       "usuarios": 6,
                     *       "republicas": 2
                     *     }
                     */
                    "application/json": components["schemas"]["PainelMaster"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_master_republicas: {
        parameters: {
            query?: {
                limite?: number;
                pagina?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "dados": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000200000001",
                     *           "nome": "República Aurora — Demonstração",
                     *           "endereco": "Rua Aurora, 100",
                     *           "codigoEntrada": "DEMOAURORA",
                     *           "adminId": "de000000-0000-4000-8000-000100000002",
                     *           "ativa": true,
                     *           "criadaEm": "2026-10-16T12:00:00.000Z"
                     *         }
                     *       ],
                     *       "paginacao": {
                     *         "pagina": 1,
                     *         "limite": 20,
                     *         "totalItens": 1,
                     *         "totalPaginas": 1
                     *       }
                     *     }
                     */
                    "application/json": {
                        dados: components["schemas"]["Republica"][];
                        paginacao: {
                            limite: number;
                            pagina: number;
                            totalItens: number;
                            totalPaginas: number;
                        };
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    patch__api_master_republicas_id_status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "ativa": false
                 *     }
                 */
                "application/json": {
                    ativa: boolean;
                };
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000200000001",
                     *       "nome": "República Aurora — Demonstração",
                     *       "endereco": "Rua Aurora, 100",
                     *       "codigoEntrada": "DEMOAURORA",
                     *       "adminId": "de000000-0000-4000-8000-000100000002",
                     *       "ativa": false,
                     *       "criadaEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Republica"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_master_republicas_republicaId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000200000001",
                     *       "nome": "República Aurora — Demonstração",
                     *       "endereco": "Rua Aurora, 100",
                     *       "codigoEntrada": "DEMOAURORA",
                     *       "adminId": "de000000-0000-4000-8000-000100000002",
                     *       "ativa": true,
                     *       "criadaEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Republica"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    patch__api_master_republicas_republicaId: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "endereco": null
                 *     }
                 */
                "application/json": components["schemas"]["EditarRepublica"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000200000001",
                     *       "nome": "República Aurora — Demonstração",
                     *       "endereco": null,
                     *       "codigoEntrada": "DEMOAURORA",
                     *       "adminId": "de000000-0000-4000-8000-000100000002",
                     *       "ativa": true,
                     *       "criadaEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Republica"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_master_republicas_republicaId_dashboard: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "totalPendente": "50.00",
                     *       "totalPagoNoMes": "40.00",
                     *       "tarefasAbertas": 1,
                     *       "moradoresAtivos": 2,
                     *       "proximasContas": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000400000001",
                     *           "republicaId": "de000000-0000-4000-8000-000200000001",
                     *           "criadaPorId": "de000000-0000-4000-8000-000100000002",
                     *           "titulo": "Internet — Demonstração",
                     *           "categoria": "INTERNET",
                     *           "valorTotal": "90.00",
                     *           "vencimento": "2026-10-26T00:00:00.000Z",
                     *           "status": "PENDENTE",
                     *           "criadaEm": "2026-10-16T12:00:00.000Z",
                     *           "statusCalculado": "PENDENTE"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Painel"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_master_republicas_republicaId_despesas: {
        parameters: {
            query?: {
                limite?: number;
                pagina?: number;
            };
            header?: never;
            path: {
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "dados": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000400000001",
                     *           "republicaId": "de000000-0000-4000-8000-000200000001",
                     *           "criadaPorId": "de000000-0000-4000-8000-000100000002",
                     *           "titulo": "Internet — Demonstração",
                     *           "categoria": "INTERNET",
                     *           "valorTotal": "90.00",
                     *           "vencimento": "2026-10-26T00:00:00.000Z",
                     *           "status": "PENDENTE",
                     *           "criadaEm": "2026-10-16T12:00:00.000Z",
                     *           "statusCalculado": "PENDENTE",
                     *           "rateios": [
                     *             {
                     *               "id": "de000000-0000-4000-8000-000500000001",
                     *               "despesaId": "de000000-0000-4000-8000-000400000001",
                     *               "membroId": "de000000-0000-4000-8000-000300000001",
                     *               "valorDevido": "30.00",
                     *               "valorPago": "30.00",
                     *               "status": "PAGO"
                     *             },
                     *             {
                     *               "id": "de000000-0000-4000-8000-000500000002",
                     *               "despesaId": "de000000-0000-4000-8000-000400000001",
                     *               "membroId": "de000000-0000-4000-8000-000300000002",
                     *               "valorDevido": "30.00",
                     *               "valorPago": "10.00",
                     *               "status": "PARCIAL"
                     *             },
                     *             {
                     *               "id": "de000000-0000-4000-8000-000500000003",
                     *               "despesaId": "de000000-0000-4000-8000-000400000001",
                     *               "membroId": "de000000-0000-4000-8000-000300000003",
                     *               "valorDevido": "30.00",
                     *               "valorPago": "0.00",
                     *               "status": "PENDENTE"
                     *             }
                     *           ]
                     *         }
                     *       ],
                     *       "paginacao": {
                     *         "pagina": 1,
                     *         "limite": 20,
                     *         "totalItens": 1,
                     *         "totalPaginas": 1
                     *       }
                     *     }
                     */
                    "application/json": {
                        dados: components["schemas"]["Despesa"][];
                        paginacao: {
                            limite: number;
                            pagina: number;
                            totalItens: number;
                            totalPaginas: number;
                        };
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_master_republicas_republicaId_despesas: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "titulo": "Internet",
                 *       "categoria": "INTERNET",
                 *       "valorTotal": "90.00",
                 *       "vencimento": "2026-10-26",
                 *       "membroIds": [
                 *         "de000000-0000-4000-8000-000300000001",
                 *         "de000000-0000-4000-8000-000300000002",
                 *         "de000000-0000-4000-8000-000300000003"
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["CriarDespesa"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            201: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000400000001",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "criadaPorId": "de000000-0000-4000-8000-000100000002",
                     *       "titulo": "Internet — Demonstração",
                     *       "categoria": "INTERNET",
                     *       "valorTotal": "90.00",
                     *       "vencimento": "2026-10-26T00:00:00.000Z",
                     *       "status": "PENDENTE",
                     *       "criadaEm": "2026-10-16T12:00:00.000Z",
                     *       "statusCalculado": "PENDENTE",
                     *       "rateios": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000001",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000001",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "0.00",
                     *           "status": "PENDENTE"
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000002",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000002",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "0.00",
                     *           "status": "PENDENTE"
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000003",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000003",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "0.00",
                     *           "status": "PENDENTE"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Despesa"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_master_republicas_republicaId_despesas_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000400000001",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "criadaPorId": "de000000-0000-4000-8000-000100000002",
                     *       "titulo": "Internet — Demonstração",
                     *       "categoria": "INTERNET",
                     *       "valorTotal": "90.00",
                     *       "vencimento": "2026-10-26T00:00:00.000Z",
                     *       "status": "PENDENTE",
                     *       "criadaEm": "2026-10-16T12:00:00.000Z",
                     *       "statusCalculado": "PENDENTE",
                     *       "rateios": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000001",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000001",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "30.00",
                     *           "status": "PAGO",
                     *           "pagamentos": [
                     *             {
                     *               "id": "de000000-0000-4000-8000-000600000001",
                     *               "rateioId": "de000000-0000-4000-8000-000500000001",
                     *               "membroId": "de000000-0000-4000-8000-000300000001",
                     *               "valor": "30.00",
                     *               "comprovanteUrl": null,
                     *               "dataPagamento": "2026-10-16T12:00:00.000Z"
                     *             }
                     *           ]
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000002",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000002",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "10.00",
                     *           "status": "PARCIAL",
                     *           "pagamentos": [
                     *             {
                     *               "id": "de000000-0000-4000-8000-000600000002",
                     *               "rateioId": "de000000-0000-4000-8000-000500000002",
                     *               "membroId": "de000000-0000-4000-8000-000300000002",
                     *               "valor": "10.00",
                     *               "comprovanteUrl": null,
                     *               "dataPagamento": "2026-10-16T12:00:00.000Z"
                     *             }
                     *           ]
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000003",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000003",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "0.00",
                     *           "status": "PENDENTE",
                     *           "pagamentos": []
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Despesa"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    patch__api_master_republicas_republicaId_despesas_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "titulo": "Internet atualizada"
                 *     }
                 */
                "application/json": components["schemas"]["EditarDespesa"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000400000001",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "criadaPorId": "de000000-0000-4000-8000-000100000002",
                     *       "titulo": "Internet atualizada",
                     *       "categoria": "INTERNET",
                     *       "valorTotal": "90.00",
                     *       "vencimento": "2026-10-26T00:00:00.000Z",
                     *       "status": "PENDENTE",
                     *       "criadaEm": "2026-10-16T12:00:00.000Z",
                     *       "statusCalculado": "PENDENTE",
                     *       "rateios": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000001",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000001",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "30.00",
                     *           "status": "PAGO"
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000002",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000002",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "10.00",
                     *           "status": "PARCIAL"
                     *         },
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000003",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000003",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "0.00",
                     *           "status": "PENDENTE"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["Despesa"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_master_republicas_republicaId_membros: {
        parameters: {
            query?: {
                /** @example false */
                inativos?: boolean;
                limite?: number;
                pagina?: number;
            };
            header?: never;
            path: {
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "dados": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000300000002",
                     *           "usuarioId": "de000000-0000-4000-8000-000100000004",
                     *           "republicaId": "de000000-0000-4000-8000-000200000001",
                     *           "ativo": true,
                     *           "entrouEm": "2026-10-16T12:00:00.000Z",
                     *           "usuario": {
                     *             "id": "de000000-0000-4000-8000-000100000004",
                     *             "nome": "Ana Moradora",
                     *             "email": "ana@demo.rephouse.test"
                     *           }
                     *         }
                     *       ],
                     *       "paginacao": {
                     *         "pagina": 1,
                     *         "limite": 20,
                     *         "totalItens": 1,
                     *         "totalPaginas": 1
                     *       }
                     *     }
                     */
                    "application/json": {
                        dados: components["schemas"]["MembroListado"][];
                        paginacao: {
                            limite: number;
                            pagina: number;
                            totalItens: number;
                            totalPaginas: number;
                        };
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    patch__api_master_republicas_republicaId_membros_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "ativo": false
                 *     }
                 */
                "application/json": {
                    /** @constant */
                    ativo: false;
                };
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000300000002",
                     *       "usuarioId": "de000000-0000-4000-8000-000100000004",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "ativo": false,
                     *       "entrouEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Membro"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_master_republicas_republicaId_tarefas: {
        parameters: {
            query?: {
                limite?: number;
                pagina?: number;
            };
            header?: never;
            path: {
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "dados": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000700000001",
                     *           "republicaId": "de000000-0000-4000-8000-000200000001",
                     *           "responsavelId": "de000000-0000-4000-8000-000300000002",
                     *           "titulo": "Limpar cozinha",
                     *           "descricao": null,
                     *           "prazo": "2026-10-26T00:00:00.000Z",
                     *           "status": "ABERTA",
                     *           "criadaEm": "2026-10-16T12:00:00.000Z"
                     *         }
                     *       ],
                     *       "paginacao": {
                     *         "pagina": 1,
                     *         "limite": 20,
                     *         "totalItens": 1,
                     *         "totalPaginas": 1
                     *       }
                     *     }
                     */
                    "application/json": {
                        dados: components["schemas"]["Tarefa"][];
                        paginacao: {
                            limite: number;
                            pagina: number;
                            totalItens: number;
                            totalPaginas: number;
                        };
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_master_republicas_republicaId_tarefas: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "titulo": "Limpar cozinha",
                 *       "responsavelId": "de000000-0000-4000-8000-000300000002",
                 *       "prazo": "2026-10-26"
                 *     }
                 */
                "application/json": components["schemas"]["CriarTarefa"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            201: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000700000001",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "responsavelId": "de000000-0000-4000-8000-000300000002",
                     *       "titulo": "Limpar cozinha",
                     *       "descricao": null,
                     *       "prazo": "2026-10-26T00:00:00.000Z",
                     *       "status": "ABERTA",
                     *       "criadaEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Tarefa"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    patch__api_master_republicas_republicaId_tarefas_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "status": "CONCLUIDA"
                 *     }
                 */
                "application/json": components["schemas"]["EditarTarefa"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000700000001",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "responsavelId": "de000000-0000-4000-8000-000300000002",
                     *       "titulo": "Limpar cozinha",
                     *       "descricao": null,
                     *       "prazo": "2026-10-26T00:00:00.000Z",
                     *       "status": "CONCLUIDA",
                     *       "criadaEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Tarefa"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_master_republicas_republicaId_transferir_admin: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                republicaId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "membroId": "de000000-0000-4000-8000-000300000002"
                 *     }
                 */
                "application/json": {
                    /** Format: uuid */
                    membroId: string;
                };
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "adminId": "de000000-0000-4000-8000-000100000004"
                     *     }
                     */
                    "application/json": {
                        /** Format: uuid */
                        adminId: string;
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_master_usuarios: {
        parameters: {
            query?: {
                limite?: number;
                pagina?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "dados": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000100000004",
                     *           "nome": "Ana Moradora",
                     *           "email": "ana@demo.rephouse.test",
                     *           "tipoUsuario": "USUARIO_NORMAL",
                     *           "ativo": true,
                     *           "criadoEm": "2026-10-16T12:00:00.000Z",
                     *           "excluidoEm": null
                     *         }
                     *       ],
                     *       "paginacao": {
                     *         "pagina": 1,
                     *         "limite": 20,
                     *         "totalItens": 1,
                     *         "totalPaginas": 1
                     *       }
                     *     }
                     */
                    "application/json": {
                        dados: components["schemas"]["UsuarioMaster"][];
                        paginacao: {
                            limite: number;
                            pagina: number;
                            totalItens: number;
                            totalPaginas: number;
                        };
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    patch__api_master_usuarios_id_status: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "ativo": false
                 *     }
                 */
                "application/json": {
                    ativo: boolean;
                };
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000100000004",
                     *       "nome": "Ana Moradora",
                     *       "email": "ana@demo.rephouse.test",
                     *       "tipoUsuario": "USUARIO_NORMAL",
                     *       "ativo": false,
                     *       "criadoEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Usuario"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000100000004",
                     *       "nome": "Ana Moradora",
                     *       "email": "ana@demo.rephouse.test",
                     *       "tipoUsuario": "USUARIO_NORMAL",
                     *       "ativo": true,
                     *       "criadoEm": "2026-10-16T12:00:00.000Z",
                     *       "membro": {
                     *         "id": "de000000-0000-4000-8000-000300000002",
                     *         "usuarioId": "de000000-0000-4000-8000-000100000004",
                     *         "republicaId": "de000000-0000-4000-8000-000200000001",
                     *         "ativo": true,
                     *         "entrouEm": "2026-10-16T12:00:00.000Z",
                     *         "republica": {
                     *           "id": "de000000-0000-4000-8000-000200000001",
                     *           "nome": "República Aurora — Demonstração",
                     *           "endereco": "Rua Aurora, 100",
                     *           "codigoEntrada": "DEMOAURORA",
                     *           "adminId": "de000000-0000-4000-8000-000100000002",
                     *           "ativa": true,
                     *           "criadaEm": "2026-10-16T12:00:00.000Z"
                     *         }
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["MinhaConta"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    delete__api_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "senha": "SuaSenhaDeTeste123!"
                 *     }
                 */
                "application/json": {
                    senha: string;
                };
            };
        };
        responses: {
            /** @description Operação concluída, sem corpo de resposta. */
            204: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    patch__api_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "nome": "Ana Silva"
                 *     }
                 */
                "application/json": {
                    nome: string;
                };
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000100000004",
                     *       "nome": "Ana Silva",
                     *       "email": "ana@demo.rephouse.test",
                     *       "tipoUsuario": "USUARIO_NORMAL",
                     *       "ativo": true,
                     *       "criadoEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Usuario"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_me_financeiro: {
        parameters: {
            query?: {
                limite?: number;
                pagina?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "dados": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000500000002",
                     *           "despesaId": "de000000-0000-4000-8000-000400000001",
                     *           "membroId": "de000000-0000-4000-8000-000300000002",
                     *           "valorDevido": "30.00",
                     *           "valorPago": "10.00",
                     *           "status": "PARCIAL",
                     *           "pagamentos": [
                     *             {
                     *               "id": "de000000-0000-4000-8000-000600000002",
                     *               "rateioId": "de000000-0000-4000-8000-000500000002",
                     *               "membroId": "de000000-0000-4000-8000-000300000002",
                     *               "valor": "10.00",
                     *               "comprovanteUrl": null,
                     *               "dataPagamento": "2026-10-16T12:00:00.000Z"
                     *             }
                     *           ],
                     *           "despesa": {
                     *             "id": "de000000-0000-4000-8000-000400000001",
                     *             "titulo": "Internet — Demonstração",
                     *             "categoria": "INTERNET",
                     *             "vencimento": "2026-10-26T00:00:00.000Z",
                     *             "republica": {
                     *               "id": "de000000-0000-4000-8000-000200000001",
                     *               "nome": "República Aurora — Demonstração"
                     *             }
                     *           }
                     *         }
                     *       ],
                     *       "paginacao": {
                     *         "pagina": 1,
                     *         "limite": 20,
                     *         "totalItens": 1,
                     *         "totalPaginas": 1
                     *       }
                     *     }
                     */
                    "application/json": {
                        dados: components["schemas"]["RateioPessoal"][];
                        paginacao: {
                            limite: number;
                            pagina: number;
                            totalItens: number;
                            totalPaginas: number;
                        };
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_me_financeiro_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000500000002",
                     *       "despesaId": "de000000-0000-4000-8000-000400000001",
                     *       "membroId": "de000000-0000-4000-8000-000300000002",
                     *       "valorDevido": "30.00",
                     *       "valorPago": "10.00",
                     *       "status": "PARCIAL",
                     *       "pagamentos": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000600000002",
                     *           "rateioId": "de000000-0000-4000-8000-000500000002",
                     *           "membroId": "de000000-0000-4000-8000-000300000002",
                     *           "valor": "10.00",
                     *           "comprovanteUrl": null,
                     *           "dataPagamento": "2026-10-16T12:00:00.000Z"
                     *         }
                     *       ],
                     *       "despesa": {
                     *         "id": "de000000-0000-4000-8000-000400000001",
                     *         "titulo": "Internet — Demonstração",
                     *         "categoria": "INTERNET",
                     *         "vencimento": "2026-10-26T00:00:00.000Z",
                     *         "republica": {
                     *           "id": "de000000-0000-4000-8000-000200000001",
                     *           "nome": "República Aurora — Demonstração"
                     *         }
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["RateioPessoal"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_membros: {
        parameters: {
            query?: {
                /** @example false */
                inativos?: boolean;
                limite?: number;
                pagina?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "dados": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000300000002",
                     *           "usuarioId": "de000000-0000-4000-8000-000100000004",
                     *           "republicaId": "de000000-0000-4000-8000-000200000001",
                     *           "ativo": true,
                     *           "entrouEm": "2026-10-16T12:00:00.000Z",
                     *           "usuario": {
                     *             "id": "de000000-0000-4000-8000-000100000004",
                     *             "nome": "Ana Moradora",
                     *             "email": "ana@demo.rephouse.test"
                     *           }
                     *         }
                     *       ],
                     *       "paginacao": {
                     *         "pagina": 1,
                     *         "limite": 20,
                     *         "totalItens": 1,
                     *         "totalPaginas": 1
                     *       }
                     *     }
                     */
                    "application/json": {
                        dados: components["schemas"]["MembroListado"][];
                        paginacao: {
                            limite: number;
                            pagina: number;
                            totalItens: number;
                            totalPaginas: number;
                        };
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    patch__api_membros_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "ativo": false
                 *     }
                 */
                "application/json": {
                    /** @constant */
                    ativo: false;
                };
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000300000002",
                     *       "usuarioId": "de000000-0000-4000-8000-000100000004",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "ativo": false,
                     *       "entrouEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Membro"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_openapi_json: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "openapi": "3.1.0",
                     *       "info": {
                     *         "title": "RepHouse API",
                     *         "version": "2.0.1"
                     *       },
                     *       "paths": {},
                     *       "components": {}
                     *     }
                     */
                    "application/json": Record<string, never>;
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_pagamentos: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description Uma chave por operação; reutilize-a ao repetir a mesma solicitação.
                 * @example de000000-0000-4000-8000-000900000001
                 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "rateioId": "de000000-0000-4000-8000-000500000002",
                 *       "valor": "10.00"
                 *     }
                 */
                "application/json": components["schemas"]["RegistrarPagamento"];
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description PDF, PNG, JPEG ou WEBP, até 5 MiB. O conteúdo determina o tipo.
                     */
                    comprovante?: Blob;
                    /** Format: uuid */
                    rateioId: string;
                    /** @description Valor positivo em reais. Envie string com ponto decimal, sem separador de milhares. */
                    valor: string;
                };
            };
        };
        responses: {
            /** @description Operação concluída. */
            201: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000600000002",
                     *       "rateioId": "de000000-0000-4000-8000-000500000002",
                     *       "membroId": "de000000-0000-4000-8000-000300000002",
                     *       "valor": "10.00",
                     *       "comprovanteUrl": null,
                     *       "dataPagamento": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Pagamento"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Arquivo acima de 5 MiB ou JSON acima de 1 MiB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "LIMIT_FILE_SIZE",
                     *         "message": "O comprovante deve ter no máximo 5 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Dois uploads já estão em processamento. */
            429: {
                headers: {
                    /** @example 1 */
                    "Retry-After"?: string;
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UPLOAD_BUSY",
                     *         "message": "Há muitos uploads em andamento. Tente novamente."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_pagamentos_id_comprovante: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Conteúdo binário do arquivo, carregado somente após autorização. */
            200: {
                headers: {
                    "Cache-Control"?: "no-store";
                    /** @example attachment; filename="comprovante.pdf" */
                    "Content-Disposition"?: string;
                    "Content-Length"?: number;
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/pdf": Blob;
                    "image/jpeg": Blob;
                    "image/png": Blob;
                    "image/webp": Blob;
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_ready: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "status": "ok"
                     *     }
                     */
                    "application/json": {
                        /** @constant */
                        status: "ok";
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description PostgreSQL indisponível. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "status": "unavailable"
                     *     }
                     */
                    "application/json": {
                        /** @constant */
                        status: "unavailable";
                    };
                };
            };
        };
    };
    post__api_republicas: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "nome": "República Aurora — Demonstração",
                 *       "endereco": "Rua Aurora, 100"
                 *     }
                 */
                "application/json": components["schemas"]["CriarRepublica"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            201: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000200000001",
                     *       "nome": "República Aurora — Demonstração",
                     *       "endereco": "Rua Aurora, 100",
                     *       "codigoEntrada": "DEMOAURORA",
                     *       "adminId": "de000000-0000-4000-8000-000100000002",
                     *       "ativa": true,
                     *       "criadaEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Republica"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_republicas_atual: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000200000001",
                     *       "nome": "República Aurora — Demonstração",
                     *       "endereco": "Rua Aurora, 100",
                     *       "codigoEntrada": "DEMOAURORA",
                     *       "adminId": "de000000-0000-4000-8000-000100000002",
                     *       "ativa": true,
                     *       "criadaEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Republica"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    patch__api_republicas_atual: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "nome": "República Aurora",
                 *       "endereco": null
                 *     }
                 */
                "application/json": components["schemas"]["EditarRepublica"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000200000001",
                     *       "nome": "República Aurora",
                     *       "endereco": null,
                     *       "codigoEntrada": "DEMOAURORA",
                     *       "adminId": "de000000-0000-4000-8000-000100000002",
                     *       "ativa": true,
                     *       "criadaEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Republica"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_republicas_entrar: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "codigoEntrada": "DEMOAURORA"
                 *     }
                 */
                "application/json": components["schemas"]["CodigoEntrada"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            201: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000300000002",
                     *       "usuarioId": "de000000-0000-4000-8000-000100000004",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "ativo": true,
                     *       "entrouEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Membro"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_republicas_sair: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída, sem corpo de resposta. */
            204: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_republicas_transferir_admin: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "membroId": "de000000-0000-4000-8000-000300000002"
                 *     }
                 */
                "application/json": {
                    /** Format: uuid */
                    membroId: string;
                };
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "adminId": "de000000-0000-4000-8000-000100000004"
                     *     }
                     */
                    "application/json": {
                        /** Format: uuid */
                        adminId: string;
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_republicas_trocar: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "codigoEntrada": "DEMOAURORA"
                 *     }
                 */
                "application/json": components["schemas"]["CodigoEntrada"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000300000002",
                     *       "usuarioId": "de000000-0000-4000-8000-000100000004",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "ativo": true,
                     *       "entrouEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Membro"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    get__api_tarefas: {
        parameters: {
            query?: {
                limite?: number;
                pagina?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "dados": [
                     *         {
                     *           "id": "de000000-0000-4000-8000-000700000001",
                     *           "republicaId": "de000000-0000-4000-8000-000200000001",
                     *           "responsavelId": "de000000-0000-4000-8000-000300000002",
                     *           "titulo": "Limpar cozinha",
                     *           "descricao": null,
                     *           "prazo": "2026-10-26T00:00:00.000Z",
                     *           "status": "ABERTA",
                     *           "criadaEm": "2026-10-16T12:00:00.000Z"
                     *         }
                     *       ],
                     *       "paginacao": {
                     *         "pagina": 1,
                     *         "limite": 20,
                     *         "totalItens": 1,
                     *         "totalPaginas": 1
                     *       }
                     *     }
                     */
                    "application/json": {
                        dados: components["schemas"]["Tarefa"][];
                        paginacao: {
                            limite: number;
                            pagina: number;
                            totalItens: number;
                            totalPaginas: number;
                        };
                    };
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    post__api_tarefas: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "titulo": "Limpar cozinha",
                 *       "responsavelId": "de000000-0000-4000-8000-000300000002",
                 *       "prazo": "2026-10-26"
                 *     }
                 */
                "application/json": components["schemas"]["CriarTarefa"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            201: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000700000001",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "responsavelId": "de000000-0000-4000-8000-000300000002",
                     *       "titulo": "Limpar cozinha",
                     *       "descricao": null,
                     *       "prazo": "2026-10-26T00:00:00.000Z",
                     *       "status": "ABERTA",
                     *       "criadaEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Tarefa"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    patch__api_tarefas_id: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "status": "CONCLUIDA"
                 *     }
                 */
                "application/json": components["schemas"]["EditarTarefa"];
            };
        };
        responses: {
            /** @description Operação concluída. */
            200: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "id": "de000000-0000-4000-8000-000700000001",
                     *       "republicaId": "de000000-0000-4000-8000-000200000001",
                     *       "responsavelId": "de000000-0000-4000-8000-000300000002",
                     *       "titulo": "Limpar cozinha",
                     *       "descricao": null,
                     *       "prazo": "2026-10-26T00:00:00.000Z",
                     *       "status": "CONCLUIDA",
                     *       "criadaEm": "2026-10-16T12:00:00.000Z"
                     *     }
                     */
                    "application/json": components["schemas"]["Tarefa"];
                };
            };
            /** @description Os dados enviados são inválidos. */
            400: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "VALIDATION_ERROR",
                     *         "message": "Os dados enviados são inválidos."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Sessão inválida ou encerrada. */
            401: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "UNAUTHENTICATED",
                     *         "message": "Sessão inválida ou encerrada."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description A operação exige o administrador da república. */
            403: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "FORBIDDEN",
                     *         "message": "A operação exige o administrador da república."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Registro não encontrado. */
            404: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "NOT_FOUND",
                     *         "message": "Registro não encontrado."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Já existe um registro com estes dados. */
            409: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "CONFLICT",
                     *         "message": "Já existe um registro com estes dados."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description O corpo JSON deve ter no máximo 1 MB. */
            413: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "PAYLOAD_TOO_LARGE",
                     *         "message": "O corpo JSON deve ter no máximo 1 MB."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Erro interno do servidor. */
            500: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "INTERNAL_SERVER_ERROR",
                     *         "message": "Erro interno do servidor."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Conflito temporário. Tente novamente com a mesma chave de pagamento. */
            503: {
                headers: {
                    /** @description UUID gerado pelo servidor para correlação com os logs. */
                    "X-Request-Id"?: string;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "error": {
                     *         "code": "RETRY_LATER",
                     *         "message": "Conflito temporário. Tente novamente com a mesma chave de pagamento."
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
}
