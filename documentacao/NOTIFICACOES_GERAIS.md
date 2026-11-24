# Notificações gerais e aba Todas — 4.1.0

A aba **Todas** reúne tarefas, despesas e avisos de entrada/saída de moradores, em ordem cronológica decrescente. Tarefas e Despesas continuam disponíveis como filtros. A paginação, o sino, o contador, os temas e a conexão SSE existentes são reutilizados.

## Regras

- Entrada por código e reentrada geram `MEMBRO_ENTROU`. Saída voluntária, troca de casa, desativação de vínculo pelo administrador e encerramento do vínculo por exclusão lógica geram `MEMBRO_SAIU`.
- A mensagem exibida é “Entrou na república” ou “Deixou a república”, acompanhada do nome do morador. Ela não divulga e-mail, motivo de desativação nem confirmação de exclusão da conta.
- O evento e os destinatários são gravados na mesma transação do vínculo. Falha ou troca por código inválido não deixa aviso de uma operação revertida.
- Recebem o aviso os demais moradores ativos e habilitados daquela casa. Quem realizou a ação e a pessoa que entrou/saiu ficam fora dos destinatários. Na criação da primeira casa não há outros moradores para avisar.
- Pedidos simultâneos não produzem uma segunda transição. Sair e retornar posteriormente é uma transição nova e produz outro aviso, preservando o mesmo vínculo histórico.
- Não existem eventos retroativos ou envio por e-mail. Bloquear uma conta sem alterar o vínculo não é apresentado como saída da casa.
- Clicar marca como lido e abre Moradores. Abrir o painel não marca nada. Na aba Todas, “Marcar todas como lidas” atua nas três categorias; nas outras abas continua restrito ao filtro selecionado.

## Contrato e banco

`GET /api/notificacoes?categoria=TODAS` reúne as três categorias com `{dados,paginacao}`. O parâmetro também aceita `GERAIS`, `TAREFAS` e `DESPESAS`; o padrão HTTP continua `TAREFAS` para preservar consumidores anteriores. A interface escolhe Todas explicitamente.

`GET /api/notificacoes/nao-lidas` acrescenta `gerais` e mantém `tarefas`, `despesas` e `total`. O campo novo é opcional no tipo compartilhado para permitir a interface consultar APIs anteriores durante a transição. A API 4.1.0 sempre o retorna. `PATCH /api/notificacoes/lidas` aceita `{categoria:"TODAS"}` ou uma categoria específica. Os mesmos recursos estão disponíveis em `/api/front/v1`, preservando a paginação.

A migration adicional `202611210001_notificacoes_gerais` acrescenta a referência ao vínculo que originou o evento, sem atualizar registros antigos. FKs, CHECK e triggers validam categoria, tipo, casa, situação do vínculo e destinatários. A conta limitada continua sem DELETE e só atualiza `lida_em` na caixa de notificações. Não há tabelas novas ou limpeza automática.

O nome em `titulo` é o nome usado no momento do evento. A autorização continua sendo conferida no servidor pelo vínculo atual. A sinalização LISTEN/NOTIFY permanece sem conteúdo pessoal; SSE pede reconciliação pelas consultas autorizadas.

`down.sql` é referência para uma migration compensatória revisada. Recusa a reversão se houver qualquer evento geral, para não apagar histórico nem deixar o banco incompatível. Migrations aplicadas não foram editadas.

## Verificação

Os request specs novos ficam em `testes/request-notificacoes-gerais.test.ts`, incorporados a `npm run test:completo` e `npm run test:notificacoes`. Testam destinatários, concorrência, reentrada, troca, exclusão, rollback, isolamento, totais e leitura. A suíte de navegador `notificacoes.spec.ts` acrescenta chegada em tempo real, navegação pelas três abas e abertura de Moradores.

Os testes usam exclusivamente o PostgreSQL dedicado da porta 5544. Nenhum cadastro, pagamento, saída ou desativação de teste é executado no principal. As novas capturas ficam em `.devops-local/interface/imagens/notificacoes-gerais-2026-11-21/`, separadas da entrega 4.0.0.

Resultado local: **321 testes de backend aprovados**, sem falhas ou ignorados; contrato/tipos sincronizados e schemas temporários removidos. Frontend: build, tipagem e lint sem erros (seis avisos anteriores). A suíte completa passou em **89 de 90 cenários**; permanece a falha conhecida em `motion-superficies.spec.ts:195`, linha 230. A confirmação final dos seis testes de notificações passou, incluindo reentrada realmente recebida e ausência de cortes nas abas. Os resultados dessas rodadas têm sobreposição e não devem ser somados. Veja a [evidência própria](evidencias/notificacoes-gerais-2026-11-21.json).

## Ativação no principal — 21/11/2026

O principal serve **4.1.0**, com **24 migrations e nenhuma pendente**. A migration geral foi aplicada após autorização explícita do usuário, com backup formato 2 conferido por hash e catálogo. Campos históricos de 20 tabelas foram comparados antes de iniciar a API; dados e volume PostgreSQL foram preservados. A comparação da tabela de eventos desconsidera apenas a nova coluna anulável `membro_evento_id`. Não houve novo ensaio de restauração.

A revisão automática havia recusado a primeira tentativa por exigir autorização explícita. Após o usuário autorizar “Ativação com backup”, o procedimento foi concluído: pausa breve da API, dump preventivo, migration adicional, permissões e compilação 4.1.0. A conferência final usou somente consultas e SSE com sessão curta em memória, sem entradas/saídas fictícias no principal. Consulte a [evidência de ativação](evidencias/ativacao-gerais-principal-2026-11-21.json).

O frontend conserva a compatibilidade: a aba Todas só aparece quando a API retorna o contador `gerais`. Atualize a página para selecionar Todas na abertura. O override local `.devops-local/principal-estavel.yml` mantém a compilação 4.1.0 no Docker:

```powershell
docker compose --env-file .env -f docker-compose.yml -f .devops-local/principal-estavel.yml -p projeto-rephouse up -d --wait postgres api frontend
```

A falha anterior de animação do modal não foi removida nem ignorada por esta entrega. Não houve commit, push, publicação ou CI remota.
