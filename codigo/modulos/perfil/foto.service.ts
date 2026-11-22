import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { z } from 'zod'
import type { PrismaClient } from '../../gerado/prisma/client.js'
import { withActor, type Actor } from '../../compartilhado/context.js'
import { AppError } from '../../compartilhado/http/app-error.js'

export const fotoSelect = { hashSha256: true, atualizadaEm: true } as const
export function fotoPublica(foto: { hashSha256: string; atualizadaEm: Date } | null) {
  return foto ? { versao: foto.hashSha256, atualizadaEm: foto.atualizadaEm } : null
}
const coordinate = z.number().int().nonnegative().max(25_000_000)
const cropSchema = z.object({ x: coordinate, y: coordinate, largura: coordinate.positive(), altura: coordinate.positive() }).strict()
function invalid() { return new AppError(400, 'INVALID_IMAGE', 'Envie uma foto JPEG, PNG ou WebP estática válida, até 5 MiB e 25 megapixels, com enquadramento dentro da imagem.') }
function animatedImage(buffer: Buffer) {
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    for (let offset = 12; offset + 8 <= buffer.length;) {
      const chunk = buffer.toString('ascii', offset, offset + 4), size = buffer.readUInt32LE(offset + 4)
      if (chunk === 'ANIM' || chunk === 'ANMF' || (chunk === 'VP8X' && size > 0 && ((buffer[offset + 8] ?? 0) & 2))) return true
      offset += size + 8 + size % 2
    }
    return false
  }
  if (buffer.subarray(1, 4).toString() !== 'PNG') return false
  for (let offset = 8; offset + 12 <= buffer.length;) {
    const length = buffer.readUInt32BE(offset)
    if (buffer.toString('ascii', offset + 4, offset + 8) === 'acTL') return true
    offset += length + 12
  }
  return false
}
export async function preparePhoto(buffer: Buffer, rawCrop: unknown) {
  const crop = cropSchema.parse(rawCrop)
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw invalid()
  const type = await fileTypeFromBuffer(buffer).catch(() => undefined)
  if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type.mime) || animatedImage(buffer)) throw invalid()
  try {
    const image = sharp(buffer, { limitInputPixels: 25_000_000, failOn: 'warning' })
    const meta = await image.metadata()
    if (!meta.width || !meta.height || (meta.pages ?? 1) !== 1) throw invalid()
    // Coordenadas sempre na orientação visual; nunca usar dimensões enviadas pelo cliente.
    const swapped = !!meta.orientation && meta.orientation >= 5
    const width = swapped ? meta.height : meta.width, height = swapped ? meta.width : meta.height
    if (crop.x + crop.largura > width || crop.y + crop.altura > height || Math.abs(crop.largura - crop.altura) > 1) throw invalid()
    const output = await image.autoOrient().extract({ left: crop.x, top: crop.y, width: crop.largura, height: crop.altura })
      .resize(512, 512, { fit: 'cover' }).webp({ quality: 82 }).timeout({ seconds: 5 }).toBuffer()
    if (output.length > 512 * 1024) throw invalid()
    return { conteudo: new Uint8Array(output), mimeType: 'image/webp', tamanho: output.length, hashSha256: createHash('sha256').update(output).digest('hex') }
  } catch (error) { if (error instanceof AppError) throw error; throw invalid() }
}
export function createPhotoService(db: PrismaClient) {
  return {
    save: async (actor: Actor, buffer: Buffer, crop: unknown) => {
      const prepared = await preparePhoto(buffer, crop)
      return withActor(db, actor, async (tx, user) => fotoPublica(await tx.fotoPerfil.upsert({ where: { usuarioId: user.id },
        create: { usuarioId: user.id, ...prepared }, update: { ...prepared, atualizadaEm: new Date() }, select: fotoSelect })))
    },
    remove: (actor: Actor) => withActor(db, actor, async (tx, user) => { await tx.fotoPerfil.deleteMany({ where: { usuarioId: user.id } }) }),
    read: (actor: Actor, id: string) => withActor(db, actor, async (tx, user) => {
      const target = await tx.usuario.findFirst({ where: { id, ativo: true, excluidoEm: null }, select: { id: true } })
      const missing = () => new AppError(404, 'NOT_FOUND', 'Foto indisponível.')
      if (!target) throw missing()
      if (user.id !== id) {
        const own = await tx.membroRepublica.findFirst({ where: { usuarioId: user.id, ativo: true, republica: { ativa: true } } })
        if (!own || !await tx.membroRepublica.findFirst({ where: { usuarioId: id, ativo: true, republicaId: own.republicaId } })) throw missing()
      }
      const photo = await tx.fotoPerfil.findUnique({ where: { usuarioId: id } })
      if (!photo) throw missing()
      return photo
    }),
  }
}
