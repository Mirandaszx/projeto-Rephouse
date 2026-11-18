# Motion: modais e avisos — 18/11/2026

Esta etapa completa as transições das superfícies ocasionais, preservando layout, cores e operações da versão 2.2.0. As oportunidades de recorrências e primeira despesa permanecem no [planejamento](PLANO_MOTION_DESIGN.md).

## Comportamento

- Diálogos compartilhados, formulário de despesa/pagamento e criação de tarefa: entrada de **180 ms**, saída de **140 ms**, opacidade e deslocamento vertical de **4 px**. O backdrop acompanha somente a opacidade. A curva é `cubic-bezier(0.23, 1, 0.32, 1)`.
- O diálogo continua nativo e modal durante a saída. O formulário fica inerte, com proteção adicional contra reenvio, e o foco retorna ao acionador. Se o refresh substituir esse elemento, o conteúdo principal recebe o foco.
- Fechamentos aguardam `transitionend`, com fallback de **200 ms** para CSS ausente, aba em segundo plano ou evento não entregue. Não há espera antes da requisição: salvar só inicia o fechamento após sucesso da API. Falhas mantêm os dados e o erro no formulário.
- O aviso flutuante de sucesso existente entra em **180 ms** e sai em **140 ms**, com opacidade e deslocamento vertical de até **8 px**. Continua sendo fechado manualmente, sem temporizador de desaparecimento. O fallback se aplica somente a uma saída solicitada.
- Mensagens novas usam identidade própria. Uma saída interrompida não remove a confirmação nova, mesmo que o texto seja igual. Substituir a mensagem durante a saída retoma a transição a partir do estado visual atual.
- Teclado e movimento reduzido são imediatos nesta etapa. Mudar para movimento reduzido ou usar teclado durante uma saída encerra a transição. A exceção do deslize de filtros aprovada anteriormente permanece.

## Implementação

As transições usam CSS, incluindo `@starting-style`, e um hook que coordena o fechamento do diálogo nativo. Não foi necessário instalar biblioteca. Não são animados altura, largura, blur ou números financeiros. Os avisos de erro e as confirmações locais de perfil e tarefas conservam suas posições e comportamentos; não foram transformados em novos toasts.

Não houve alteração em APIs, tipos públicos, banco, migrations ou versão. Home, login, cadastro e casinha permanecem como estavam. Não houve commit ou push.

## Validação local

Os sete cenários novos de `motion-superficies.spec.ts` cobrem modalidades nativa e compartilhada, restauração de foco, reabertura, envio lento, reenvio, falhas, sucesso, teclado, mudança de movimento reduzido, mensagens consecutivas idênticas e ausência de `transitionend`. A montagem isolada do componente de aviso existe somente no teste.

As capturas controladas ficam em `.devops-local/interface/imagens/motion-superficies/`, separadas das evidências anteriores. A matriz inclui 320, 390, 768 e 1440 px, temas claro/escuro e janela baixa. Os seis quadros adicionais em `.devops-local/interface/imagens/motion-quadros/` mostram entrada, saída e aviso nos dois temas em 390 px. A captura intermediária pausa apenas o relógio e as animações do teste, sem alterar o tempo do produto.

Comando completo: `npm --prefix interface run verificar`. **Build, tipagem e lint aprovados; 64 testes aprovados, sem falhas, instabilidades ou testes ignorados.** Permanecem cinco avisos anteriores de Fast Refresh em `main.tsx`. O harness usa exclusivamente o PostgreSQL de testes e um schema descartável; as jornadas existentes de tarefas, pagamentos e MASTER fazem parte da regressão. A tipagem foi repetida após o ajuste do relógio nas capturas. Resultado final, hashes e limitações: [evidência local](evidencias/validacao-motion-primeira-etapa.json).

A primeira execução focada aprovou dez cenários e falhou no harness de mensagens consecutivas: o teste importava `createRoot` como export nomeado, mas o módulo otimizado do Vite o fornece no export padrão. O harness foi corrigido; os sete cenários novos passaram isoladamente e na regressão completa. O relatório inicial foi preservado fora do versionamento.

Capturas e testes automatizados não equivalem a testes em celular físico ou leitor de tela. A preferência do Windows por movimento reduzido pode deixar os novos efeitos imediatos: isso é esperado e não altera a exceção aprovada dos filtros.
