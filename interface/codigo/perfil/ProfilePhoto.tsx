import { useEffect, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { apiRequest } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import ActionDialog from '../gestao/ActionDialog'
import ErrorNotice from '../interno/ErrorNotice'
import type { Feedback } from '../interno/feedback'
import { errorFeedback } from '../gestao/types'
import type { Account } from '../gestao/types'
import PhotoAvatar from './PhotoAvatar'

async function preview(file: File) {
  if (!file.size || file.size > 5 * 1024 * 1024) throw Error('Selecione uma foto de até 5 MiB.')
  const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer)
  const text = (offset: number, count: number) => new TextDecoder().decode(bytes.subarray(offset,offset+count))
  const jpeg = bytes[0] === 255 && bytes[1] === 216
  const png = text(1,3) === 'PNG', webp = text(0,4) === 'RIFF' && text(8,4) === 'WEBP'
  if (!jpeg && !png && !webp) throw Error('Envie JPEG, PNG ou WebP estático. SVG e GIF não são aceitos.')
  for (let offset = png ? 8 : webp ? 12 : bytes.length; offset + 8 <= bytes.length;) {
    const size = view.getUint32(offset + (png ? 0 : 4), !png)
    const chunk = text(offset + (png ? 4 : 0), 4)
    if (chunk === 'acTL' || chunk === 'ANIM' || chunk === 'ANMF') throw Error('Escolha uma foto estática, sem animação.')
    offset += png ? size + 12 : size + 8 + (size % 2)
  }
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { throw Error('Não foi possível abrir essa imagem. Escolha outra foto.') }
  const pixels = bitmap.width * bitmap.height; bitmap.close()
  if (pixels > 25_000_000) throw Error('A foto deve ter até 25 megapixels. Reduza a resolução e tente novamente.')
  return URL.createObjectURL(file)
}

export default function ProfilePhoto({ account, token, onChanged }: { account: Account; token: string; onChanged: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const section = useRef<HTMLElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const removed = useRef(false)
  const pending = useRef(false)
  const mounted = useRef(true)
  const [selection, setSelection] = useState<{ file: File; url: string } | null>(null)
  const [reading, setReading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<Feedback>('')
  const [notice, setNotice] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const area = useRef<Area | null>(null)
  const supported = account.foto !== undefined
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => () => { if (selection) URL.revokeObjectURL(selection.url) }, [selection])
  function changed(message: string) { setNotice(message); onChanged() }
  function restoreFocus(primary = false) {
    const target = !primary && opener.current?.isConnected && !opener.current.disabled ? opener.current : section.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    target?.focus({ preventScroll: true })
  }
  return <section ref={section} className="rep-management-card profile-photo-section" aria-labelledby="profile-photo-title">
    <PhotoAvatar name={account.nome} userId={account.id} photo={account.foto} token={token} context={account.membro?.republicaId} className="profile-photo-large" />
    <div className="profile-photo-controls"><h2 id="profile-photo-title">Foto de perfil</h2><p>Visível aos moradores da sua república.</p>
      <p id="photo-formats" className="rep-management-note">Foto de até 5 MB, em JPG, PNG ou WebP.</p>
      {!supported && <p className="rep-management-note">Envio de foto indisponível nesta versão da API.</p>}
      <div className="rep-management-actions"><GlisseButton disabled={reading || !supported} aria-describedby="photo-formats" onClick={event => { opener.current = event.currentTarget; input.current?.click() }}>{reading ? 'Abrindo foto…' : account.foto ? 'Trocar foto' : 'Adicionar foto'}</GlisseButton>
        {account.foto && <GlisseButton variant="secondary" disabled={reading} onClick={event => { opener.current = event.currentTarget; removed.current = false; setRemoving(true) }}>Remover foto</GlisseButton>}</div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Escolher foto de perfil" onChange={event => {
        const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''
        if (!file || pending.current || !supported) return
        pending.current = true; setReading(true); setError(''); setNotice('')
        void preview(file).then(url => {
          if (!mounted.current) { URL.revokeObjectURL(url); return }
          area.current = null; setCrop({ x: 0, y: 0 }); setZoom(1); setSelection({ file, url })
        }).catch(failure => { if (mounted.current) setError(errorFeedback(failure)) }).finally(() => { pending.current = false; if (mounted.current) setReading(false) })
      }} />
      {error && <ErrorNotice error={error} />}{notice && <p role="status">{notice}</p>}
    </div>
    {selection && <ActionDialog title="Ajustar foto de perfil" confirm="Salvar foto" onClose={() => { setSelection(null); restoreFocus() }} onSubmit={async () => {
      if (!area.current) throw Error('Aguarde a prévia da foto carregar.')
      const body = new FormData(); body.set('imagem', selection.file)
      body.set('recorte', JSON.stringify({ x: area.current.x, y: area.current.y, largura: area.current.width, altura: area.current.height }))
      await apiRequest('POST', '/me/foto', token, body)
      changed('Foto atualizada.')
    }}>
      <p id="photo-crop-help">Arraste para enquadrar. Pelo teclado, use as setas na imagem e no controle de zoom.</p>
      <div className="profile-crop" role="group" aria-label="Enquadramento da foto" aria-describedby="photo-crop-help">
        <Cropper image={selection.url} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_percent, pixels) => { area.current = pixels }} cropperProps={{ 'aria-label': 'Posicionar foto' }} />
      </div>
      <label>Zoom da foto<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
    </ActionDialog>}
    {removing && <ActionDialog title="Remover foto de perfil" confirm="Remover foto" onClose={() => { setRemoving(false); restoreFocus(removed.current) }} onSubmit={async () => { await apiRequest('DELETE','/me/foto',token); removed.current = true; changed('Foto removida.') }}><p>A foto será removida e suas iniciais voltarão a aparecer.</p></ActionDialog>}
  </section>
}
