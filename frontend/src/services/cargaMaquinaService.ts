import api from './api';
import type { CargaMaquinaDashboardResponse } from '../types';

export const cargaMaquinaService = {
  obterResumo: (params?: { dias_uteis?: number; horas_dia?: number }) =>
    api.get<CargaMaquinaDashboardResponse>('/carga-maquina/resumo', { params }).then(r => r.data),

  simular: (data: { dias_uteis?: number; horas_dia?: number; pedidos: { produto_id: number; quantidade: number }[] }) =>
    api.post<CargaMaquinaDashboardResponse>('/carga-maquina/simular', data).then(r => r.data),
};
