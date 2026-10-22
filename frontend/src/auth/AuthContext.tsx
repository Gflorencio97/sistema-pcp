import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { EVENTO_SESSAO_EXPIRADA, guardarToken, lerToken, limparToken } from '../services/sessao';
import type { Usuario } from '../types';

interface AuthCtx {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (login: string, senha: string) => Promise<void>;
  sair: () => void;
  trocarSenha: (atual: string, nova: string) => Promise<void>;
  podeEditar: boolean;   // editor ou admin
  podeExcluir: boolean;  // somente admin
  ehAdmin: boolean;
}

const Contexto = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState<boolean>(!!lerToken());

  const sair = useCallback(() => {
    limparToken();
    setUsuario(null);
    qc.clear();   // nao deixa dados do usuario anterior na memoria
  }, [qc]);

  // Ao abrir o sistema com um token guardado, confirma quem e o usuario
  useEffect(() => {
    if (!lerToken()) return;
    authService
      .me()
      .then(setUsuario)
      .catch(() => limparToken())
      .finally(() => setCarregando(false));
  }, []);

  // A API respondeu 401 (sessao vencida ou conta desativada): volta para o login
  useEffect(() => {
    const aoExpirar = () => {
      setUsuario(null);
      qc.clear();
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, [qc]);

  const entrar = useCallback(async (login: string, senha: string) => {
    const resp = await authService.login(login, senha);
    guardarToken(resp.access_token);
    setUsuario(resp.usuario);
  }, []);

  const trocarSenha = useCallback(async (atual: string, nova: string) => {
    const resp = await authService.trocarSenha(atual, nova);
    guardarToken(resp.access_token);
    setUsuario(resp.usuario);
  }, []);

  const valor = useMemo<AuthCtx>(() => {
    const perfil = usuario?.perfil;
    return {
      usuario,
      carregando,
      entrar,
      sair,
      trocarSenha,
      podeEditar: perfil === 'admin' || perfil === 'editor',
      podeExcluir: perfil === 'admin',
      ehAdmin: perfil === 'admin',
    };
  }, [usuario, carregando, entrar, sair, trocarSenha]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
