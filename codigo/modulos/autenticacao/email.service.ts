import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { hash, argon2id } from 'argon2'
import type { Prisma, PrismaClient } from '../../gerado/prisma/client.js'
import type { EmailOptions } from '../../infraestrutura/email/resend.js'
import { executarTransacaoAcid } from '../../infraestrutura/banco/transaction.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import type { CadastroInput } from './auth.types.js'

const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const secretPattern = /^[A-Za-z0-9_-]{43}$/
const invalid = () => new AppError(401, 'EMAIL_LINK_INVALID', 'Este link é inválido, expirou ou já foi utilizado. Solicite outro no mesmo navegador.')
export const emailPending = { confirmacaoPendente: true, message: 'Se o endereço estiver elegível, enviaremos um link. Confira seu e-mail e a pasta de spam.' } as const
export interface EmailProof { id: string; token: string; nome?: string; senha?: string }
type Purpose = 'cadastro' | 'login'

/** Solicitações pendentes não são contas: somente a confirmação cria um usuário NORMAL. */
export function createEmailService(db: PrismaClient, options?: EmailOptions) {
  function configured(): EmailOptions {
    if (!options) throw new AppError(503, 'EMAIL_DISABLED', 'O envio de e-mails ainda não foi configurado. Contas existentes podem entrar com senha.')
    return options
  }
  function browserSecret(cookie?: string) { return cookie && secretPattern.test(cookie) ? cookie : randomBytes(32).toString('base64url') }
  async function admit(tx: Prisma.TransactionClient, email: string): Promise<boolean> {
    const rows = await tx.$queryRaw<{ email_hash: string }[]>`
      INSERT INTO limites_envio_email(email_hash,janela_inicio,ultimo_envio,quantidade)
      VALUES(${digest(email)},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,1)
      ON CONFLICT(email_hash) DO UPDATE SET
        janela_inicio=CASE WHEN limites_envio_email.janela_inicio <= CURRENT_TIMESTAMP-interval '15 minutes' THEN CURRENT_TIMESTAMP ELSE limites_envio_email.janela_inicio END,
        ultimo_envio=CURRENT_TIMESTAMP,
        quantidade=CASE WHEN limites_envio_email.janela_inicio <= CURRENT_TIMESTAMP-interval '15 minutes' THEN 1 ELSE limites_envio_email.quantidade+1 END
      WHERE limites_envio_email.janela_inicio <= CURRENT_TIMESTAMP-interval '15 minutes'
        OR (limites_envio_email.ultimo_envio <= CURRENT_TIMESTAMP-interval '60 seconds' AND limites_envio_email.quantidade<3)
      RETURNING email_hash`
    return rows.length === 1
  }
  async function deliver(to: string, id: string, token: string, purpose: Purpose | 'novaConta') {
    const config = configured(), url = new URL('/confirmar-email', config.publicUrl)
    url.hash = new URLSearchParams({ id, token }).toString()
    const title = purpose === 'cadastro' ? 'Confirme seu e-mail no RepHouse' : purpose === 'novaConta' ? 'Crie sua conta no RepHouse' : 'Seu link para entrar no RepHouse'
    const lead = purpose === 'novaConta' ? 'Ainda não existe uma conta RepHouse com este e-mail. Abra o link no mesmo navegador em que fez a solicitação para criá-la:' : 'Abra o link no mesmo navegador em que fez a solicitação e confirme o acesso:'
    const text = `${title}\n\n${lead}\n${url.href}\n\nO link vale por 10 minutos e funciona uma única vez. Se não solicitou, ignore esta mensagem.`
    const instrucao = `${purpose === 'novaConta' ? 'Ainda não existe uma conta RepHouse com este e-mail. ' : ''}Abra no mesmo navegador em que fez a solicitação.`
    const acao = purpose === 'novaConta' ? 'Criar minha conta no RepHouse' : 'Confirmar e entrar no RepHouse'
    // URL base é configuração validada. Nome e outros textos do usuário não entram no HTML.
    const safeUrl = url.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    await config.send({ id, to, subject: title, text,
      confirmacao: purpose === 'cadastro'
        ? { finalidade: 'cadastro', params: { linkConfirmacao: url.href } }
        : { finalidade: 'login', params: {
          linkConfirmacao: url.href,
          titulo: purpose === 'novaConta' ? 'Crie sua conta' : 'Entre no RepHouse',
          instrucao,
          acao: purpose === 'novaConta' ? 'Criar minha conta' : 'Confirmar e entrar',
        } },
      html: `<html lang="pt-BR"><body><h1>${title}</h1><p>${instrucao}</p><p><a href="${safeUrl}">${acao}</a></p><p>Válido por 10 minutos, para uma única utilização. Se não solicitou, ignore esta mensagem.</p></body></html>` })
  }
  return {
    enabled: () => !!options,
    async register(input: CadastroInput & { acaoRepublica?: 'criar' | 'entrar' }, cookie?: string) {
      configured()
      const senhaHash = await hash(input.senha, { type: argon2id })
      const secret = browserSecret(cookie), id = randomUUID(), token = randomBytes(32).toString('base64url')
      const sent = await executarTransacaoAcid(db, async tx => {
        if (await tx.usuario.findUnique({ where: { email: input.email }, select: { id: true } })) {
          throw new AppError(409, 'CONFLICT', 'Já existe uma conta com este e-mail. Entre na conta ou solicite um link de acesso.')
        }
        if (!await admit(tx, input.email)) return false
        // Outra pessoa não substitui nome/senha de uma solicitação pendente pelo mesmo e-mail.
        // Link de "entrar por e-mail" sem conta (nome nulo) não bloqueia o cadastro com senha.
        const pending = await tx.linkEmail.findFirst({ where: { email: input.email, finalidade: 'cadastro', nome: { not: null }, consumidoEm: null, expiraEm: { gt: new Date() } } })
        if (pending) return false
        const now = new Date()
        await tx.linkEmail.create({ data: { id, email: input.email, finalidade: 'cadastro', tokenHash: digest(token), cookieHash: digest(secret),
          nome: input.nome, senhaHash, acaoRepublica: input.acaoRepublica ?? 'criar', criadoEm: now, expiraEm: new Date(now.getTime() + 600_000) } })
        return true
      })
      if (sent) await deliver(input.email, id, token, 'cadastro')
      return { secret, response: emailPending }
    },
    async request(email: string, finalidade: Purpose, cookie?: string) {
      configured()
      const secret = browserSecret(cookie), id = randomUUID(), token = randomBytes(32).toString('base64url')
      const sent = await executarTransacaoAcid(db, async tx => {
        if (!await admit(tx, email)) return false
        const now = new Date(), cookieHash = digest(secret)
        let data: Prisma.LinkEmailUncheckedCreateInput
        if (finalidade === 'cadastro') {
          // Reenvio da confirmação só pode ser solicitado pelo navegador do cadastro original.
          const pending = await tx.linkEmail.findFirst({ where: { email, finalidade, nome: { not: null }, consumidoEm: null,
            criadoEm: { gt: new Date(now.getTime() - 86_400_000) } }, orderBy: [{ criadoEm: 'desc' }, { id: 'asc' }] })
          if (!pending || pending.cookieHash !== cookieHash || await tx.usuario.findUnique({ where: { email }, select: { id: true } })) return false
          data = { id, email, finalidade, nome: pending.nome, senhaHash: pending.senhaHash, acaoRepublica: pending.acaoRepublica,
            tokenHash: digest(token), cookieHash, criadoEm: now, expiraEm: new Date(now.getTime() + 600_000) }
        } else {
          const user = await tx.usuario.findUnique({ where: { email } })
          if (!user) {
            // Entrar por link com e-mail sem conta (26/11/2026): o mesmo link cria a conta, sem senha, e o nome é pedido
            // na confirmação. A resposta é a mesma de quem tem conta, então a tela não revela quem usa o RepHouse.
            // Não toca em cadastros pendentes de outro navegador: só substitui links anteriores deste mesmo tipo.
            await tx.linkEmail.updateMany({ where: { email, finalidade: 'cadastro', nome: null, consumidoEm: null }, data: { consumidoEm: now } })
            await tx.linkEmail.create({ data: { id, email, finalidade: 'cadastro', tokenHash: digest(token), cookieHash, criadoEm: now, expiraEm: new Date(now.getTime() + 600_000) } })
            return 'cadastro' as const
          }
          if (!user.ativo || user.excluidoEm) return false
          data = { id, email, finalidade, usuarioId: user.id, versaoToken: user.versaoToken, tokenHash: digest(token), cookieHash,
            criadoEm: now, expiraEm: new Date(now.getTime() + 600_000) }
        }
        await tx.linkEmail.updateMany({ where: { email, finalidade, consumidoEm: null }, data: { consumidoEm: now } })
        await tx.linkEmail.create({ data })
        return finalidade
      })
      if (sent) await deliver(email, id, token, sent === 'cadastro' && finalidade === 'login' ? 'novaConta' : sent)
      return { secret, response: emailPending }
    },
    async confirm(proof: EmailProof, cookie?: string) {
      configured()
      if (!cookie || !secretPattern.test(cookie) || !secretPattern.test(proof.token)) throw invalid()
      // Hash fora da transação (Argon2 é lento); só é usado se o link for de conta nova sem senha.
      const novaSenha = proof.senha ? await hash(proof.senha, { type: argon2id }) : undefined
      return executarTransacaoAcid(db, async tx => {
        const now = new Date()
        const link = await tx.linkEmail.findFirst({ where: { id: proof.id, tokenHash: digest(proof.token), cookieHash: digest(cookie),
          consumidoEm: null, expiraEm: { gt: now } } })
        if (!link) throw invalid()
        // Conta nova pelo "entrar por e-mail": o link é válido, mas faltam nome e senha. Nada é consumido; a tela pede os
        // dois. A senha mantém a regra do banco de que toda conta tem um meio de acesso (senha ou Google).
        const nome = link.nome ?? proof.nome
        const senha = link.senhaHash ?? novaSenha
        if (link.finalidade === 'cadastro' && (!nome || !senha)) throw new AppError(400, 'EMAIL_ACCOUNT_DETAILS_REQUIRED', 'Para criar sua conta, informe seu nome e crie uma senha.')
        const claimed = await tx.linkEmail.updateMany({ where: { id: link.id, consumidoEm: null, expiraEm: { gt: now } }, data: { consumidoEm: now } })
        if (claimed.count !== 1) throw invalid()
        let user
        if (link.finalidade === 'cadastro') {
          if (await tx.usuario.findUnique({ where: { email: link.email }, select: { id: true } })) throw invalid()
          user = await tx.usuario.create({ data: { email: link.email, nome: nome!, senhaHash: senha! } })
        } else {
          user = await tx.usuario.findUnique({ where: { id: link.usuarioId! } })
          if (!user || user.email !== link.email || !user.ativo || user.excluidoEm || user.versaoToken !== link.versaoToken) throw invalid()
        }
        await tx.emailVerificado.upsert({ where: { usuarioId: user.id }, create: { usuarioId: user.id }, update: {} })
        return { user, acaoRepublica: link.finalidade === 'cadastro' ? link.acaoRepublica : null }
      })
    },
  }
}
