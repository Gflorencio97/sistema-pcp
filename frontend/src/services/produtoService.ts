import api from './api';
import type { Produto, ProdutoCreate } from '../types';

export const produtoService = {
  listar: (params?: { ativo?: boolean; search?: string }) =>
    api.get<Produto[]>('/produtos', { params }).then(r => r.data),

  obter: (id: number) =>
    api.get<Produto>(`/produtos/${id}`).then(r => r.data),

  criar: (data: ProdutoCreate) =>
    api.post<Produto>('/produtos', data).then(r => r.data),

  atualizar: (id: number, data: Partial<ProdutoCreate>) =>
    api.patch<Produto>(`/produtos/${id}`, data).then(r => r.data),

  deletar: (id: number) =>
    api.delete(`/produtos/${id}`),
};
