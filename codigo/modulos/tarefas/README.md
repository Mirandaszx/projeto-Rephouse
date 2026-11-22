# Tarefas

Rotas, controller, service e repository implementam listagem, detalhe, criação, edição, associação e liberação. Tarefa aberta pode ficar sem responsável; prazo é opcional.

Morador ativo cria tarefa disponível ou para si e assume uma disponível. Criador edita o conteúdo enquanto disponível; responsável ativo conclui, reabre ou libera; administrador gerencia e atribui a outro membro. Concorrência é resolvida em transação Serializable. O repository recebe `tx`; consultas restringem a república autorizada.

Autoria não é inventada para tarefas antigas. Versão interna identifica transições e eventos persistentes; criação e notificações confirmam ou revertem juntas. Idempotência preserva snapshots e autorização da operação. Despesas continuam administrativas. Consulte [o guia da versão 4.0.0](../../../documentacao/NOTIFICACOES_E_TAREFAS.md).
