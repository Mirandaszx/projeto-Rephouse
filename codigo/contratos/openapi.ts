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
const codigoAprovacao = { type: 'string', pattern: '^[0-9]{6}$' }
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
const monthInput = { type: 'string', pattern: '^(19|20|21)[0-9]{2}-(0[1-9]|1[0-2])$', example: '2026-11' }
const financialSituation = { enum: ['EM_DIA', 'VENCE_EM_BREVE', 'VENCE_HOJE', 'ATRASADA', 'QUITADA'] }
const financialMetadata = { dataReferencia: dateInput, situacaoVencimento: financialSituation, pagamentoParcial: { type: 'boolean' } }
const recurrenceOrigin = nullable(object({ id: uuid, competencia: monthInput }))
const recurringConfig = { titulo: { type: 'string', minLength: 1, maxLength: 160 }, categoria: { type: 'string', minLength: 1, maxLength: 80 },
  valorTotal: positiveMoney, diaVencimento: { type: 'integer', minimum: 1, maximum: 31 }, membroIds: { type: 'array', minItems: 1, uniqueItems: true, items: uuid } }
const schemas: Record<string, Schema> = {
  FotoPerfil: object({ versao: { type: 'string', pattern: '^[a-f0-9]{64}$' }, atualizadaEm: timestamp }),
  Error: object({ error: object({ code: { type: 'string' }, message: { type: 'string' } }) }),
  Usuario: object({ ...usuarioFields, foto: nullable(ref('FotoPerfil')) }, Object.keys(usuarioFields)),
  UsuarioMaster: object({ ...usuarioFields, excluidoEm: nullable(timestamp) }),
  Sessao: object({ token: { type: 'string', description: 'Bearer JWT válido por uma hora.' }, usuario: ref('Usuario') }),
  EmailPendente: object({ confirmacaoPendente: { const: true }, message: { type: 'string' }, solicitacaoId: uuid, codigoAprovacao }, ['confirmacaoPendente', 'message', 'solicitacaoId']),
  ConfirmacaoEmail: object({ token: { type: 'string' }, usuario: ref('Usuario'), acaoRepublica: { enum: ['criar','entrar',null] } }),
  ResultadoConfirmacaoEmail: { oneOf: [ref('ConfirmacaoEmail'), object({ aprovadoEmOutroDispositivo: { const: true } })] },
  ResultadoConclusaoEmail: { oneOf: [ref('ConfirmacaoEmail'), object({ confirmacaoPendente: { const: true } })] },
  Republica: object({ id: uuid, nome: { type: 'string' }, endereco: nullable({ type: 'string' }), codigoEntrada: { type: 'string' }, adminId: uuid, ativa: { type: 'boolean' }, criadaEm: timestamp }),
  Membro: object(membroFields),
  MembroListado: object({ ...membroFields, usuario: object({ id: uuid, nome: { type: 'string' }, email: { type: 'string', format: 'email' }, foto: nullable(ref('FotoPerfil')) }, ['id','nome','email']) }),
  MinhaConta: object({ ...usuarioFields, membro: nullable(object({ ...membroFields, republica: ref('Republica') })), foto: nullable(ref('FotoPerfil')), emailConfirmadoEm: nullable(timestamp) }, [...Object.keys(usuarioFields),'membro']),
  Pagamento: object({ id: uuid, rateioId: uuid, membroId: uuid, valor: money, comprovanteUrl: nullable({ type: 'string', pattern: '^/api/pagamentos/[a-f0-9-]+/comprovante$' }), dataPagamento: timestamp }),
  Rateio: object({ ...rateioFields, ...financialMetadata, valorRestante: money, pagamentos: array(ref('Pagamento')) }, Object.keys(rateioFields)),
  RateioPessoal: object({ ...rateioFields, ...financialMetadata, valorRestante: money, pagamentos: array(ref('Pagamento')), despesa: object({ id: uuid, titulo: { type: 'string' }, categoria: { type: 'string' }, vencimento: storedDate, republica: object({ id: uuid, nome: { type: 'string' } }) }) }, [...Object.keys(rateioFields), 'pagamentos', 'despesa']),
  DespesaResumo: object({ ...despesaFields, ...financialMetadata, recorrencia: recurrenceOrigin }, Object.keys(despesaFields)),
  Despesa: object({ ...despesaFields, ...financialMetadata, recorrencia: recurrenceOrigin, rateios: array(ref('Rateio')) }, [...Object.keys(despesaFields), 'rateios']),
  Tarefa: object({ id: uuid, republicaId: uuid, responsavelId: nullable(uuid), criadorId: nullable(uuid), responsavelAtivo: nullable({type:'boolean'}), titulo: { type: 'string' }, descricao: nullable({ type: 'string' }), prazo: nullable(storedDate), status: { enum: ['ABERTA', 'CONCLUIDA'] }, criadaEm: timestamp }, ['id','republicaId','responsavelId','titulo','descricao','prazo','status','criadaEm']),
  Notificacao: object({ id: uuid, categoria: {enum:['TAREFAS','DESPESAS','GERAIS']}, tipo:{enum:['TAREFA_CRIADA','TAREFA_ASSUMIDA','TAREFA_REATRIBUIDA','TAREFA_CONCLUIDA','TAREFA_LIBERADA','TAREFA_REABERTA','DESPESA_PROXIMA','DESPESA_VENCE_HOJE','MEMBRO_ENTROU','MEMBRO_SAIU']}, titulo:{type:'string'}, atorNome:nullable({type:'string'}), tarefaId:nullable(uuid), despesaId:nullable(uuid), vencimento:nullable(storedDate), lidaEm:nullable(timestamp), criadoEm:timestamp }),
  NotificacoesNaoLidas: object({tarefas:{type:'integer',minimum:0},despesas:{type:'integer',minimum:0},gerais:{type:'integer',minimum:0},total:{type:'integer',minimum:0}},['tarefas','despesas','total']),
  Painel: object({ ...painelFields, dataReferencia: dateInput, financeiroIndividual: ref('ResumoIndividual'), financeiroIndividualGeral: ref('ResumoIndividual') }, Object.keys(painelFields)),
  ResumoIndividual: object({ competencia: nullable(monthInput), dataReferencia: dateInput, totalDevido: money, totalPago: money, saldoPendente: money, totalItens: { type: 'integer', minimum: 0 }, rateiosPendentes: { type: 'integer', minimum: 0 } }),
  CriarRecorrencia: object({ ...recurringConfig, inicio: monthInput, fim: nullable(dateInput), despesaOrigemId: uuid }, [...Object.keys(recurringConfig), 'inicio']),
  EditarRecorrencia: { ...object({ ...recurringConfig, fim: nullable(dateInput), ativa: { type: 'boolean' } }, []), minProperties: 1 },
  Recorrencia: object({ id: uuid, republicaId: uuid, despesaOrigemId: nullable(uuid), inicio: monthInput, fim: nullable(dateInput), proximaCompetencia: monthInput,
    ativa: { type: 'boolean' }, pausaMotivo: nullable({ type: 'string' }), configuracoes: array(object({ ...recurringConfig, id: uuid, vigencia: monthInput })) }),
  CompetenciaRecorrencia: object({ competencia: monthInput, estado: { enum: ['GERADA', 'PENDENTE_REVISAO', 'BLOQUEADA', 'REVISADA'] }, motivo: nullable({ type: 'string' }), despesaId: nullable(uuid), revisadaEm: nullable(timestamp) }),
  PainelMaster: object({ ...painelFields, usuarios: { type: 'integer', minimum: 0 }, republicas: { type: 'integer', minimum: 0 } }),
  Cadastro: object({ nome: nameInput, email: { type: 'string', format: 'email', maxLength: 254 }, senha: password, acaoRepublica: { enum: ['criar','entrar'], default: 'criar' }, codigoPorEmail: { type: 'boolean' } }, ['nome','email','senha']),
  Login: object({ email: { type: 'string', format: 'email', maxLength: 254 }, senha: password }),
  MetodosAutenticacao: object({ google: object({ habilitado: { type: 'boolean' }, clientId: nullable({ type: 'string' }) }), email: object({ habilitado: { type: 'boolean' } }) }),
  DesafioGoogleInput: object({ finalidade: { enum: ['login', 'exclusao'], default: 'login' } }, []),
  DesafioGoogle: object({ desafioId: uuid, nonce: { type: 'string' }, expiraEm: timestamp }),
  LoginGoogle: object({ credential: { type: 'string', minLength: 1, maxLength: 16000, writeOnly: true }, desafioId: uuid, senha: password }, ['credential', 'desafioId']),
  CriarRepublica: object({ nome: nameInput, endereco: { type: 'string', maxLength: 255 } }, ['nome']),
  EditarRepublica: object({ nome: nameInput, endereco: nullable({ type: 'string', maxLength: 255 }) }, []),
  CodigoEntrada: object({ codigoEntrada: { type: 'string', pattern: '^[A-Za-z0-9]{6,32}$', description: 'Espaços nas pontas são removidos e letras são convertidas para maiúsculas.' } }),
  CriarDespesa: object({ titulo: { type: 'string', minLength: 1, maxLength: 160 }, categoria: { type: 'string', minLength: 1, maxLength: 80 }, valorTotal: positiveMoney, vencimento: dateInput, membroIds: { type: 'array', minItems: 1, items: uuid, description: 'IDs de vínculos de membros ativos da mesma república; não são IDs de usuários.' } }),
  CriarTarefa: object({ titulo: { type: 'string', minLength: 1, maxLength: 160 }, responsavelId: nullable(uuid), descricao: { type: 'string', maxLength: 5000 }, prazo: nullable(dateInput) }, ['titulo']),
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
    if (code === '429' && !path.startsWith('/api/auth/')) continue
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
add('/api/openapi.json', 'get', 'Obter o contrato OpenAPI', { public: true, tag: 'Documentação', response: { type: 'object', required: ['openapi', 'info', 'paths', 'components'] }, output: { openapi: '3.1.0', info: { title: 'RepHouse API', version: '4.2.0' }, paths: {}, components: {} } })
const exemploEmailPendente = { confirmacaoPendente: true, message: 'Confira seu e-mail.', solicitacaoId: id(9, 3), codigoAprovacao: '123456' }
const cadastro = add('/api/auth/register', 'post', 'Solicitar cadastro com confirmação obrigatória', { public: true, tag: 'Autenticação', status: 202, body: ref('Cadastro'), input: { nome: usuario.nome, email: usuario.email, senha: 'SuaSenhaDeTeste123!' }, response: ref('EmailPendente'), output: exemploEmailPendente, description: 'A conta NORMAL é criada ao concluir a confirmação. Campos de privilégio são rejeitados e e-mail já utilizado retorna 409. Com codigoPorEmail: true, o código de uso único vale dez minutos e só é enviado ao e-mail. Use /api/auth/email/concluir no navegador solicitante. Por padrão, clientes existentes recebem o link de confirmação.' })
const login = add('/api/auth/login', 'post', 'Autenticar por e-mail e senha', { public: true, tag: 'Autenticação', body: ref('Login'), input: { email: usuario.email, senha: 'SuaSenhaDeTeste123!' }, response: ref('Sessao'), output: { token: 'JWT_RECEBIDO_DA_API', usuario }, description: 'Token de uma hora. Contas bloqueadas ou excluídas não autenticam. Ao expirar, faça login novamente; não há refresh token.' })
login.responses['401'] = { description: 'Credenciais incorretas ou conta indisponível.', content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' } } } } }
cadastro.description += ' Cadastro e login compartilham limite de 20 tentativas por IP a cada 15 minutos.'
add('/api/auth/logout', 'post', 'Invalidar todos os tokens da conta', { status: 204, tag: 'Autenticação' })
add('/api/auth/metodos', 'get', 'Consultar métodos de autenticação', { public: true, tag: 'Autenticação', response: ref('MetodosAutenticacao'), output: { google: { habilitado: false, clientId: null }, email: { habilitado: false } } })
const requestEmail = add('/api/auth/email/solicitar', 'post', 'Solicitar link mágico ou reenviar confirmação', { public: true, tag: 'Autenticação', status: 202,
  body: object({ email: { type: 'string', format: 'email', maxLength: 254 }, finalidade: { enum: ['login','cadastro'], default: 'login' }, codigoPorEmail: { type: 'boolean' } }, ['email']),
  input: { email: usuario.email, finalidade: 'login' },
  response: ref('EmailPendente'), output: exemploEmailPendente,
  description: 'Resposta genérica para contas novas, existentes ou indisponíveis e envios limitados. Até três envios em 15 minutos, com intervalo mínimo de 60 segundos. Reenvio de cadastro exige o cookie do pedido original. Use codigoPorEmail: true para receber o código por e-mail e confirmá-lo pela rota de conclusão. Para e-mail sem conta, a confirmação permite concluir o cadastro com nome e senha.' })
const confirmEmail = add('/api/auth/email/confirmar', 'post', 'Confirmar ou aprovar link por e-mail', { public: true, tag: 'Autenticação',
  body: object({ id: uuid, token: { type: 'string', pattern: '^[A-Za-z0-9_-]{43}$' }, nome: nameInput, senha: password, codigoAprovacao }, ['id', 'token']), response: ref('ResultadoConfirmacaoEmail'),
  input: { id: id(9, 3), token: 'a'.repeat(43) },
  output: { token: 'JWT_RECEBIDO_DA_API', usuario, acaoRepublica: 'criar' }, description: 'POST explícito depois de abrir /confirmar-email. O cookie original permite concluir o acesso diretamente. Em outro aparelho, 400 EMAIL_APPROVAL_REQUIRED solicita o código que aparece na tela original. Aprovação com código retorna aprovadoEmOutroDispositivo e a sessão é emitida pela rota de conclusão. O link expira em dez minutos e deve ser usado uma única vez.' })
const concludeEmail = add('/api/auth/email/concluir', 'post', 'Concluir acesso no navegador solicitante', { public: true, tag: 'Autenticação',
  body: object({ id: uuid, nome: nameInput, senha: password, codigo: { ...codigoAprovacao, writeOnly: true } }, ['id']), input: { id: id(9, 3) },
  response: ref('ResultadoConclusaoEmail'), output: { confirmacaoPendente: true },
  description: 'Envie solicitacaoId como id e mantenha o cookie HttpOnly do pedido. Para código recebido por e-mail, envie codigo com os seis dígitos. Há limite de cinco tentativas inválidas. Se faltarem nome e senha, complete na mesma tela após verificar o código. Clientes que usam link podem consultar esta rota após a aprovação em outro aparelho. A sessão é emitida uma única vez.' })
for (const operation of [cadastro, requestEmail, confirmEmail, concludeEmail]) {
  for (const status of ['401','403','503']) operation.responses[status] = { description: status === '503' ? 'Envio de e-mail indisponível ou não configurado.' : 'Link ou origem não autorizado.', content: { 'application/json': { schema: ref('Error'), example: { error: { code: status === '503' ? 'EMAIL_DISABLED' : status === '403' ? 'EMAIL_ORIGIN_FORBIDDEN' : 'EMAIL_LINK_INVALID', message: status === '503' ? 'O envio de e-mails ainda não foi configurado.' : 'Link ou origem não autorizado.' } } } } }
  operation.parameters = [{ name: 'Origin', in: 'header', required: true, schema: { type: 'string', format: 'uri' } }]
}
const googleChallenge = add('/api/auth/google/desafio', 'post', 'Criar desafio Google de cinco minutos', { public: true, tag: 'Autenticação', body: ref('DesafioGoogleInput'), input: { finalidade: 'login' }, response: ref('DesafioGoogle'), output: { desafioId: id(9, 1), nonce: 'NONCE_ALEATORIO_RECEBIDO', expiraEm: agora }, description: 'Exige Origin configurada. Cookie rephouse_google HttpOnly; SameSite=Lax; Path=/api; Secure em produção. Use /api na mesma origem. Exclusão exige Bearer vigente; vincula usuário e versão da sessão. 60 desafios/IP/15min. Nonce e cookie têm somente hashes no banco.' })
const googleLogin = add('/api/auth/google', 'post', 'Entrar ou vincular Google', { public: true, tag: 'Autenticação', body: ref('LoginGoogle'), input: { credential: 'CREDENCIAL_GOOGLE', desafioId: id(9, 1) }, response: ref('Sessao'), output: { token: 'JWT_RECEBIDO_DA_API', usuario }, description: 'Exige Origin autorizada, cookie do desafio e nonce válido. Primeiro acesso cria NORMAL sem senha; sub identifica a conta. 409 GOOGLE_LINK_REQUIRED pede a senha da conta existente; reenvie a mesma credencial/desafio com senha antes de expirar. Erros revertem o consumo; sucesso consome uma vez. Compartilha 20 tentativas/IP/15min com login e cadastro. Não reativa contas. 503 GOOGLE_UNAVAILABLE ou GOOGLE_DISABLED.' })
for (const operation of [googleChallenge, googleLogin]) {
  for (const status of ['401', '403', '503']) operation.responses[status] = { description: status === '503' ? 'Google não configurado ou indisponível.' : 'Credencial, origem, sessão ou desafio inválido.', content: { 'application/json': { schema: ref('Error'), example: { error: { code: status === '503' ? 'GOOGLE_UNAVAILABLE' : status === '403' ? 'GOOGLE_ORIGIN_FORBIDDEN' : 'GOOGLE_INVALID_CREDENTIAL', message: 'Não foi possível confirmar o acesso Google.' } } } } }
  operation.responses['429']!.headers = { 'Retry-After': { schema: { type: 'string' }, description: 'Segundos até nova tentativa.' } }
}
googleChallenge.responses['200']!.headers = { 'Set-Cookie': { schema: { type: 'string' }, description: 'Cookie transitório HttpOnly; nunca disponibilizado ao JavaScript.' } }
add('/api/me', 'get', 'Consultar conta e vínculo atual', { tag: 'Conta', response: ref('MinhaConta'), output: { ...usuario, membro: { ...membro, republica } } })
const photoUpload = add('/api/me/foto', 'post', 'Adicionar ou substituir a própria foto', { tag: 'Conta', response: ref('FotoPerfil'), output: { versao: 'a'.repeat(64), atualizadaEm: agora }, description: 'JPEG, PNG ou WebP estático até 5 MiB e 25 megapixels. Recorte em pixels na imagem orientada: x, y, largura, altura; quadrado. Servidor valida e gera WebP 512×512, até 512 KiB, sem metadados. Original descartado. Revalida sessão na transação; dois uploads em andamento no máximo por instância.' })
photoUpload.requestBody = { required: true, content: { 'multipart/form-data': { schema: object({ imagem: { type: 'string', format: 'binary' }, recorte: { type: 'string', description: 'JSON {x,y,largura,altura} com inteiros na orientação visual da foto.' } }) } } }
photoUpload.responses['413'] = { description: 'Foto maior que 5 MiB.', content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'LIMIT_FILE_SIZE', message: 'A foto deve ter no máximo 5 MiB.' } } } } }
add('/api/me/foto', 'delete', 'Remover a própria foto', { tag: 'Conta', status: 204, description: 'Idempotente: ausência de foto também retorna 204. Não altera o histórico financeiro.' })
const photoRead = add('/api/usuarios/{id}/foto', 'get', 'Consultar foto autenticada', { tag: 'Conta', description: 'Somente o proprietário ou morador ativo da mesma casa atual, com contas habilitadas. Sem privilégio global MASTER. Ausência e acesso indevido retornam 404. Cache-Control: no-store; token somente no header.' })
photoRead.responses['200'] = { description: 'Foto WebP normalizada.', content: { 'image/webp': { schema: { type: 'string', format: 'binary' } } } }
add('/api/me', 'patch', 'Editar o próprio nome', { tag: 'Conta', body: object({ nome: nameInput }), input: { nome: 'Ana Silva' }, response: ref('Usuario'), output: { ...usuario, nome: 'Ana Silva' } })
add('/api/me', 'delete', 'Excluir logicamente a própria conta', { status: 204, tag: 'Conta', body: { oneOf: [object({ senha: password }), object({ credential: { type: 'string', minLength: 1, maxLength: 16000, writeOnly: true }, desafioId: uuid })] }, input: { senha: 'SuaSenhaDeTeste123!' }, description: 'Confirma senha ou Google vinculado à própria conta (desafio finalidade exclusao, cookie e Origin). 409: OUTSTANDING_DEBT, TRANSFER_ADMIN_REQUIRED ou LAST_MASTER. Encerra vínculos, revoga tokens e anonimiza os dados pessoais na mesma transação (LGPD): nome vira Ex-morador, e-mail e senha são substituídos, e foto, Google, links de e-mail e notificações são apagados. O histórico financeiro e de tarefas permanece sem identificar a pessoa; o e-mail fica livre para um novo cadastro. Conta excluída não pode ser reativada.' })
add('/api/me/dados', 'get', 'Baixar uma cópia dos próprios dados pessoais', { tag: 'Conta', response: { type: 'object', additionalProperties: false,
  required: ['geradoEm', 'sobre', 'conta', 'republicas', 'suasPartesNasDespesas', 'pagamentos', 'despesasCriadas', 'tarefas', 'notificacoes'],
  properties: { geradoEm: timestamp, sobre: { type: 'string' }, conta: { type: 'object' }, republicas: { type: 'array', items: { type: 'object' } },
    suasPartesNasDespesas: { type: 'array', items: { type: 'object' } }, pagamentos: { type: 'array', items: { type: 'object' } },
    despesasCriadas: { type: 'array', items: { type: 'object' } }, tarefas: { type: 'array', items: { type: 'object' } }, notificacoes: { type: 'array', items: { type: 'object' } } } },
  output: { geradoEm: '2026-11-26T12:00:00.000Z', sobre: 'Cópia dos seus dados pessoais no RepHouse (LGPD, art. 18).', conta: { id: usuario.id, nome: usuario.nome, email: usuario.email }, republicas: [], suasPartesNasDespesas: [], pagamentos: [], despesasCriadas: [], tarefas: [], notificacoes: [] },
  description: 'LGPD, art. 18, II e V. Resposta com Content-Disposition attachment (rephouse-meus-dados.json). Senhas, hashes, tokens e conteúdo de arquivos nunca entram.' })
