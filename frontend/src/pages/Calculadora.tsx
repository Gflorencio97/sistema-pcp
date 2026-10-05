import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calculator,
  Clock,
  AlertCircle,
  Settings2,
  CalendarCheck,
  Zap,
  Play,
  CheckCircle2,
  Gauge,
  Calendar,
  X
} from 'lucide-react';
import { produtoService } from '../services/produtoService';
import { roteiroService } from '../services/roteiroService';
import { ordemService } from '../services/ordemService';
import { addBusinessDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CalculoHorasResponse, PrioridadeOrdem } from '../types';

const BAR_COLORS: Record<string, string> = {
  USINAGEM:    '#3b82f6',
  FUR_INC:     '#8b5cf6',
  FUR_07:      '#ec4899',
  BRUNIMENTO:  '#f97316',
  ROLETAMENTO: '#10b981',
  LAV_INSP:    '#6b7280',
};

function HorasBar({ horas, total }: { horas: number; total: number }) {
  const pct = total > 0 ? (horas / total) * 100 : 0;
  return (
    <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
      <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Calculadora() {
  const [produtoId, setProdutoId] = useState<number>(0);
  const [quantidade, setQuantidade] = useState<number>(0);
  const [resultado, setResultado] = useState<CalculoHorasResponse | null>(null);

  // Estados do Modal de Lançar Produção
  const [modalLancar, setModalLancar] = useState(false);
  const [numeroOp, setNumeroOp] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeOrdem>('normal');
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(addBusinessDays(new Date(), 5), 'yyyy-MM-dd'));
  const [observacoes, setObservacoes] = useState('');
  const [ordemCriadaSucesso, setOrdemCriadaSucesso] = useState<{ numero: string } | null>(null);

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => produtoService.listar({ ativo: true }),
  });

  const calcular = useMutation({
    mutationFn: () => roteiroService.calcularHoras({ produto_id: produtoId, quantidade }),
    onSuccess: (data) => {
      setResultado(data);
      setOrdemCriadaSucesso(null);
    },
  });

  // Operações com horas
  const operacoesComHoras = resultado?.operacoes.filter(o => o.horas_necessarias && o.horas_necessarias > 0) ?? [];
  const etapaGargalo = operacoesComHoras.length > 0
    ? operacoesComHoras.reduce((prev, curr) => ((curr.horas_necessarias || 0) > (prev.horas_necessarias || 0) ? curr : prev))
    : null;

  const diasGargalo = etapaGargalo?.dias_necessarios ? Math.ceil(etapaGargalo.dias_necessarios) : 0;
  const dataPrevisaoConclusao = diasGargalo > 0 ? addBusinessDays(new Date(), diasGargalo) : null;

  // Primeira máquina do processo (geralmente Usinagem)
  const primeiraMaquina = resultado?.operacoes.find(o => o.maquina_id)?.maquina_id;

  const abrirModalLancar = () => {
    const prod = produtos.find(p => p.id === produtoId);
    setNumeroOp(prod ? `${prod.codigo}.0` : '00000.0');
    if (dataPrevisaoConclusao) {
      setDataFim(format(dataPrevisaoConclusao, 'yyyy-MM-dd'));
    }
    setModalLancar(true);
  };

  const lancarProducaoMutation = useMutation({
    mutationFn: () => {
      return ordemService.criar({
        numero: numeroOp,
        produto_id: produtoId,
        maquina_id: primeiraMaquina || undefined,
        quantidade_planejada: quantidade,
        prioridade: prioridade,
        data_inicio_planejada: new Date(`${dataInicio}T07:00:00Z`).toISOString(),
        data_fim_planejada: new Date(`${dataFim}T17:00:00Z`).toISOString(),
        observacoes: observacoes || undefined,
      });
    },
    onSuccess: (op) => {
      setModalLancar(false);
      setOrdemCriadaSucesso({ numero: op.numero });
    },
  });

  const podeCalcular = produtoId > 0 && quantidade > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Topo */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-600 p-2.5">
          <Calculator className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calculadora & Lançamento de Produção</h1>
          <p className="text-sm text-gray-500">Calcule as horas por etapa e lance o pedido diretamente na programação da fábrica</p>
        </div>
      </div>

      {/* Formulário de Cálculo */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Produto</label>
            <select
              value={produtoId}
              onChange={e => {
                setProdutoId(Number(e.target.value));
                setResultado(null);
                setOrdemCriadaSucesso(null);
              }}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Quantidade (peças)</label>
            <input
              type="number"
              min={1}
              value={quantidade || ''}
              onChange={e => {
                setQuantidade(Number(e.target.value));
                setResultado(null);
                setOrdemCriadaSucesso(null);
              }}
              placeholder="Ex: 4000"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={() => calcular.mutate()}
          disabled={!podeCalcular || calcular.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {calcular.isPending ? 'Calculando...' : (
            <><Calculator className="h-4 w-4" /> Calcular Horas e Carga Máquina</>
          )}
        </button>

        {calcular.error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Erro ao calcular. Verifique se o produto tem roteiro cadastrado.
          </div>
        )}
      </div>

      {/* Banner de Sucesso ao Lançar Ordem */}
      {ordemCriadaSucesso && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-emerald-900 shadow-sm animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-600 p-2 text-white">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  Ordem {ordemCriadaSucesso.numero} lançada com sucesso!
                </h3>
                <p className="text-sm text-emerald-700 mt-0.5">
                  As horas foram distribuídas nas máquinas correspondentes da sua fábrica.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              to="/carga-maquina"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition"
            >
              <Gauge className="h-4 w-4" />
              Ver no Dashboard de Carga Máquina
            </Link>
            <Link
              to="/programacao"
              className="flex items-center gap-1.5 rounded-xl bg-white border border-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
            >
              <Calendar className="h-4 w-4" />
              Ver no Gantt / Programação
            </Link>
          </div>
        </div>
      )}

      {/* Resultado do Cálculo */}
      {resultado && (
        <div className="space-y-4">
          {/* Header do Resultado com Botão de Ação */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Resultado do Cálculo</span>
              <h2 className="text-xl font-bold text-gray-900">{resultado.produto_nome}</h2>
              <p className="text-sm text-gray-500">
                Lote de <strong className="text-gray-800">{resultado.quantidade.toLocaleString('pt-BR')} peças</strong> · Total de{' '}
                <strong className="text-blue-600">{resultado.total_horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} horas</strong>
              </p>
            </div>

            <button
              onClick={abrirModalLancar}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition"
            >
              <Play className="h-4 w-4 fill-white" />
              Lançar na Produção
            </button>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total de Produção</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-600">
                  {resultado.total_horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h
                </span>
                <span className="text-xs text-gray-500">({resultado.quantidade.toLocaleString('pt-BR')} peças)</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">Soma de todas as operações</p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5" />
                Etapa Gargalo
              </div>
              <div className="mt-1">
                <span className="text-lg font-bold text-gray-900">
                  {etapaGargalo ? etapaGargalo.operacao_nome : '—'}
                </span>
                {etapaGargalo && (
                  <div className="text-xs text-gray-500">
                    {etapaGargalo.horas_necessarias?.toFixed(1)}h
                    {etapaGargalo.maquina_nome ? ` na ${etapaGargalo.maquina_nome}` : ''}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 uppercase tracking-wider">
                <CalendarCheck className="h-3.5 w-3.5" />
                Previsão de Conclusão
              </div>
              <div className="mt-1">
                <span className="text-lg font-bold text-gray-900">
                  {dataPrevisaoConclusao ? format(dataPrevisaoConclusao, "dd 'de' MMMM", { locale: ptBR }) : '—'}
                </span>
                <div className="text-xs text-gray-500">
                  {diasGargalo > 0 ? `~${diasGargalo} dias úteis (base: ${etapaGargalo?.maquina_horas_por_dia || 17.15}h/dia)` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Operações & Máquinas */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Detalhamento por Operação & Máquina Alocada
            </h2>

            <div className="space-y-3">
              {resultado.operacoes.map((op) => (
                <div key={op.operacao_codigo} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: BAR_COLORS[op.operacao_codigo] ?? '#cbd5e1' }}
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-800">{op.operacao_nome}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          {op.maquina_nome ? (
                            <span className="flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                              <Settings2 className="h-3 w-3" />
                              {op.maquina_nome}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Nenhuma máquina vinculada</span>
                          )}
                          {op.pcs_hora && (
                            <span className="text-gray-400">· {op.pcs_hora} pçs/h</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm justify-between sm:justify-end">
                      {op.dias_necessarios != null && (
                        <div className="text-right">
                          <span className="text-xs font-semibold text-gray-700">
                            ~{op.dias_necessarios} dias
                          </span>
                          <div className="text-[10px] text-gray-400">
                            ({op.maquina_horas_por_dia || 17.15}h/dia)
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1 font-bold text-gray-900 min-w-[80px] justify-end">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {op.horas_necessarias != null
                          ? `${op.horas_necessarias.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`
                          : <span className="text-gray-300 font-normal">—</span>
                        }
                      </div>
                    </div>
                  </div>

                  {op.horas_necessarias != null && (
                    <HorasBar horas={op.horas_necessarias} total={resultado.total_horas} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Lançamento na Produção */}
      {modalLancar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Play className="h-5 w-5 text-emerald-600 fill-emerald-600" />
                Lançar Ordem na Produção
              </h2>
              <button onClick={() => setModalLancar(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                <strong>Produto:</strong> {resultado?.produto_nome} <br />
                <strong>Lote:</strong> {resultado?.quantidade.toLocaleString('pt-BR')} peças ·{' '}
                <strong>Horas Totais:</strong> {resultado?.total_horas.toFixed(1)}h
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Identificador do Lote / OP *
                </label>
                <input
                  type="text"
                  value={numeroOp}
                  onChange={e => setNumeroOp(e.target.value)}
                  placeholder="Ex: EVCM-7013.0 ou Nº ERP"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Código.0 gerado automaticamente ou digite o número da OP do ERP.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Previsão Término</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Prioridade</label>
                <select
                  value={prioridade}
                  onChange={e => setPrioridade(e.target.value as PrioridadeOrdem)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observações (opcional)</label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  rows={2}
                  placeholder="Ex: Pedido especial do cliente XYZ"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {lancarProducaoMutation.error && (
                <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Erro ao lançar ordem. Verifique se o número da OP já existe ou se há conflito de agenda.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4 border-gray-100">
              <button
                type="button"
                onClick={() => setModalLancar(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => lancarProducaoMutation.mutate()}
                disabled={lancarProducaoMutation.isPending || !numeroOp}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {lancarProducaoMutation.isPending ? 'Lançando...' : 'Confirmar e Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
