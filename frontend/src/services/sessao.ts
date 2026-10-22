// Guarda o token do login. Tudo em try/catch: se o navegador bloquear o armazenamento, o sistema continua abrindo.
const CHAVE = 'pcp_token';

export const lerToken = (): string | null => {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
};

export const guardarToken = (token: string): void => {
  try {
    localStorage.setItem(CHAVE, token);
  } catch {
    /* sem armazenamento: a sessao vale so ate recarregar a pagina */
  }
};

export const limparToken = (): void => {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* nada a fazer */
  }
};

export const EVENTO_SESSAO_EXPIRADA = 'pcp:sessao-expirada';
