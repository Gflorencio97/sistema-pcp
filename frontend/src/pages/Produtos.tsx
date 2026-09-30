import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, AlertCircle, Check, SlidersHorizontal, Settings2 } from 'lucide-react';
import { produtoService } from '../services/produtoService';
import { roteiroService } from '../services/roteiroService';
import { maquinaService } from '../services/maquinaService';
import type { Produto, ProdutoCreate } from '../types';

function ProdutoForm({ initial, onSave, onCancel }: {
  initial?: Partial<ProdutoCreate>;
  onSave: (data: ProdutoCreate) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ProdutoCreate>({
    codigo: initial?.codigo ?? '',
    nome: initial?.nome ?? '',
    codigo_fundido: initial?.codigo_fundido ?? '',
    descricao: initial?.descricao ?? '',
    unidade_medida: initial?.unidade_medida ?? 'UN',
    ativo: initial?.ativo ?? true,
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Código do Produto *</label>
          <input
            value={form.codigo}
            onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: EVCM-7013"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Nome do Produto *</label>
          <input
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Carcaça Mecânica 7013"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Código Fundido (Matéria-prima)</label>
          <input
            value={form.codigo_fundido ?? ''}
            onChange={e => setForm(f => ({ ...f, codigo_fundido: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: EVFCM-0118"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Unidade de Medida</label>
          <input
            value={form.unidade_medida}
            onChange={e => setForm(f => ({ ...f, unidade_medida: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="UN, KG, PC..."
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Descrição / Observações</label>
        <textarea
          value={form.descricao ?? ''}
          onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={form.ativo}
          onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
          className="rounded"
        />
        Produto ativo
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

function RoteiroModal({ produto, onClose }: { produto: Produto; onClose: () => void }) {
  const qc = useQueryClient();
  const [itens, setItens] = useState<{
    operacao_codigo: string;
    operacao_nome: string;
    pcs_hora: string;
    maquina_id: number | null;
    ativo: boolean;
  }[]>([]);
  const [salvoSucesso, setSalvoSucesso] = useState(false);

  const { data: roteiroData = [], isLoading } = useQuery({
    queryKey: ['roteiro', produto.id],
    queryFn: () => roteiroService.obterRoteiro(produto.id),
  });

  const { data: maquinas = [] } = useQuery({
    queryKey: ['maquinas', 'ativas'],
    queryFn: () => maquinaService.listar({ status: 'ativa' }),
  });

  useEffect(() => {
    if (roteiroData.length > 0) {
      setItens(
        roteiroData.map(r => ({
          operacao_codigo: r.operacao_codigo,
          operacao_nome: r.operacao_nome,
          pcs_hora: r.pcs_hora ? String(r.pcs_hora) : '',
          maquina_id: r.maquina_id ?? null,
          ativo: r.ativo,
        }))
      );
    }
  }, [roteiroData]);

  const salvarMutation = useMutation({
    mutationFn: () => {
      const payload = itens.map(i => ({
        operacao_codigo: i.operacao_codigo,
        pcs_hora: i.pcs_hora && Number(i.pcs_hora) > 0 ? Number(i.pcs_hora) : null,
        maquina_id: i.maquina_id,
        ativo: i.ativo,
      }));
      return roteiroService.salvarRoteiroCompleto(produto.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roteiro', produto.id] });
      setSalvoSucesso(true);
      setTimeout(() => setSalvoSucesso(false), 2500);
    },
  });

  const handlePcsChange = (index: number, val: string) => {
    setItens(prev => {
      const next = [...prev];
      next[index] = { ...next[index], pcs_hora: val };
      return next;
    });
  };

  const handleMaquinaChange = (index: number, val: string) => {
    const maquinaId = val ? Number(val) : null;
    setItens(prev => {
      const next = [...prev];
      next[index] = { ...next[index], maquina_id: maquinaId };
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Roteiro de Produção & Vínculo de Máquinas</h2>
            <p className="text-xs text-gray-500">
              Produto: <span className="font-semibold text-gray-700">{produto.codigo}</span> — {produto.nome}
              {produto.codigo_fundido && <span className="ml-2 text-blue-600 font-mono">(Fundido: {produto.codigo_fundido})</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs text-gray-500">
          Configure a taxa de produção (<strong>pçs/h</strong>) e selecione a <strong>Máquina / Linha</strong> encarregada de cada etapa.
        </p>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">Carregando operações...</div>
        ) : (
          <div className="space-y-3">
            {itens.map((item, idx) => {
              const pcs = Number(item.pcs_hora);
              const minPorPeca = pcs > 0 ? ((1 / pcs) * 60).toFixed(2) : null;

              // Máquinas compatíveis com essa operação para sugerir no topo
              const maquinasSugeridas = maquinas.filter(m => !m.operacao_codigo || m.operacao_codigo === item.operacao_codigo);
              const outrasMaquinas = maquinas.filter(m => m.operacao_codigo && m.operacao_codigo !== item.operacao_codigo);

              return (
                <div
                  key={item.operacao_codigo}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{item.operacao_nome}</span>
                      <div className="text-[11px] text-gray-400 font-mono">{item.operacao_codigo}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Seleção de Máquina */}
                    <div className="flex items-center gap-1.5">
                      <Settings2 className="h-4 w-4 text-gray-400" />
                      <select
                        value={item.maquina_id ?? ''}
                        onChange={e => handleMaquinaChange(idx, e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[190px]"
                      >
                        <option value="">Sem máquina definida</option>
                        {maquinasSugeridas.length > 0 && (
                          <optgroup label="Linhas recomendadas">
                            {maquinasSugeridas.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.nome} ({m.horas_por_dia || 17.15}h/dia)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {outrasMaquinas.length > 0 && (
                          <optgroup label="Outras máquinas">
                            {outrasMaquinas.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.nome}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    {/* Taxa de Peças/Hora */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.pcs_hora}
                        onChange={e => handlePcsChange(idx, e.target.value)}
                        placeholder="0"
                        className="w-20 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-right text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-500">pçs/h</span>
                    </div>

                    {/* Tempo por peça */}
                    <div className="min-w-[90px] text-right text-xs">
                      {minPorPeca ? (
                        <span className="font-semibold text-blue-700">{minPorPeca} min/pç</span>
                      ) : (
                        <span className="text-gray-300 italic text-[11px]">Inativo</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {salvoSucesso && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 border border-green-200">
            <Check className="h-4 w-4" /> Roteiro e máquinas salvos com sucesso!
          </div>
        )}

        {salvarMutation.error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" /> Erro ao salvar roteiro. Tente novamente.
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t pt-4 border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => salvarMutation.mutate()}
            disabled={salvarMutation.isPending}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {salvarMutation.isPending ? 'Salvando...' : 'Salvar Roteiro'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Produtos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; produto?: Produto }>({ open: false });
  const [roteiroModalProduto, setRoteiroModalProduto] = useState<Produto | null>(null);

  const { data: produtos = [], isLoading, error: queryError } = useQuery({
    queryKey: ['produtos', search],
    queryFn: () => produtoService.listar({ search: search || undefined }),
  });

  const criar = useMutation({
    mutationFn: produtoService.criar,
    onSuccess: (novoProd) => {
      qc.invalidateQueries({ queryKey: ['produtos'] });
      setModal({ open: false });
      setRoteiroModalProduto(novoProd);
    },
  });

  const atualizar = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProdutoCreate> }) => produtoService.atualizar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos'] });
      setModal({ open: false });
    },
  });

  const deletar = useMutation({
    mutationFn: produtoService.deletar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  });

  const handleSave = (data: ProdutoCreate) => {
    if (modal.produto) {
      atualizar.mutate({ id: modal.produto.id, data });
    } else {
      criar.mutate(data);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500">Cadastre produtos e vincule as máquinas e taxas de produção de cada etapa</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Novo Produto
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm border border-gray-100">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por nome, código ou fundido..."
          className="flex-1 text-sm focus:outline-none"
        />
      </div>

      {queryError && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          Erro ao conectar com a API de produtos. Verifique se o backend está rodando.
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Código</th>
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Matéria-Prima (Fundido)</th>
              <th className="px-4 py-3 font-semibold">Unidade</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Roteiro & Máquinas</th>
              <th className="px-4 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Carregando produtos...
                </td>
              </tr>
            ) : produtos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Nenhum produto cadastrado ainda. Clique em "Novo Produto" para começar.
                </td>
              </tr>
            ) : (
              produtos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">{p.codigo}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nome}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">
                    {p.codigo_fundido || <span className="text-gray-300 italic">Não informado</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.unidade_medida}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setRoteiroModalProduto(p)}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      title="Definir máquinas e peças por hora"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Configurar Roteiro
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ open: true, produto: p })}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        title="Editar dados cadastrais"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir o produto ${p.nome}?`)) {
                            deletar.mutate(p.id);
                          }
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Excluir produto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Cadastro/Edição Produto */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {modal.produto ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <ProdutoForm
              initial={modal.produto}
              onSave={handleSave}
              onCancel={() => setModal({ open: false })}
            />
            {(criar.error || atualizar.error) && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" /> Erro ao salvar produto. Verifique se o código já existe.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Roteiro de Produção */}
      {roteiroModalProduto && (
        <RoteiroModal
          produto={roteiroModalProduto}
          onClose={() => setRoteiroModalProduto(null)}
        />
      )}
    </div>
  );
}
