# RepHouse

## Estado desta entrega

Protótipo frontend para revisão na branch `front`: home, autenticação, república, despesas, tarefas, moradores e master. A interface atual está em `interface/codigo/rebuild` e `interface/codigo/novo`. O foco desta etapa é o código, sem continuidade do trabalho no Figma. A prévia local usa dados fictícios em memória; a integração completa com o backend será validada depois. Instruções em `interface/README.md`.

O levantamento abaixo preserva o contexto inicial do produto; referências a prazos e ao frontend starter pertencem àquele levantamento.

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Moradores de repúblicas e residências compartilhadas.
- Administrador de cada república, responsável pela gestão da casa.
- Administrador MASTER, com visão global e acesso explícito a cada república conforme a API.

## Product Purpose

Organizar a vida da república: despesas compartilhadas, rateios, pagamentos registrados, histórico, moradores e tarefas. Tornar claras as obrigações de cada pessoa e a situação da casa.

## Operating Context

- Experiência web-first, com alta responsividade para celular; a prioridade não é mobile-first.
- Primeira versão para acompanhamento interno da equipe em 31/10/2026. Não se trata de apresentação formal.
- React, TypeScript, Vite e Tailwind já compõem a base do frontend em `interface/`.
- Backend existente em Node/Express/TypeScript com PostgreSQL/Prisma. A API é a autoridade sobre permissões e regras de negócio.

## Capabilities and Constraints

- Integrar os fluxos existentes: autenticação, perfil, repúblicas, membros, despesas, rateios, pagamentos/comprovantes, histórico pessoal, tarefas, dashboards e administração MASTER.
- Existem três perfis. A interface mostra ações permitidas, mas não substitui a autorização do servidor.
- Dinheiro trafega como string decimal e datas de vencimento como `YYYY-MM-DD`; manter contrato da API.
- Pagamentos da API registram quitação parcial/integral; não representam transferência bancária processada pelo RepHouse.
- A referência Splitwise não autoriza acrescentar funcionalidades ausentes da API, como acertos entre pagador e recebedor.
- Modelo comercial futuro: um mês gratuito, seguido de assinatura. O gestor confirmou que toda a parte de assinatura fica para depois; não integrar, simular cobrança ou bloquear acesso nesta versão.
- Integração ainda não validada executando a aplicação completa; inspeção de código não equivale a teste de funcionamento.

## Brand Commitments

- Nome de trabalho: RepHouse. Sem logo, identidade, Figma ou layout anterior aprovados.
- Liberdade para criar identidade própria e escolher componentes React.
- Splitwise como referência de simplicidade e experiência; preservar identidade própria.
- Direção inicial aceita como base de exploração: leve, amigável e confiável, com verde/azul e destaque quente. Tipografia como Manrope ou Inter é candidata, não decisão final.
- Usuário pediu curadoria de componentes e referências externas, aplicação das skills de design, coordenação por subagentes, Figma e Playwright e registro durável das decisões.

## Evidence on Hand

- Código e documentação do repositório público: https://github.com/Mirandaszx/projeto-Rephouse
- Contrato: `codigo/openapi.ts`; montagem das rotas: `codigo/app.ts`; modelo: `prisma/schema.prisma`.
- Regras de migração e limitações: `documentacao/MIGRACAO_DJANGO.md`.
- Frontend inicial contém apenas a tela starter em `interface/codigo/App.tsx`.
- Respostas do usuário e do gestor consolidadas em `docs/design/briefing.md`.
- Fontes de inspiração e componentes em `docs/design/referencias.md`. Não há estatísticas, depoimentos ou usuários reais autorizados para publicação.

## Product Principles

1. Permitir entender e resolver a próxima obrigação sem esforço.
2. Preservar o contexto da república e o papel de quem está usando o sistema.
3. Manter histórico e valores financeiros claros e fiéis ao backend.
4. Fazer desktop e celular funcionarem bem com os mesmos dados e regras.
5. Construir uma linguagem visual coerente e reutilizável entre as telas.