add('/api/privacidade', 'get', 'Consultar contato de privacidade', { public: true, tag: 'Conta', response: object({ contato: nullable({ type: 'string', format: 'email' }), versaoPolitica: { type: 'string' } }),
  output: { contato: 'privacidade@example.com', versaoPolitica: '2026-11-26' }, description: 'Contato para pedidos de titulares (LGPD, art. 41), lido de PRIVACY_CONTACT_EMAIL ou EMAIL_FROM.' })
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
  const createExpense = add(`${prefix}/despesas`, 'post', 'Criar despesa com rateio igual entre selecionados', { tag, status: 201, body: ref('CriarDespesa'), input: expenseInput, response: ref('Despesa'), output: { ...despesa, rateios: rateios.map(r => ({ ...r, valorPago: '0.00', status: 'PENDENTE' })) }, description: 'Qualquer morador ativo da república pode cadastrar. Participantes ativos da mesma república. Sobra de centavos distribuída por ordem dos IDs. Um participante assume o valor inteiro.' })
  add(`${prefix}/despesas/{id}`, 'get', 'Consultar despesa com pagamentos dos rateios', { tag, response: ref('Despesa'), output: { ...despesa, rateios: rateios.map(r => ({ ...r, pagamentos: r.id === rateio.id ? [pagamento] : r.status === 'PAGO' ? [{ ...pagamento, id: id(6, 1), rateioId: r.id, membroId: r.membroId, valor: r.valorPago }] : [] })) } })
  add(`${prefix}/despesas/{id}`, 'patch', 'Editar despesa', { tag, body: ref('EditarDespesa'), input: { titulo: 'Internet atualizada' }, response: ref('Despesa'), output: { ...despesa, titulo: 'Internet atualizada', rateios }, description: 'Corrige quem cadastrou a despesa ou o administrador da república (demais: 403; outra república: 404). Valor e participantes ficam bloqueados após o primeiro pagamento (409 FINANCIAL_HISTORY_LOCKED). Depois do aviso de vencimento, valor e participantes ainda podem mudar, mas o morador já avisado não sai da divisão (409 DUE_NOTICE_SENT). Título, categoria e vencimento podem ser editados.' })
  add(`${prefix}/tarefas`, 'get', 'Listar tarefas', { tag: prefix === '/api' ? 'Tarefas' : tag, response: array(ref('Tarefa')), output: [tarefa] })
  const createTask = add(`${prefix}/tarefas`, 'post', 'Criar tarefa disponível ou atribuída', { tag: prefix === '/api' ? 'Tarefas' : tag, status: 201, body: ref('CriarTarefa'), input: taskInput, response: ref('Tarefa'), output: tarefa, description:'Qualquer morador ativo cria tarefa disponível (responsavelId ausente/null) ou para si. ADMIN/MASTER podem atribuir a outro morador ativo.' })
  for (const creation of [createExpense, createTask]) {
    creation.parameters ??= []
    creation.parameters.push({ name: 'Idempotency-Key', in: 'header', required: false, schema: uuid,
      description: 'UUID público por criação. Mesma chave, usuário, operação e dados retornam a resposta original (201); dados ou república diferentes retornam 409 IDEMPOTENCY_CONFLICT. Nova chave permite criação intencional igual. Sem header não há proteção contra reenvios; header inválido retorna 400. Sessão e permissão são revalidadas em todo reenvio.' })
  }
  add(`${prefix}/tarefas/{id}`, 'get', 'Consultar tarefa', { tag:'Tarefas',response:ref('Tarefa'),output:tarefa })
  add(`${prefix}/tarefas/{id}`, 'patch', 'Editar, concluir ou reabrir tarefa', { tag: prefix === '/api' ? 'Tarefas' : tag, body: ref('EditarTarefa'), input: { status: 'CONCLUIDA' }, response: ref('Tarefa'), output: { ...tarefa, status: 'CONCLUIDA' }, description: 'ADMIN/MASTER gerenciam. Criador edita título, descrição e prazo enquanto disponível. Responsável ativo conclui/reabre; só administrador troca responsável. Conclusão exige responsável.' })
  add(`${prefix}/tarefas/{id}/assumir`, 'post', 'Assumir tarefa disponível', { tag:'Tarefas',body:object({}),input:{},response:ref('Tarefa'),output:tarefa,description:'Associa ao vínculo ativo do próprio solicitante. Concorrente de outro morador recebe 409 TASK_ALREADY_ASSIGNED; repetição pelo mesmo responsável não duplica evento.' })
  add(`${prefix}/tarefas/{id}/liberar`, 'post', 'Liberar tarefa aberta', { tag:'Tarefas',body:object({}),input:{},response:ref('Tarefa'),output:{...tarefa,responsavelId:null},description:'Responsável ativo ou administrador; não libera tarefa concluída.' })
  add(`${prefix}/dashboard`, 'get', 'Consultar indicadores da república', { tag: prefix === '/api' ? 'Painel' : tag, response: ref('Painel'), output: painel, description: 'Inclui dívida de ex-moradores. O mês segue APP_TIME_ZONE, padrão horário de Brasília (America/Sao_Paulo); todos os indicadores usam a mesma transação.' })
}
const payment = add('/api/pagamentos', 'post', 'Registrar pagamento parcial ou integral', { tag: 'Financeiro', status: 201, body: ref('RegistrarPagamento'), input: { rateioId: rateio.id, valor: '10.00' }, response: ref('Pagamento'), output: pagamento, description: 'Somente proprietário do rateio, inclusive após sair da república. Saldo não pode ser ultrapassado. Idempotency-Key UUID obrigatório: repetir o mesmo conteúdo retorna o mesmo pagamento (201); mudar valor, rateio ou arquivo retorna 409. Não movimenta dinheiro e não possui estorno, edição ou exclusão nesta entrega.' })
payment.parameters = [{ name: 'Idempotency-Key', in: 'header', required: true, schema: uuid, example: id(9, 1), description: 'Uma chave por operação; reutilize-a ao repetir a mesma solicitação.' }]
payment.requestBody!.content['multipart/form-data'] = { schema: object({ rateioId: uuid, valor: positiveMoney, comprovante: { type: 'string', format: 'binary', description: 'PDF, PNG, JPEG ou WEBP, até 5 MiB. O conteúdo determina o tipo.' } }, ['rateioId', 'valor']) }
payment.responses['413'] = { description: 'Arquivo acima de 5 MiB ou JSON acima de 1 MiB.', content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'LIMIT_FILE_SIZE', message: 'O comprovante deve ter no máximo 5 MB.' } } } } }
payment.responses['429']={description:'Dois uploads já estão em processamento.',headers:{'Retry-After':{schema:{type:'string'},example:'1'}},content:{'application/json':{schema:ref('Error'),example:{error:{code:'UPLOAD_BUSY',message:'Há muitos uploads em andamento. Tente novamente.'}}}}}
const receipt = add('/api/pagamentos/{id}/comprovante', 'get', 'Baixar comprovante privado', { tag: 'Financeiro', description: 'Proprietário do pagamento, administrador da república de origem ou MASTER. Conteúdo armazenado no PostgreSQL. Ausência de comprovante ou falta de acesso retorna 404.' })
receipt.responses['200'] = { description: 'Conteúdo binário do arquivo, carregado somente após autorização.', headers: { 'Content-Disposition': { schema: { type: 'string' }, example: 'attachment; filename="comprovante.pdf"' },'Content-Length':{schema:{type:'integer',minimum:1,maximum:5242880}},'Cache-Control':{schema:{const:'no-store'}},'X-Content-Type-Options':{schema:{const:'nosniff'}} }, content: Object.fromEntries(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].map(type => [type, { schema: { type: 'string', format: 'binary' } }])) }
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

