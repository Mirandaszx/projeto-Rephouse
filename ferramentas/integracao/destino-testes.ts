/** Allowlist de destinos exclusivos de testes; nunca consultar DATABASE_URL. */
export const URL_TESTES_LOCAL = 'postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test?schema=public'

export function validarDestinoTestes(value: string | undefined, githubActions = process.env.GITHUB_ACTIONS === 'true'): URL {
  if (!value || !URL.canParse(value)) throw new Error('Informe a URL exclusiva do PostgreSQL de testes.')
  const url = new URL(value)
  const local = url.port === '5544' && url.username === 'rephouse_interface_test'
  const ci = githubActions && url.port === '5432' && url.username === 'rephouse_ci'
  const schema = url.searchParams.get('schema') ?? 'public'
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1'].includes(url.hostname)
    || url.pathname !== '/rabbu_mvp_test' || !(local || ci) || !url.password
    || !/^(public|complete_test_[a-f0-9]{32})$/.test(schema)
    || [...url.searchParams.keys()].some(key => key !== 'schema')) {
    // Não interpolar a URL: uma configuração recusada também pode conter segredos.
    throw new Error('Destino recusado: use exclusivamente o PostgreSQL dedicado de testes, com host, porta, banco e usuário permitidos.')
  }
  return url
}
