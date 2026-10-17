# Integração TypeScript — API 2.0.1

`api.d.ts` é gerado do OpenAPI e exporta `paths`, `components` e `operations`. Campos binários são representados como `Blob` para uso no navegador. Copie este arquivo e os exemplos para o projeto consumidor; não importe Prisma nem código interno do backend. São tipos sem dependência de runtime. Eles não substituem validação do servidor nem validam automaticamente JSON recebido.

```powershell
npm ci
npm run api:tipos
npm run api:tipos:verificar
npm run typecheck
```

O gerador `openapi-typescript` 7.13.0 exige TypeScript 5. Por isso fica no workspace privado `ferramentas/contrato`, com TypeScript 5.9.3. Backend e exemplos continuam verificados com TypeScript 6.0.3. O lockfile fixa os dois compiladores, e `npm ci` instala tudo. Não há pacote publicado nem biblioteca completa de cliente.

Os exemplos em `exemplos.ts` usam `fetch`, recebem explicitamente a URL base e o token e não persistem credenciais. Há funções para login, listagem paginada, pagamento com ou sem arquivo, download como Blob e logout sem leitura de JSON em 204. A URL base não inclui `/api`; por exemplo, `http://localhost:3000`.

```typescript
import {pagar,ErroResposta} from './exemplos.js'

const chave=crypto.randomUUID() // Uma chave por intenção, preservada para reenvio.
const dados={rateioId:'ID_OBTIDO_DA_API',valor:'20.00'}
try {
  const pagamento=await pagar(baseUrl,token,dados,chave,arquivoOpcional)
  // Atualize os dados consultando a API; não calcule o saldo como fonte de verdade.
} catch(error) {
  if(error instanceof ErroResposta){
    // 401: solicitar novo login. 403: informar falta de permissão.
    // 409: atualizar o estado e apresentar o conflito; não gerar outra chave automaticamente.
    // 429/503: apresentar a indisponibilidade e respeitar error.retryAfter.
    // error.requestId permite localizar a requisição nos logs sem expor o token.
  }
}
// Se o usuário decidir reenviar após falha de rede/503, use dados, arquivo e chave idênticos.
```

Respostas de listagem usam `resposta.dados` e `resposta.paginacao`. Dinheiro continua sendo string decimal com ponto, e datas civis são tratadas como `YYYY-MM-DD`, sem conversão inadvertida de fuso. Consulte o guia de integração para diferenças entre `usuarioId`, `membroId` e escopos MASTER.

No multipart, o navegador define o boundary; não configure `Content-Type` manualmente. O download exige Bearer token e não é uma URL pública para atribuir diretamente a uma imagem ou link sem autenticação. O backend já expõe `Content-Disposition`, `X-Request-Id`, `Retry-After` e limites de tentativas via CORS para as origens permitidas.

Fonte: [openapi-typescript](https://openapi-ts.dev/introduction). Contrato: `documentacao/openapi.json` ou `GET /api/openapi.json`.
