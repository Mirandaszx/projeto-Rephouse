# Frontend RepHouse

Protótipo web-first em React, TypeScript e Vite, responsivo para desktop e celular. Inclui home, cadastro/login, visão da república, despesas e rateio, registro de pagamento com comprovante, tarefas, moradores e painel master.

## Revisar sem configurar o backend

Requer Node.js 22.12+ e npm. A partir de `interface/`:

```sh
npm ci
npm run preview:prototipo
```

O comando compila o frontend e inicia uma prévia **somente local**, com dados fictícios em memória, em `http://127.0.0.1:5182`. O terminal mostra também os acessos diretos e uma senha aleatória para os dois usuários de teste.

| Tela | Endereço |
| --- | --- |
| Home | http://127.0.0.1:5182/ |
| Login | http://127.0.0.1:5182/novo/login |
| Cadastro | http://127.0.0.1:5182/novo/cadastro |
| República | http://127.0.0.1:5182/preview/republica |
| Master | http://127.0.0.1:5182/preview/master |

Na prévia é possível copiar o convite, cadastrar despesas com rateio, registrar pagamentos, anexar um comprovante para demonstrar a interface, criar/concluir tarefas e explorar os filtros e tabelas master. O cadastro abre a casa fictícia já preparada. Arquivos de comprovante não são armazenados. Os indicadores históricos do master são ilustrativos. Reiniciar o servidor restaura os dados; mudanças são compartilhadas entre as abas desse servidor.

Abra master e república em abas diferentes: a sessão usa `sessionStorage` por aba. A prévia não implementa todas as regras, permissões e rotas do backend e não deve ser usada como servidor de produção ou autenticação real. Não use dados pessoais nem comprovantes reais.

## Desenvolvimento com a API existente

```sh
npm run dev
```

O Vite encaminha `/api` para `http://127.0.0.1:3000` por padrão. A variável `REPHOUSE_API_URL` altera o destino; no Docker Compose ela aponta para `http://api:3000`. Consulte o README da raiz para configurar o backend. Nesse modo, contas e autorizações vêm da API.

As chamadas do frontend seguem os contratos existentes. A integração completa com banco e backend ainda precisa de validação própria. Assinaturas e processamento bancário ficam fora desta entrega.

## Verificação

```sh
npm run build
npm run lint
npx playwright install chromium
npm run test:e2e
```

Os testes Playwright executam os fluxos com a API interceptada em desktop e celular; não validam o banco nem o backend real. Relatórios ficam em `interface/output/`, ignorado pelo Git.

## Componentes e fontes

Botões e navegação usam o pacote oficial Glisse. Componentes selecionados do Spell UI, shadcn/ui, Cult UI e Unlumen ficam no código com suas origens e adaptações. Inter é servida localmente com licença OFL. Os avisos de licença aplicáveis ficam junto dos componentes e fontes.

Veja [implementação e origens](../docs/design/implementacao-prototipo.md) e [curadoria](../docs/design/favoritos-provisorios.md). As referências Pro que exigem acesso não foram incorporadas. As rotas `/legado` e `/design-system` preservam explorações anteriores; a revisão atual deve priorizar a home e `/novo/*`.
