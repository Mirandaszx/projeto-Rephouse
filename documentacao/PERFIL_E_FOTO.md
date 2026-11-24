# Perfil e foto — versão local 4.2.0

## Estado da entrega

Implementação **ativada no principal local em 22/11/2026**, após autorização explícita. A API serve 4.2.0, com **26 migrations e nenhuma pendente**. Backup novo com catálogo e SHA-256 conferidos; todas as 20 tabelas anteriores foram comparadas antes/depois da migration, sem alteração, e o volume PostgreSQL foi preservado. A conta limitada recebeu as permissões da foto; API e proxy foram conferidos em 17 verificações HTTP. Não foram criadas contas ou fotos artificiais no principal. Veja a [evidência de ativação](evidencias/ativacao-perfil-principal-2026-11-22.json). Testes usam somente `rabbu_mvp_test`, porta 5544, schemas descartáveis e contas fictícias. Não houve commit, push ou publicação.

### Resultados locais — 22/11/2026

| Verificação | Resultado |
|---|---|
| `npm run test:completo` | **337 aprovados, zero falhas/ignorados**; schema temporário removido. |
| Verificação final de foto e permissões | 16 aprovados; repetição dos 10 casos de foto com GPS/EXIF e container animado de um quadro também aprovada. Não somar repetições como novos casos. |
| Build, tipagem, lint e tipos gerados | Aprovados; seis avisos Fast Refresh preexistentes. |
| `npm --prefix interface run verificar` | **104 aprovados, três falhas, nenhum ignorado**. As oito jornadas do perfil passaram. |
| Tema isolado, sem alterar testes ou código | Três aprovados. A falha da suíte completa não se reproduziu nesta execução. |
| Motion isolado, sem alterar testes | Seis aprovados e uma falha, somente o cenário de animação já conhecido. O timeout inicial do cenário de avisos não se reproduziu nesta execução. |
| Docker local sem rede/banco | Serviço real gera WebP 512 × 512 sem metadados usando Sharp 0.35.5 em Node 24. |
| Detector Impeccable | Zero achados nos componentes revisados. |

A **suíte completa do frontend não está aprovada**. Permanecem três falhas de execução para investigar, sem apagar, ignorar ou afrouxar testes:

1. Falha de animação já conhecida em `motion-superficies.spec.ts:195`, com timeout na verificação da saída, linha 230. O teste foi preservado.
2. `tema.spec.ts:8` falhou na suíte completa ao alternar a preferência do sistema de escuro para claro, linha 14. O arquivo passou isoladamente. A sequência perfil/tema passou com 11 testes após explicitar o esquema claro do novo contexto por toque, mas a falha persistiu na execução completa. Essa preparação não é apresentada como correção do problema global. O código e as expectativas do tema não foram alterados; a causa ainda precisa de investigação.
3. `motion-superficies.spec.ts:127` apresentou timeout na função `ready`, aguardando o título principal antes de iniciar o cenário de avisos. Não é apresentado como defeito confirmado da lógica de avisos nem como falha preexistente comprovada.

O retorno de foco do editor revelou um defeito novo na primeira execução: o botão ficava desabilitado enquanto o seletor abria e deixava de ser o foco de origem. O componente agora conserva explicitamente esse acionador e devolve o foco ao cancelar; o teste por toque passou sem mudar a expectativa.

Veja o [relatório e hashes das evidências](evidencias/perfil-foto-2026-11-22.json), incluindo tentativas anteriores, resultados finais e capturas. O código está implementado e as jornadas do perfil foram validadas; aprovação global do frontend e ativação do principal são estados separados.

## Uso

Em **Meu perfil**, escolha **Adicionar foto** ou **Trocar foto**. São aceitos JPEG, PNG e WebP estáticos até 5 MiB e 25 megapixels. SVG, GIF, arquivos animados, corrompidos e recortes fora da imagem são rejeitados.

A prévia circular permite arrastar e ajustar o zoom antes de **Salvar foto**. Pelo teclado, Tab alcança a imagem e o zoom; as setas ajustam o enquadramento e o controle de zoom. Cancelar ou Escape, fora de um envio em andamento, preserva a imagem anterior e retorna o foco ao acionador. Durante o envio não é possível reenviar nem fechar o diálogo. Uma falha conserva o editor para correção ou nova tentativa, sem substituição visual antecipada.

**Remover foto** exige confirmação e retorna às iniciais. Nome continua editável. E-mail, data de cadastro, república atual e função são informações de consulta. A confirmação por link vem de `emails_verificados`: ausência de registro aparece como **Confirmação por e-mail não registrada**, sem bloquear contas antigas ou inventar confirmação. Uma identidade Google não é convertida artificialmente em registro de confirmação por link.

Não foram acrescentados troca de senha, edição do e-mail, telefone, biografia, importação automática do Google ou notificações de alteração de foto.

## Imagem e privacidade

