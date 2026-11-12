import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, ClipboardCheck, Plus, UserRound } from 'lucide-react'
import { SegmentedControl } from 'glisse'
import { apiRequest, request } from '../api'
import ActionDialog from '../gestao/ActionDialog'
import { GlisseButton } from '../rebuild/GlisseButton'
import { AnimatedField, DateField } from '../rebuild/Fields'
import FilterCombobox from '../rebuild/FilterCombobox'
import { SpellTaskCheckbox } from './SpellTaskCheckbox'
import { Badge, EmptyState } from '../interno/WorkspaceUI'
import { brasilDay } from '../interno/presentation'
import { useWorkspaceTransition } from '../interno/useWorkspaceTransition'
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
  const results = useWorkspaceTransition(filter)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [responsible, setResponsible] = useState('')
  const [formRevision, setFormRevision] = useState(0)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
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
      await apiRequest('PATCH', '/tarefas/' + encodeURIComponent(task.id), token, { status })
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
  const today = brasilDay()

  return <section className="rep-tasks" aria-labelledby="rep-tasks-label">
    <div className="rep-tasks-head">
      <div className="rep-tasks-heading">
        <span className="rep-task-symbol" aria-hidden="true"><ClipboardCheck size={21} /></span>
        <div><h2 id="rep-tasks-label">Rotina compartilhada</h2><p>{tasks ? `${items.length - completed} ${items.length - completed === 1 ? 'aberta' : 'abertas'} · ${completed} ${completed === 1 ? 'concluída' : 'concluídas'}` : 'Organize os afazeres da casa.'}</p></div>
      </div>
      {canManage && members.length > 0 && <GlisseButton disabled={busy || !tasks} onClick={() => { setFormError(''); setResponsible(''); setFormRevision(value => value + 1); dialog.current?.showModal() }} icon={<Plus size={16} aria-hidden="true" />}>Nova tarefa</GlisseButton>}
    </div>
    <div className="rep-tasks-filter"><SegmentedControl aria-label="Filtrar tarefas" value={filter} items={filters} onValueChange={value => setFilter(value as Filter)} /></div>
    {error && <div className="rep-task-state"><p role="alert">{error}</p>{!tasks && <GlisseButton variant="secondary" onClick={() => { setError(''); setRevision(value => value + 1) }}>Tentar novamente</GlisseButton>}</div>}
    {notice && <p className="rep-task-feedback" role="status">{notice}</p>}
    {!tasks && !error && <p className="rep-task-state" role="status">Carregando tarefas…</p>}
    <div ref={results} className="workspace-results">
    {tasks && visible.length === 0 && <EmptyState title={items.length ? 'Nenhuma tarefa neste filtro.' : 'Nenhuma tarefa cadastrada na casa.'} />}
    {tasks && <ul className="rep-task-list">{visible.map(task => {
      const checked = task.status === 'CONCLUIDA'
      const canToggle = canManage || (!checked && memberId === task.responsavelId)
      const person = members.find(member => member.id === task.responsavelId)
      const overdue = !checked && Boolean(task.prazo && task.prazo.slice(0, 10) < today)
      return <li className="rep-task-row" key={task.id}>
        <div>
          <SpellTaskCheckbox title={task.titulo} checked={checked} disabled={busy || !canToggle} onCheckedChange={next => void changeStatus(task, next)} />
          {task.descricao && <p className="rep-task-description">{task.descricao}</p>}
          <div className="rep-task-meta">
            {person && <span><UserRound size={14} aria-hidden="true" />{person.usuario.nome}</span>}
            {task.prazo && <span><CalendarDays size={14} aria-hidden="true" /><time dateTime={task.prazo.slice(0, 10)}>{formatDue(task.prazo)}</time></span>}
          </div>
        </div>
        <div className="rep-task-actions"><Badge tone={checked ? 'success' : overdue ? 'danger' : 'warning'}>{checked ? 'Concluída' : overdue ? 'Em atraso' : 'Aberta'}</Badge>{canManage && <GlisseButton variant="secondary" disabled={busy} aria-label={`Editar tarefa ${task.titulo}`} onClick={() => setEditingTask(task)}>Editar</GlisseButton>}</div>
      </li>
    })}</ul>}
    </div>
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
    {editingTask && <ActionDialog title="Editar tarefa" confirm="Salvar tarefa" onClose={() => setEditingTask(null)} onSubmit={async data => {
      const updated = await apiRequest<Task>('PATCH', `/tarefas/${editingTask.id}`, token, {
        titulo: String(data.get('titulo')).trim(), responsavelId: String(data.get('responsavelId')),
        descricao: String(data.get('descricao')).trim(), prazo: String(data.get('prazo')) || null,
      })
      setTasks(current => current?.map(task => task.id === updated.id ? updated : task) ?? null)
      setNotice('Tarefa atualizada.')
    }}>
      <label>Título<input name="titulo" required maxLength={160} defaultValue={editingTask.titulo} /></label>
      <label>Responsável<select name="responsavelId" aria-label="Responsável" required defaultValue={editingTask.responsavelId}>{!members.some(member => member.id === editingTask.responsavelId) && <option value={editingTask.responsavelId}>Responsável anterior</option>}{members.map(member => <option key={member.id} value={member.id}>{member.usuario.nome}</option>)}</select></label>
      <label>Prazo opcional<input type="date" name="prazo" defaultValue={editingTask.prazo?.slice(0, 10) ?? ''} /></label>
      <label>Descrição opcional<textarea name="descricao" rows={3} maxLength={5000} defaultValue={editingTask.descricao ?? ''} /></label>
    </ActionDialog>}
  </section>
}
