# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Moradores de repúblicas, administradores da própria casa e MASTER responsável pela administração do sistema. O usuário principal acompanha tarefas, sua participação nas contas e os avisos da casa em celular ou computador.

## Product Purpose

Organizar moradores, tarefas compartilhadas e despesas com rateio. O sistema registra pagamentos manuais e comprovantes; não movimenta dinheiro nem integra gateway bancário nesta entrega.

## Capabilities and Constraints

- Morador pode criar tarefa disponível ou para si, assumir, concluir, liberar e reabrir a própria tarefa. Administrador mantém a gestão da casa.
- Notificações internas separam tarefas e despesas; leitura é individual, persistente e restrita ao vínculo atual. Não enviar esses avisos por e-mail ou pelo sistema operacional.
- Pagamentos parciais, centavos exatos, recorrências, histórico financeiro, idempotência e autorização pertencem ao backend/PostgreSQL.
- Confirmação de cadastro e link mágico usam o provedor de e-mail no servidor. Contas existentes preservam o acesso por senha.
- Desenvolvimento em TypeScript, React, monólito em camadas e PostgreSQL. Sem novas dependências ou publicação nesta etapa de notificações. Validar migrations no banco dedicado antes da ativação autorizada no principal, com backup e preservação dos dados e volumes.

## Brand Commitments

RepHouse mantém a identidade aprovada em verde, temas claro/escuro e fonte Inter local. Home, login, cadastro e casinha preservam sua composição. Não repetir a casinha como decoração operacional.

## Product Principles

Regras de autorização continuam válidas após troca de vínculo ou administração. Erros não são apresentados como resultados vazios. Reenvios não duplicam operações confirmadas. Dados e evidências históricas são preservados.

## Accessibility & Inclusion

Navegação por teclado, foco visível, rótulos e estados textuais, contraste adequado e suporte a movimento reduzido. Avisos essenciais não desaparecem automaticamente. A exceção de movimento já aprovada para o filtro deslizante é preservada.
