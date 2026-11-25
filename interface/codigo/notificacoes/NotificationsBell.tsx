import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, ChevronLeft, ChevronRight, ClipboardList, ReceiptText, UserRoundPlus, UserRoundMinus, X } from 'lucide-react'
import { apiRequest, request } from '../api'
import type { Schemas } from '../gestao/types'
import ErrorNotice from '../interno/ErrorNotice'
import { errorFeedback, type Feedback } from '../interno/feedback'
import { GlisseButton } from '../rebuild/GlisseButton'
import type { NotificationsState } from './useNotifications'
import './notifications.css'
import { Tooltip, TooltipContent, TooltipTrigger } from '../rebuild/vendor/shadcn-tooltip'

type Category = 'TODAS'|'TAREFAS'|'DESPESAS'
type Notice = Schemas['Notificacao']
type Page = {dados:Notice[];paginacao:{pagina:number;totalPaginas:number;totalItens:number}}
const phrases: Record<Notice['tipo'],string> = {
  TAREFA_CRIADA:'criou uma tarefa',TAREFA_ASSUMIDA:'assumiu a tarefa',TAREFA_REATRIBUIDA:'alterou o responsável',
  TAREFA_CONCLUIDA:'concluiu a tarefa',TAREFA_LIBERADA:'liberou a tarefa',TAREFA_REABERTA:'reabriu a tarefa',
  DESPESA_PROXIMA:'Sua parcela está próxima do vencimento',DESPESA_VENCE_HOJE:'Sua parcela vence hoje',
  MEMBRO_ENTROU:'Entrou na república',MEMBRO_SAIU:'Deixou a república',
}
const date = (value: string) => new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(value))
export default function NotificationsBell({token,state,onOpen}:{token:string;state:NotificationsState;onOpen:(notice:Notice)=>void}) {
  const [open,setOpen] = useState(false), [category,setCategory] = useState<Category>('TODAS')
  const categories: Category[] = state.counts.gerais===undefined?['TAREFAS','DESPESAS']:['TODAS','TAREFAS','DESPESAS']
  const selectedCategory = category==='TODAS'&&state.counts.gerais===undefined?'TAREFAS':category
  const [page,setPage] = useState(1), [result,setResult] = useState<Page|null>(null)
  const [error,setError] = useState<Feedback>(''), [busy,setBusy] = useState(false), [attempt,setAttempt] = useState(0)
  const [resolvedKey,setResolvedKey] = useState('')
  const requestKey=`${selectedCategory}|${page}|${state.revision}|${attempt}`
  const loading=open&&resolvedKey!==requestKey
  const panel = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null), submitting = useRef(false)
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    request<Page>(`/notificacoes?categoria=${selectedCategory}&pagina=${page}&limite=20`,token,undefined,undefined,controller.signal)
      .then(value=>{if(!controller.signal.aborted){setResult(value);setError('');setResolvedKey(requestKey)}})
      .catch(failure=>{if(!controller.signal.aborted){setError(errorFeedback(failure));setResolvedKey(requestKey)}})
    return ()=>controller.abort()
  },[open,selectedCategory,page,token,requestKey])
  useEffect(()=>{
    if(open){
      const bounds=trigger.current?.getBoundingClientRect()
      if(bounds&&panel.current){panel.current.style.setProperty('--notifications-top',`${Math.min(bounds.bottom+8,window.innerHeight-280)}px`);panel.current.style.setProperty('--notifications-right',`${Math.max(16,window.innerWidth-bounds.right)}px`)}
      panel.current?.showModal(); panel.current?.querySelector<HTMLButtonElement>('[data-close]')?.focus()
    }
    else if(panel.current?.open){panel.current.close();trigger.current?.focus()}
  },[open])
  if(!state.enabled)return null
  const close=()=>{if(!submitting.current)setOpen(false)}
  const mark=async(notice?:Notice)=>{
    if(submitting.current)return
    submitting.current=true;setBusy(true);setError('')
    try{
      await apiRequest('PATCH',notice?`/notificacoes/${notice.id}/lida`:'/notificacoes/lidas',token,notice?{}:{categoria:selectedCategory})
      // A marcação já foi confirmada. Uma queda na atualização do contador não impede abrir o destino.
      await state.refresh().catch(()=>{})
      if(notice){panel.current?.close();setOpen(false);onOpen(notice)}else setAttempt(value=>value+1)
    }catch(failure){setError(errorFeedback(failure))}
    finally{submitting.current=false;setBusy(false)}
  }
  const categoryCount = (value:Category) => value==='TODAS'?state.counts.total:value==='TAREFAS'?state.counts.tarefas:state.counts.despesas
  const count = categoryCount(selectedCategory)
  return <div className="notifications-anchor">
    <Tooltip><TooltipTrigger ref={trigger} render={<button type="button" className="notifications-trigger" data-connection={state.status} aria-label={`Notificações${state.counts.total?`, ${state.counts.total} não lidas`:''}`} aria-haspopup="dialog" aria-expanded={open} onClick={event=>{if(panel.current)panel.current.dataset.keyboard=String(event.detail===0);setOpen(true);void state.refresh().catch(()=>{})}} />}>
      <Bell size={20} aria-hidden="true" />{state.counts.total>0&&<span className="notifications-counter" aria-hidden="true">{state.counts.total>99?'99+':state.counts.total}</span>}
    </TooltipTrigger><TooltipContent>Notificações</TooltipContent></Tooltip>
    <dialog className="notifications-panel" ref={panel} aria-labelledby="notifications-title" onCancel={event=>{event.preventDefault();close()}} onClick={event=>{if(event.target===panel.current){const bounds=panel.current.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close()}}}>
      <header><h2 id="notifications-title">Notificações</h2><button type="button" data-close aria-label="Fechar notificações" disabled={busy} onClick={close}><X size={20}/></button></header>
      <div className="notifications-tabs" role="tablist" aria-label="Categorias de notificações" onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const index=(categories.indexOf(selectedCategory)+(event.key==='ArrowRight'?1:-1)+categories.length)%categories.length;setCategory(categories[index]!);setPage(1);event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[index]?.focus()}}}>
        {categories.map(value=><button type="button" role="tab" key={value} id={`notifications-${value}`} aria-controls="notifications-items" aria-selected={selectedCategory===value} tabIndex={selectedCategory===value?0:-1} onClick={()=>{setCategory(value);setPage(1)}}>{value==='TODAS'?'Todas':value==='TAREFAS'?'Tarefas':'Despesas'}<span>{categoryCount(value)}</span></button>)}
      </div>
      <div className="notifications-toolbar"><span role="status">{state.status==='conectado'?'Atualizado em tempo real':state.status==='conectando'?'Conectando…':'Reconectando…'}</span><button type="button" disabled={busy||loading||count===0} onClick={()=>void mark()}><CheckCheck size={16} aria-hidden="true"/>Marcar todas como lidas</button></div>
      <section role="tabpanel" id="notifications-items" aria-labelledby={`notifications-${selectedCategory}`} aria-busy={loading} tabIndex={0}>
        {error?<div className="notifications-state"><ErrorNotice error={error}/><GlisseButton variant="secondary" onClick={()=>setAttempt(value=>value+1)}>Tentar novamente</GlisseButton></div>:loading?<p className="notifications-state" role="status">Carregando avisos…</p>:result?.dados.length?<ul>{result.dados.map(notice=><li key={notice.id} data-unread={!notice.lidaEm}>
          <button type="button" disabled={busy} onClick={()=>void mark(notice)}>
            <span className="notifications-kind" aria-hidden="true">{notice.categoria==='TAREFAS'?<ClipboardList size={18}/>:notice.categoria==='DESPESAS'?<ReceiptText size={18}/>:notice.tipo==='MEMBRO_ENTROU'?<UserRoundPlus size={18}/>:<UserRoundMinus size={18}/>}</span>
            <span className="notifications-copy"><span>{notice.categoria==='TAREFAS'?`${notice.atorNome??'Um morador'} ${phrases[notice.tipo]}`:phrases[notice.tipo]}</span><strong>{notice.titulo}</strong>{notice.vencimento&&<span>Vencimento: {notice.vencimento.slice(0,10).split('-').reverse().join('/')}</span>}<time dateTime={notice.criadoEm}>{date(notice.criadoEm)}</time></span>
            {!notice.lidaEm&&<span className="notifications-dot"><span className="sr-only">Não lida</span></span>}
          </button>
        </li>)}</ul>:<p className="notifications-state">{selectedCategory==='TODAS'?'Nenhuma notificação por aqui.':selectedCategory==='TAREFAS'?'Nenhum aviso de tarefa por aqui.':'Nenhum aviso de vencimento por aqui.'}</p>}
      </section>
      {result&&result.paginacao.totalPaginas>1&&<footer><button type="button" aria-label="Avisos anteriores" disabled={page<=1||loading} onClick={()=>setPage(value=>value-1)}><ChevronLeft size={18}/></button><span>Página {page} de {result.paginacao.totalPaginas}</span><button type="button" aria-label="Próximos avisos" disabled={page>=result.paginacao.totalPaginas||loading} onClick={()=>setPage(value=>value+1)}><ChevronRight size={18}/></button></footer>}
    </dialog>
  </div>
}
