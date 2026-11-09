# Dashboard — primeira exploração

## Artefato

[Abrir design editável](https://www.figma.com/design/KFcLRjPQ4rT2HOt64FouV9?node-id=2-154).

Direção proposta pelo coordenador: Casa aberta com listas financeiras rigorosas. Ainda não aprovada pelo usuário como visual definitivo. Alternativa textual Livro da casa permanece em `propostas.md`.

Composição desktop 1440 × 960 e adaptação celular 390 px. Manrope Regular/Bold; fundo frio claro, texto verde escuro, ação verde, links azuis e atenção quente. Marca tipográfica provisória, não logo final. Um resumo financeiro destacado e duas áreas de operação: contas em aberto e tarefas.

O botão principal usa instância importada do Simple Design System, variante Primary/Default/Medium, adaptada ao verde. Os demais elementos são camadas editáveis e auto-layout autorais. Não existem screenshots achatadas compondo a interface.

## Conteúdo fiel ao backend

`totalPendente` é o total pendente de todos os rateios da casa: rótulo **Em aberto na casa**. `totalPagoNoMes` corresponde ao mês corrente: **Pagamentos registrados em outubro** neste exemplo datado. Não existe seletor de período histórico neste dashboard. Contas pendentes podem estar vencidas; a implementação deverá ordenar pelos dados retornados pela API.

Os valores, moradores e despesas no desenho são dados fictícios. Tarefas detalhadas exigem consulta ao endpoint apropriado; contagem e lista não devem ser confundidas. Nenhum dado do arquivo prova operação da aplicação.

## Motion proposto por Astra High

Uma única colaboração especializada nesta rodada, modelo `gpt-6-astra`, esforço `high`. Nenhum agente adicional de implementação foi aberto.

| Interação | Especificação candidata | Regra |
|---|---|---|
| Pressão de botão | escala 0,97; resposta 100 ms, retorno 160 ms | Sucesso só após resposta da API; preservar largura e evitar submissão duplicada. |
| Detalhe desktop | painel à direita, 250 ms, curva (0.32, 0.72, 0, 1) | Interrompível, saída pelo mesmo caminho e foco devolvido ao acionador. |
| Menu contextual | opacidade + escala 0,95 para 1; 200 ms | Origem no acionador; só opções suportadas pelo backend. |
| Conclusão de tarefa | indicador durante envio, troca de status em 160 ms | Sem desfazer para morador e sem ocultar falhas da API. |

Teclado tem resposta imediata. Movimento reduzido remove transformações; hover só onde existir ponteiro apropriado. A primeira exploração tem valores estáticos. O usuário pediu considerar gráficos com motion e números animados ao longo do projeto; isso é uma direção futura, sem cobrança de implementação imediata. Avaliar animações curtas, valor final exato, acessibilidade e dados realmente disponíveis. 3D não compõe o dashboard; uma ilustração de convivência pode ser explorada numa futura landing se houver função clara.

## Próxima etapa

Receber avaliação desta direção, ajustar o necessário e consolidar o design para implementação. A base React e a configuração Playwright existentes serão reutilizadas. Construir autenticação, contexto de república e consultas reais por fluxo; não simular funcionamento de API como se estivesse integrado.
