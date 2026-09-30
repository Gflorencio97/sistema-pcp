import { Link, useLocation } from 'react-router-dom';
import { Factory, Settings, Package, Calendar, LayoutDashboard, Calculator, Gauge, BookOpen } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/carga-maquina', label: 'Carga Máquina', icon: Gauge },
  { to: '/programacao', label: 'Programação', icon: Calendar },
  { to: '/calculadora', label: 'Calculadora', icon: Calculator },
  { to: '/ordens', label: 'Ordens de Produção', icon: Factory },
  { to: '/maquinas', label: 'Máquinas', icon: Settings },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/ajuda', label: 'Guia & Manual', icon: BookOpen },
];


export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-700">
        <Factory className="h-7 w-7 text-blue-400" />
        <div>
          <div className="text-sm font-bold leading-tight">PCP Sistema</div>
          <div className="text-[10px] text-gray-400 leading-tight">Controle de Produção</div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 px-5 py-3 text-[10px] text-gray-500">
        v1.0.0 — PCP Evoluttion
      </div>
    </aside>
  );
}