- O servidor detecta o formato real, decodifica e limita a 25 milhões de pixels. Corrige a orientação EXIF antes de validar o recorte; gera WebP quadrado 512 × 512, qualidade 82, até 512 KiB, sem EXIF/XMP/localização.
- O original e as coordenadas não são persistidos. Uma linha em `fotos_perfil` guarda a imagem tratada, tamanho, tipo, hash SHA-256 e data; substituir não cria histórico de fotos.
- Somente o proprietário altera ou remove. Consultar exige conta habilitada e sessão vigente: proprietário ou morador ativo da mesma república atual, também ativa. Não há exceção global para MASTER. Vínculos antigos/inativos não dão acesso.
- A resposta binária usa `Cache-Control: no-store`, `image/webp` e `nosniff`. Ausência e acesso indevido recebem o mesmo 404.
- O frontend faz `fetch` com Bearer no header e cria uma URL de objeto em memória. Reutiliza a leitura enquanto os mesmos avatares estiverem montados e libera requisições/URLs ao encerrar o contexto. Não guarda fotos, originais ou URLs em localStorage/sessionStorage, nem coloca JWT na URL.
- Sem imagem ou diante de erro, mostra iniciais. As mudanças próprias atualizam os dados após confirmação; outros moradores recebem a imagem atualizada na próxima consulta, sem novo SSE.
- Excluir a conta remove a foto na mesma transação, somente após as confirmações e restrições existentes; dívidas, administração pendente e último MASTER continuam protegidos. Histórico financeiro não é removido.

## Contrato

| Operação | Entrada e saída |
|---|---|
| `POST /api/me/foto` | Multipart com `imagem` e `recorte` como JSON `{x,y,largura,altura}`; retorna `{versao,atualizadaEm}` com 200. |
| `DELETE /api/me/foto` | 204 inclusive quando já não há foto. |
| `GET /api/usuarios/{id}/foto` | Imagem WebP autenticada; 404 para ausência ou acesso indevido. |

`recorte` usa inteiros em pixels na imagem já orientada: origem não negativa, largura/altura positivas, quadrado com tolerância de um pixel de arredondamento e limites verificados pelo servidor. Não existe parâmetro para escolher o dono do upload.

O `/api/me` acrescenta `foto` e `emailConfirmadoEm`. Usuários nas listagens de moradores acrescentam metadados opcionais de `foto`, sem bytes. Contas inativas, vínculos inativos e consultas MASTER com escopo explícito recebem foto nula. As operações passam pelo mesmo adaptador `/api/front/v1`, sem remover autenticação ou restrições. Quando a API anterior omite esses campos, a interface desabilita o upload e informa que a confirmação está indisponível, sem interpretar ausência do campo como ausência de confirmação.

Erros preservam `{error:{code,message}}` e `X-Request-Id`: 400 para imagem/recorte inválido, 401 para sessão inválida, 404 para consulta indisponível, 413 para arquivo maior que 5 MiB e 429 quando já existem dois uploads de foto em andamento na instância. A autorização é revalidada na transação após o processamento.

As novas dependências estão fixadas: `react-easy-crop@6.2.5` na interface e `sharp@0.35.5` no backend. Elas atendem, respectivamente, [enquadramento com teclado/toque](https://github.com/ValentinH/react-easy-crop) e [tratamento de saída sem preservação de metadados](https://sharp.pixelplumbing.com/api-output/).

## Banco e ativação

A migration `202611220002_fotos_perfil` cria uma tabela, sem alterar registros anteriores. Há PK/FK por usuário, campos obrigatórios, limite e consistência de tamanho com `octet_length`, tipo WebP fixo e formato de hash. A conta limitada recebe somente SELECT/INSERT/UPDATE/DELETE nessa nova tabela.

O `down.sql` recusa a reversão quando houver fotos; não apaga imagens para permitir o rollback. Migrations anteriores permanecem intactas.

A ativação autorizada no principal local foi concluída com backup em `copias-seguranca/2026-11-22T06-21-40-619Z-antes-perfil-foto-24a77232/`, aplicação desta migration, atualização explícita das permissões e API 4.2.0. O dump foi verificado por catálogo e hash; não foi executada restauração. Não iniciar o novo backend contra o schema antigo: o `/api/me` e a listagem de moradores consultam a nova tabela. O frontend tolera a ausência dos metadados na API anterior; neste principal a funcionalidade está ativada. O envio com conta real não foi executado durante a ativação: a jornada completa permanece comprovada no banco dedicado, sem inserir dados de teste no principal.

## Verificação

```powershell
npm run test:completo
npm --prefix interface run verificar
```

As request specs estão em `testes/request-perfil.test.ts`; cenários do navegador em `interface/testes-pr2/perfil-foto.spec.ts`. Os testes geram imagens fictícias, exercitam HTTP, PostgreSQL, concorrência, restrições, conta limitada, reinício real da API compilada, acessibilidade e responsividade. Capturas desta etapa ficam em `.devops-local/interface/imagens/perfil-foto-2026-11-22/`, separadas das anteriores. Toque foi verificado em navegador emulado; não foi apresentado como teste em aparelho físico.
