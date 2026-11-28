import { randomBytes } from 'node:crypto'
import { verify, hash, argon2id } from 'argon2'
import { SignJWT, jwtVerify } from 'jose'
import type { PrismaClient, Usuario } from '../../gerado/prisma/client.js'
import { withActor, type Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { z } from 'zod'
import { AuthRepository } from './auth.repository.js'
import type { LoginInput } from './auth.types.js'
import { createGoogleService, type GoogleOptions, type GoogleProof } from './google.service.js'
import { createEmailService, type EmailConclusao, type EmailProof } from './email.service.js'
import type { EmailOptions } from '../../infraestrutura/email/resend.js'
import { notifyMembership } from '../notificacoes/notificacoes.service.js'
import { fotoPublica, fotoSelect } from '../perfil/foto.service.js'

// Hash descartável: conta inexistente ou sem senha custa o mesmo Argon2 que uma senha errada,
// para o tempo de resposta não revelar quais e-mails têm conta.
let hashFicticio: Promise<string> | undefined
const conferirSemConta = async (senha: string) => {
  hashFicticio ??= hash(randomBytes(32).toString('base64url'), { type: argon2id })
  await verify(await hashFicticio, senha).catch(() => false)
  return false
}

function publicUser(user: Usuario) {
  const { id, nome, email, tipoUsuario, ativo, criadoEm } = user
  return { id, nome, email, tipoUsuario, ativo, criadoEm }
}

export function createAuthService(db: PrismaClient, secret: string, googleOptions?: GoogleOptions, emailOptions?: EmailOptions) {
  const repository = new AuthRepository()
  const google = createGoogleService(db, googleOptions)
  const email = createEmailService(db, secret, emailOptions)
  const key = new TextEncoder().encode(secret)
  async function token(user: Usuario) {
    return new SignJWT({ ver: user.versaoToken }).setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id).setIssuedAt().setIssuer('rephouse').setAudience('rephouse-api')
      .setExpirationTime('1h').sign(key)
  }
  async function emailSession(result: { user: Usuario; acaoRepublica: string | null }) {
    return { token: await token(result.user), usuario: publicUser(result.user), acaoRepublica: result.acaoRepublica }
  }
  return {
    methods: () => ({ ...google.methods(), email: { habilitado: email.enabled() } }),
    register: email.register,
    requestEmail: email.request,
    async confirmEmail(proof: EmailProof, cookie?: string) {
      const result = await email.confirm(proof, cookie)
      return 'user' in result ? emailSession(result) : result
    },
    async concludeEmail(proof: EmailConclusao, cookie?: string) {
      const result = await email.conclude(proof, cookie)
      return result ? emailSession(result) : { confirmacaoPendente: true } as const
    },
    challenge: google.challenge.bind(google),
    async googleLogin(proof: GoogleProof, cookie?: string) {
      const user = await google.login(proof, cookie)
      return { token: await token(user), usuario: publicUser(user) }
    },
    async login(input: LoginInput) {
      const user = await repository.buscarPorEmail(db, input.email)
      const senhaValida = user?.senhaHash ? await verify(user.senhaHash, input.senha).catch(() => false) : await conferirSemConta(input.senha)
      if (!user || !user.ativo || user.excluidoEm || !senhaValida) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.')
      }
      return { token: await token(user), usuario: publicUser(user) }
    },
    async verifyToken(value: string): Promise<Actor> {
      try {
        const { payload } = await jwtVerify(value, key, { algorithms: ['HS256'], issuer: 'rephouse', audience: 'rephouse-api' })
        z.object({sub:z.uuid(),ver:z.number().int().nonnegative(),iat:z.number().int().nonnegative(),exp:z.number().int().positive()}).parse(payload)
        if (typeof payload.sub !== 'string' || typeof payload.ver !== 'number') throw new Error()
        return { id: payload.sub, versaoToken: payload.ver }
      } catch { throw new AppError(401, 'UNAUTHENTICATED', 'Token inválido ou expirado.') }
    },
    activeSession: (actor:Actor)=>withActor(db,actor,async()=>undefined),
    me: (actor: Actor) => withActor(db, actor, async (tx, user) => ({
      ...publicUser(user),
      membro: await repository.vinculoAtual(tx, user.id),
      foto: fotoPublica(await tx.fotoPerfil.findUnique({ where: { usuarioId: user.id }, select: fotoSelect })),
      emailConfirmadoEm: (await tx.emailVerificado.findUnique({ where: { usuarioId: user.id } }))?.verificadoEm ?? null,
    })),
    edit: (actor: Actor, nome: string) => withActor(db, actor, (tx, user) => repository.editarNome(tx, user.id, nome)),
    logout: (actor: Actor) => withActor(db, actor, async (tx, user) => {
      await repository.invalidarTokens(tx, user.id)
    }),
    async deleteAccount(actor: Actor, confirmation: string | GoogleProof, cookie?: string) {
      const original = await repository.buscarPorId(db, actor.id)
      const proof = typeof confirmation === 'string' ? undefined : await google.prepare(confirmation, cookie)
      if (!proof && (!original?.senhaHash || typeof confirmation !== 'string' || !await verify(original.senhaHash, confirmation).catch(() => false))) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Confirme sua senha para excluir a conta.')
      }
      return withActor(db, actor, async (tx, user) => {
        if (proof) {
          const identity = await tx.identidadeGoogle.findUnique({ where: { sub: proof.identity.sub } })
          if (identity?.usuarioId !== user.id) throw new AppError(403, 'GOOGLE_REAUTH_REQUIRED', 'Confirme o Google vinculado à sua própria conta.')
          await google.consume(tx, proof, actor)
        } else if (user.senhaHash !== original?.senhaHash) {
          throw new AppError(401, 'INVALID_CREDENTIALS', 'Confirme sua senha para excluir a conta.')
        }
        if (await repository.administra(tx, user.id)) {
          throw new AppError(409, 'TRANSFER_ADMIN_REQUIRED', 'Transfira a administração antes de excluir sua conta.')
        }
        if (await repository.dividas(tx, user.id)) {
          throw new AppError(409, 'OUTSTANDING_DEBT', 'Quite suas dívidas, inclusive de repúblicas anteriores.')
        }
        if (user.tipoUsuario === 'USUARIO_MASTER' && await repository.outrosMasters(tx, user.id) === 0) {
          throw new AppError(409, 'LAST_MASTER', 'Outro MASTER ativo precisa permanecer na plataforma.')
        }
        const memberships = await tx.membroRepublica.findMany({where:{usuarioId:user.id,ativo:true}})
        await repository.encerrarVinculos(tx, user.id)
        for (const member of memberships) await notifyMembership(tx, member, user.id, 'MEMBRO_SAIU')
        // Exclusão definitiva: invalida todos os tokens e, na mesma transação, anonimiza os dados pessoais (LGPD,
        // 26/11/2026). Nome vira "Ex-morador", e-mail e senha somem, e foto, Google, links e notificações são apagados.
        // O histórico financeiro e de tarefas fica para os outros moradores, sem identificar a pessoa.
        await repository.excluir(tx, user.id)
        await tx.$executeRaw`SELECT rephouse_anonimizar_conta_excluida(${user.id}::uuid)`
      })
    },
  }
}
export type AuthService = ReturnType<typeof createAuthService>
