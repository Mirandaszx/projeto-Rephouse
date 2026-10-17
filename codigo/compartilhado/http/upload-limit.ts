import type { RequestHandler } from 'express'
import { AppError } from './app-error.js'

export function createUploadLimit(max=2):RequestHandler {
  let active=0
  return(req,res,next)=>{
    if(!req.is('multipart/form-data')){next();return}
    if(active>=max){res.set('Retry-After','1');next(new AppError(429,'UPLOAD_BUSY','Há muitos uploads em andamento. Tente novamente.'));return}
    active++
    let released=false
    const release=()=>{if(!released){released=true;active--}}
    res.locals.releaseUpload=release
    // Desconectar o cliente não cancela uma transação já iniciada no PostgreSQL.
    res.once('finish',release);res.once('close',()=>{if(!res.locals.uploadInProgress)release()})
    next()
  }
}
