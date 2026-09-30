// Tipos principais do sistema PCP

export type StatusMaquina = 'ativa' | 'manutencao' | 'inativa';
export type StatusOrdem = 'planejada' | 'em_andamento' | 'concluida' | 'cancelada' | 'pausada';
export type PrioridadeOrdem = 'baixa' | 'normal' | 'alta' | 'urgente';

// --- Roteiro de Produção ---
export interface RoteiroItem {
  id: number;
  produto_id: number;
  operacao_codigo: string;
  operacao_nome: string;
  ordem: number;
  pcs_hora?: number | null;
  horas_por_peca?: number | null;
  maquina_id?: number | null;
  maquina_nome?: string | null;
  maquina_codigo?: string | null;
  maquina_horas_por_dia?: number | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface CalculoOperacao {
  operacao_codigo: string;
  operacao_nome: string;
  ordem: number;
  pcs_hora?: number | null;
  horas_necessarias?: number | null;
  maquina_id?: number | null;
  maquina_nome?: string | null;
  maquina_horas_por_dia?: number | null;
  dias_necessarios?: number | null;
  disponivel: boolean;
}

export interface CalculoHorasRequest {
  produto_id: number;
  quantidade: number;
}

export interface CalculoHorasResponse {
  produto_id: number;
  produto_nome: string;
  quantidade: number;
  operacoes: CalculoOperacao[];
  total_horas: number;
}


export interface Maquina {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string;
  setor?: string;
  operacao_codigo?: string;
  horas_por_dia?: number;
  capacidade_hora?: number;
  status: StatusMaquina;
  turno_manha: boolean;
  turno_tarde: boolean;
  turno_noite: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface MaquinaCreate {
  codigo: string;
  nome: string;
  descricao?: string;
  setor?: string;
  operacao_codigo?: string;
  horas_por_dia?: number;
  capacidade_hora?: number;
  status?: StatusMaquina;
  turno_manha?: boolean;
  turno_tarde?: boolean;
  turno_noite?: boolean;
}

export interface Produto {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string;
  codigo_fundido?: string;
  unidade_medida: string;
  tempo_producao_hora?: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ProdutoCreate {
  codigo: string;
  nome: string;
  descricao?: string;
  codigo_fundido?: string;
  unidade_medida?: string;
  tempo_producao_hora?: number;
  ativo?: boolean;
}

export interface OrdemProducao {
  id: number;
  numero: string;
  produto_id: number;
  maquina_id?: number;
  quantidade_planejada: number;
  quantidade_produzida: number;
  status: StatusOrdem;
  prioridade: PrioridadeOrdem;
  data_inicio_planejada?: string;
  data_fim_planejada?: string;
  data_inicio_real?: string;
  data_fim_real?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  produto?: Produto;
  maquina?: Maquina;
}

export interface OrdemCreate {
  numero: string;
  produto_id: number;
  maquina_id?: number;
  quantidade_planejada: number;
  prioridade?: PrioridadeOrdem;
  data_inicio_planejada?: string;
  data_fim_planejada?: string;
  observacoes?: string;
}

export interface OrdemGantt {
  id: number;
  numero: string;
  produto_nome: string;
  produto_codigo?: string;
  produto_codigo_fundido?: string;
  maquina_nome?: string;
  maquina_codigo?: string;
  maquina_id?: number;
  operacao_codigo?: string;
  status: StatusOrdem;
  prioridade: PrioridadeOrdem;
  data_inicio_planejada?: string;
  data_fim_planejada?: string;
  quantidade_planejada: number;
  quantidade_produzida: number;
  percentual_conclusao: number;
  observacoes?: string;
}

// --- Carga Máquina Dashboard ---
export interface CargaMaquinaItem {
  maquina_id: number;
  codigo: string;
  nome: string;
  setor?: string;
  operacao_codigo?: string;
  horas_por_dia: number;
  horas_disponiveis: number;
  horas_ocupadas: number;
  saldo_horas: number;
  percentual_ocupacao: number;
  status_capacidade: 'normal' | 'atencao' | 'sobrecarga';
  qtd_ordens: number;
}

export interface CargaSetorItem {
  setor_nome: string;
  operacao_codigo?: string;
  horas_disponiveis: number;
  horas_ocupadas: number;
  percentual_ocupacao: number;
  status_capacidade: 'normal' | 'atencao' | 'sobrecarga';
  maquinas: CargaMaquinaItem[];
}

export interface CargaMaquinaDashboardResponse {
  dias_uteis: number;
  horas_dia_padrao: number;
  horas_disponiveis_total: number;
  horas_ocupadas_total: number;
  saldo_horas_total: number;
  percentual_ocupacao_total: number;
  total_maquinas: number;
  maquinas_sobrecarregadas: number;
  maquinas_atencao: number;
  maquinas_normais: number;
  setores: CargaSetorItem[];
}

