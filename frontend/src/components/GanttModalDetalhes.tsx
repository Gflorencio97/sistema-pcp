import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays } from 'date-fns';
import { X, Calendar, Clock, AlertTriangle, CheckCircle2, Play, Pause, Layers, Package, Save } from 'lucide-react';
import { ordemService } from '../services/ordemService';
import type { OrdemGantt, Maquina, StatusOrdem, PrioridadeOrdem } from '../types';

interface GanttModalDetalhesProps {
  ordem: OrdemGantt | null;
  maquinas: Maquina[];
  onClose: () => void;
  onSuccess?: () => void;
}

const STATUS_LABELS: Record<StatusOrdem, { label: string; badge: string }> = {
  planejada: { label: 'Planejada', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  em_andamento: { label: 'Em Andamento', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  pausada: { label: 'Pausada', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  concluida: { label: 'Concluída', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelada: { label: 'Cancelada', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
};

const PRIORIDADE_LABELS: Record<PrioridadeOrdem, { label: string; badge: string }> = {
  urgente: { label: 'Urgente', badge: 'bg-rose-500 text-white' },
  alta: { label: 'Alta', badge: 'bg-amber-500 text-white' },
  normal: { label: 'Normal', badge: 'bg-blue-500 text-white' },
  baixa: { label: 'Baixa', badge: 'bg-gray-400 text-white' },
};

export default function GanttModalDetalhes({ ordem, maquinas, onClose, onSuccess }: GanttModalDetalhesProps) {
  const queryClient = useQueryClient();

  const [maquinaId, setMaquinaId] = useState<number | undefined>(ordem?.maquina_id);
  const [status, setStatus] = useState<StatusOrdem>(ordem?.status ?? 'planejada');
  const [prioridade, setPrioridade] = useState<PrioridadeOrdem>(ordem?.prioridade ?? 'normal');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [qtdProduzida, setQtdProduzida] = useState<number>(ordem?.quantidade_produzida ?? 0);
  const [observacoes, setObservacoes] = useState<string>(ordem?.observacoes ?? '');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (ordem) {
      setMaquinaId(ordem.maquina_id);
      setStatus(ordem.status);
      setPrioridade(ordem.prioridade);
      setQtdProduzida(ordem.quantidade_produzida ?? 0);
      setObservacoes(ordem.observacoes ?? '');
      setErro(null);

      if (ordem.data_inicio_planejada) {
        setDataInicio(ordem.data_inicio_planejada.slice(0, 16));
      } else {
        setDataInicio('');
      }

      if (ordem.data_fim_planejada) {
        setDataFim(ordem.data_fim_planejada.slice(0, 16));
      } else {
        setDataFim('');
      }
    }
  }, [ordem]);

  const updateMutation = useMutation({
    mutationFn: (dados: any) => ordemService.atualizar(ordem!.id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt'] });
      queryClient.invalidateQueries({ queryKey: ['ordens'] });
      queryClient.invalidateQueries({ queryKey: ['carga-maquina-resumo'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErro(err?.response?.data?.detail ?? 'Erro ao salvar alterações da ordem.');
    },
  });

  if (!ordem) return null;

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const payload: any = {
      maquina_id: maquinaId ? Number(maquinaId) : null,
      status,
      prioridade,
      quantidade_produzida: Number(qtdProduzida),
      observacoes: observacoes || null,
    };

    if (dataInicio) {
      payload.data_inicio_planejada = new Date(dataInicio).toISOString();
    }
    if (dataFim) {
      payload.data_fim_planejada = new Date(dataFim).toISOString();
    }

    updateMutation.mutate(payload);
  };

  // Calcular dias de duração planejada
  let duracaoDias: number | null = null;
  if (dataInicio && dataFim) {
    const d1 = new Date(dataInicio);
    const d2 = new Date(dataFim);
    duracaoDias = Math.max(1, differenceInCalendarDays(d2, d1) + 1);
  }

  const percentualCalc = ordem.quantidade_planejada > 0
    ? Math.min(100, Math.round((qtdProduzida / ordem.quantidade_planejada) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm font-bold text-sm">
              OP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{ordem.numero}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${STATUS_LABELS[status]?.badge}`}>
                  {STATUS_LABELS[status]?.label}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PRIORIDADE_LABELS[prioridade]?.badge}`}>
                  {PRIORIDADE_LABELS[prioridade]?.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">Programação & Reagendamento de Linha</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSalvar} className="flex-1 overflow-y-auto p-6 space-y-5">
          {erro && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold">Não foi possível reagendar</p>
                <p className="text-xs text-rose-700 mt-0.5">{erro}</p>
              </div>
            </div>
          )}

          {/* Cartão de Informações do Produto */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-900 font-medium">
              <span className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-blue-600" />
                Produto Fabricado
              </span>
              {ordem.produto_codigo_fundido && (
                <span className="font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px]">
                  Fundido: {ordem.produto_codigo_fundido}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-gray-900 text-sm">
                {ordem.produto_codigo ? `[${ordem.produto_codigo}]` : ''}
              </span>
              <span className="text-sm font-semibold text-gray-800">{ordem.produto_nome}</span>
            </div>
          </div>

          {/* Progresso de Produção */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-gray-700">Progresso do Lote</span>
              <span className="font-bold text-gray-900">
                {qtdProduzida.toLocaleString('pt-BR')} / {ordem.quantidade_planejada.toLocaleString('pt-BR')} pçs ({percentualCalc}%)
              </span>
            </div>
            
            {/* Barra de Progresso */}
            <div className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  percentualCalc >= 100 ? 'bg-emerald-500' : percentualCalc > 0 ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                style={{ width: `${percentualCalc}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Quantidade Produzida (pçs)
                </label>
                <input
                  type="number"
                  min={0}
                  max={ordem.quantidade_planejada * 2}
                  value={qtdProduzida}
                  onChange={(e) => setQtdProduzida(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setQtdProduzida(ordem.quantidade_planejada)}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  Concluir 100%
                </button>
                <button
                  type="button"
                  onClick={() => setQtdProduzida(0)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Zerar
                </button>
              </div>
            </div>
          </div>

          {/* Seleção de Linha / Máquina e Prioridade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-gray-500" />
                Máquina / Linha Alocada
              </label>
              <select
                value={maquinaId ?? ''}
                onChange={(e) => setMaquinaId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Sem máquina definida</option>
                {maquinas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.codigo} — {m.nome} ({m.operacao_codigo ?? m.setor ?? 'Geral'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Trocar de máquina atualiza a carga da linha automaticamente.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Prioridade da Ordem
              </label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as PrioridadeOrdem)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          {/* Datas Planejadas (Gantt Scheduling) */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                Agendamento de Datas (Linha do Tempo)
              </span>
              {duracaoDias !== null && (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  Duração: {duracaoDias} dia{duracaoDias > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Início Planejado
                </label>
                <input
                  type="datetime-local"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Fim Planejado
                </label>
                <input
                  type="datetime-local"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Ações Rápidas de Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Status da Ordem
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setStatus('planejada')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
                  status === 'planejada'
                    ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-300'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Planejada
              </button>

              <button
                type="button"
                onClick={() => setStatus('em_andamento')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
                  status === 'em_andamento'
                    ? 'border-blue-400 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-300'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Play className="h-3.5 w-3.5 text-blue-600" />
                Em Produção
              </button>

              <button
                type="button"
                onClick={() => setStatus('pausada')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
                  status === 'pausada'
                    ? 'border-orange-400 bg-orange-50 text-orange-900 font-bold ring-2 ring-orange-300'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Pause className="h-3.5 w-3.5 text-orange-600" />
                Pausada
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatus('concluida');
                  if (qtdProduzida < ordem.quantidade_planejada) {
                    setQtdProduzida(ordem.quantidade_planejada);
                  }
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
                  status === 'concluida'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-300'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Concluída
              </button>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Observações / Instruções de Fábrica
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Priorizar lote para atender expedição do dia 15..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
          
          <button
            type="button"
            onClick={handleSalvar}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

      </div>
    </div>
  );
}
