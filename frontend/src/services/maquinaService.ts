import api from './api';
import type { Maquina, MaquinaCreate } from '../types';

export const maquinaService = {
  listar: (params?: { status?: string; setor?: string; search?: string }) =>
    api.get<Maquina[]>('/maquinas', { params }).then(r => r.data),

  obter: (id: number) =>
    api.get<Maquina>(`/maquinas/${id}`).then(r => r.data),

  criar: (data: MaquinaCreate) =>
    api.post<Maquina>('/maquinas', data).then(r => r.data),

  atualizar: (id: number, data: Partial<MaquinaCreate>) =>
    api.patch<Maquina>(`/maquinas/${id}`, data).then(r => r.data),

  deletar: (id: number) =>
    api.delete(`/maquinas/${id}`),
};
