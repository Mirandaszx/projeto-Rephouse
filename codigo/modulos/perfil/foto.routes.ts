import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import type { RequestHandler } from 'express'
import type { PrismaClient } from '../../gerado/prisma/client.js'
import { createUploadLimit } from '../../compartilhado/http/upload-limit.js'
import { AppError } from '../../compartilhado/http/app-error.js'
import { createPhotoService } from './foto.service.js'

export function createPhotoRouter(db: PrismaClient, activeSession: RequestHandler) {
  const router = Router(), service = createPhotoService(db)
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 2048, parts: 2 } })
  router.post('/me/foto', activeSession, createUploadLimit(), (req, res, next) => {
    upload.single('imagem')(req, res, error => {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'LIMIT_FILE_SIZE', 'A foto deve ter no máximo 5 MiB.'))
      next(error)
    })
  }, async (req, res) => {
    res.locals.uploadInProgress = true
    try {
      if (!req.file || typeof req.body.recorte !== 'string') throw new AppError(400, 'INVALID_IMAGE', 'Selecione uma foto e confirme seu enquadramento.')
      let crop: unknown
      try { crop = JSON.parse(req.body.recorte) } catch { throw new AppError(400, 'VALIDATION_ERROR', 'Enquadramento inválido.') }
      res.json(await service.save(res.locals.actor, req.file.buffer, crop))
    } finally { res.locals.releaseUpload?.() }
  })
  router.delete('/me/foto', async (_req, res) => { await service.remove(res.locals.actor); res.sendStatus(204) })
  router.get('/usuarios/:id/foto', async (req, res) => {
    const photo = await service.read(res.locals.actor, z.uuid().parse(req.params.id))
    res.set({ 'Content-Type': photo.mimeType, 'Content-Length': String(photo.tamanho), 'Cache-Control': 'no-store', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff' }).send(Buffer.from(photo.conteudo))
  })
  return router
}
