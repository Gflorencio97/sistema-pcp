import { Outlet } from 'react-router-dom';
import { LogOut, UserCircle } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../auth/AuthContext';

const ROTULO_PERFIL: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  visualizador: 'Visualizador',
};

export default function Layout() {
  const { usuario, sair } = useAuth();

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
    </div>
  );
}
