# Refinamento Impeccable — 20/11/2026

Aplicação 2.2.1, na branch `teste-devops`. A revisão preserva as cores, o layout aprovado, login/cadastro e casinha. Não modifica APIs, tipos públicos, banco ou regras financeiras. Alterações locais anteriores permanecem preservadas; sem commit, push ou CI remota nesta etapa.

## Ajustes entregues

| Achado da auditoria | Implementação |
| --- | --- |
| Frontend servia uma versão antiga | Compose de desenvolvimento habilita observação periódica do Vite, a cada segundo; apenas o frontend foi recriado. Alteração de módulo temporário foi servida sem reinício e o arquivo foi removido. |
| Erro misturado com código de suporte | `ErrorNotice` mantém uma mensagem principal e `SupportDetails` expõe o identificador recolhido e copiável. Login reutiliza os detalhes, conservando seu temporizador e suas pausas para leitura. |
| Foco perdido após remontagem do formulário | `useDialogMotion` recupera foco somente quando o modal aberto ficou sem controle focado. Na reabertura de tentativa incerta, começa em Fechar. Escape, retorno ao acionador e bloqueio durante envio permanecem. |
| Pendências sem aviso de vencimento no painel | Badges mostram a situação enviada pelo servidor e pagamento parcial de forma independente. Sem situação pronta, a apresentação usa a data civil de referência recebida; mantém a janela de sete dias. Totais e saldos não foram alterados. |
| Consultas financeiras em páginas que não as usam | Moradores, tarefas e configurações consultam conta, república e membros; não exigem dashboard ou despesas. Visão geral e despesas preservam as consultas financeiras. Recorrências continuam conferindo pendências mesmo recolhidas. |
| Endereço desconhecido abria a home | Página explicativa com links de retorno. A lista de caminhos internos é compartilhada com a navegação. Redirecionamentos antigos permanecem. É tratamento de rota do frontend; não altera status/contratos da API. |
| Sistema visual disperso | `DESIGN.md` e `.impeccable/design.json` registram o sistema atual. Fonte local, apresentação da marca e cores de erro ficaram concentradas na base compartilhada. As demais regras legadas não foram reescritas em massa. |

O filtro de despesas conserva o deslize de seleção, sem barra, setas laterais ou instrução adicional. Nenhuma nova dependência foi instalada.

## Atualização de arquivos no Docker

O problema reapareceu após reiniciar: arquivos alterados no Windows continuavam antigos nas respostas do Vite no container. O Compose habilita `REPHOUSE_VITE_POLLING=true`, e `interface/vite.config.ts` usa `server.watch.usePolling` com intervalo de 1000 ms somente quando essa variável está ativa. Execução nativa mantém o observador padrão. O comportamento e o custo potencial de CPU dessa alternativa são documentados pelo [Vite](https://vite.dev/config/server-options.html#server-watch); não foi feito benchmark de CPU nesta revisão.

Para aplicar uma mudança dessa configuração no ambiente existente, mantenha o projeto e seu override e recrie somente o frontend:

```powershell
docker compose -p projeto-rephouse -f docker-compose.yml -f .devops-local/restricao-portas.override.json up -d --no-deps --force-recreate frontend
```

O override citado é local deste checkout. Não copie suas configurações de banco para outro ambiente. O ajuste de observação não se aplica ao backend compilado/produção. Em máquinas nas quais os eventos nativos funcionem corretamente, a variável pode ser definida como `false` no ambiente do Compose.

## Validação

Comando oficial: `npm --prefix interface run verificar`, usando a API HTTP de testes e o PostgreSQL dedicado da porta 5544, com schema temporário. Os testes de tarefas, pagamentos, comprovantes e MASTER continuam na suíte. Nenhum teste foi ignorado ou afrouxado; o teste antigo de mensagem foi atualizado para verificar o mesmo identificador nos detalhes de suporte, fora do alerta principal.

Os oito cenários novos cobrem foco após montar despesa/pagamento/tarefa, falha incerta com uma mensagem, cópia do identificador, reabertura e reenvio idêntico, independência das consultas por página, atraso/hoje/sete dias, referência do servidor diferente do relógio do navegador e recuperação de endereço desconhecido.

As evidências visuais usam dados fictícios e respostas controladas na porta 5173; não são apresentadas como novas jornadas integradas com PostgreSQL. Foram conferidas 40 combinações de rota/largura/tema, além de foco e 32 amostras de contraste. Capturas novas ficam separadas em `.devops-local/interface/imagens/impeccable-ajustes-real/` e `impeccable-ajustes-final/`.

Resultado final: **79 testes executados, 78 aprovados, uma falha preexistente de animação, zero ignorados**. Os oito cenários novos passaram. Build e tipagem passaram; lint teve zero erros e seis avisos de Fast Refresh no ponto de entrada (cinco anteriores e mais um do mesmo padrão para o componente lazy de endereço inexistente). O detector Impeccable não encontrou alertas nos arquivos de interface alterados. Contrato e tipos permanecem sincronizados.

As contagens finais e limitações estão em [evidencias/refinamento-impeccable-2026-11-20.json](evidencias/refinamento-impeccable-2026-11-20.json). A falha de `motion-superficies.spec.ts:192`, com timeout na linha 227, impede declarar a suíte completa aprovada. O teste foi mantido e não foi afrouxado. A primeira execução foi preservada separadamente: suas duas falhas novas foram corrigidas no código antes da execução final. A auditoria inicial e as evidências anteriores permanecem históricas.
