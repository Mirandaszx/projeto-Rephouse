import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import { hash, argon2id } from 'argon2'
import type { LinkEmail, Prisma, PrismaClient } from '../../gerado/prisma/client.js'
import type { EmailOptions } from '../../infraestrutura/email/resend.js'
import { executarTransacaoAcid } from '../../infraestrutura/banco/transaction.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import type { CadastroInput } from './auth.types.js'

const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const secretPattern = /^[A-Za-z0-9_-]{43}$/
const invalid = () => new AppError(401, 'EMAIL_LINK_INVALID', 'Este link é inválido, expirou ou já foi utilizado. Solicite outro link.')
export const emailPending = { confirmacaoPendente: true, message: 'Se o endereço estiver elegível, enviaremos um link. Confira seu e-mail e a pasta de spam.' } as const
type AccountDetails = { id: string; nome?: string; senha?: string }
export interface EmailConclusao extends AccountDetails { codigo?: string }
export interface EmailProof extends AccountDetails { token: string; codigoAprovacao?: string }
type Purpose = 'cadastro' | 'login'
const codigoHash = (id: string, codigo: string) => digest(`${id}:${codigo}`)

/** Solicitações pendentes não são contas: somente a confirmação cria um usuário NORMAL. */
export function createEmailService(db: PrismaClient, signingSecret: string, options?: EmailOptions) {
  const hashEmailCode = (id: string, codigo: string) => createHmac('sha256', signingSecret).update(`rephouse:email-code:${id}:${codigo}`).digest('hex')
  function emailChallenge(codigoPorEmail: boolean) {
    const id = randomUUID(), token = randomBytes(32).toString('base64url')
    const codigo = String(randomInt(1_000_000)).padStart(6, '0')
    const codigoAprovacaoHash = codigoPorEmail ? hashEmailCode(id, codigo) : codigoHash(id, codigo)
    const response = codigoPorEmail
      ? { ...emailPending, solicitacaoId: id, message: 'Se o endereço estiver elegível, enviaremos um código. Confira seu e-mail e a pasta de spam.' }
      : { ...emailPending, solicitacaoId: id, codigoAprovacao: codigo }
    return { id, token, codigo, codigoAprovacaoHash, response }
  }
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
  async function deliver(to: string, id: string, token: string, purpose: Purpose | 'novaConta', codigo?: string) {
    const config = configured()
    if (codigo !== undefined) {
      const titulo = purpose === 'cadastro' ? 'Confirme seu e-mail' : purpose === 'novaConta' ? 'Crie sua conta' : 'Entre no RepHouse'
      const subject = purpose === 'cadastro' ? 'Seu código de cadastro no RepHouse' : 'Seu código de acesso ao RepHouse'
      const instrucao = 'Digite este código na tela do RepHouse em que você iniciou o pedido.'
      const validade = 'O código vale por 10 minutos e pode ser usado uma única vez. Se você não fez o pedido, ignore esta mensagem.'
      const params = { codigoConfirmacao: codigo, instrucao, titulo }
      await config.send({ id, to, subject,
        text: `${titulo}\n\n${instrucao}\n\n${codigo}\n\n${validade}`,
        html: `<html lang="pt-BR"><body><h1>${titulo}</h1><p>${instrucao}</p><p style="font-size:32px"><strong>${codigo}</strong></p><p>${validade}</p></body></html>`,
        confirmacao: { finalidade: purpose === 'cadastro' ? 'cadastro' : 'login', params },
      })
      return
    }
    const url = new URL('/confirmar-email', config.publicUrl)
    url.hash = new URLSearchParams({ id, token }).toString()
    const title = purpose === 'cadastro' ? 'Confirme seu e-mail no RepHouse' : purpose === 'novaConta' ? 'Crie sua conta no RepHouse' : 'Seu link para entrar no RepHouse'
    const instrucao = `${purpose === 'novaConta' ? 'Ainda não existe uma conta RepHouse com este e-mail. ' : ''}Abra o link para confirmar. Se estiver em outro aparelho, use o código exibido na tela em que iniciou o pedido.`
    const text = `${title}\n\n${instrucao}\n${url.href}\n\nO link vale por 10 minutos e funciona uma única vez. Se não solicitou, ignore esta mensagem.`
    const acao = purpose === 'novaConta' ? 'Criar minha conta no RepHouse' : 'Confirmar e entrar no RepHouse'
    // URL base é configuração validada. Nome e outros textos do usuário não entram no HTML.
    const safeUrl = url.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    await config.send({ id, to, subject: title, text,
      confirmacao: purpose === 'cadastro'
        ? { finalidade: 'cadastro', params: { linkConfirmacao: url.href, instrucao } }
        : { finalidade: 'login', params: {
          linkConfirmacao: url.href,
          titulo: purpose === 'novaConta' ? 'Crie sua conta' : 'Entre no RepHouse',
          instrucao,
          acao: purpose === 'novaConta' ? 'Criar minha conta' : 'Confirmar e entrar',
        } },
      html: `<html lang="pt-BR"><body><h1>${title}</h1><p>${instrucao}</p><p><a href="${safeUrl}">${acao}</a></p><p>Válido por 10 minutos, para uma única utilização. Se não solicitou, ignore esta mensagem.</p></body></html>` })
  }

  async function consume(tx: Prisma.TransactionClient, link: LinkEmail, now: Date, nomeInformado?: string, senhaInformada?: string) {
    const nome = link.nome ?? nomeInformado
    const senha = link.senhaHash ?? senhaInformada
    if (link.finalidade === 'cadastro' && (!nome || !senha)) {
      throw new AppError(400, 'EMAIL_ACCOUNT_DETAILS_REQUIRED', 'Para criar sua conta, informe seu nome e crie uma senha.')
    }
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
  }

  async function approve(tx: Prisma.TransactionClient, link: LinkEmail, expectedHash: string, now: Date) {
    if (!link.codigoAprovacaoHash || link.tentativasAprovacao >= 5) return false
    if (!timingSafeEqual(Buffer.from(link.codigoAprovacaoHash, 'hex'), Buffer.from(expectedHash, 'hex'))) {
      if (!link.aprovadoEm) await tx.linkEmail.update({ where: { id: link.id }, data: { tentativasAprovacao: { increment: 1 } } })
      return false
    }
    if (!link.aprovadoEm) await tx.linkEmail.update({ where: { id: link.id }, data: { aprovadoEm: now } })
    return true
  }

  return {
    enabled: () => !!options,
    async register(input: CadastroInput & { acaoRepublica?: 'criar' | 'entrar'; codigoPorEmail?: boolean }, cookie?: string) {
      configured()
      const senhaHash = await hash(input.senha, { type: argon2id })
      const secret = browserSecret(cookie)
      const codigoPorEmail = input.codigoPorEmail === true
      const { id, token, codigo, codigoAprovacaoHash, response } = emailChallenge(codigoPorEmail)
      const sent = await executarTransacaoAcid(db, async tx => {
        if (await tx.usuario.findUnique({ where: { email: input.email }, select: { id: true } })) {
          throw new AppError(409, 'CONFLICT', 'Já existe uma conta com este e-mail. Entre com sua senha ou solicite um código de acesso.')
        }
        if (!await admit(tx, input.email)) return false
        // Outra pessoa não substitui nome/senha de uma solicitação pendente pelo mesmo e-mail.
        // Link de "entrar por e-mail" sem conta (nome nulo) não bloqueia o cadastro com senha.
        const pending = await tx.linkEmail.findFirst({ where: { email: input.email, finalidade: 'cadastro', nome: { not: null }, consumidoEm: null, expiraEm: { gt: new Date() } } })
        if (pending) return false
        const now = new Date()
        await tx.linkEmail.create({ data: { id, email: input.email, finalidade: 'cadastro', tokenHash: digest(token), cookieHash: digest(secret), codigoAprovacaoHash,
          nome: input.nome, senhaHash, acaoRepublica: input.acaoRepublica ?? 'criar', criadoEm: now, expiraEm: new Date(now.getTime() + 600_000) } })
        return true
      })
      if (sent) await deliver(input.email, id, token, 'cadastro', codigoPorEmail ? codigo : undefined)
      return { secret, response }
    },
    async request(email: string, finalidade: Purpose, cookie?: string, codigoPorEmail = false) {
      configured()
      const secret = browserSecret(cookie)
      const { id, token, codigo, codigoAprovacaoHash, response } = emailChallenge(codigoPorEmail)
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
            tokenHash: digest(token), cookieHash, codigoAprovacaoHash, criadoEm: now, expiraEm: new Date(now.getTime() + 600_000) }
        } else {
          const user = await tx.usuario.findUnique({ where: { email } })
          if (!user) {
            // Entrar por link com e-mail sem conta (26/11/2026): o mesmo link cria a conta, sem senha, e o nome é pedido
            // na confirmação. A resposta é a mesma de quem tem conta, então a tela não revela quem usa o RepHouse.
            // Não toca em cadastros pendentes de outro navegador: só substitui links anteriores deste mesmo tipo.
            await tx.linkEmail.updateMany({ where: { email, finalidade: 'cadastro', nome: null, consumidoEm: null }, data: { consumidoEm: now } })
            await tx.linkEmail.create({ data: { id, email, finalidade: 'cadastro', tokenHash: digest(token), cookieHash, codigoAprovacaoHash, criadoEm: now, expiraEm: new Date(now.getTime() + 600_000) } })
            return 'cadastro' as const
          }
          if (!user.ativo || user.excluidoEm) return false
          data = { id, email, finalidade, usuarioId: user.id, versaoToken: user.versaoToken, tokenHash: digest(token), cookieHash,
            codigoAprovacaoHash, criadoEm: now, expiraEm: new Date(now.getTime() + 600_000) }
        }
        await tx.linkEmail.updateMany({ where: { email, finalidade, consumidoEm: null }, data: { consumidoEm: now } })
        await tx.linkEmail.create({ data })
        return finalidade
      })
      if (sent) await deliver(email, id, token, sent === 'cadastro' && finalidade === 'login' ? 'novaConta' : sent, codigoPorEmail ? codigo : undefined)
      return { secret, response }
    },
    async confirm(proof: EmailProof, cookie?: string) {
      configured()
      if (!secretPattern.test(proof.token)) throw invalid()
      const cookieHash = cookie && secretPattern.test(cookie) ? digest(cookie) : undefined
      const novaSenha = proof.codigoAprovacao === undefined && proof.senha ? await hash(proof.senha, { type: argon2id }) : undefined
      const result = await executarTransacaoAcid(db, async tx => {
        const now = new Date()
        const link = await tx.linkEmail.findFirst({ where: { id: proof.id, tokenHash: digest(proof.token),
          consumidoEm: null, expiraEm: { gt: now } } })
        if (!link) throw invalid()
        if (proof.codigoAprovacao !== undefined) {
          return await approve(tx, link, codigoHash(link.id, proof.codigoAprovacao), now)
            ? { aprovadoEmOutroDispositivo: true } as const : { codigoInvalido: true } as const
        }
        if (link.cookieHash !== cookieHash) {
          if (!link.codigoAprovacaoHash) throw invalid()
          throw new AppError(400, 'EMAIL_APPROVAL_REQUIRED', 'Digite o código exibido no aparelho que iniciou o pedido.')
        }
        return consume(tx, link, now, proof.nome, novaSenha)
      })
      // O limite por link precisa ser persistido antes de responder com erro.
      if ('codigoInvalido' in result) throw new AppError(400, 'EMAIL_APPROVAL_INVALID', 'Código inválido. Confira o código no aparelho que iniciou o pedido ou solicite outro link.')
      return result
    },
    async conclude(proof: EmailConclusao, cookie?: string) {
      configured()
      if (!cookie || !secretPattern.test(cookie)) throw invalid()
      const novaSenha = proof.senha ? await hash(proof.senha, { type: argon2id }) : undefined
      const result = await executarTransacaoAcid(db, async tx => {
        const now = new Date()
        const link = await tx.linkEmail.findFirst({ where: { id: proof.id, cookieHash: digest(cookie),
          consumidoEm: null, expiraEm: { gt: now } } })
        if (proof.codigo !== undefined) {
          if (!link || link.tentativasAprovacao >= 5) return { codigoInvalido: 'indisponivel' } as const
          if (!await approve(tx, link, hashEmailCode(link.id, proof.codigo), now)) return { codigoInvalido: 'incorreto' } as const
          // Cadastro iniciado pelo acesso por e-mail ainda precisa dos dados da conta.
          // Grave a verificação agora para que a pessoa só digite o código uma vez.
          if (link.finalidade === 'cadastro' && !link.nome && (!proof.nome || !novaSenha)) return { precisaCompletarCadastro: true } as const
        } else if (!link?.aprovadoEm) return null
        return consume(tx, link, now, proof.nome, novaSenha)
      })
      if (result && 'codigoInvalido' in result) {
        const message = result.codigoInvalido === 'incorreto'
          ? 'Código incorreto. Confira os seis dígitos no e-mail e tente novamente.'
          : 'Este código não está mais disponível. Solicite um novo código.'
        throw new AppError(400, 'EMAIL_CODE_INVALID', message)
      }
      if (result && 'precisaCompletarCadastro' in result) {
        throw new AppError(400, 'EMAIL_ACCOUNT_DETAILS_REQUIRED', 'Para criar sua conta, informe seu nome e crie uma senha.')
      }
      return result
    },
  }
}
