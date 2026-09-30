import api from './api';
import type { CalculoHorasRequest, CalculoHorasResponse, RoteiroItem } from '../types';

export const roteiroService = {
  obterRoteiro: (produtoId: number) =>
    api.get<RoteiroItem[]>(`/roteiro/produto/${produtoId}`).then(r => r.data),

  atualizarItem: (
    roteiroId: number,
    data: { pcs_hora?: number | null; maquina_id?: number | null; ativo?: boolean }
  ) =>
    api.patch<RoteiroItem>(`/roteiro/item/${roteiroId}`, data).then(r => r.data),

  salvarRoteiroCompleto: (
    produtoId: number,
    itens: { operacao_codigo: string; pcs_hora?: number | null; maquina_id?: number | null; ativo?: boolean }[]
  ) =>
    api.put<RoteiroItem[]>(`/roteiro/produto/${produtoId}`, { itens }).then(r => r.data),

  calcularHoras: (req: CalculoHorasRequest) =>
    api.post<CalculoHorasResponse>('/roteiro/calcular-horas', req).then(r => r.data),
};