const financialParameters = [
  { name: 'competencia', in: 'query', schema: monthInput, description: 'Mês do vencimento. Sem filtro mantém o histórico completo.' },
  { name: 'situacao', in: 'query', schema: { enum: ['TODAS','PENDENTES','PROXIMAS','ATRASADAS','PAGAS'] }, description: 'PROXIMAS inclui hoje e os próximos sete dias. Quitadas não entram nos avisos.' },
]
const summaryExample = { competencia: '2026-11', dataReferencia: '2026-11-17', totalDevido: '60.00', totalPago: '25.00', saldoPendente: '35.00', totalItens: 1, rateiosPendentes: 1 }
const summary = add('/api/me/financeiro/resumo', 'get', 'Consultar resumo das próprias parcelas', { tag: 'Financeiro', response: ref('ResumoIndividual'), output: summaryExample,
  description: 'Agregação de todas as parcelas filtradas, independente da paginação. O mês é do vencimento, não da data do pagamento. Funciona sem vínculo ativo e preserva histórico.' })
summary.parameters = [...financialParameters, { name: 'republicaId', in: 'query', schema: uuid }]
paths['/api/me/financeiro']!.get!.parameters ??= []
paths['/api/me/financeiro']!.get!.parameters!.push(...summary.parameters)
const recurringExample = { id: id(10,1), republicaId: republica.id, despesaOrigemId: null, inicio: '2026-11', fim: null, proximaCompetencia: '2026-12', ativa: true, pausaMotivo: null,
  configuracoes: [{ id: id(11,1), vigencia: '2026-11', titulo: 'Internet', categoria: 'INTERNET', valorTotal: '120.00', diaVencimento: 20, membroIds: [membro.id] }] }
