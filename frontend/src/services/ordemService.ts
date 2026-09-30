import api from './api';
import type { OrdemProducao, OrdemCreate, OrdemGantt } from '../types';

export const ordemService = {
  listar: (params?: { status?: string; maquina_id?: number; search?: string }) =>
    api.get<OrdemProducao[]>('/ordens/', { params }).then(r => r.data),

  gantt: (params?: { data_inicio?: string; data_fim?: string; maquina_id?: number; incluir_concluidas?: boolean }) =>
    api.get<OrdemGantt[]>('/ordens/gantt', { params }).then(r => r.data),

  obter: (id: number) =>
    api.get<OrdemProducao>(`/ordens/${id}`).then(r => r.data),

  criar: (data: OrdemCreate) =>
    api.post<OrdemProducao>('/ordens/', data).then(r => r.data),


  atualizar: (id: number, data: Partial<OrdemCreate & { status?: string; quantidade_produzida?: number }>) =>
    api.patch<OrdemProducao>(`/ordens/${id}`, data).then(r => r.data),

  deletar: (id: number) =>
    api.delete(`/ordens/${id}`),
};
