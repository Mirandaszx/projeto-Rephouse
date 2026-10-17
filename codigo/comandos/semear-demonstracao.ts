import 'dotenv/config'
import { createDatabase } from '../infraestrutura/banco/client.js'
import { semearDemonstracao } from '../infraestrutura/banco/demonstracao.js'

const db = createDatabase()
try {
  const result = await semearDemonstracao(db, process.env.DEMO_PASSWORD)
  console.log(result.criado ? 'Demonstração criada.' : 'Demonstração já existe; dados e senhas preservados.')
  console.table(result.contas.map(({ email, tipoUsuario }) => ({ email, perfil: tipoUsuario })))
  console.log('Use a DEMO_PASSWORD definida na primeira execução. A senha não é exibida pelo comando.')
} catch {
  console.error('Não foi possível criar a demonstração. Confira DEMO_PASSWORD (12 a 128 caracteres), ambiente, migrations e se os IDs/e-mails reservados estão livres ou completos.')
  process.exitCode = 1
} finally { await db.$disconnect() }
