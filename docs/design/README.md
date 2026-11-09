# Design do RepHouse — protótipo para revisão

Para executar a versão atual, consulte [o README do frontend](../../interface/README.md). O comando `npm run preview:prototipo` em `interface/` abre uma prévia com dados fictícios e sem backend. O foco atual é a interface em código; a integração completa será validada depois. Veja [componentes implementados](implementacao-prototipo.md) e [curadoria](favoritos-provisorios.md).

O registro abaixo é histórico do levantamento inicial e não descreve o estado de publicação da branch `front`.

Registro local do trabalho iniciado em 30/10/2026. Os arquivos estão nesta cópia do repositório; salvar aqui não significa enviar ao GitHub nem ao Figma.

- [Produto e restrições](../../PRODUCT.md): fatos confirmados e autoridade para trabalhos futuros.
- [Briefing](briefing.md): escopo, integração e papéis.
- [Referências](referencias.md): curadoria e limitações dos componentes.
- [Direções em exploração](propostas.md): duas propostas textuais; nenhuma é layout aprovado ou captura renderizada.
- [Decisões e andamento](acompanhamento.md): estado e próximos passos.
- [Organização no Figma](figma.md): estrutura proposta e estado da conexão.
- [Skills e critérios de qualidade](qualidade.md): aplicação de Emil, Apple Design e demais referências.
- [Primeira direção do dashboard](dashboard-primeira-direcao.md): arquivo Figma, composição e especificações de motion.
- [Playwright](playwright.md): configuração e evidências de automação local, quando disponibilizadas.

## Fluxo de acompanhamento

1. Consolidar requisitos e curadoria no repositório.
2. Conectar a conta Figma e verificar as capacidades disponíveis antes de prometer criação/edição de arquivos.
3. Comparar direções e salvar o layout escolhido e seus tokens. O Figma deve receber referências às telas e às decisões reais, sem substituir a documentação do produto.
4. Implementar por fluxo da API mantendo a mesma linguagem visual.
5. Verificar desktop e celular com navegador/Playwright; guardar capturas e relatórios e registrar limites da verificação.

## Limites do registro

Não guardar senhas, tokens, arquivos `.env`, sessões de autenticação ou comprovantes reais na documentação ou nos relatórios versionados. Nenhuma publicação externa ou PR foi executado nesta etapa.
