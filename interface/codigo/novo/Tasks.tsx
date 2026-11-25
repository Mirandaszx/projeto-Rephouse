import ErrorNotice from '../interno/ErrorNotice'
import { uncertainCreationMessage } from '../interno/feedback'
import { errorFeedback } from '../interno/feedback'
import type { Feedback } from '../interno/feedback'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, Check, ClipboardCheck, Plus, UserRound } from 'lucide-react'
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
import { useDialogMotion } from '../interno/useDialogMotion'
import { useCreationAttempt } from '../gestao/useCreationAttempt'
import './tasks.css'
import type { Schemas } from '../gestao/types'
import { ListSkeleton } from '../interno/LoadingSkeleton'

type Status = 'ABERTA' | 'CONCLUIDA'
type Filter = 'todas' | Status
type Task = Schemas['Tarefa']
type Member = { id: string; usuario: { nome: string } }
type Props = { token: string; members: Member[]; memberId?: string; userId?: string; canManage: boolean; sharedEnabled?: boolean; onExpired: (error: unknown) => boolean }

const filters = [
  { value: 'todas', label: 'Todas' },
  { value: 'ABERTA', label: 'Abertas' },
  { value: 'CONCLUIDA', label: 'Concluídas' },
]
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
const formatDue = (date: string) => dateFormat.format(new Date(date.slice(0, 10) + 'T00:00:00Z'))

