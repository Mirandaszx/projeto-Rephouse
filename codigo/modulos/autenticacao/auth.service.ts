import { hash, verify, argon2id } from 'argon2'
import { SignJWT, jwtVerify } from 'jose'
import type { PrismaClient, Usuario } from '../../gerado/prisma/client.js'
import { executarTransacaoAcid } from '../../infraestrutura/banco/transaction.js'
import { withActor, type Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { z } from 'zod'
import { AuthRepository } from './auth.repository.js'
import type { CadastroInput, LoginInput } from './auth.types.js'

function publicUser(user: Usuario) {
  const { id, nome, email, tipoUsuario, ativo, criadoEm } = user
  return { id, nome, email, tipoUsuario, ativo, criadoEm }
}

export function createAuthService(db: PrismaClient, secret: string) {
  const repository = new AuthRepository()
  const key = new TextEncoder().encode(secret)
  async function token(user: Usuario) {
    return new SignJWT({ ver: user.versaoToken }).setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id).setIssuedAt().setIssuer('rephouse').setAudience('rephouse-api')
      .setExpirationTime('1h').sign(key)
  }
  return {
    async register(input: CadastroInput) {
      // Hash é calculado fora do retry: a callback transacional contém apenas acesso ao banco.
      const senhaHash = await hash(input.senha, { type: argon2id })
      const user = await executarTransacaoAcid(db, tx => repository.criar(tx, {
        nome: input.nome, email: input.email, senhaHash,
      }))
      return { token: await token(user), usuario: publicUser(user) }
    },
    async login(input: LoginInput) {
      const user = await repository.buscarPorEmail(db, input.email)
      if (!user || !user.ativo || user.excluidoEm || !await verify(user.senhaHash, input.senha).catch(() => false)) {
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
    })),
    edit: (actor: Actor, nome: string) => withActor(db, actor, (tx, user) => repository.editarNome(tx, user.id, nome)),
    logout: (actor: Actor) => withActor(db, actor, async (tx, user) => {
      await repository.invalidarTokens(tx, user.id)
    }),
    async deleteAccount(actor: Actor, senha: string) {
      const original = await repository.buscarPorId(db, actor.id)
      if (!original || !await verify(original.senhaHash, senha).catch(() => false)) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Confirme sua senha para excluir a conta.')
      }
      return withActor(db, actor, async (tx, user) => {
        if (await repository.administra(tx, user.id)) {
          throw new AppError(409, 'TRANSFER_ADMIN_REQUIRED', 'Transfira a administração antes de excluir sua conta.')
        }
        if (await repository.dividas(tx, user.id)) {
          throw new AppError(409, 'OUTSTANDING_DEBT', 'Quite suas dívidas, inclusive de repúblicas anteriores.')
        }
        if (user.tipoUsuario === 'USUARIO_MASTER' && await repository.outrosMasters(tx, user.id) === 0) {
          throw new AppError(409, 'LAST_MASTER', 'Outro MASTER ativo precisa permanecer na plataforma.')
        }
        await repository.encerrarVinculos(tx, user.id)
        // Exclusão lógica é definitiva na API: conserva FKs e invalida todos os tokens.
        await repository.excluir(tx, user.id)
      })
    },
  }
}
export type AuthService = ReturnType<typeof createAuthService>
