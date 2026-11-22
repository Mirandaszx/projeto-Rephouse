# Integração TypeScript — API local 4.2.0

A versão local acrescenta foto e informações do perfil; sua migration **não está aplicada no principal 4.1.0**. `perfil.ts` exemplifica upload multipart com recorte orientado, consulta binária autenticada e remoção idempotente. `MinhaConta` recebe metadados opcionais de foto e confirmação por link; `MembroListado.usuario` recebe metadados opcionais da foto. Consulte [o guia do perfil](../documentacao/PERFIL_E_FOTO.md). Não coloque Bearer na URL, não trate a imagem como JSON e libere URLs temporárias da tela.

`consultarNotificacoes` agora aceita `TODAS` e `GERAIS`, além dos filtros anteriores. Todas reúne as três categorias com paginação; os tipos acrescentam `MEMBRO_ENTROU`/`MEMBRO_SAIU` e o contador opcional `gerais`. O padrão HTTP continua TAREFAS; o exemplo atualizado escolhe TODAS. Consulte [a expansão 4.1.0](../documentacao/NOTIFICACOES_GERAIS.md) antes de integrar: o principal está na 4.1.0 após a ativação autorizada da migration adicional, com backup.

Tarefas agora podem ter `responsavelId: null`; qualquer morador ativo cria uma disponível ou para si. Use `associarTarefa` de `notificacoes.ts` para assumir/liberar e `criarTarefa` com uma chave UUID por tentativa lógica. Não gere nova chave ao reenviar resultado incerto. A autorização definitiva fica no backend.

`notificacoes.ts` demonstra listagem paginada, contagem, leitura e SSE por `fetch` com Bearer no header. Em `conectado`/`atualizar`, consulte novamente a caixa e os contadores. Trate encerramento de sessão/contexto e reconexão na tela; não use JWT na URL. Mesmo no adaptador do frontend, a listagem de notificações mantém `{dados,paginacao}`. Veja [regras e ativação](../documentacao/NOTIFICACOES_E_TAREFAS.md). O principal deste checkout serve a versão 4.1.0; a entrega 4.0.0 e sua evidência de ativação permanecem históricas.

Mudança incompatível: `POST /api/auth/register` agora retorna **202 sem sessão**, até a confirmação do e-mail. Consumir `solicitarCadastro`, `solicitarLinkEmail` e `confirmarLinkEmail` no proxy de mesma origem. Manter o cookie, remover o fragmento e confirmar por ação explícita. Contas antigas continuam entrando por senha. Consulte [o guia de autenticação](../documentacao/AUTENTICACAO_EMAIL.md). As evidências 2.x abaixo são históricas quanto ao cadastro; contratos financeiros e paginação permanecem preservados.

Para a entrega de conta, repúblicas, moradores, tarefas e MASTER, siga [as jornadas sem operações financeiras](../documentacao/JORNADAS_INTEGRACAO.md). Há uma coleção Insomnia em `insomnia-jornadas.json`, exemplos em `jornadas.ts` e uma demonstração isolada por `npm run integracao:demo`. Os exemplos financeiros abaixo pertencem à entrega anterior e ficam preservados.

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

## Revisão 2.2.1

A extensão de término mensal acrescenta `fim?: string | null` às entradas de recorrência. Use `YYYY-MM-DD`; o vencimento exatamente nessa data ainda será gerado. Omitir mantém o comportamento anterior e, em uma edição, `null` remove o limite. As contas já existentes são preservadas. Consulte [regras, exemplos e ativação](../documentacao/RECORRENCIA_DATA_FIM.md).

As criações de despesas e tarefas aceitam o header opcional `Idempotency-Key`, inclusive nas rotas MASTER e no adaptador. Gere um UUID por operação e conserve-o ao reenviar os mesmos dados; não gere outro após timeout. A chave é pública e não substitui Bearer ou autorização. Mesma identidade e corpo retornam 201 com a resposta original; dados/destino diferentes retornam 409. Sem header, o consumidor preserva o comportamento anterior, sem garantia contra duplicação. Consulte [o guia 2.2.1](../documentacao/CORRECOES_2_2_1.md) para recuperação manual e limitações da memória da tela.

```typescript
const chave = crypto.randomUUID();
const dados = JSON.stringify({ titulo: 'Limpar cozinha', responsavelId: membroId });
// Em um reenvio manual, reutilize chave e dados. O exemplo não repete automaticamente.
const resposta = await fetch(`${baseUrl}/api/tarefas`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': chave },
  body: dados,
});
```
