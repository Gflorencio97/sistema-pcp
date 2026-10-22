import { Outlet } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { KeyRound, LogOut, UserCircle } from 'lucide-react';
import { mensagemDeErro } from '../pages/Login';
import Sidebar from './Sidebar';
import { useAuth } from '../auth/AuthContext';

const ROTULO_PERFIL: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  visualizador: 'Visualizador',
};

function TrocarSenhaModal({ onFechar }: { onFechar: () => void }) {
  const { trocarSenha } = useAuth();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const campo = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

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
      setOk(true);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível trocar a senha.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Trocar a minha senha</h2>
        {ok ? (
          <div className="mt-4 space-y-4">
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Senha alterada. Você continua conectado neste computador; as outras sessões foram encerradas.</p>
            <div className="flex justify-end"><button onClick={onFechar} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Fechar</button></div>
          </div>
        ) : (
          <form onSubmit={enviar} className="mt-4 space-y-3">
            <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">Senha atual</span>
              <input type="password" value={atual} onChange={e => setAtual(e.target.value)} autoComplete="current-password" required maxLength={128} className={campo} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">Nova senha</span>
              <input type="password" value={nova} onChange={e => setNova(e.target.value)} autoComplete="new-password" required minLength={8} maxLength={64} className={campo} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">Repita a nova senha</span>
              <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} autoComplete="new-password" required maxLength={64} className={campo} /></label>
            <p className="text-[11px] text-gray-500">Pelo menos 8 caracteres, com letras e números, e diferente do login.</p>
            {erro && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onFechar} className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={enviando} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">Salvar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Layout() {
  const { usuario, sair } = useAuth();
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Usuario logado */}
        <header className="flex shrink-0 items-center justify-end gap-3 border-b border-gray-200 bg-white px-6 py-2 text-sm">
          <UserCircle className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-gray-800">{usuario?.nome}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
            {ROTULO_PERFIL[usuario?.perfil ?? ''] ?? usuario?.perfil}
          </span>
          <button
            onClick={() => setTrocandoSenha(true)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <KeyRound className="h-3.5 w-3.5" /> Trocar senha
          </button>
          <button
            onClick={sair}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>

        {/* Rodapé Global */}
        <footer className="border-t border-gray-200/80 bg-white/70 backdrop-blur-xs px-6 py-2.5 text-[11px] text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-1 shrink-0 select-none">
          <span>© {new Date().getFullYear()} Evoluttion Automotive — Sistema de Planejamento e Controle da Produção</span>
          <span>
            Desenvolvido por <strong className="font-semibold text-gray-800">Gabriel Florêncio</strong> • TI Evoluttion
          </span>
        </footer>
      </div>
      {trocandoSenha && <TrocarSenhaModal onFechar={() => setTrocandoSenha(false)} />}
    </div>
  );
}
