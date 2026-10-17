# Autenticação

Cadastro independente, login, JWT, logout, edição do nome e exclusão lógica da própria conta estão implementados.

As camadas são `auth.routes.ts`, `auth.controller.ts`, `auth.service.ts` e `auth.repository.ts`. O controller valida a entrada, o service aplica a política e o repository acessa usuários pelo Prisma.

Cadastro público sempre cria `USUARIO_NORMAL`. A senha é transformada em hash no service; hash e senha não fazem parte da resposta pública. A identidade autenticada vem de um token validado e de uma conta ativa conferida no banco.

Excluir exige senha correta, ausência de dívidas e transferência prévia de administração. A transação encerra os vínculos e invalida os tokens, preservando registros e e-mail. O último MASTER ativo não pode ser excluído.
