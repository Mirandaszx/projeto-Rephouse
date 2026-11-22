export interface CriarTarefaInput {
  responsavelId?: string | null
  titulo: string
  descricao?: string
  prazo?: Date | null
}
