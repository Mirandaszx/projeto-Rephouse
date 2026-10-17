type Schema = Record<string, unknown>
interface Media { schema: Schema; example?: unknown }
interface ApiResponse { description: string; content?: Record<string, Media>; headers?: Record<string, unknown> }
interface Operation {
  operationId: string; summary: string; description: string; tags: string[]; security?: unknown[]
  parameters?: unknown[]; requestBody?: { required: boolean; content: Record<string, Media> }
  responses: Record<string, ApiResponse>; 'x-perfis': string[]
}
interface Options {
  body?: Schema; input?: unknown; response?: Schema; output?: unknown; status?: number
  public?: boolean; admin?: boolean; description?: string; tag?: string
}
const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` })
const uuid = { type: 'string', format: 'uuid' }
const timestamp = { type: 'string', format: 'date-time' }
const dateInput = { type: 'string', format: 'date', description: 'Data sem horário: YYYY-MM-DD.' }
const storedDate = { ...timestamp, description: 'Data civil serializada à meia-noite UTC. Considere a parte YYYY-MM-DD, sem convertê-la para o fuso local.' }
const money = { type: 'string', pattern: '^\\d{1,10}\\.\\d{2}$', description: 'Valor monetário em reais, com duas casas decimais.' }
const positiveMoney = { type: 'string', pattern: '^\\d{1,10}(\\.\\d{1,2})?$', not: { pattern: '^0+(\\.0{1,2})?$' }, description: 'Valor positivo em reais. Envie string com ponto decimal, sem separador de milhares.' }
const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { type: 'null' }] })
const array = (items: Schema): Schema => ({ type: 'array', items })
const object = (properties: Record<string, Schema>, required = Object.keys(properties)): Schema => ({ type: 'object', additionalProperties: false, properties, required })
const nameInput = { type: 'string', minLength: 1, maxLength: 120 }
const password = { type: 'string', minLength: 8, maxLength: 128, writeOnly: true }
const id = (tipo: number, numero: number) => `de000000-0000-4000-8000-${String(tipo).padStart(4, '0')}${String(numero).padStart(8, '0')}`
const agora = '2026-10-16T12:00:00.000Z'
const usuario = { id: id(1, 4), nome: 'Ana Moradora', email: 'ana@demo.rephouse.test', tipoUsuario: 'USUARIO_NORMAL', ativo: true, criadoEm: agora }
const republica = { id: id(2, 1), nome: 'República Aurora — Demonstração', endereco: 'Rua Aurora, 100', codigoEntrada: 'DEMOAURORA', adminId: id(1, 2), ativa: true, criadaEm: agora }
const membro = { id: id(3, 2), usuarioId: usuario.id, republicaId: republica.id, ativo: true, entrouEm: agora }
const pagamento = { id: id(6, 2), rateioId: id(5, 2), membroId: membro.id, valor: '10.00', comprovanteUrl: null, dataPagamento: agora }
const rateio = { id: pagamento.rateioId, despesaId: id(4, 1), membroId: membro.id, valorDevido: '30.00', valorPago: '10.00', status: 'PARCIAL' }
const despesa = { id: id(4, 1), republicaId: republica.id, criadaPorId: republica.adminId, titulo: 'Internet — Demonstração', categoria: 'INTERNET', valorTotal: '90.00', vencimento: '2026-10-26T00:00:00.000Z', status: 'PENDENTE', criadaEm: agora, statusCalculado: 'PENDENTE' }
const rateios = [
  { ...rateio, id: id(5, 1), membroId: id(3, 1), valorPago: '30.00', status: 'PAGO' },
  rateio,
  { ...rateio, id: id(5, 3), membroId: id(3, 3), valorPago: '0.00', status: 'PENDENTE' },
]
const tarefa = { id: id(7, 1), republicaId: republica.id, responsavelId: membro.id, titulo: 'Limpar cozinha', descricao: null, prazo: '2026-10-26T00:00:00.000Z', status: 'ABERTA', criadaEm: agora }
const painel = { totalPendente: '50.00', totalPagoNoMes: '40.00', tarefasAbertas: 1, moradoresAtivos: 2, proximasContas: [despesa] }
const usuarioFields = { id: uuid, nome: { type: 'string' }, email: { type: 'string', format: 'email' }, tipoUsuario: { enum: ['USUARIO_NORMAL', 'USUARIO_ADMIN', 'USUARIO_MASTER'] }, ativo: { type: 'boolean' }, criadoEm: timestamp }
const membroFields = { id: uuid, usuarioId: uuid, republicaId: uuid, ativo: { type: 'boolean' }, entrouEm: timestamp }
const rateioFields = { id: uuid, despesaId: uuid, membroId: uuid, valorDevido: money, valorPago: money, status: { enum: ['PENDENTE', 'PARCIAL', 'PAGO'] } }
const despesaFields = { id: uuid, republicaId: uuid, criadaPorId: uuid, titulo: { type: 'string' }, categoria: { type: 'string' }, valorTotal: money, vencimento: storedDate, status: { enum: ['PENDENTE', 'PAGA'] }, criadaEm: timestamp, statusCalculado: { enum: ['PENDENTE', 'PAGA', 'VENCIDA'] } }
const painelFields = { totalPendente: money, totalPagoNoMes: money, tarefasAbertas: { type: 'integer', minimum: 0 }, moradoresAtivos: { type: 'integer', minimum: 0 }, proximasContas: array(ref('DespesaResumo')) }
const schemas: Record<string, Schema> = {
  Error: object({ error: object({ code: { type: 'string' }, message: { type: 'string' } }) }),
  Usuario: object(usuarioFields),
  UsuarioMaster: object({ ...usuarioFields, excluidoEm: nullable(timestamp) }),
  Sessao: object({ token: { type: 'string', description: 'Bearer JWT válido por uma hora.' }, usuario: ref('Usuario') }),
  Republica: object({ id: uuid, nome: { type: 'string' }, endereco: nullable({ type: 'string' }), codigoEntrada: { type: 'string' }, adminId: uuid, ativa: { type: 'boolean' }, criadaEm: timestamp }),
  Membro: object(membroFields),
  MembroListado: object({ ...membroFields, usuario: object({ id: uuid, nome: { type: 'string' }, email: { type: 'string', format: 'email' } }) }),
  MinhaConta: object({ ...usuarioFields, membro: nullable(object({ ...membroFields, republica: ref('Republica') })) }),
  Pagamento: object({ id: uuid, rateioId: uuid, membroId: uuid, valor: money, comprovanteUrl: nullable({ type: 'string', pattern: '^/api/pagamentos/[a-f0-9-]+/comprovante$' }), dataPagamento: timestamp }),
  Rateio: object({ ...rateioFields, pagamentos: array(ref('Pagamento')) }, Object.keys(rateioFields)),
  RateioPessoal: object({ ...rateioFields, pagamentos: array(ref('Pagamento')), despesa: object({ id: uuid, titulo: { type: 'string' }, categoria: { type: 'string' }, vencimento: storedDate, republica: object({ id: uuid, nome: { type: 'string' } }) }) }),
  DespesaResumo: object(despesaFields),
  Despesa: object({ ...despesaFields, rateios: array(ref('Rateio')) }),
  Tarefa: object({ id: uuid, republicaId: uuid, responsavelId: uuid, titulo: { type: 'string' }, descricao: nullable({ type: 'string' }), prazo: nullable(storedDate), status: { enum: ['ABERTA', 'CONCLUIDA'] }, criadaEm: timestamp }),
  Painel: object(painelFields),
  PainelMaster: object({ ...painelFields, usuarios: { type: 'integer', minimum: 0 }, republicas: { type: 'integer', minimum: 0 } }),
  Cadastro: object({ nome: nameInput, email: { type: 'string', format: 'email', maxLength: 254 }, senha: password }),
  Login: object({ email: { type: 'string', format: 'email', maxLength: 254 }, senha: password }),
  CriarRepublica: object({ nome: nameInput, endereco: { type: 'string', maxLength: 255 } }, ['nome']),
  EditarRepublica: object({ nome: nameInput, endereco: nullable({ type: 'string', maxLength: 255 }) }, []),
  CodigoEntrada: object({ codigoEntrada: { type: 'string', pattern: '^[A-Za-z0-9]{6,32}$', description: 'Espaços nas pontas são removidos e letras são convertidas para maiúsculas.' } }),
  CriarDespesa: object({ titulo: { type: 'string', minLength: 1, maxLength: 160 }, categoria: { type: 'string', minLength: 1, maxLength: 80 }, valorTotal: positiveMoney, vencimento: dateInput, membroIds: { type: 'array', minItems: 1, items: uuid, description: 'IDs de vínculos de membros ativos da mesma república; não são IDs de usuários.' } }),
  CriarTarefa: object({ titulo: { type: 'string', minLength: 1, maxLength: 160 }, responsavelId: uuid, descricao: { type: 'string', maxLength: 5000 }, prazo: nullable(dateInput) }, ['titulo', 'responsavelId']),
  RegistrarPagamento: object({ rateioId: uuid, valor: positiveMoney }),
}
schemas.EditarDespesa = { ...schemas.CriarDespesa, required: [] }
schemas.EditarTarefa = object({ ...(schemas.CriarTarefa.properties as Record<string, Schema>), status: { enum: ['ABERTA', 'CONCLUIDA'] } }, [])
const paths: Record<string, Record<string, Operation>> = {}
const normal = ['USUARIO_NORMAL', 'USUARIO_ADMIN', 'USUARIO_MASTER']
const erros: Record<number, [string, string]> = {
  400: ['VALIDATION_ERROR', 'Os dados enviados são inválidos.'],
  401: ['UNAUTHENTICATED', 'Sessão inválida ou encerrada.'],
  403: ['FORBIDDEN', 'A operação exige o administrador da república.'],
  404: ['NOT_FOUND', 'Registro não encontrado.'],
  409: ['CONFLICT', 'Já existe um registro com estes dados.'],
  413: ['PAYLOAD_TOO_LARGE', 'O corpo JSON deve ter no máximo 1 MB.'],
  429: ['TOO_MANY_REQUESTS', 'Aguarde antes de tentar novamente.'],
  500: ['INTERNAL_SERVER_ERROR', 'Erro interno do servidor.'],
  503: ['RETRY_LATER', 'Conflito temporário. Tente novamente com a mesma chave de pagamento.'],
}
function add(path: string, method: string, summary: string, options: Options = {}) {
  const status = options.status ?? 200
  const master = path.startsWith('/api/master/')
  const perfis = options.public ? [] : master ? ['USUARIO_MASTER'] : options.admin ? ['USUARIO_ADMIN', 'USUARIO_MASTER'] : normal
  const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: uuid }))
  const responses: Record<string, ApiResponse> = {
    [status]: status === 204 ? { description: 'Operação concluída, sem corpo de resposta.' } : {
      description: 'Operação concluída.', content: { 'application/json': { schema: options.response!, example: options.output } },
    },
  }
  for (const [code, [error, message]] of Object.entries(erros)) {
    if (options.public && ['401', '403', '503'].includes(code)) continue
    if (code === '429' && !['/api/auth/register', '/api/auth/login'].includes(path)) continue
    responses[code] = { description: message, content: { 'application/json': { schema: ref('Error'), example: { error: { code: error, message } } } } }
  }
  const operation: Operation = {
    operationId: `${method}_${path.replace(/[{}]/g, '').replace(/\W+/g, '_')}`,
    summary, tags: [options.tag ?? (master ? 'MASTER' : 'Repúblicas')],
    description: `${options.public ? 'Acesso público.' : `Perfis: ${perfis.join(', ')}. Conta ativa e token vigente obrigatórios.`} ${options.description ?? ''}`.trim(),
    'x-perfis': perfis, ...(options.public ? { security: [] } : {}), responses,
    ...(parameters.length ? { parameters } : {}),
    ...(options.body ? { requestBody: { required: true, content: { 'application/json': { schema: options.body, example: options.input } } } } : {}),
  }
  paths[path] ??= {}
  paths[path][method] = operation
  return operation
}
const personal = { ...rateio, pagamentos: [pagamento], despesa: { id: despesa.id, titulo: despesa.titulo, categoria: despesa.categoria, vencimento: despesa.vencimento, republica: { id: republica.id, nome: republica.nome } } }
const expenseInput = { titulo: 'Internet', categoria: 'INTERNET', valorTotal: '90.00', vencimento: '2026-10-26', membroIds: [id(3, 1), id(3, 2), id(3, 3)] }
const taskInput = { titulo: 'Limpar cozinha', responsavelId: membro.id, prazo: '2026-10-26' }
add('/api/health', 'get', 'Verificar o processo HTTP', { public: true, tag: 'Documentação', response: object({ status: { const: 'ok' } }), output: { status: 'ok' } })
const ready = add('/api/ready', 'get', 'Verificar conexão ao PostgreSQL', { public: true, tag: 'Documentação', description: 'Consulta SELECT 1; responde em até dois segundos, sem detalhes da conexão.', response: object({ status: { const: 'ok' } }), output: { status: 'ok' } })
ready.responses['503'] = { description: 'PostgreSQL indisponível.', content: { 'application/json': { schema: object({ status: { const: 'unavailable' } }), example: { status: 'unavailable' } } } }
add('/api/openapi.json', 'get', 'Obter o contrato OpenAPI', { public: true, tag: 'Documentação', response: { type: 'object', required: ['openapi', 'info', 'paths', 'components'] }, output: { openapi: '3.1.0', info: { title: 'RepHouse API', version: '2.0.0' }, paths: {}, components: {} } })
const cadastro = add('/api/auth/register', 'post', 'Cadastrar conta independente', { public: true, tag: 'Autenticação', status: 201, body: ref('Cadastro'), input: { nome: usuario.nome, email: usuario.email, senha: 'SuaSenhaDeTeste123!' }, response: ref('Sessao'), output: { token: 'JWT_RECEBIDO_DA_API', usuario }, description: 'Sempre cria NORMAL; campos de privilégio são rejeitados. O e-mail é normalizado. E-mail já utilizado, inclusive por conta excluída, retorna 409.' })
const login = add('/api/auth/login', 'post', 'Autenticar por e-mail e senha', { public: true, tag: 'Autenticação', body: ref('Login'), input: { email: usuario.email, senha: 'SuaSenhaDeTeste123!' }, response: ref('Sessao'), output: { token: 'JWT_RECEBIDO_DA_API', usuario }, description: 'Token de uma hora. Contas bloqueadas ou excluídas não autenticam. Ao expirar, faça login novamente; não há refresh token.' })
login.responses['401'] = { description: 'Credenciais incorretas ou conta indisponível.', content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' } } } } }
cadastro.description += ' Cadastro e login compartilham limite de 20 tentativas por IP a cada 15 minutos.'
add('/api/auth/logout', 'post', 'Invalidar todos os tokens da conta', { status: 204, tag: 'Autenticação' })
add('/api/me', 'get', 'Consultar conta e vínculo atual', { tag: 'Conta', response: ref('MinhaConta'), output: { ...usuario, membro: { ...membro, republica } } })
add('/api/me', 'patch', 'Editar o próprio nome', { tag: 'Conta', body: object({ nome: nameInput }), input: { nome: 'Ana Silva' }, response: ref('Usuario'), output: { ...usuario, nome: 'Ana Silva' } })
add('/api/me', 'delete', 'Excluir logicamente a própria conta', { status: 204, tag: 'Conta', body: object({ senha: password }), input: { senha: 'SuaSenhaDeTeste123!' }, description: 'Confirma a senha. 409: OUTSTANDING_DEBT, TRANSFER_ADMIN_REQUIRED ou LAST_MASTER. Preserva histórico e e-mail; encerra vínculos e revoga tokens. Conta excluída não pode ser reativada.' })
add('/api/me/financeiro', 'get', 'Listar os próprios rateios atuais e antigos', { tag: 'Financeiro', response: array(ref('RateioPessoal')), output: [personal], description: 'A saída da república mantém acesso somente ao próprio histórico, sem consultar os demais moradores.' })
add('/api/me/financeiro/{id}', 'get', 'Consultar um rateio próprio', { tag: 'Financeiro', response: ref('RateioPessoal'), output: personal })
add('/api/republicas', 'post', 'Criar república e assumir a administração', { status: 201, body: ref('CriarRepublica'), input: { nome: republica.nome, endereco: republica.endereco }, response: ref('Republica'), output: republica, description: 'Exige ausência de vínculo ativo. Promove para ADMIN e cria o vínculo na mesma transação; MASTER mantém o perfil.' })
add('/api/republicas/atual', 'get', 'Consultar república atual', { response: ref('Republica'), output: republica })
add('/api/republicas/atual', 'patch', 'Editar nome e endereço da república', { admin: true, body: ref('EditarRepublica'), input: { nome: 'República Aurora', endereco: null }, response: ref('Republica'), output: { ...republica, nome: 'República Aurora', endereco: null } })
for (const action of ['entrar', 'trocar']) add(`/api/republicas/${action}`, 'post', action === 'entrar' ? 'Entrar por código' : 'Trocar de república atomicamente', { status: action === 'entrar' ? 201 : 200, body: ref('CodigoEntrada'), input: { codigoEntrada: 'DEMOAURORA' }, response: ref('Membro'), output: membro, description: action === 'entrar' ? 'Exige ausência de vínculo ativo. Reentrar reutiliza o vínculo histórico.' : 'Exige vínculo atual. Código inválido reverte a saída anterior. Dívidas permanecem no histórico próprio; administrador transfere sua responsabilidade primeiro.' })
add('/api/republicas/sair', 'post', 'Sair preservando dívidas e histórico', { status: 204, description: 'Administrador deve transferir a responsabilidade antes. Dívidas não impedem a saída.' })
add('/api/republicas/transferir-admin', 'post', 'Transferir administração explicitamente', { admin: true, body: object({ membroId: uuid }), input: { membroId: membro.id }, response: object({ adminId: uuid }), output: { adminId: usuario.id }, description: 'Substituto precisa ser outro membro ativo da mesma república, com conta ativa.' })
const members = add('/api/membros', 'get', 'Listar membros', { response: array(ref('MembroListado')), output: [{ ...membro, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } }], description: 'inativos=true inclui vínculos históricos e exige administrador da república ou MASTER.' })
members.parameters = [{ name: 'inativos', in: 'query', schema: { type: 'boolean', default: false }, example: false }]
add('/api/membros/{id}', 'patch', 'Desativar vínculo de morador', { admin: true, body: object({ ativo: { const: false } }), input: { ativo: false }, response: ref('Membro'), output: { ...membro, ativo: false }, description: 'Não apaga o histórico. O administrador atual precisa transferir sua responsabilidade antes.' })
for (const prefix of ['/api', '/api/master/republicas/{republicaId}']) {
  const tag = prefix === '/api' ? 'Financeiro' : 'MASTER'
  add(`${prefix}/despesas`, 'get', 'Listar despesas e rateios', { tag, response: array(ref('Despesa')), output: [{ ...despesa, rateios }], description: 'Escopo da república autorizada. Listagem paginada.' })
  add(`${prefix}/despesas`, 'post', 'Criar despesa com rateio igual entre selecionados', { tag, admin: true, status: 201, body: ref('CriarDespesa'), input: expenseInput, response: ref('Despesa'), output: { ...despesa, rateios: rateios.map(r => ({ ...r, valorPago: '0.00', status: 'PENDENTE' })) }, description: 'Participantes ativos da mesma república. Sobra de centavos distribuída por ordem dos IDs. Um participante assume o valor inteiro.' })
  add(`${prefix}/despesas/{id}`, 'get', 'Consultar despesa com pagamentos dos rateios', { tag, response: ref('Despesa'), output: { ...despesa, rateios: rateios.map(r => ({ ...r, pagamentos: r.id === rateio.id ? [pagamento] : r.status === 'PAGO' ? [{ ...pagamento, id: id(6, 1), rateioId: r.id, membroId: r.membroId, valor: r.valorPago }] : [] })) } })
  add(`${prefix}/despesas/{id}`, 'patch', 'Editar despesa', { tag, admin: true, body: ref('EditarDespesa'), input: { titulo: 'Internet atualizada' }, response: ref('Despesa'), output: { ...despesa, titulo: 'Internet atualizada', rateios }, description: 'Valor e participantes ficam bloqueados após o primeiro pagamento (409 FINANCIAL_HISTORY_LOCKED). Título, categoria e vencimento podem ser editados.' })
  add(`${prefix}/tarefas`, 'get', 'Listar tarefas', { tag: prefix === '/api' ? 'Tarefas' : tag, response: array(ref('Tarefa')), output: [tarefa] })
  add(`${prefix}/tarefas`, 'post', 'Criar tarefa para membro ativo', { tag: prefix === '/api' ? 'Tarefas' : tag, admin: true, status: 201, body: ref('CriarTarefa'), input: taskInput, response: ref('Tarefa'), output: tarefa })
  add(`${prefix}/tarefas/{id}`, 'patch', 'Editar ou concluir tarefa', { tag: prefix === '/api' ? 'Tarefas' : tag, body: ref('EditarTarefa'), input: { status: 'CONCLUIDA' }, response: ref('Tarefa'), output: { ...tarefa, status: 'CONCLUIDA' }, description: 'ADMIN e MASTER gerenciam. Morador só pode enviar status=CONCLUIDA para uma tarefa atribuída a seu vínculo ativo.' })
  add(`${prefix}/dashboard`, 'get', 'Consultar indicadores da república', { tag: prefix === '/api' ? 'Painel' : tag, response: ref('Painel'), output: painel, description: 'Inclui dívida de ex-moradores. O mês segue APP_TIME_ZONE, padrão horário de Brasília (America/Sao_Paulo); todos os indicadores usam a mesma transação.' })
}
const payment = add('/api/pagamentos', 'post', 'Registrar pagamento parcial ou integral', { tag: 'Financeiro', status: 201, body: ref('RegistrarPagamento'), input: { rateioId: rateio.id, valor: '10.00' }, response: ref('Pagamento'), output: pagamento, description: 'Somente proprietário do rateio, inclusive após sair da república. Saldo não pode ser ultrapassado. Idempotency-Key UUID obrigatório: repetir o mesmo conteúdo retorna o mesmo pagamento (201); mudar valor, rateio ou arquivo retorna 409. Não movimenta dinheiro e não possui estorno, edição ou exclusão nesta entrega.' })
payment.parameters = [{ name: 'Idempotency-Key', in: 'header', required: true, schema: uuid, example: id(9, 1), description: 'Uma chave por operação; reutilize-a ao repetir a mesma solicitação.' }]
payment.requestBody!.content['multipart/form-data'] = { schema: object({ rateioId: uuid, valor: positiveMoney, comprovante: { type: 'string', format: 'binary', description: 'PDF, PNG, JPEG ou WEBP, até 5 MiB. O conteúdo determina o tipo.' } }, ['rateioId', 'valor']) }
payment.responses['413'] = { description: 'Arquivo acima de 5 MiB ou JSON acima de 1 MiB.', content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'LIMIT_FILE_SIZE', message: 'O comprovante deve ter no máximo 5 MB.' } } } } }
payment.responses['429']={description:'Dois uploads já estão em processamento.',headers:{'Retry-After':{schema:{type:'string'},example:'1'}},content:{'application/json':{schema:ref('Error'),example:{error:{code:'UPLOAD_BUSY',message:'Há muitos uploads em andamento. Tente novamente.'}}}}}
const receipt = add('/api/pagamentos/{id}/comprovante', 'get', 'Baixar comprovante privado', { tag: 'Financeiro', description: 'Proprietário do pagamento, administrador da república de origem ou MASTER. Ausência de arquivo ou falta de acesso retorna 404.' })
receipt.responses['200'] = { description: 'Conteúdo binário do arquivo.', headers: { 'Content-Disposition': { schema: { type: 'string' }, example: 'attachment; filename="comprovante.pdf"' } }, content: Object.fromEntries(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].map(type => [type, { schema: { type: 'string', format: 'binary' } }])) }
add('/api/master/usuarios', 'get', 'Listar usuários globalmente', { response: array(ref('UsuarioMaster')), output: [{ ...usuario, excluidoEm: null }] })
add('/api/master/republicas', 'get', 'Listar repúblicas globalmente', { response: array(ref('Republica')), output: [republica] })
add('/api/master/dashboard', 'get', 'Consultar indicadores globais', { response: ref('PainelMaster'), output: { ...painel, totalPagoNoMes: '100.00', usuarios: 6, republicas: 2 } })
add('/api/master/usuarios/{id}/status', 'patch', 'Bloquear ou desbloquear conta', { body: object({ ativo: { type: 'boolean' } }), input: { ativo: false }, response: ref('Usuario'), output: { ...usuario, ativo: false }, description: 'Revoga tokens anteriores também após desbloqueio. Conta excluída não pode ser reativada; o último MASTER ativo não pode ser bloqueado.' })
add('/api/master/republicas/{id}/status', 'patch', 'Bloquear ou desbloquear república', { body: object({ ativa: { type: 'boolean' } }), input: { ativa: false }, response: ref('Republica'), output: { ...republica, ativa: false } })
const masterPrefix = '/api/master/republicas/{republicaId}'
add(masterPrefix, 'get', 'Consultar república pelo contexto MASTER', { response: ref('Republica'), output: republica })
add(masterPrefix, 'patch', 'Editar república pelo contexto MASTER', { body: ref('EditarRepublica'), input: { endereco: null }, response: ref('Republica'), output: { ...republica, endereco: null } })
const masterMembers = add(`${masterPrefix}/membros`, 'get', 'Listar membros pelo contexto MASTER', { response: array(ref('MembroListado')), output: [{ ...membro, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } }] })
masterMembers.parameters!.push({ name: 'inativos', in: 'query', schema: { type: 'boolean', default: false }, example: false })
add(`${masterPrefix}/membros/{id}`, 'patch', 'Desativar vínculo pelo contexto MASTER', { body: object({ ativo: { const: false } }), input: { ativo: false }, response: ref('Membro'), output: { ...membro, ativo: false } })
add(`${masterPrefix}/transferir-admin`, 'post', 'Transferir administração pelo contexto MASTER', { body: object({ membroId: uuid }), input: { membroId: membro.id }, response: object({ adminId: uuid }), output: { adminId: usuario.id } })

const pageMetadata=object({pagina:{type:'integer',minimum:1},limite:{type:'integer',minimum:1,maximum:100},totalItens:{type:'integer',minimum:0},totalPaginas:{type:'integer',minimum:0}})
for(const operations of Object.values(paths)){
  const operation=operations.get
  const media=operation?.responses['200']?.content?.['application/json']
  if(media?.schema.type==='array'){
    const example=media.example as unknown[]
    media.schema=object({dados:media.schema,paginacao:pageMetadata})
    media.example={dados:example,paginacao:{pagina:1,limite:20,totalItens:example.length,totalPaginas:example.length?1:0}}
    operation!.parameters??=[]
    operation!.parameters.push({name:'pagina',in:'query',schema:{type:'integer',minimum:1,maximum:1000000,default:1}},{name:'limite',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:20}})
    operation!.description+=' Resposta paginada: dados e paginacao. Página além do resultado retorna dados vazio. Parâmetros inválidos ou desconhecidos retornam 400.'
  }
}
// Identificador presente inclusive em erros e downloads; nenhum segredo é registrado.
for (const operations of Object.values(paths)) for (const operation of Object.values(operations)) {
  for (const response of Object.values(operation.responses)) {
    response.headers = { ...response.headers, 'X-Request-Id': { description: 'UUID gerado pelo servidor para correlação com os logs.', schema: uuid } }
  }
}

export const openApiDocument = {
  openapi: '3.1.0',
  info: { title: 'RepHouse API', version: '2.0.0', description: 'Backend TypeScript. Listagens retornam {dados,paginacao}. Dinheiro é string decimal. Datas de entrada usam YYYY-MM-DD; datas civis de saída usam ISO à meia-noite UTC. Relatórios e vencimentos seguem APP_TIME_ZONE, padrão horário de Brasília (America/Sao_Paulo). Exemplos são ilustrativos. Endpoints protegidos usam Authorization: Bearer TOKEN; CORS não substitui autorização.' },
  servers: [{ url: 'http://localhost:3000', description: 'Desenvolvimento local; ajuste ao ambiente da equipe.' }],
  tags: ['Documentação', 'Autenticação', 'Conta', 'Repúblicas', 'Financeiro', 'Tarefas', 'Painel', 'MASTER'].map(name => ({ name })),
  security: [{ bearerAuth: [] }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas },
  paths,
}
