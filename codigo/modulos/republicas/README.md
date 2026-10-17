# Repúblicas e moradores

Implementa criação, consulta, edição, entrada por código, saída, troca, membros e transferência explícita da administração.

Organização: `republicas.routes.ts` → `republicas.controller.ts` → `republicas.service.ts` → `republicas.repository.ts`.

O service recebe a identidade autenticada separadamente dos dados da requisição. Criar república exige promover o usuário e criar seu vínculo na mesma transação. A troca de república desativa o vínculo antigo e cria/reativa o novo usando a infraestrutura transacional, passando o mesmo `tx` a todos os repositories. Um administrador transfere sua responsabilidade antes da saída. Sair com dívida é permitido: o usuário mantém acesso restrito aos próprios rateios antigos.

O repository recebe o contexto de execução; não abre transações próprias. Vínculos inativos permanecem no banco para conservar o histórico.
