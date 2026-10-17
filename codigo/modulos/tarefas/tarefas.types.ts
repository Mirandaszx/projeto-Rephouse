export interface CriarTarefaInput {
  responsavelId: string
  titulo: string
  descricao?: string
  prazo?: Date | null
}
