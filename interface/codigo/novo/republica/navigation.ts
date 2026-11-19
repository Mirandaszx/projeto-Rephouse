import { Building2, ClipboardCheck, ReceiptText, Users } from 'lucide-react'

export const pages = [
  { path: '/republica', label: 'Visão geral', icon: Building2 },
  { path: '/republica/despesas', label: 'Despesas', icon: ReceiptText },
  { path: '/republica/tarefas', label: 'Tarefas', icon: ClipboardCheck },
  { path: '/republica/moradores', label: 'Moradores', icon: Users },
] as const

export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
