# Tarefas

Rotas, controller, service e repository implementam listagem, criação e edição de tarefas com responsável obrigatório e prazo opcional.

O service valida administrador e vínculo na república para criar/atribuir tarefas; o morador conclui somente as tarefas atribuídas a ele. O repository recebe `tx` quando participar de uma operação transacional. As consultas sempre restringem a república autorizada.
