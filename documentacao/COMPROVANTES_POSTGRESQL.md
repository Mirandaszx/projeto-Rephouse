# Comprovantes no PostgreSQL — versão 2.0.1

Pagamento e comprovante agora são gravados na mesma transação serializável. Os arquivos ficam em `comprovantes.conteudo` (`bytea`), com pagamento único, MIME, tamanho, SHA-256 e data. O banco recusa tamanho inválido, hash divergente, MIME fora da lista e alterações/exclusões. O backend identifica o tipo pelo conteúdo. Não são gravados nome original nem caminho de arquivo nos novos pagamentos.

As rotas continuam iguais. JSON aceita pagamento sem arquivo; multipart aceita um PDF, PNG, JPEG ou WEBP de até 5 MiB. O campo público `comprovanteUrl` continua sendo `/api/pagamentos/{id}/comprovante` ou `null`. Listagens e detalhes consultam somente a existência do comprovante. Apenas o download autorizado busca seus bytes, com nome genérico, tamanho, MIME, `nosniff`, `no-store` e `X-Request-Id`.

## Atualização e conferência

Antes de trocar a versão, use a ferramenta anterior para fazer um backup formato 1 e preserve a imagem/configuração anterior. Pare somente a API, mantenha PostgreSQL e volumes, instale as dependências do lockfile e aplique a migration adicional. Não execute reset nem altere migrations já aplicadas.

```powershell
npm ci
npm run db:deploy
npm run comprovantes:importar -- conferir armazenamento/comprovantes
npm run comprovantes:importar -- aplicar armazenamento/comprovantes
npm run comprovantes:verificar
```

Os comandos diretos usam `DATABASE_URL`. Confirme o ambiente selecionado. Para arquivos no volume Docker antigo, use um processo avulso com o volume montado **somente para leitura** e passe esse caminho ao importador. A API de desenvolvimento também deve permanecer parada durante a importação. Na execução compilada, o comando equivalente é `node dist/comandos/importar-comprovantes.js aplicar /importacao`.

O importador verifica todas as referências antes da primeira escrita e grava em transações por pagamento. Repetir a execução confere os documentos existentes sem duplicar registros. Arquivos ausentes, referências inseguras, tipos inválidos e hashes divergentes interrompem a execução. Em falha intermediária, os documentos já importados permanecem válidos e a execução pode ser repetida depois da correção. Nenhum pagamento histórico ou arquivo original é alterado. Arquivos sem referência são apenas informados.

A API recusa o startup enquanto houver referências legadas pendentes ou comprovantes inconsistentes. A coluna antiga `pagamentos.comprovante_url` continua preservada para os históricos; os novos pagamentos usam a relação `comprovantes`. Depois da conferência, inicie a API e valide health, readiness, login e download. A inspeção inicial desta entrega encontrou zero pagamentos no banco de desenvolvimento; os cenários legados foram testados em ambientes exclusivos.

## Backup e restauração

Os comandos e seus argumentos permanecem:

```powershell
npm run backup -- projeto-rephouse .env desenvolvimento
npm run backup -- rephouse-validacao .env.backend backend
npm run restaurar -- rephouse-restauracao-teste copias-seguranca/PASTA .env.backend
```

O formato **2** contém `banco.dump` e `manifesto.json`. O dump customizado inclui os comprovantes, e o manifesto registra versão, imagem, data, fuso e SHA-256. A captura suspende a API e a reinicia em `finally`, inclusive em falha. A trava exclusiva por projeto continua ativa. Sem manifesto completo e hashes válidos, uma pasta não é um backup restaurável.

O restaurador continua aceitando o formato **1**, que contém dump e `comprovantes.tar.gz`: cria um destino Docker novo, restaura o banco, aplica migrations adicionais, extrai os arquivos em volume temporário exclusivo, importa e verifica os documentos, e somente então inicia a API. O arquivo original e os volumes antigos permanecem intocados. Uma falha impede liberar a API; recursos novos incompletos são identificados pelo projeto escolhido para diagnóstico. A área temporária é removida somente após importação bem-sucedida.

O Compose atual não monta armazenamento de comprovantes na API. Volumes anteriores permanecem no Docker e não devem ser apagados como parte desta atualização. Backups anteriores também são preservados; não há exclusão automática.

O destino de restauração é recusado também quando já existe um volume com o nome esperado, mesmo sem rótulos do Compose. O teste local criou um volume descartável sem rótulos para verificar essa proteção e removeu somente essa fixture.

## Recuperação da transição

Antes de liberar tráfego na nova versão, uma falha permite voltar à imagem/configuração anterior, mantendo o banco com a migration aditiva e os arquivos originais preservados. Não use `git reset` nem restaure sobre volumes existentes. Quando necessário, faça checkout separado da revisão anterior e use a configuração privada daquele ambiente.

Depois de novos pagamentos com comprovante no banco, a versão anterior não consegue servir esses documentos. Nesse caso, não faça reversão direta: mantenha os dados, corrija a versão atual ou ensaie a recuperação do backup em outra instância. A restauração nunca sobrescreve o banco ativo.

## Verificação e desempenho

`npm run verificar` inclui tipos sincronizados, exemplos compilados para navegador e testes de banco/HTTP. `npm run test:devops` valida os dois formatos de backup, hashes dos downloads, reinício, falhas de captura e durabilidade. Os comandos `test:carga` e `test:carga:completo` agora incluem PNGs sintéticos válidos de aproximadamente 256 KiB, pouco compressíveis, nos pagamentos, e downloads em aproximadamente 10% das chamadas. Respostas 429 no tráfego normal contam como falhas. O teste deliberado de saturação é separado.

O [resultado desta versão](evidencias/validacao-comprovantes.json) é separado dos ensaios 2.0.0. No cenário completo, foram 16.604 requisições, 39,47 requisições/s, p95 de leitura 127,60 ms e escrita 194,23 ms; upload 213,08 ms e download 119,21 ms. Não houve HTTP 500, duplicação, violação de isolamento ou inconsistência financeira. Os 1.165 pagamentos confirmados corresponderam a 1.165 comprovantes no banco. O banco cresceu aproximadamente 305,26 MiB.

O resultado global foi **`target_not_met`**. Houve 145 respostas 429, representando 0,873% das requisições. Embora latências e taxa abaixo de 1% tenham passado, o cenário mantém a exigência adicional de 100% das verificações aprovadas, que falhou por essas recusas. Elas foram contabilizadas, sem reenvio automático nem aumento do limite de dois uploads. Portanto, esta medição não é apresentada como capacidade plenamente aprovada. O ajuste posterior para manter o slot ocupado mesmo se o cliente desconectar foi validado por regressão e carga curta; o ensaio completo não simula desconexões.

Os commits permanecem locais e a CI remota não foi executada.

Referências: [bytea](https://www.postgresql.org/docs/18/datatype-binary.html), [SHA-256 e tamanho binário](https://www.postgresql.org/docs/18/functions-binarystring.html), [backup lógico](https://www.postgresql.org/docs/18/backup-dump.html).