for (const prefix of ['/api', '/api/master/republicas/{republicaId}']) {
  const expenseList = paths[`${prefix}/despesas`]!.get!
  expenseList.parameters ??= []
  expenseList.parameters.push(...financialParameters, { name: 'escopo', in: 'query', schema: { enum: ['CASA','PESSOAL'], default: 'CASA' }, description: 'PESSOAL filtra a própria parcela; CASA considera a quitação de toda a conta.' })
  add(`${prefix}/recorrencias`, 'get', 'Listar recorrências mensais', { response: array(ref('Recorrencia')), output: [recurringExample], tag: 'Financeiro' })
  const createRecurring = add(`${prefix}/recorrencias`, 'post', 'Criar recorrência e primeira competência aplicável', { admin: true, status: 201, tag: 'Financeiro', body: ref('CriarRecorrencia'),
    input: { titulo: 'Internet', categoria: 'INTERNET', valorTotal: '120.00', diaVencimento: 20, inicio: '2026-11', membroIds: [membro.id] }, response: ref('Recorrencia'), output: recurringExample,
    description: 'Idempotência obrigatória. Participantes fixos; início no mês atual ou futuro. Vencimento já passado exige próximo mês. Dias inexistentes usam o último dia do mês. Origem avulsa exige início após seu mês e após o mês atual. fim é opcional, inclusivo pelo vencimento civil (1900 a 2199); deve incluir o primeiro vencimento. Ausente ou null mantém repetição sem prazo. Não gera despesa nem pendência de revisão depois do limite.' })
  createRecurring.parameters ??= []
  createRecurring.parameters.push({ name: 'Idempotency-Key', in: 'header', required: true, schema: uuid })
  add(`${prefix}/recorrencias/{id}`, 'get', 'Consultar configuração da recorrência', { response: ref('Recorrencia'), output: recurringExample, tag: 'Financeiro' })
  add(`${prefix}/recorrencias/{id}`, 'patch', 'Editar ou desativar recorrência', { admin: true, body: ref('EditarRecorrencia'), input: { ativa: false }, response: ref('Recorrencia'), output: { ...recurringExample, ativa: false }, tag: 'Financeiro',
    description: 'Configurações valem a partir do próximo mês, sem reescrever despesas ou versões anteriores. fim altera imediatamente o limite para competências ainda não geradas; null remove o limite, omitir mantém o existente. A data não pode anteceder o início. Despesas já geradas permanecem independentes. ativa=false não exclui histórico. Reativação exige participantes ativos e ativa=true; mudar fim não reativa automaticamente uma recorrência encerrada.' })
  add(`${prefix}/recorrencias/{id}/competencias`, 'get', 'Consultar competências e pendências de revisão', { response: array(ref('CompetenciaRecorrencia')), output: [{ competencia: '2026-11', estado: 'GERADA', motivo: null, despesaId: despesa.id, revisadaEm: null }], tag: 'Financeiro' })
  const review = add(`${prefix}/recorrencias/{id}/competencias/{competencia}/revisar`, 'post', 'Marcar competência não gerada como revisada', { admin: true, status: 204, body: object({}), input: {}, tag: 'Financeiro', description: 'Não cria pagamentos nem altera saldos. Cadastre uma despesa avulsa se a revisão identificar cobrança necessária. Competências geradas não podem ser revisadas.' })
  review.parameters = review.parameters!.map(parameter => (parameter as { name: string }).name === 'competencia' ? { name: 'competencia', in: 'path', required: true, schema: monthInput } : parameter)
}

