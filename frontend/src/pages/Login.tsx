import { useState, type FormEvent } from 'react';
import { Factory, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function CartaoAcesso({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 rounded-2xl bg-gray-900 p-3">
              <Factory className="h-8 w-8 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-gray-900">Evoluttion Automotive</div>
            <div className="text-xs text-gray-500">Sistema de Planejamento e Controle da Produção</div>
            <h1 className="mt-5 text-base font-semibold text-gray-800">{titulo}</h1>
            <p className="mt-1 text-xs text-gray-500">{subtitulo}</p>
          </div>
          {children}
        </div>
      </main>
      <footer className="px-6 py-4 text-center text-[11px] text-gray-500">
        Desenvolvido por <strong className="font-semibold text-gray-800">Gabriel Florêncio</strong> • TI Evoluttion
      </footer>
    </div>
  );
}

export function mensagemDeErro(e: unknown, padrao: string): string {
  const detalhe = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detalhe === 'string') return detalhe;
  if (Array.isArray(detalhe) && detalhe[0]?.msg) return String(detalhe[0].msg);
  return padrao;
}

export default function Login() {
  const { entrar } = useAuth();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(login.trim(), senha);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível entrar. Confira a conexão com o servidor.'));
      setSenha('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoAcesso titulo="Acesso ao sistema" subtitulo="Entre com o seu login e a sua senha.">
      <form onSubmit={enviar} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Login</span>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
            <User className="h-4 w-4 text-gray-400" />
            <input
              value={login}
              onChange={e => setLogin(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              maxLength={50}
              className="w-full text-sm focus:outline-none"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Senha</span>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
            <Lock className="h-4 w-4 text-gray-400" />
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              autoComplete="current-password"
              required
              maxLength={128}
              className="w-full text-sm focus:outline-none"
            />
          </div>
        </label>
        {erro && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </CartaoAcesso>
  );
}
