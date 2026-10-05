import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { ordemService } from '../services/ordemService';
import { maquinaService } from '../services/maquinaService';
import { produtoService } from '../services/produtoService';
import { format } from 'date-fns';
import type { OrdemProducao, OrdemCreate } from '../types';

const STATUS_COLOR: Record<string, string> = {
  planejada: 'bg-yellow-100 text-yellow-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
  pausada: 'bg-gray-100 text-gray-600',
};

const PRIORIDADE_COLOR: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700',
  alta: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-50 text-blue-600',
  baixa: 'bg-gray-100 text-gray-500',
};

function OrdemForm({ initial, onSave, onCancel, error }: {
  initial?: Partial<OrdemCreate>;
  onSave: (data: OrdemCreate) => void;
  onCancel: () => void;
  error?: string;
}) {
  const { data: produtos = [] } = useQuery({ queryKey: ['produtos'], queryFn: () => produtoService.listar({ ativo: true }) });
  const { data: maquinas = [] } = useQuery({ queryKey: ['maquinas'], queryFn: () => maquinaService.listar({ status: 'ativa' }) });

  const [form, setForm] = useState<OrdemCreate>({
    numero: initial?.numero ?? '',
    produto_id: initial?.produto_id ?? 0,
    maquina_id: initial?.maquina_id,
    quantidade_planejada: initial?.quantidade_planejada ?? 1,
    prioridade: initial?.prioridade ?? 'normal',
    data_inicio_planejada: initial?.data_inicio_planejada ?? '',
    data_fim_planejada: initial?.data_fim_planejada ?? '',
    observacoes: initial?.observacoes ?? '',
  });

  const handleProdutoChange = (novoId: number) => {
    const prod = produtos.find(p => p.id === novoId);
    setForm(f => {
      let novoNumero = f.numero;
      if (!novoNumero || novoNumero.includes('.')) {
        novoNumero = prod ? `${prod.codigo}.0` : '';
      }
      return {
        ...f,
        produto_id: novoId,
        numero: novoNumero,
      };
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-semibold text-gray-700">Produto Fabricado *</label>
          <select
            value={form.produto_id}
            onChange={e => handleProdutoChange(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value={0}>Selecione o produto...</option>
            {produtos.map(p => (
              <option key={p.id} value={p.id}>
                {p.codigo} — {p.nome} {p.codigo_fundido ? `(Fundido: ${p.codigo_fundido})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">Identificador do Lote / OP *</label>
          <input
            value={form.numero}
            onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: EVCM-7013.0 ou Nº ERP"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">
            Auto-preenchido com código.0 ou digite o nº do ERP.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">Prioridade</label>
          <select
            value={form.prioridade}
            onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as any }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">Linha / Máquina</label>
          <select
            value={form.maquina_id ?? ''}
            onChange={e => setForm(f => ({ ...f, maquina_id: e.target.value ? Number(e.target.value) : undefined }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sem máquina definida</option>
            {maquinas.map(m => (
              <option key={m.id} value={m.id}>
                {m.codigo} — {m.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Qtd. Planejada *</label>
          <input
            type="number"
            min={1}
            value={form.quantidade_planejada}
            onChange={e => setForm(f => ({ ...f, quantidade_planejada: Number(e.target.value) }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div />

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Início Planejado</label>
          <input
            type="datetime-local"
            value={form.data_inicio_planejada?.slice(0, 16) ?? ''}
            onChange={e => setForm(f => ({ ...f, data_inicio_planejada: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Fim Planejado</label>
          <input
            type="datetime-local"
            value={form.data_fim_planejada?.slice(0, 16) ?? ''}
            onChange={e => setForm(f => ({ ...f, data_fim_planejada: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Observações</label>
        <textarea
          value={form.observacoes ?? ''}
          onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
        <button onClick={() => onSave(form)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Salvar</button>
      </div>
    </div>
  );
}

export default function Ordens() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [modal, setModal] = useState<{ open: boolean; ordem?: OrdemProducao }>({ open: false });
  const [formError, setFormError] = useState('');

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ['ordens', search, statusFiltro],
    queryFn: () => ordemService.listar({ search: search || undefined, status: statusFiltro || undefined }),
  });

  const criar = useMutation({
    mutationFn: ordemService.criar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ordens'] }); setModal({ open: false }); setFormError(''); },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? 'Erro ao criar ordem.'),
  });

  const atualizar = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => ordemService.atualizar(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ordens'] }); setModal({ open: false }); setFormError(''); },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? 'Erro ao atualizar ordem.'),
  });

  const deletar = useMutation({
    mutationFn: ordemService.deletar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ordens'] }),
  });

  const handleSave = (data: OrdemCreate) => {
    setFormError('');
    if (modal.ordem) {
      atualizar.mutate({ id: modal.ordem.id, data });
    } else {
      criar.mutate(data);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ordens de Produção</h1>
        <button onClick={() => { setModal({ open: true }); setFormError(''); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Nova Ordem
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl bg-white px-4 py-2 shadow-sm border border-gray-100">
        <Search className="h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por número..." className="flex-1 text-sm focus:outline-none" />
        <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none">
          <option value="">Todos os status</option>
          <option value="planejada">Planejada</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="pausada">Pausada</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Número</th>
              <th className="px-4 py-3 font-semibold">Produto</th>
              <th className="px-4 py-3 font-semibold">Máquina</th>
              <th className="px-4 py-3 font-semibold">Quantidade</th>
              <th className="px-4 py-3 font-semibold">Datas</th>
              <th className="px-4 py-3 font-semibold">Prioridade</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Carregando...</td></tr>
            ) : ordens.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Nenhuma ordem encontrada.</td></tr>
            ) : ordens.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-gray-700">{o.numero}</td>
                <td className="px-4 py-3 text-gray-800">{o.produto?.nome ?? `#${o.produto_id}`}</td>
                <td className="px-4 py-3 text-gray-500">{o.maquina?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {o.quantidade_produzida}/{o.quantidade_planejada}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {o.data_inicio_planejada ? format(new Date(o.data_inicio_planejada), 'dd/MM/yy') : '—'}
                  {o.data_fim_planejada ? ` → ${format(new Date(o.data_fim_planejada), 'dd/MM/yy')}` : ''}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORIDADE_COLOR[o.prioridade]}`}>{o.prioridade}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[o.status]}`}>
                    {o.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setModal({ open: true, ordem: o }); setFormError(''); }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (confirm(`Excluir ${o.numero}?`)) deletar.mutate(o.id); }}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {modal.ordem ? 'Editar Lote / OP' : 'Novo Lote / Ordem de Produção'}
            </h2>
            <OrdemForm
              initial={modal.ordem ? {
                numero: modal.ordem.numero,
                produto_id: modal.ordem.produto_id,
                maquina_id: modal.ordem.maquina_id,
                quantidade_planejada: modal.ordem.quantidade_planejada,
                prioridade: modal.ordem.prioridade,
                data_inicio_planejada: modal.ordem.data_inicio_planejada,
                data_fim_planejada: modal.ordem.data_fim_planejada,
                observacoes: modal.ordem.observacoes,
              } : undefined}
              onSave={handleSave}
              onCancel={() => { setModal({ open: false }); setFormError(''); }}
              error={formError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
