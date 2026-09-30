import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
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
