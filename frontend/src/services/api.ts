import axios from 'axios';
import { EVENTO_SESSAO_EXPIRADA, lerToken, limparToken } from './sessao';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname) {
    const host = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol || 'http:';
    return `${protocol}//${host}${port}/api/v1`;
  }
  return 'http://localhost:8085/api/v1';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
});

// Envia o token do login em toda requisicao
api.interceptors.request.use(config => {
  const token = lerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 = sessao vencida, conta desativada ou senha trocada: limpa a sessao e volta ao login.
// (O proprio /auth/login responde 401 para senha errada; esse caso a tela de login trata.)
api.interceptors.response.use(
  resposta => resposta,
  erro => {
    const url = String(erro?.config?.url ?? '');
    if (erro?.response?.status === 401 && !url.includes('/auth/login')) {
      limparToken();
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    }
    return Promise.reject(erro);
  },
);

export default api;