const noticeList=add('/api/notificacoes','get','Listar notificações da república atual',{tag:'Notificações',response:array(ref('Notificacao')),output:[]})
noticeList.parameters=[{name:'categoria',in:'query',schema:{enum:['TODAS','TAREFAS','DESPESAS','GERAIS'],default:'TAREFAS'}}]
add('/api/notificacoes/nao-lidas','get','Contar avisos ativos não lidos',{tag:'Notificações',response:ref('NotificacoesNaoLidas'),output:{tarefas:0,despesas:0,gerais:0,total:0}})
add('/api/notificacoes/{id}/lida','patch','Marcar aviso próprio como lido',{tag:'Notificações',status:204,body:object({}),input:{}})
add('/api/notificacoes/lidas','patch','Marcar a categoria ou todas como lidas',{tag:'Notificações',status:204,body:object({categoria:{enum:['TODAS','TAREFAS','DESPESAS','GERAIS']}}),input:{categoria:'TODAS'}})
const streamNotices=add('/api/notificacoes/eventos','get','Receber atualizações por SSE',{tag:'Notificações',description:'Use fetch com Authorization Bearer; nunca envie JWT na URL. Eventos conectado/atualizar pedem reconciliação por HTTP. sessao-encerrada/contexto-encerrado encerram o contexto; indisponivel permite reconexão. Heartbeat e autorização em até 15 segundos.'})
streamNotices.responses['200']={description:'Fluxo autenticado, sem transação de longa duração.',content:{'text/event-stream':{schema:{type:'string'},example:'event: conectado\ndata: {}\n\n'}}}
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
// A API principal continua paginada. Somente este namespace atende os arrays
// esperados pelo frontend do PR #2, compartilhando as mesmas operações.
for (const [path, operations] of Object.entries(paths)) {
  if (['/api/health', '/api/ready', '/api/openapi.json'].includes(path)) continue
  const compatible = structuredClone(operations)
  for (const operation of Object.values(compatible)) {
    operation.operationId = `frontV1_${operation.operationId}`
    operation.tags = ['Frontend (compatibilidade)']
    operation.description += ' Adaptador do frontend PR #2. Mesmas permissões e transações da API principal.'
    const media = operation.responses['200']?.content?.['application/json']
    const properties = media?.schema.properties as Record<string, Schema> | undefined
    if (media && properties?.dados?.type === 'array' && !path.startsWith('/api/notificacoes')) {
      media.schema = properties.dados
      media.example = (media.example as { dados: unknown }).dados
      operation.parameters = operation.parameters?.filter(parameter => !['pagina', 'limite'].includes((parameter as { name: string }).name))
      operation.description = operation.description.replace('Listagem paginada.', '').replace('Resposta paginada: dados e paginacao. Página além do resultado retorna dados vazio. Parâmetros inválidos ou desconhecidos retornam 400.', '')
      operation.description += ' Array completo, até 1.000 registros. Acima disso retorna 409 FRONT_COLLECTION_LIMIT, sem truncamento. Não aceita pagina ou limite; use a API principal para paginação.'
      operation.responses['409'] = { description: 'Coleção acima do limite do adaptador.', content: { 'application/json': { schema: ref('Error'), example: { error: { code: 'FRONT_COLLECTION_LIMIT', message: 'Há registros demais para esta tela. Utilize a interface com paginação.' } } } } }
    }
  }
  paths[path.replace(/^\/api/, '/api/front/v1')] = compatible
}
// Identificador presente inclusive em erros e downloads; nenhum segredo é registrado.
for (const operations of Object.values(paths)) for (const operation of Object.values(operations)) {
  for (const response of Object.values(operation.responses)) {
    response.headers = { ...response.headers, 'X-Request-Id': { description: 'UUID gerado pelo servidor para correlação com os logs.', schema: uuid } }
  }
}

export const openApiDocument = {
  openapi: '3.1.0',
  info: { title: 'RepHouse API', version: '4.2.0', description: 'Backend TypeScript. Listagens retornam {dados,paginacao}. Dinheiro é string decimal. Datas de entrada usam YYYY-MM-DD; datas civis de saída usam ISO à meia-noite UTC. Relatórios e vencimentos seguem APP_TIME_ZONE, padrão horário de Brasília (America/Sao_Paulo). Exemplos são ilustrativos. Endpoints protegidos usam Authorization: Bearer TOKEN; CORS não substitui autorização.' },
  servers: [{ url: 'http://localhost:3000', description: 'Desenvolvimento local; ajuste ao ambiente da equipe.' }],
  tags: ['Documentação', 'Autenticação', 'Conta', 'Repúblicas', 'Financeiro', 'Tarefas', 'Notificações', 'Painel', 'MASTER', 'Frontend (compatibilidade)'].map(name => ({ name })),
  security: [{ bearerAuth: [] }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas },
  paths,
}
