import { useEffect, useState } from 'react'
import { acquirePhoto, type PhotoMetadata } from './photo-cache'
import './profile.css'

export default function PhotoAvatar({ name, userId, token, photo, context = '', className = 'workspace-person-mark' }: {
  name: string; userId?: string; token?: string; photo?: PhotoMetadata | null; context?: string; className?: string
}) {
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null)
  const [failed, setFailed] = useState('')
  const key = token && userId && photo ? `${token}:${context}:${userId}:${photo.versao}` : ''
  useEffect(() => {
    if (!key || !userId || !token) return
    let active = true
    const item = acquirePhoto(key, userId, token)
    void item.promise.then(url => { if (active) setLoaded({ key, url }) }).catch(() => { if (active) setFailed(key) })
    return () => { active = false; item.release() }
  }, [key, userId, token])
  const initials = name.trim().split(/\s+/u).slice(0,2).map(part => Array.from(part)[0] ?? '').join('').toLocaleUpperCase('pt-BR')
  return <span className={`${className} profile-avatar`} aria-hidden="true" data-avatar-user={userId}>
    {initials || '·'}{loaded?.key === key && failed !== key && <img src={loaded.url} alt="" onError={() => setFailed(key)} />}
  </span>
}
