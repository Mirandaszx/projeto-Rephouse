# Administração da plataforma

Rotas, controller, service e repository implementam consultas globais, dashboard e bloqueio/desbloqueio de usuários e repúblicas. As rotas com república explícita reutilizam os serviços dos demais módulos.

Este módulo exige autenticação e autorização explícita de `USUARIO_MASTER` antes de acessar dados globais. O controller não define privilégios a partir do corpo da requisição. Operações que alteram vários registros usam a infraestrutura transacional compartilhada.

Bloqueio de conta revoga seus tokens. Conta excluída não pode ser reativada, e o último MASTER ativo não pode ser bloqueado. Provisionamento de MASTER é um comando local, sem rota pública de promoção.