export default function Tasks({ token, members, memberId, userId, canManage, sharedEnabled = true, onExpired }: Props) {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<Feedback>('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [filter, setFilter] = useState<Filter>('todas')
  const results = useWorkspaceTransition(filter)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [formError, setFormError] = useState<Feedback>('')
  const [responsible, setResponsible] = useState('')
  const [formRevision, setFormRevision] = useState(0)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const { dialog, open: openDialog, close: closeDialog, isClosing } = useDialogMotion()
  const saving = useRef(false)
  const creation = useCreationAttempt()
  useEffect(()=>{
    const update=()=>setRevision(value=>value+1)
    window.addEventListener('rephouse:notifications-updated',update)
    return ()=>window.removeEventListener('rephouse:notifications-updated',update)
  },[])

  useEffect(() => {
    let active = true
    request<Task[]>('/tarefas', token).then(items => {
      if (active) setTasks(items)
    }).catch((failure: unknown) => {
      if (active && !onExpired(failure)) setError(errorFeedback(failure))
    })
    return () => { active = false }
  }, [token, revision, onExpired])

  async function changeStatus(task: Task, checked: boolean) {
    if (saving.current || isClosing()) return
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
      if (!onExpired(failure)) setError(errorFeedback(failure))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving.current || isClosing()) return
    const form = event.currentTarget
    const values = new FormData(form)
    const titulo = String(values.get('titulo') ?? '').trim()
    if (!titulo && !creation.uncertain) {
      setFormError('Dê um nome à tarefa.')
      return
    }
    const responsavelId = String(values.get('responsavelId') ?? '')
    if (!responsavelId && !creation.uncertain && !sharedEnabled) {
      setFormError('Selecione quem vai fazer a tarefa.')
      return
    }
    const descricao = String(values.get('descricao') ?? '').trim()
    const prazo = String(values.get('prazo') ?? '')
    saving.current = true
    setBusy(true)
    setFormError('')
    try {
      const created = creation.uncertain ? await creation.send<Task>(token)
        : await creation.send<Task>(token, '/tarefas', { titulo, responsavelId: responsavelId || null, ...(descricao ? { descricao } : {}), ...(prazo ? { prazo } : {}) })
      setTasks(current => [created, ...(current ?? []).filter(task => task.id !== created.id)])
      // O reenvio devolve a criação original; a tarefa pode ter sido alterada depois.
      if (creation.uncertain) setRevision(value => value + 1)
      setFilter('todas')
      setNotice('Tarefa criada.')
      await closeDialog()
      form.reset()
    } catch (failure) {
      if (!onExpired(failure)) setFormError(errorFeedback(failure))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  const items = tasks ?? []
  const completed = items.filter(item => item.status === 'CONCLUIDA').length
  const visible = items.filter(item => filter === 'todas' || item.status === filter)
  const today = brasilDay()
  async function assignment(task:Task, action:'assumir'|'liberar') {
    if(saving.current)return
    saving.current=true;setBusy(true);setError('')
    try{
      const updated=await request<Task>(`/tarefas/${task.id}/${action}`,token,{})
      setTasks(current=>current?.map(item=>item.id===updated.id?updated:item)??null)
      setNotice(action==='assumir'?'Você assumiu a tarefa.':'Tarefa disponível para outros moradores.')
    }catch(failure){if(!onExpired(failure)){setError(errorFeedback(failure));setRevision(value=>value+1)}}
    finally{saving.current=false;setBusy(false)}
  }

  // Só tarefas livres e abertas podem ser escolhidas; a seleção vale para o que está visível no filtro.
  const isFree = (task: Task) => sharedEnabled && task.status === 'ABERTA' && !task.responsavelId
  const free = visible.filter(isFree)
  const chosen = free.filter(task => selected.includes(task.id))
  const count = (total: number) => `${total} ${total === 1 ? 'tarefa' : 'tarefas'}`
  async function assumeChosen() {
    if (saving.current || !chosen.length) return
    saving.current = true; setBusy(true); setError(''); setNotice('')
    let taken = 0, refused = 0
    try {
      // Uma chamada por tarefa: cada uma mantém a regra e a proteção contra disputa da API.
      for (const task of chosen) {
        try {
          const updated = await request<Task>(`/tarefas/${task.id}/assumir`, token, {})
          setTasks(current => current?.map(item => item.id === updated.id ? updated : item) ?? null)
          taken++
        } catch (failure) {
          if (onExpired(failure)) return
          refused++
        }
      }
      setSelected([])
      if (taken) setNotice(`Você assumiu ${count(taken)}.`)
      if (refused) {
        setError(`${count(refused)} não ${refused === 1 ? 'pôde ser assumida' : 'puderam ser assumidas'}. A lista foi atualizada: confira quem ficou responsável.`)
        setRevision(value => value + 1)
      }
    } finally { saving.current = false; setBusy(false) }
  }

  return <section className="rep-tasks" aria-labelledby="rep-tasks-label">
    <div className="rep-tasks-head">
      <div className="rep-tasks-heading">
        <span className="rep-task-symbol" aria-hidden="true"><ClipboardCheck size={21} /></span>
        <div><h2 id="rep-tasks-label">Rotina compartilhada</h2><p>{tasks ? `${items.length - completed} ${items.length - completed === 1 ? 'aberta' : 'abertas'} · ${completed} ${completed === 1 ? 'concluída' : 'concluídas'}` : 'Organize os afazeres da casa.'}</p></div>
      </div>
      {(sharedEnabled || canManage) && members.length > 0 && <GlisseButton disabled={busy || !tasks} onClick={() => { if (isClosing()) return; if (!creation.hasPending()) { setFormError(''); setResponsible(''); setFormRevision(value => value + 1) }; openDialog() }} icon={<Plus size={16} aria-hidden="true" />}>Nova tarefa</GlisseButton>}
    </div>
    <div className="rep-tasks-filter"><SegmentedControl aria-label="Filtrar tarefas" value={filter} items={filters} onValueChange={value => setFilter(value as Filter)} /></div>
    {error && <div className="rep-task-state"><ErrorNotice error={error} />{!tasks && <GlisseButton variant="secondary" onClick={() => { setError(''); setRevision(value => value + 1) }}>Tentar novamente</GlisseButton>}</div>}
    {notice && <p className="rep-task-feedback" role="status">{notice}</p>}
    {!tasks && !error && <ListSkeleton label="Carregando tarefas…" />}
    {free.length > 1 && !chosen.length && <p className="rep-task-hint">Marque as tarefas livres para assumir várias de uma vez.</p>}
    <div ref={results} className="workspace-results">
    {tasks && visible.length === 0 && <EmptyState title={items.length ? 'Nenhuma tarefa neste filtro.' : 'Nenhuma tarefa cadastrada na casa.'} />}
    {tasks && <ul className="rep-task-list">{visible.map(task => {
      const checked = task.status === 'CONCLUIDA'
      const canToggle = Boolean(task.responsavelId) && (canManage || ((sharedEnabled || !checked) && memberId === task.responsavelId))
      const canEdit = canManage || (sharedEnabled && !task.responsavelId && task.criadorId === userId)
      const person = members.find(member => member.id === task.responsavelId)
      const overdue = !checked && Boolean(task.prazo && task.prazo.slice(0, 10) < today)
      const selectable = isFree(task)
      return <li className="rep-task-row" key={task.id}>
        <div>
          {selectable
            ? <SpellTaskCheckbox title={task.titulo} checked={selected.includes(task.id)} disabled={busy}
              onCheckedChange={next => setSelected(current => next ? [...current, task.id] : current.filter(id => id !== task.id))} />
            : <p className="rep-task-title"><span aria-hidden="true">{checked && <Check size={18} />}</span><span className={checked ? 'rep-task-name rep-task-name-done' : 'rep-task-name'}>{task.titulo}</span></p>}
          {task.descricao && <p className="rep-task-description">{task.descricao}</p>}
          <div className="rep-task-meta">
            {person && <span><UserRound size={14} aria-hidden="true" />{person.usuario.nome}</span>}
            {!task.responsavelId&&<span>Disponível para assumir</span>}
            {task.responsavelId&&task.responsavelAtivo===false&&<span>Responsável inativo · administrador deve redistribuir</span>}
            {task.prazo && <span><CalendarDays size={14} aria-hidden="true" /><time dateTime={task.prazo.slice(0, 10)}>{formatDue(task.prazo)}</time></span>}
          </div>
        </div>
        <div className="rep-task-actions">{/* Sem selo para "aberta": o selo fica para as exceções. */}{(checked || overdue) && <Badge tone={checked ? 'success' : 'danger'}>{checked ? 'Concluída' : 'Em atraso'}</Badge>}{sharedEnabled&&!checked&&!task.responsavelId&&<GlisseButton disabled={busy} aria-label={`Assumir tarefa ${task.titulo}`} onClick={()=>void assignment(task,'assumir')}>Assumir tarefa</GlisseButton>}{canToggle && <GlisseButton variant="secondary" disabled={busy} aria-label={`${checked ? 'Reabrir' : 'Concluir'} tarefa ${task.titulo}`} onClick={() => void changeStatus(task, !checked)}>{checked ? 'Reabrir' : 'Concluir'}</GlisseButton>}{sharedEnabled&&!checked&&task.responsavelId&&(canManage||memberId===task.responsavelId)&&<GlisseButton variant="secondary" disabled={busy} aria-label={`Deixar disponível a tarefa ${task.titulo}`} onClick={()=>void assignment(task,'liberar')}>Deixar disponível</GlisseButton>}{canEdit && <GlisseButton variant="secondary" disabled={busy} aria-label={`Editar tarefa ${task.titulo}`} onClick={() => setEditingTask(task)}>Editar</GlisseButton>}</div>
      </li>
    })}</ul>}
    </div>
    {chosen.length > 0 && <div className="rep-task-bulk">
      <p role="status">{count(chosen.length)} {chosen.length === 1 ? 'selecionada' : 'selecionadas'}</p>
      <GlisseButton variant="secondary" disabled={busy} onClick={() => setSelected([])}>Limpar seleção</GlisseButton>
      <GlisseButton disabled={busy} onClick={() => void assumeChosen()}>{busy ? 'Assumindo…' : `Assumir selecionadas (${chosen.length})`}</GlisseButton>
    </div>}
    <dialog ref={dialog} className="rep-dialog rep-task-dialog" aria-labelledby="rep-task-dialog-title" onCancel={event => { event.preventDefault(); if (!saving.current) void closeDialog() }}>
      <form key={formRevision} onSubmit={createTask}>
        <h2 id="rep-task-dialog-title">Nova tarefa</h2>
        <fieldset className="rep-form-fields" disabled={busy || creation.uncertain} inert={creation.uncertain}>
          <AnimatedField label="Título" name="titulo" required maxLength={160} />
          <div><p>Responsável</p><FilterCombobox value={responsible} onChange={setResponsible} label="Selecionar responsável" items={[...(sharedEnabled?[{value:'',label:'Disponível para assumir'}]:[]),...members.filter(member=>canManage||member.id===memberId).map(member => ({ value: member.id, label: member.id===memberId&&!canManage?'Eu vou fazer':member.usuario.nome }))]} /><input type="hidden" name="responsavelId" value={responsible} />{sharedEnabled&&!responsible&&<p className="rep-management-note">Qualquer morador poderá assumir esta tarefa.</p>}</div>
          <DateField label="Prazo opcional" name="prazo" />
          <label>Descrição opcional<textarea name="descricao" rows={3} maxLength={5000} /></label>
        </fieldset>
        <ErrorNotice error={formError || (creation.uncertain ? uncertainCreationMessage : '')} message={creation.uncertain ? uncertainCreationMessage : undefined} />
        <footer><GlisseButton variant="secondary" disabled={busy} onClick={() => void closeDialog()}>{creation.uncertain ? 'Fechar' : 'Cancelar'}</GlisseButton><GlisseButton type="submit" disabled={busy}>{busy ? 'Salvando…' : creation.uncertain ? 'Reenviar solicitação' : 'Criar tarefa'}</GlisseButton></footer>
      </form>
    </dialog>
    {editingTask && <ActionDialog title="Editar tarefa" confirm="Salvar tarefa" onClose={() => setEditingTask(null)} onSubmit={async data => {
      const updated = await apiRequest<Task>('PATCH', `/tarefas/${editingTask.id}`, token, {
        titulo: String(data.get('titulo')).trim(), ...(canManage?{responsavelId: String(data.get('responsavelId')??'')||null}:{}),
        descricao: String(data.get('descricao')).trim(), prazo: String(data.get('prazo')) || null,
      })
      setTasks(current => current?.map(task => task.id === updated.id ? updated : task) ?? null)
      setNotice('Tarefa atualizada.')
    }}>
      <label>Título<input name="titulo" required maxLength={160} defaultValue={editingTask.titulo} /></label>
      {canManage&&<label>Responsável<select name="responsavelId" aria-label="Responsável" defaultValue={editingTask.responsavelId??''}>{sharedEnabled&&editingTask.status==='ABERTA'&&<option value="">Disponível para assumir</option>}{editingTask.responsavelId&&!members.some(member => member.id === editingTask.responsavelId) && <option value={editingTask.responsavelId}>Responsável anterior</option>}{members.map(member => <option key={member.id} value={member.id}>{member.usuario.nome}</option>)}</select></label>}
      <label>Prazo opcional<input type="date" name="prazo" defaultValue={editingTask.prazo?.slice(0, 10) ?? ''} /></label>
      <label>Descrição opcional<textarea name="descricao" rows={3} maxLength={5000} defaultValue={editingTask.descricao ?? ''} /></label>
    </ActionDialog>}
  </section>
}
