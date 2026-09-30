import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { maquinaService } from '../services/maquinaService';
import type { Maquina, MaquinaCreate } from '../types';

const STATUS_LABEL: Record<string, string> = { ativa: 'Ativa', manutencao: 'Manutenção', inativa: 'Inativa' };
const STATUS_COLOR: Record<string, string> = {
  ativa: 'bg-green-100 text-green-700',
  manutencao: 'bg-yellow-100 text-yellow-700',
  inativa: 'bg-gray-100 text-gray-600',
};

function MaquinaForm({ initial, onSave, onCancel }: {
  initial?: Partial<MaquinaCreate>;
  onSave: (data: MaquinaCreate) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<MaquinaCreate>({
    codigo: initial?.codigo ?? '',
    nome: initial?.nome ?? '',
    descricao: initial?.descricao ?? '',
    setor: initial?.setor ?? '',
    capacidade_hora: initial?.capacidade_hora,
    status: initial?.status ?? 'ativa',
    turno_manha: initial?.turno_manha ?? true,
    turno_tarde: initial?.turno_tarde ?? true,
    turno_noite: initial?.turno_noite ?? false,
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Código *</label>
          <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="MAQ-001" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Nome *</label>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Torno CNC 1" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Setor</label>
          <input value={form.setor ?? ''} onChange={e => setForm(f => ({ ...f, setor: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Usinagem" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Capacidade (un/h)</label>
          <input type="number" value={form.capacidade_hora ?? ''} onChange={e => setForm(f => ({ ...f, capacidade_hora: e.target.value ? Number(e.target.value) : undefined }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="100" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="ativa">Ativa</option>
          <option value="manutencao">Manutenção</option>
          <option value="inativa">Inativa</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Turnos</label>
        <div className="flex gap-4">
          {([['turno_manha', 'Manhã'], ['turno_tarde', 'Tarde'], ['turno_noite', 'Noite']] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                className="rounded" />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
        <button onClick={() => onSave(form)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Salvar</button>
      </div>
    </div>
  );
}

export default function Maquinas() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; maquina?: Maquina }>({ open: false });

  const { data: maquinas = [], isLoading } = useQuery({
    queryKey: ['maquinas', search],
    queryFn: () => maquinaService.listar({ search: search || undefined }),
  });

  const criar = useMutation({
    mutationFn: maquinaService.criar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maquinas'] }); setModal({ open: false }); },
  });

  const atualizar = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MaquinaCreate> }) => maquinaService.atualizar(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maquinas'] }); setModal({ open: false }); },
  });

  const deletar = useMutation({
    mutationFn: maquinaService.deletar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maquinas'] }),
  });

  const handleSave = (data: MaquinaCreate) => {
    if (modal.maquina) {
      atualizar.mutate({ id: modal.maquina.id, data });
    } else {
      criar.mutate(data);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Máquinas</h1>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Nova Máquina
        </button>
      </div>

      {/* Busca */}
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm border border-gray-100">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por nome ou código..."
          className="flex-1 text-sm focus:outline-none"
        />
      </div>

      {/* Tabela */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Código</th>
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Setor</th>
              <th className="px-4 py-3 font-semibold">Turnos</th>
              <th className="px-4 py-3 font-semibold">Capacidade</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Carregando...</td></tr>
            ) : maquinas.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Nenhuma máquina cadastrada.</td></tr>
            ) : maquinas.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-gray-700">{m.codigo}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{m.nome}</td>
                <td className="px-4 py-3 text-gray-500">{m.setor ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {[m.turno_manha && 'M', m.turno_tarde && 'T', m.turno_noite && 'N'].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{m.capacidade_hora ? `${m.capacidade_hora} un/h` : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[m.status]}`}>
                    {STATUS_LABEL[m.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setModal({ open: true, maquina: m })}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (confirm(`Excluir ${m.nome}?`)) deletar.mutate(m.id); }}
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

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {modal.maquina ? 'Editar Máquina' : 'Nova Máquina'}
            </h2>
            <MaquinaForm
              initial={modal.maquina}
              onSave={handleSave}
              onCancel={() => setModal({ open: false })}
            />
            {(criar.error || atualizar.error) && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                Erro ao salvar. Verifique os dados.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
