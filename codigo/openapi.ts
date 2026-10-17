type Schema = Record<string, unknown>
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const uuid = { type: 'string', format: 'uuid' }
const money = { type: 'string', pattern: '^\\d{1,10}(\\.\\d{1,2})?$', example: '25.50' }
const object = (properties: Schema, required: string[] = []) => ({ type: 'object', additionalProperties: false, properties, required })
const jsonBody = (schema: Schema) => ({ required: true, content: { 'application/json': { schema } } })
const paths: Record<string, Record<string, unknown>> = {}
function add(path: string, method: string, summary: string, body?: Schema, status = 200, publicRoute = false) {
  const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: uuid }))
  paths[path] ??= {}
  paths[path][method] = { summary, ...(publicRoute ? { security: [] } : {}),
    ...(body ? { requestBody: jsonBody(body) } : {}), ...(parameters.length ? { parameters } : {}),
    responses: { [status]: { description: 'Operação concluída.' },
      ...Object.fromEntries([400,401,403,404,409,413,429,503].map(code => [code, {
        description: 'Consulte error.code e error.message.', content: { 'application/json': { schema: ref('Error') } },
      }])) } }
}
const expense = object({ titulo: { type: 'string', maxLength: 160 }, categoria: { type: 'string', maxLength: 80 },
  valorTotal: money, vencimento: { type: 'string', format: 'date' }, membroIds: { type: 'array', minItems: 1, items: uuid } },
['titulo','categoria','valorTotal','vencimento','membroIds'])
const task = object({ titulo: { type: 'string' }, responsavelId: uuid, descricao: { type: 'string' }, prazo: { type: 'string', format: 'date' } }, ['titulo','responsavelId'])
add('/api/health','get','Saúde do processo HTTP',undefined,200,true)
add('/api/auth/register','post','Cadastrar conta NORMAL independente',object({ nome: { type: 'string' }, email: { type: 'string', format: 'email' }, senha: { type: 'string', minLength: 8, maxLength: 128 } },['nome','email','senha']),201,true)
add('/api/auth/login','post','Autenticar por e-mail',object({ email: { type: 'string', format: 'email' }, senha: { type: 'string' } },['email','senha']),200,true)
add('/api/auth/logout','post','Invalidar todos os tokens da conta',undefined,204)
add('/api/me','get','Consultar usuário e vínculo atual')
add('/api/me','patch','Editar o próprio nome',object({ nome: { type: 'string' } },['nome']))
add('/api/me','delete','Excluir logicamente a conta após quitar dívidas e transferir administração',object({ senha: { type: 'string' } },['senha']),204)
add('/api/me/financeiro','get','Consultar somente os próprios rateios, inclusive de repúblicas anteriores')
add('/api/me/financeiro/{id}','get','Consultar histórico de um rateio próprio')
add('/api/republicas','post','Criar república e assumir administração',object({ nome: { type: 'string' }, endereco: { type: 'string', maxLength: 255 } },['nome']),201)
add('/api/republicas/atual','get','Consultar a república atual')
add('/api/republicas/atual','patch','Editar nome e endereço',object({ nome: { type: 'string' }, endereco: { type: ['string','null'] } }))
for (const action of ['entrar','trocar']) add(`/api/republicas/${action}`,'post',`${action}: usar código de entrada`,object({ codigoEntrada: { type: 'string', pattern: '^[A-Z0-9]{6,32}$' } },['codigoEntrada']),action === 'entrar' ? 201 : 200)
add('/api/republicas/sair','post','Encerrar vínculo atual preservando dívidas e histórico',undefined,204)
add('/api/republicas/transferir-admin','post','Escolher novo administrador ativo',object({ membroId: uuid },['membroId']))
add('/api/membros','get','Listar membros; inativos=true exige ADMIN')
add('/api/membros/{id}','patch','Desativar vínculo sem excluir histórico',object({ ativo: { const: false } },['ativo']))
for (const prefix of ['/api', '/api/master/republicas/{republicaId}']) {
  add(`${prefix}/despesas`,'get','Listar despesas e rateios do contexto autorizado')
  add(`${prefix}/despesas`,'post','Criar despesa e rateios na mesma transação',expense,201)
  add(`${prefix}/despesas/{id}`,'get','Consultar despesa e seus rateios')
  add(`${prefix}/despesas/{id}`,'patch','Editar despesa; estrutura financeira bloqueada após pagamento',{ ...expense, required: [] })
  add(`${prefix}/tarefas`,'get','Listar tarefas do contexto autorizado')
  add(`${prefix}/tarefas`,'post','Criar tarefa atribuída a membro ativo',task,201)
  add(`${prefix}/tarefas/{id}`,'patch','ADMIN gerencia; responsável apenas conclui',{ ...task, required: [], properties: { ...task.properties as Schema, status: { enum: ['ABERTA','CONCLUIDA'] } } })
  add(`${prefix}/dashboard`,'get','Indicadores financeiros e tarefas do mesmo snapshot')
}
add('/api/pagamentos','post','Registrar pagamento parcial ou integral, com comprovante opcional',object({ rateioId: uuid, valor: money },['rateioId','valor']),201)
const paymentOperation = paths['/api/pagamentos'].post as Schema
paymentOperation.parameters = [{ name: 'Idempotency-Key', in: 'header', required: true, schema: uuid }]
paymentOperation.requestBody = { required: true, content: {
  'application/json': { schema: object({ rateioId: uuid, valor: money },['rateioId','valor']) },
  'multipart/form-data': { schema: object({ rateioId: uuid, valor: money, comprovante: { type: 'string', format: 'binary', description: 'PDF, PNG, JPEG ou WEBP, até 5 MB.' } },['rateioId','valor']) },
} }
add('/api/pagamentos/{id}/comprovante','get','Download privado: proprietário, administrador da casa ou MASTER')
add('/api/master/usuarios','get','MASTER: listar usuários sem credenciais')
add('/api/master/republicas','get','MASTER: listar todas as repúblicas')
add('/api/master/dashboard','get','MASTER: indicadores globais')
add('/api/master/usuarios/{id}/status','patch','MASTER: bloquear/desbloquear; contas excluídas não voltam',object({ ativo: { type: 'boolean' } },['ativo']))
add('/api/master/republicas/{id}/status','patch','MASTER: bloquear/desbloquear república',object({ ativa: { type: 'boolean' } },['ativa']))
for (const [path,method,summary,body] of [
  ['/api/master/republicas/{republicaId}','get','MASTER: consultar república',undefined],
  ['/api/master/republicas/{republicaId}','patch','MASTER: editar república',object({ nome: { type: 'string' }, endereco: { type: ['string','null'] } })],
  ['/api/master/republicas/{republicaId}/membros','get','MASTER: listar membros',undefined],
  ['/api/master/republicas/{republicaId}/membros/{id}','patch','MASTER: desativar membro',object({ ativo: { const: false } },['ativo'])],
  ['/api/master/republicas/{republicaId}/transferir-admin','post','MASTER: transferir administração',object({ membroId: uuid },['membroId'])],
] as const) add(path,method,summary,body)

export const openApiDocument = { openapi: '3.1.0', info: { title: 'RepHouse API', version: '1.0.0',
  description: 'Backend TypeScript. Dinheiro em strings decimais. Datas sem horário em YYYY-MM-DD; relatórios em America/Fortaleza.' },
  security: [{ bearerAuth: [] }], components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: { Error: object({ error: object({ code: { type: 'string' }, message: { type: 'string' } },['code','message']) },['error']) } }, paths }
