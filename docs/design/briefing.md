# Briefing confirmado

## Objetivo

Construir o frontend completo do RepHouse com integração ao backend já existente. A primeira versão será mostrada à equipe até 31/10/2026 para acompanhamento. A abrangência exata do que estará funcional nessa data deve ser informada por evidências da implementação, não por uma promessa implícita de conclusão total.

## Experiência e identidade

Web-first, com alta responsividade para celular e importância mantida no desktop. Layout e identidade partem do zero. A equipe concedeu liberdade criativa. O usuário pretende aproveitar componentes React de catálogos, com curadoria e adaptação para um sistema visual consistente.

Referência de experiência: Splitwise — organização de grupos, despesas compartilhadas, saldos e histórico, adaptados ao modelo do RepHouse. A referência não muda as regras da API.

## Superfícies e integração existente

| Superfície | Base atual da API | Observação para a interface |
|---|---|---|
| Cadastro/login | `/api/auth/register`, `/login`, `/logout` | Tratar expiração, erro e saída de sessão. |
| Perfil | `/api/me` | Edição de nome e exclusão conforme regras; não inventar recuperação de senha ou upload de foto. |
| Entrada na casa | `/api/republicas`, `/entrar`, `/trocar` | Criar ou entrar por código; um vínculo ativo conforme backend. |
| República/membros | `/api/republicas/atual`, `/api/membros` | Administração da casa, saída e transferência; preservar histórico. |
| Financeiro | `/api/despesas`, `/api/pagamentos` | Rateios, pagamentos parciais ou integrais com atualização de saldo e comprovantes opcionais. |
| Histórico pessoal | `/api/me/financeiro` | Incluir obrigações anteriores conforme acesso permitido. |
| Tarefas | `/api/tarefas` | Respeitar ações por perfil; não pressupor reabrir/desfazer para moradores. |
| Visão geral | `/api/dashboard` | Exibir somente indicadores retornados ou derivados corretamente. |
| MASTER | `/api/master/*` | Visão global e acesso explícito ao contexto de uma república. |

As rotas abreviadas na tabela devem ser resolvidas pelo contrato completo em `codigo/openapi.ts`.

## Fora da primeira versão

- Assinatura, cobrança recorrente, contagem de mês gratuito e bloqueio por plano: gestor pediu expressamente para depois.
- Transferências bancárias, Pix processado, acertos automáticos entre pessoas ou provedor de pagamentos.
- Aprovação de comprovantes, auditoria global de eventos, notificações ou outros fluxos sem contrato no backend.
- Cópia integral da identidade do Splitwise ou adoção automática de todos os catálogos sugeridos.

## Integrações de trabalho

- Figma: solicitado para salvar e acompanhar design. A conta ainda precisa estar efetivamente conectada e as capacidades verificadas.
- Playwright: solicitado para automação e verificação; configuração local é diferente de um conector MCP.
- Agentes: pesquisa de componentes, exploração visual e QA têm responsáveis independentes. A coordenação final e a coerência permanecem no agente principal.

## Questões ainda abertas

- Direção visual final, logo e tokens aprovados.
- Arquivo/projeto Figma de destino, quando a conexão estiver pronta.
- Ambiente executável completo, dados de teste e credenciais locais dos três perfis.
- Quais fluxos já terão passado por integração e navegador no marco de 31/10.
