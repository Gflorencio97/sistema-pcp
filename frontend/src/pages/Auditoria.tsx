import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { authService } from '../services/authService';
import type { AuditoriaRegistro } from '../types';

const ENTIDADES = [
  { valor: 'produto', rotulo: 'Produtos' },
  { valor: 'roteiro', rotulo: 'Roteiros' },
  { valor: 'maquina', rotulo: 'Máquinas' },
  { valor: 'setor_mod', rotulo: 'Setores MOD' },
  { valor: 'ordem', rotulo: 'Ordens' },
  { valor: 'usuario', rotulo: 'Usuários' },
];
const ACOES = [
  { valor: 'criar', rotulo: 'Criou' },
  { valor: 'editar', rotulo: 'Editou' },
  { valor: 'excluir', rotulo: 'Excluiu' },
  { valor: 'login', rotulo: 'Entrou' },
  { valor: 'login_falhou', rotulo: 'Falha de login' },
];
const COR_ACAO: Record<string, string> = {
  criar: 'bg-emerald-100 text-emerald-700',
  editar: 'bg-blue-100 text-blue-700',
  excluir: 'bg-red-100 text-red-700',
  login: 'bg-gray-100 text-gray-600',
  login_falhou: 'bg-amber-100 text-amber-700',
};
const POR_PAGINA = 50;

function Detalhes({ r }: { r: AuditoriaRegistro }) {
  const chaves = Array.from(new Set([...Object.keys(r.dados_antes ?? {}), ...Object.keys(r.dados_depois ?? {})]));
  if (chaves.length === 0) return <span className="text-gray-400">Sem detalhes.</span>;
  const fmt = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return (
    <table className="text-xs">
      <thead><tr className="text-left text-gray-400"><th className="pr-6">Campo</th><th className="pr-6">Antes</th><th>Depois</th></tr></thead>
      <tbody>
        {chaves.map(c => (
          <tr key={c}>
            <td className="pr-6 font-mono text-gray-600">{c}</td>
            <td className="pr-6 text-red-700">{fmt(r.dados_antes?.[c])}</td>
            <td className="text-emerald-700">{fmt(r.dados_depois?.[c])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Auditoria() {
  const [usuarioId, setUsuarioId] = useState('');
  const [entidade, setEntidade] = useState('');
  const [acao, setAcao] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [pagina, setPagina] = useState(0);
  const [aberto, setAberto] = useState<number | null>(null);

  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios'], queryFn: authService.listarUsuarios });
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['auditoria', usuarioId, entidade, acao, de, ate, pagina],
    queryFn: () => authService.consultarAuditoria({
      usuario_id: usuarioId ? Number(usuarioId) : undefined,
      entidade: entidade || undefined,
      acao: acao || undefined,
      data_inicio: de ? `${de}T00:00:00` : undefined,
      data_fim: ate ? `${ate}T23:59:59` : undefined,
      skip: pagina * POR_PAGINA,
      limit: POR_PAGINA,
    }),
  });

  const campo = 'rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none';
  const mudou = (fn: (v: string) => void) => (e: { target: { value: string } }) => { fn(e.target.value); setPagina(0); };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
        <p className="text-sm text-gray-500">Quem fez o quê e quando. Os registros mais recentes aparecem primeiro.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <label className="text-xs text-gray-500">Usuário
          <select value={usuarioId} onChange={mudou(setUsuarioId)} className={`${campo} mt-1 block`}>
            <option value="">Todos</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.login})</option>)}
          </select></label>
        <label className="text-xs text-gray-500">O que
          <select value={entidade} onChange={mudou(setEntidade)} className={`${campo} mt-1 block`}>
            <option value="">Tudo</option>
            {ENTIDADES.map(e => <option key={e.valor} value={e.valor}>{e.rotulo}</option>)}
          </select></label>
        <label className="text-xs text-gray-500">Ação
          <select value={acao} onChange={mudou(setAcao)} className={`${campo} mt-1 block`}>
            <option value="">Todas</option>
            {ACOES.map(a => <option key={a.valor} value={a.valor}>{a.rotulo}</option>)}
          </select></label>
        <label className="text-xs text-gray-500">De
          <input type="date" value={de} onChange={mudou(setDe)} className={`${campo} mt-1 block`} /></label>
        <label className="text-xs text-gray-500">Até
          <input type="date" value={ate} onChange={mudou(setAte)} className={`${campo} mt-1 block`} /></label>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="w-8 px-2 py-3" />
              <th className="px-4 py-3 font-semibold">Data e hora</th>
              <th className="px-4 py-3 font-semibold">Usuário</th>
              <th className="px-4 py-3 font-semibold">Ação</th>
              <th className="px-4 py-3 font-semibold">Registro</th>
              <th className="px-4 py-3 font-semibold">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Carregando...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
            ) : registros.map(r => {
              const tem = !!(r.dados_antes || r.dados_depois);
              const isAberto = aberto === r.id;
              return (
                <Fragment key={r.id}>
                  <tr className={tem ? 'cursor-pointer hover:bg-gray-50' : ''} onClick={() => tem && setAberto(isAberto ? null : r.id)}>
                    <td className="px-2 py-3 text-gray-400">{tem && (isAberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{r.data_hora ? format(new Date(r.data_hora), 'dd/MM/yyyy HH:mm:ss') : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.usuario_login ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_ACAO[r.acao] ?? 'bg-gray-100 text-gray-600'}`}>{ACOES.find(a => a.valor === r.acao)?.rotulo ?? r.acao}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-700">{r.entidade ? `${ENTIDADES.find(e => e.valor === r.entidade)?.rotulo ?? r.entidade} #${r.entidade_id ?? ''}` : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.ip ?? '—'}</td>
                  </tr>
                  {isAberto && (
                    <tr className="bg-gray-50"><td />
                      <td colSpan={5} className="px-4 py-3"><Detalhes r={r} /></td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-sm">
        <button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40">Anterior</button>
        <span className="text-xs text-gray-500">Página {pagina + 1}</span>
        <button disabled={registros.length < POR_PAGINA} onClick={() => setPagina(p => p + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40">Próxima</button>
      </div>
    </div>
  );
}
