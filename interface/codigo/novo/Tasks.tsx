import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, ClipboardCheck, Plus, UserRound } from 'lucide-react'
import { SegmentedControl } from 'glisse'
import { request } from '../api'
import { GlisseButton } from '../rebuild/GlisseButton'
import { AnimatedField, DateField } from '../rebuild/Fields'
import FilterCombobox from '../rebuild/FilterCombobox'
import { SpellTaskCheckbox } from './SpellTaskCheckbox'
import { AnimatedList } from './UnlumenTaskList'
import './tasks.css'

type Status = 'ABERTA' | 'CONCLUIDA'
type Filter = 'todas' | Status
type Task = { id: string; titulo: string; descricao?: string | null; prazo?: string | null; status: Status; responsavelId: string }
type Member = { id: string; usuario: { nome: string } }
type Props = { token: string; members: Member[]; memberId?: string; canManage: boolean; onExpired: (error: unknown) => boolean }

const filters = [
  { value: 'todas', label: 'Todas' },
  { value: 'ABERTA', label: 'Abertas' },
  { value: 'CONCLUIDA', label: 'Concluídas' },
]
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
const formatDue = (date: string) => dateFormat.format(new Date(date.slice(0, 10) + 'T00:00:00Z'))

export default function Tasks({ token, members, memberId, canManage, onExpired }: Props) {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [filter, setFilter] = useState<Filter>('todas')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [responsible, setResponsible] = useState('')
  const [formRevision, setFormRevision] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const saving = useRef(false)

  useEffect(() => {
    let active = true
    request<Task[]>('/tarefas', token).then(items => {
      if (active) setTasks(items)
    }).catch((failure: unknown) => {
      if (active && !onExpired(failure)) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar as tarefas.')
    })
    return () => { active = false }
  }, [token, revision, onExpired])

  async function changeStatus(task: Task, checked: boolean) {
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const status: Status = checked ? 'CONCLUIDA' : 'ABERTA'
      const response = await fetch('/api/tarefas/' + encodeURIComponent(task.id), {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result) throw Object.assign(new Error(result?.error?.message || 'Não foi possível atualizar a tarefa.'), { status: response.status })
      setTasks(current => current?.map(item => item.id === task.id ? { ...item, status } : item) ?? null)
      setNotice(checked ? 'Tarefa concluída.' : 'Tarefa reaberta.')
    } catch (failure) {
      if (!onExpired(failure)) setError(failure instanceof Error ? failure.message : 'Não foi possível atualizar a tarefa.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving.current) return
    const form = event.currentTarget
    const values = new FormData(form)
    const titulo = String(values.get('titulo') ?? '').trim()
    if (!titulo) {
      setFormError('Dê um nome à tarefa.')
      return
    }
    const responsavelId = String(values.get('responsavelId') ?? '')
    if (!responsavelId) {
      setFormError('Selecione quem vai fazer a tarefa.')
      return
    }
    const descricao = String(values.get('descricao') ?? '').trim()
    const prazo = String(values.get('prazo') ?? '')
    saving.current = true
    setBusy(true)
    setFormError('')
    try {
      const created = await request<Task>('/tarefas', token, { titulo, responsavelId, ...(descricao ? { descricao } : {}), ...(prazo ? { prazo } : {}) })
      setTasks(current => [created, ...(current ?? [])])
      setFilter('todas')
      setNotice('Tarefa criada.')
      form.reset()
      dialog.current?.close()
    } catch (failure) {
      if (!onExpired(failure)) setFormError(failure instanceof Error ? failure.message : 'Não foi possível criar a tarefa.')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  const items = tasks ?? []
  const completed = items.filter(item => item.status === 'CONCLUIDA').length
  const visible = items.filter(item => filter === 'todas' || item.status === filter)

  return <section className="rep-tasks" aria-labelledby="rep-tasks-label">
    <div className="rep-tasks-head">
      <div className="rep-tasks-heading">
        <span className="rep-task-symbol" aria-hidden="true"><ClipboardCheck size={21} /></span>
        <div><h2 id="rep-tasks-label">Rotina compartilhada</h2><p>{tasks ? `${items.length - completed} abertas · ${completed} concluídas` : 'Organize os afazeres da casa.'}</p></div>
      </div>
      {canManage && members.length > 0 && <GlisseButton disabled={busy || !tasks} onClick={() => { setFormError(''); setResponsible(''); setFormRevision(value => value + 1); dialog.current?.showModal() }} icon={<Plus size={16} aria-hidden="true" />}>Nova tarefa</GlisseButton>}
    </div>
    <div className="rep-tasks-filter"><SegmentedControl aria-label="Filtrar tarefas" value={filter} items={filters} onValueChange={value => setFilter(value as Filter)} /></div>
    {error && <div className="rep-task-state"><p role="alert">{error}</p>{!tasks && <GlisseButton variant="secondary" onClick={() => { setError(''); setRevision(value => value + 1) }}>Tentar novamente</GlisseButton>}</div>}
    {notice && <p className="rep-task-feedback" role="status">{notice}</p>}
    {!tasks && !error && <p className="rep-task-state" role="status">Carregando tarefas…</p>}
    {tasks && visible.length === 0 && <p className="rep-task-state">{items.length ? 'Nenhuma tarefa neste filtro.' : 'Nenhuma tarefa cadastrada na casa.'}</p>}
    {tasks && <AnimatedList items={visible} maxVisible={items.length} gap={8} className="rep-task-list" renderItem={task => {
      const checked = task.status === 'CONCLUIDA'
      const canToggle = canManage || (!checked && memberId === task.responsavelId)
      const person = members.find(member => member.id === task.responsavelId)
      return <div className="rep-task-row">
        <div>
          <SpellTaskCheckbox title={task.titulo} checked={checked} disabled={busy || !canToggle} onCheckedChange={next => void changeStatus(task, next)} />
          {task.descricao && <p className="rep-task-description">{task.descricao}</p>}
          <div className="rep-task-meta">
            {person && <span><UserRound size={14} aria-hidden="true" />{person.usuario.nome}</span>}
            {task.prazo && <span><CalendarDays size={14} aria-hidden="true" /><time dateTime={task.prazo.slice(0, 10)}>{formatDue(task.prazo)}</time></span>}
          </div>
        </div>
        <span className="rep-task-status" data-done={checked}>{checked ? 'Concluída' : 'Aberta'}</span>
      </div>
    }} />}
    <dialog ref={dialog} className="rep-dialog rep-task-dialog" aria-labelledby="rep-task-dialog-title" onCancel={event => { if (busy) event.preventDefault() }}>
      <form key={formRevision} onSubmit={createTask}>
        <h2 id="rep-task-dialog-title">Nova tarefa</h2>
        <fieldset className="rep-form-fields" disabled={busy}>
          <AnimatedField label="Título" name="titulo" required maxLength={160} />
          <div><p>Responsável</p><FilterCombobox value={responsible} onChange={setResponsible} label="Selecionar responsável" items={members.map(member => ({ value: member.id, label: member.usuario.nome }))} /><input type="hidden" name="responsavelId" value={responsible} /></div>
          <DateField label="Prazo opcional" name="prazo" />
          <label>Descrição opcional<textarea name="descricao" rows={3} maxLength={5000} /></label>
        </fieldset>
        {formError && <p role="alert">{formError}</p>}
        <footer><GlisseButton variant="secondary" disabled={busy} onClick={() => dialog.current?.close()}>Cancelar</GlisseButton><GlisseButton type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Criar tarefa'}</GlisseButton></footer>
      </form>
    </dialog>
  </section>
}
