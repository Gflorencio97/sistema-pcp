import { useAuth } from '../auth/AuthContext';

/** O que o perfil do usuario logado pode fazer na tela. O backend aplica as mesmas regras (403). */
export function usePermissoes() {
  const { podeEditar, podeExcluir, ehAdmin, usuario } = useAuth();
  return { podeEditar, podeExcluir, ehAdmin, perfil: usuario?.perfil };
}
