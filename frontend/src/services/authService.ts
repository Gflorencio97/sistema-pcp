import api from './api';
import type { AuditoriaRegistro, TokenResposta, Usuario, UsuarioComSenha } from '../types';

export interface ParamsAuditoria {
  usuario_id?: number;
  entidade?: string;
  acao?: string;
  data_inicio?: string;
  data_fim?: string;
  skip?: number;
  limit?: number;
}

export const authService = {
  login: (login: string, senha: string) =>
    api.post<TokenResposta>('/auth/login', { login, senha }).then(r => r.data),

  me: () => api.get<Usuario>('/auth/me').then(r => r.data),

  trocarSenha: (senha_atual: string, nova_senha: string) =>
    api.post<TokenResposta>('/auth/trocar-senha', { senha_atual, nova_senha }).then(r => r.data),

  listarUsuarios: () => api.get<Usuario[]>('/usuarios').then(r => r.data),

  criarUsuario: (data: { nome: string; login: string; perfil: string; senha?: string }) =>
    api.post<UsuarioComSenha>('/usuarios', data).then(r => r.data),

  atualizarUsuario: (id: number, data: { nome?: string; perfil?: string; ativo?: boolean }) =>
    api.patch<Usuario>(`/usuarios/${id}`, data).then(r => r.data),

  redefinirSenha: (id: number) =>
    api.post<UsuarioComSenha>(`/usuarios/${id}/redefinir-senha`).then(r => r.data),

  consultarAuditoria: (params: ParamsAuditoria) =>
    api.get<AuditoriaRegistro[]>('/auditoria', { params }).then(r => r.data),
};
