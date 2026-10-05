import api from './api';
import type { CargaMaquinaDashboardResponse, SetorMOD, SetorMODUpdate } from '../types';

export const cargaMaquinaService = {
  obterResumo: (params?: { dias_uteis?: number; horas_dia?: number }) =>
    api.get<CargaMaquinaDashboardResponse>('/carga-maquina/resumo', { params }).then(r => r.data),

  simular: (data: { dias_uteis?: number; horas_dia?: number; pedidos: { produto_id: number; quantidade: number }[] }) =>
    api.post<CargaMaquinaDashboardResponse>('/carga-maquina/simular', data).then(r => r.data),

  listarMOD: () =>
    api.get<SetorMOD[]>('/carga-maquina/mod').then(r => r.data),

  atualizarMOD: (setores: SetorMODUpdate[]) =>
    api.put<SetorMOD[]>('/carga-maquina/mod', { setores }).then(r => r.data),

  atualizarMODSetor: (codigo: string, data: SetorMODUpdate) =>
    api.put<SetorMOD[]>(`/carga-maquina/mod/${codigo}`, data).then(r => r.data),
};

