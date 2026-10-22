import { useState, type FormEvent } from 'react';
import { AlertCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { CartaoAcesso, mensagemDeErro } from './Login';

/** Tela obrigatoria no primeiro acesso (e depois de uma redefinicao de senha pelo administrador). */
export default function TrocarSenha() {
  const { usuario, trocarSenha, sair } = useAuth();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    if (nova !== confirmar) {
      setErro('A confirmação não confere com a nova senha.');
      return;
    }
    setEnviando(true);
    try {
      await trocarSenha(atual, nova);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível trocar a senha.'));
    } finally {
      setEnviando(false);
    }
  };

  const campo = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <CartaoAcesso
      titulo="Defina a sua senha"
      subtitulo={`Olá, ${usuario?.nome ?? ''}. Por segurança, troque a senha provisória antes de continuar.`}
    >
      <form onSubmit={enviar} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Senha atual (provisória)</span>
          <input type="password" value={atual} onChange={e => setAtual(e.target.value)} autoComplete="current-password" required maxLength={128} className={campo} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Nova senha</span>
          <input type="password" value={nova} onChange={e => setNova(e.target.value)} autoComplete="new-password" required minLength={8} maxLength={64} className={campo} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Repita a nova senha</span>
          <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} autoComplete="new-password" required maxLength={64} className={campo} />
        </label>
        <p className="flex items-start gap-1.5 text-[11px] text-gray-500">
          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Pelo menos 8 caracteres, com letras e números, e diferente do login.
        </p>
        {erro && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}
        <button type="submit" disabled={enviando} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {enviando ? 'Salvando...' : 'Salvar nova senha'}
        </button>
        <button type="button" onClick={sair} className="w-full text-center text-xs text-gray-500 hover:text-gray-800">
          Sair
        </button>
      </form>
    </CartaoAcesso>
  );
}
