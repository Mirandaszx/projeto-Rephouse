# Consolidação do backend

A entrega anterior está preservada no commit `7781cfb`. Esta etapa fortalece o backend e prepara paginação e avaliação de crescimento. Por decisão do usuário, os commits ficam **somente locais**; push, PR e execução remota do GitHub Actions permanecem pendentes.

## Segurança e operação

Helmet adiciona os headers HTTP; HTTPS/HSTS público fica a cargo de uma implantação futura. Respostas da API usam `Cache-Control: no-store`. O servidor limita headers a 10 segundos, recebimento a 30 segundos e drenagem de encerramento a 15 segundos.

JWT exige identidade UUID, emissão, expiração e versão não negativa. Antes do processamento de comprovantes, a sessão é conferida no banco; a autorização é novamente validada na transação do pagamento. Uploads mantêm 5 MiB e no máximo dois processamentos simultâneos por instância, com `429 UPLOAD_BUSY` e `Retry-After: 1` quando saturados.

Falhas de escrita retornam `503 STORAGE_UNAVAILABLE` antes de iniciar o pagamento e tentam remover somente o arquivo criado por aquela operação. Erros estruturados de conexão e conflitos esgotados retornam 503; conflitos de domínio/financeiros retornam 409; entradas inválidas retornam 400. Mensagens SQL não são usadas para classificar erros. A migration adicional `202610170007_erros_dominio` mantém as regras existentes e acrescenta SQLSTATE `RH001` às exceções de domínio.

Logs de diagnóstico incluem categoria, código seguro e `requestId`, sem mensagem interna, SQL, stack ou entradas privadas. `npm run comprovantes:verificar` consulta referências e arquivos em modo somente leitura: informa pagamentos com arquivo ausente, arquivos sem referência e links ignorados. Não remove nada.

Backup/restauração usam trava exclusiva por projeto em `.devops-local/travas`; outra operação concorrente é recusada. A trava é removida no `finally`. Após encerramento forçado, confira o PID e os containers antes de remover manualmente uma trava abandonada. O manifesto é validado antes da restauração e preserva compatibilidade com cópias anteriores sem fuso explícito, adotando Brasília.

## Ambiente de desenvolvimento

A API antiga foi recriada com a montagem da pasta atual. Antes disso, foram feitos dumps preventivos dos bancos selecionado e original em `copias-seguranca/pre-consolidacao`; o banco selecionado não possuía referências a comprovantes. PostgreSQL, volume existente e frontend não foram recriados. `health` e `ready` responderam 200 após a recuperação.

Uma regra ampla de `.gitignore` ignorava também `codigo/infraestrutura/armazenamento`. Ela foi limitada ao armazenamento de dados na raiz, para versionar o código de comprovantes e permitir checkout reproduzível.

Resultados finais, paginação e carga serão registrados ao concluir os ensaios desta etapa.
