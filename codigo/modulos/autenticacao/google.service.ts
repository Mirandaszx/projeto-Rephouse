import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { verify } from 'argon2'
import type { Prisma, PrismaClient } from '../../gerado/prisma/client.js'
import type { Actor } from '../../compartilhado/context.js'
import { withActor } from '../../compartilhado/context.js'
import { executarTransacaoAcid } from '../../infraestrutura/banco/transaction.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { createGoogleVerifier, type GoogleVerifier, type GoogleIdentity } from './google.verifier.js'

export interface GoogleOptions { clientId: string; secureCookies?: boolean; verify?: GoogleVerifier }
export interface GoogleProof { credential: string; desafioId: string; senha?: string }
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const invalid = () => new AppError(401, 'GOOGLE_INVALID_CREDENTIAL', 'A confirmação Google é inválida ou expirou.')
export function createGoogleService(db: PrismaClient, options?: GoogleOptions) {
  const verifier = options ? options.verify ?? createGoogleVerifier(options.clientId) : undefined
  function configured() {
    if (!verifier) throw new AppError(503, 'GOOGLE_DISABLED', 'O acesso Google ainda não foi configurado.')
    return verifier
  }
  return {
    methods: () => ({ google: { habilitado: !!options, clientId: options?.clientId ?? null } }),
    async challenge(finalidade: 'login' | 'exclusao', cookie?: string, actor?: Actor) {
      configured()
      const secret = cookie && /^[A-Za-z0-9_-]{43}$/.test(cookie) ? cookie : randomBytes(32).toString('base64url')
      const nonce = randomBytes(32).toString('base64url'), id = randomUUID()
      const expiraEm = new Date(Date.now() + 300_000)
      const data = { id, nonceHash: digest(nonce), cookieHash: digest(secret), finalidade,
        usuarioId: finalidade === 'exclusao' ? actor?.id : undefined,
        versaoToken: finalidade === 'exclusao' ? actor?.versaoToken : undefined, expiraEm }
      const insert = async (tx: Prisma.TransactionClient) => {
        // Limpeza limitada evita que a criação de um desafio faça uma varredura ilimitada.
        await tx.$executeRaw`DELETE FROM desafios_google WHERE id IN (SELECT id FROM desafios_google WHERE expira_em < now() ORDER BY expira_em LIMIT 100)`
        await tx.desafioGoogle.create({ data })
      }
      if (finalidade === 'exclusao') {
        if (!actor) throw new AppError(401, 'UNAUTHENTICATED', 'Autenticação necessária.')
        await withActor(db, actor, insert)
      } else await executarTransacaoAcid(db, insert)
      return { secret, response: { desafioId: id, nonce, expiraEm } }
    },
    async prepare(proof: GoogleProof, cookie?: string) {
      const identity = await configured()(proof.credential)
      if (!cookie || !/^[A-Za-z0-9_-]{43}$/.test(cookie)) throw invalid()
      return { identity, id: proof.desafioId, cookieHash: digest(cookie), nonceHash: digest(identity.nonce) }
    },
    async consume(tx: Prisma.TransactionClient, prepared: { identity: GoogleIdentity; id: string; cookieHash: string; nonceHash: string }, actor?: Actor) {
      const updated = await tx.desafioGoogle.updateMany({ where: {
        id: prepared.id, cookieHash: prepared.cookieHash, nonceHash: prepared.nonceHash,
        finalidade: actor ? 'exclusao' : 'login', usuarioId: actor?.id ?? null,
        versaoToken: actor?.versaoToken ?? null, consumidoEm: null, expiraEm: { gt: new Date() },
      }, data: { consumidoEm: new Date() } })
      if (updated.count !== 1) throw invalid()
    },
    async login(proof: GoogleProof, cookie?: string) {
      const prepared = await this.prepare(proof, cookie)
      const original = await db.usuario.findUnique({ where: { email: prepared.identity.email } })
      const passwordValid = !!(proof.senha && original?.senhaHash && await verify(original.senhaHash, proof.senha).catch(() => false))
      for (let attempt = 0; ; attempt++) {
        try {
          return await executarTransacaoAcid(db, async tx => {
            await this.consume(tx, prepared)
            const linked = await tx.identidadeGoogle.findUnique({ where: { sub: prepared.identity.sub }, include: { usuario: true } })
            if (linked) {
              if (!linked.usuario.ativo || linked.usuario.excluidoEm) throw invalid()
              return linked.usuario
            }
            let user = await tx.usuario.findUnique({ where: { email: prepared.identity.email }, include: { identidadeGoogle: true } })
            if (user) {
              if (!user.ativo || user.excluidoEm) throw invalid()
              if (user.identidadeGoogle) throw new AppError(409, 'GOOGLE_IDENTITY_CONFLICT', 'A conta já possui outra identidade Google.')
              if (!proof.senha) throw new AppError(409, 'GOOGLE_LINK_REQUIRED', 'Confirme a senha atual para conectar o Google à sua conta.')
              if (!passwordValid || user.senhaHash !== original?.senhaHash) throw invalid()
            } else {
              user = await tx.usuario.create({ data: {
                nome: (prepared.identity.name ?? prepared.identity.email.split('@')[0]!).slice(0, 120),
                email: prepared.identity.email,
              }, include: { identidadeGoogle: true } })
            }
            await tx.identidadeGoogle.create({ data: { sub: prepared.identity.sub, usuarioId: user.id } })
            return user
          })
        } catch (error) {
          // Duas primeiras entradas podem disputar o índice único; reler com novo snapshot.
          if (attempt < 2 && error && typeof error === 'object' && 'code' in error && error.code === 'P2002') continue
          throw error
        }
      }
    },
  }
}
