import { useState, useMemo } from 'react';
import {
  format,
  addDays,
  startOfDay,
  isSameDay,
  isWeekend,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import type { OrdemGantt, Maquina, StatusOrdem, PrioridadeOrdem } from '../types';

interface GanttChartProps {
  ordens: OrdemGantt[];
  maquinas: Maquina[];
  dataInicio: Date;
  totalDias: number;
  visao: 'maquina' | 'ordem';
  onSelecionarOrdem: (ordem: OrdemGantt) => void;
  ocultarFinaisSemana?: boolean;
}

const SETORES_PADRAO = [
  { codigo: 'USINAGEM', nome: 'Usinagem' },
  { codigo: 'FUR_INC', nome: 'Furação Inclinada' },
  { codigo: 'FUR_07', nome: 'Furação 07' },
  { codigo: 'BRUNIMENTO', nome: 'Brunimento' },
  { codigo: 'ROLETAMENTO', nome: 'Roletamento' },
  { codigo: 'LAV_INSP', nome: 'Lavagem & Inspeção' },
];

const PRIORIDADE_CORES: Record<PrioridadeOrdem, { bg: string; border: string; text: string }> = {
  urgente: { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-white' },
  alta: { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white' },
  normal: { bg: 'bg-blue-600', border: 'border-blue-700', text: 'text-white' },
  baixa: { bg: 'bg-slate-500', border: 'border-slate-600', text: 'text-white' },
};

const STATUS_INDICATOR: Record<StatusOrdem, { borderStyle: string; badge: string }> = {
  planejada: { borderStyle: 'border-dashed border-2', badge: 'bg-amber-100 text-amber-800' },
  em_andamento: { borderStyle: 'border-solid border shadow-sm', badge: 'bg-blue-100 text-blue-800' },
  pausada: { borderStyle: 'border-dotted border-2 opacity-75', badge: 'bg-orange-100 text-orange-800' },
  concluida: { borderStyle: 'border-solid border opacity-80', badge: 'bg-emerald-100 text-emerald-800' },
  cancelada: { borderStyle: 'line-through opacity-50', badge: 'bg-rose-100 text-rose-800' },
};

export default function GanttChart({
  ordens,
  maquinas,
  dataInicio,
  totalDias,
  visao,
  onSelecionarOrdem,
  ocultarFinaisSemana = false,
}: GanttChartProps) {
  const [setoresAbertos, setSetoresAbertos] = useState<Record<string, boolean>>({
    USINAGEM: true,
    FUR_INC: true,
    FUR_07: true,
    BRUNIMENTO: true,
    ROLETAMENTO: true,
    LAV_INSP: true,
  });

  const hoje = startOfDay(new Date());
  const inicio = startOfDay(dataInicio);

  // Lista de dias da régua
  const todosDias = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < totalDias; i++) {
      const d = addDays(inicio, i);
      if (!ocultarFinaisSemana || !isWeekend(d)) {
        arr.push(d);
      }
    }
    return arr;
  }, [inicio, totalDias, ocultarFinaisSemana]);

  // Largura de cada célula de dia (px)
  const diaWidth = totalDias <= 14 ? 54 : totalDias <= 30 ? 40 : totalDias <= 60 ? 30 : 24;
  const trackWidth = todosDias.length * diaWidth;

  // Agrupamento de meses para o header duplo
  const mesesHeader = useMemo(() => {
    const meses: { chave: string; rotulo: string; qtdDias: number }[] = [];
    let currentChave = '';
    let currentQtd = 0;
    let currentRotulo = '';

    todosDias.forEach((d) => {
      const chave = format(d, 'yyyy-MM');
      const rotulo = format(d, 'MMMM yyyy', { locale: ptBR });

      if (chave !== currentChave) {
        if (currentChave) {
          meses.push({ chave: currentChave, rotulo: currentRotulo, qtdDias: currentQtd });
        }
        currentChave = chave;
        currentRotulo = rotulo;
        currentQtd = 1;
      } else {
        currentQtd++;
      }
    });

    if (currentChave) {
      meses.push({ chave: currentChave, rotulo: currentRotulo, qtdDias: currentQtd });
    }

    return meses;
  }, [todosDias]);

  // Posição de hoje em pixels
  const hojeIdx = todosDias.findIndex((d) => isSameDay(d, hoje));
  const hojeLeftPx = hojeIdx >= 0 ? hojeIdx * diaWidth + diaWidth / 2 : null;

  // Função para calcular posição X e largura de uma ordem
  const calcOrdemPosition = (dataIniStr?: string, dataFimStr?: string) => {
    if (!dataIniStr || !dataFimStr) return null;
    const dIni = startOfDay(new Date(dataIniStr));
    const dFim = startOfDay(new Date(dataFimStr));

    // Encontrar índices no array de dias visíveis
    let startIdx = todosDias.findIndex((d) => isSameDay(d, dIni) || d > dIni);
    if (startIdx === -1) {
      if (dIni > todosDias[todosDias.length - 1]) return null;
      startIdx = 0;
    }

    let endIdx = todosDias.findIndex((d) => isSameDay(d, dFim));
    if (endIdx === -1) {
      if (dFim < todosDias[0]) return null;
      endIdx = todosDias.length - 1;
    }

    if (endIdx < startIdx) {
      endIdx = startIdx;
    }

    const leftPx = startIdx * diaWidth;
    const durDias = Math.max(1, endIdx - startIdx + 1);
    const widthPx = durDias * diaWidth - 4; // margem de 4px

    return { leftPx, widthPx, durDias };
  };

  // Toggle setor
  const toggleSetor = (codigo: string) => {
    setSetoresAbertos((prev) => ({ ...prev, [codigo]: !prev[codigo] }));
  };

  // Identificar conflitos por máquina
  const conflitosPorMaquina = useMemo(() => {
    const mapaConflitos: Record<number, Set<number>> = {}; // maquinaId -> Set de ordemIds em conflito

    maquinas.forEach((m) => {
      const ordensDaMaquina = ordens.filter(
        (o) => o.maquina_id === m.id && o.data_inicio_planejada && o.data_fim_planejada && o.status !== 'cancelada' && o.status !== 'concluida'
      );

      for (let i = 0; i < ordensDaMaquina.length; i++) {
        for (let j = i + 1; j < ordensDaMaquina.length; j++) {
          const o1 = ordensDaMaquina[i];
          const o2 = ordensDaMaquina[j];

          const ini1 = new Date(o1.data_inicio_planejada!).getTime();
          const fim1 = new Date(o1.data_fim_planejada!).getTime();
          const ini2 = new Date(o2.data_inicio_planejada!).getTime();
          const fim2 = new Date(o2.data_fim_planejada!).getTime();

          // Overlap: ini1 < fim2 && fim1 > ini2
          if (ini1 < fim2 && fim1 > ini2) {
            if (!mapaConflitos[m.id]) mapaConflitos[m.id] = new Set();
            mapaConflitos[m.id].add(o1.id);
            mapaConflitos[m.id].add(o2.id);
          }
        }
      }
    });

    return mapaConflitos;
  }, [ordens, maquinas]);

  // Ordens sem máquina
  const ordensSemMaquina = useMemo(() => {
    return ordens.filter((o) => !o.maquina_id);
  }, [ordens]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Wrapper de Scroll Horizontal + Vertical */}
      <div className="overflow-x-auto overflow-y-auto max-h-[72vh] relative">
        <div style={{ width: 280 + trackWidth }} className="flex flex-col select-none">
          
          {/* HEADER DUPLO: Meses e Dias (Sticky Top) */}
          <div className="sticky top-0 z-30 flex bg-white border-b border-gray-200 shadow-xs">
            {/* Coluna fixa do Header */}
            <div className="w-[280px] shrink-0 sticky left-0 z-40 bg-gray-50 border-r border-gray-200 p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 tracking-wide uppercase flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-blue-600" />
                {visao === 'maquina' ? 'Linhas / Máquinas' : 'Ordens de Produção'}
              </span>
              <span className="text-[11px] text-gray-400">
                {todosDias.length} dias
              </span>
            </div>

            {/* Linha do tempo dos Dias */}
            <div className="flex-1 flex flex-col" style={{ width: trackWidth }}>
              {/* Linha 1: Meses */}
              <div className="flex border-b border-gray-100 bg-gray-50/90 text-xs font-semibold text-gray-700">
                {mesesHeader.map((m) => (
                  <div
                    key={m.chave}
                    style={{ width: m.qtdDias * diaWidth }}
                    className="border-r border-gray-200 px-3 py-1.5 capitalize text-center truncate"
                  >
                    {m.rotulo}
                  </div>
                ))}
              </div>

              {/* Linha 2: Dias */}
              <div className="flex bg-white text-[11px]">
                {todosDias.map((d, i) => {
                  const ehFimDeSemana = isWeekend(d);
                  const ehHoje = isSameDay(d, hoje);

                  return (
                    <div
                      key={i}
                      style={{ width: diaWidth }}
                      className={`shrink-0 border-r border-gray-100 py-1.5 text-center flex flex-col items-center justify-center transition-colors ${
                        ehHoje
                          ? 'bg-rose-50 text-rose-700 font-bold border-rose-200'
                          : ehFimDeSemana
                          ? 'bg-gray-100/60 text-gray-400 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title={format(d, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    >
                      <span className="text-[10px] uppercase font-semibold leading-none mb-0.5">
                        {format(d, 'EEEEE', { locale: ptBR })}
                      </span>
                      <span className={`text-xs ${ehHoje ? 'rounded-full bg-rose-600 text-white w-5 h-5 flex items-center justify-center' : ''}`}>
                        {format(d, 'd')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CORPO DO GANTT: LINHAS */}
          <div className="relative flex flex-col divide-y divide-gray-100">
            
            {/* Linha vertical "Hoje" atravessando todo o gráfico */}
            {hojeLeftPx !== null && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: 280 + hojeLeftPx }}
              >
                <div className="h-full w-0.5 bg-rose-500 shadow-sm" />
                <div className="sticky top-11 -ml-3.5 z-30 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md">
                  Hoje
                </div>
              </div>
            )}

            {/* MODO 1: VISÃO POR MÁQUINA */}
            {visao === 'maquina' && (
              <>
                {SETORES_PADRAO.map((setor) => {
                  const maquinasDoSetor = maquinas.filter(
                    (m) => (m.operacao_codigo ?? m.setor ?? '').toUpperCase() === setor.codigo
                  );

                  if (maquinasDoSetor.length === 0) return null;

                  const isAberto = setoresAbertos[setor.codigo] ?? true;

                  // Contar total de OPs ativas no setor
                  const totalOpsSetor = ordens.filter((o) =>
                    maquinasDoSetor.some((m) => m.id === o.maquina_id)
                  ).length;

                  return (
                    <div key={setor.codigo} className="flex flex-col">
                      {/* Cabeçalho do Setor (Colapsável) */}
                      <div
                        onClick={() => toggleSetor(setor.codigo)}
                        className="flex items-center bg-gray-50/90 px-4 py-2 border-y border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-[280px] shrink-0 sticky left-0 z-10 flex items-center gap-2">
                          {isAberto ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                            {setor.nome}
                          </span>
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                            {maquinasDoSetor.length} máquinas
                          </span>
                          {totalOpsSetor > 0 && (
                            <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                              {totalOpsSetor} OP{totalOpsSetor > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Linhas das Máquinas deste setor */}
                      {isAberto &&
                        maquinasDoSetor.map((maquina) => {
                          const ordensDaMaquina = ordens.filter((o) => o.maquina_id === maquina.id);
                          const temConflito = !!conflitosPorMaquina[maquina.id]?.size;

                          return (
                            <div
                              key={maquina.id}
                              className="flex items-stretch hover:bg-gray-50/50 group transition-colors min-h-[58px]"
                            >
                              {/* Coluna Fixa da Máquina */}
                              <div className="w-[280px] shrink-0 sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-200 px-3 py-2.5 flex flex-col justify-center">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-xs text-gray-900 truncate">
                                    {maquina.nome}
                                  </span>
                                  {temConflito && (
                                    <span
                                      className="flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 animate-pulse"
                                      title="Conflito de agendamento: duas ou mais ordens alocadas no mesmo período!"
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                      Conflito
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                                  <span className="font-mono">{maquina.codigo}</span>
                                  <span>•</span>
                                  <span>{maquina.horas_por_dia ?? 17.15}h/dia</span>
                                  {ordensDaMaquina.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="text-blue-600 font-medium">
                                        {ordensDaMaquina.length} OP{ordensDaMaquina.length > 1 ? 's' : ''}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Linha do Tempo da Máquina */}
                              <div
                                className="relative flex-1 py-1.5 flex items-center"
                                style={{ width: trackWidth }}
                              >
                                {/* Grade de colunas de fundo */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                  {todosDias.map((d, i) => (
                                    <div
                                      key={i}
                                      style={{ width: diaWidth }}
                                      className={`shrink-0 border-r border-gray-100 h-full ${
                                        isWeekend(d) ? 'bg-gray-100/40' : ''
                                      }`}
                                    />
                                  ))}
                                </div>

                                {/* Barras das Ordens nesta Máquina */}
                                {ordensDaMaquina.map((ordem, idx) => {
                                  const pos = calcOrdemPosition(
                                    ordem.data_inicio_planejada,
                                    ordem.data_fim_planejada
                                  );
                                  if (!pos) return null;

                                  const ehConflito = conflitosPorMaquina[maquina.id]?.has(ordem.id);
                                  const cor = PRIORIDADE_CORES[ordem.prioridade] ?? PRIORIDADE_CORES.normal;
                                  const statusEstilo = STATUS_INDICATOR[ordem.status] ?? STATUS_INDICATOR.planejada;

                                  // Se houver conflito, desloca verticalmente para não sobrepor totalmente
                                  const topOffset = ehConflito ? (idx % 2 === 0 ? 4 : 28) : 8;
                                  const barHeight = ehConflito ? 22 : 36;

                                  return (
                                    <div
                                      key={ordem.id}
                                      onClick={() => onSelecionarOrdem(ordem)}
                                      style={{
                                        left: pos.leftPx,
                                        width: pos.widthPx,
                                        top: topOffset,
                                        height: barHeight,
                                        minWidth: 42,
                                      }}
                                      className={`absolute z-10 flex items-center justify-between overflow-hidden rounded-lg px-2 text-white shadow-xs cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:shadow-md hover:z-20 ${cor.bg} ${statusEstilo.borderStyle} ${
                                        ehConflito ? 'ring-2 ring-rose-400 ring-offset-1' : ''
                                      }`}
                                      title={`[${ordem.numero}] ${ordem.produto_nome}\nInício: ${format(new Date(ordem.data_inicio_planejada!), 'dd/MM/yyyy')}\nFim: ${format(new Date(ordem.data_fim_planejada!), 'dd/MM/yyyy')} (${pos.durDias} dias)\nProgresso: ${ordem.percentual_conclusao}% (${ordem.quantidade_produzida}/${ordem.quantidade_planejada} pçs)\nPrioridade: ${ordem.prioridade.toUpperCase()}\nStatus: ${ordem.status.toUpperCase()}\n\nClique para detalhes ou reagendar`}
                                    >
                                      {/* Barra de progresso semitransparente interna */}
                                      <div
                                        className="absolute left-0 top-0 bottom-0 bg-white/20 pointer-events-none transition-all duration-300"
                                        style={{ width: `${ordem.percentual_conclusao}%` }}
                                      />

                                      {/* Conteúdo da Barra */}
                                      <div className="relative z-10 flex items-center gap-1.5 truncate text-[11px] font-bold">
                                        {ehConflito && (
                                          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-200 animate-bounce" />
                                        )}
                                        <span className="tracking-tight">{ordem.numero}</span>
                                        {pos.widthPx > 110 && ordem.produto_codigo && (
                                          <span className="font-mono text-[10px] font-normal opacity-90">
                                            • {ordem.produto_codigo}
                                          </span>
                                        )}
                                        {pos.widthPx > 180 && (
                                          <span className="text-[10px] font-medium opacity-85 truncate">
                                            ({ordem.quantidade_planejada.toLocaleString('pt-BR')} pçs)
                                          </span>
                                        )}
                                      </div>

                                      {/* Percentual no canto direito */}
                                      {pos.widthPx > 80 && (
                                        <span className="relative z-10 shrink-0 text-[10px] font-extrabold opacity-95 bg-black/20 rounded px-1 ml-1">
                                          {ordem.percentual_conclusao}%
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}

                {/* Seção de Ordens sem Máquina Definida */}
                {ordensSemMaquina.length > 0 && (
                  <div className="flex flex-col border-t-2 border-amber-200">
                    <div className="flex items-center bg-amber-50/80 px-4 py-2 border-b border-amber-100">
                      <div className="w-[280px] shrink-0 sticky left-0 z-10 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                          Sem Máquina Definida ({ordensSemMaquina.length})
                        </span>
                      </div>
                    </div>

                    {ordensSemMaquina.map((ordem) => {
                      const pos = calcOrdemPosition(
                        ordem.data_inicio_planejada,
                        ordem.data_fim_planejada
                      );

                      return (
                        <div
                          key={ordem.id}
                          className="flex items-stretch hover:bg-amber-50/30 group transition-colors min-h-[50px]"
                        >
                          <div className="w-[280px] shrink-0 sticky left-0 z-10 bg-white group-hover:bg-amber-50/40 border-r border-gray-200 px-3 py-2 flex flex-col justify-center">
                            <span className="font-semibold text-xs text-gray-900">
                              {ordem.numero}
                            </span>
                            <span className="text-[11px] text-amber-700 truncate">
                              {ordem.produto_nome}
                            </span>
                          </div>

                          <div
                            className="relative flex-1 py-1.5 flex items-center"
                            style={{ width: trackWidth }}
                          >
                            <div className="absolute inset-0 flex pointer-events-none">
                              {todosDias.map((d, i) => (
                                <div
                                  key={i}
                                  style={{ width: diaWidth }}
                                  className={`shrink-0 border-r border-gray-100 h-full ${
                                    isWeekend(d) ? 'bg-gray-100/40' : ''
                                  }`}
                                />
                              ))}
                            </div>

                            {pos && (
                              <div
                                onClick={() => onSelecionarOrdem(ordem)}
                                style={{
                                  left: pos.leftPx,
                                  width: pos.widthPx,
                                  minWidth: 42,
                                }}
                                className="absolute z-10 flex h-8 items-center justify-between rounded-lg bg-amber-500 px-2 text-white shadow-xs cursor-pointer hover:bg-amber-600 transition-all hover:scale-[1.01]"
                              >
                                <span className="text-[11px] font-bold truncate">
                                  {ordem.numero} • Selecionar Linha
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* MODO 2: VISÃO POR ORDEM (LINEAR) */}
            {visao === 'ordem' && (
              <>
                {ordens.length === 0 ? (
                  <div className="flex items-center justify-center py-20 text-gray-400">
                    Nenhuma ordem encontrada no período selecionado.
                  </div>
                ) : (
                  ordens.map((ordem) => {
                    const pos = calcOrdemPosition(
                      ordem.data_inicio_planejada,
                      ordem.data_fim_planejada
                    );
                    const cor = PRIORIDADE_CORES[ordem.prioridade] ?? PRIORIDADE_CORES.normal;
                    const statusEstilo = STATUS_INDICATOR[ordem.status] ?? STATUS_INDICATOR.planejada;

                    return (
                      <div
                        key={ordem.id}
                        className="flex items-stretch hover:bg-gray-50 group transition-colors min-h-[58px]"
                      >
                        {/* Coluna Fixa da Ordem */}
                        <div className="w-[280px] shrink-0 sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-200 px-3 py-2 flex flex-col justify-center">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-gray-900">{ordem.numero}</span>
                            <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${statusEstilo.badge}`}>
                              {ordem.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 truncate mt-0.5">
                            {ordem.produto_codigo ? `[${ordem.produto_codigo}] ` : ''}
                            {ordem.produto_nome}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                            <span className="text-blue-600 font-medium">
                              {ordem.maquina_nome ?? 'Sem máquina'}
                            </span>
                            <span>•</span>
                            <span>{ordem.percentual_conclusao}% concluído</span>
                          </div>
                        </div>

                        {/* Linha do Tempo da Ordem */}
                        <div
                          className="relative flex-1 py-1.5 flex items-center"
                          style={{ width: trackWidth }}
                        >
                          <div className="absolute inset-0 flex pointer-events-none">
                            {todosDias.map((d, i) => (
                              <div
                                key={i}
                                style={{ width: diaWidth }}
                                className={`shrink-0 border-r border-gray-100 h-full ${
                                  isWeekend(d) ? 'bg-gray-100/40' : ''
                                }`}
                              />
                            ))}
                          </div>

                          {pos && (
                            <div
                              onClick={() => onSelecionarOrdem(ordem)}
                              style={{
                                left: pos.leftPx,
                                width: pos.widthPx,
                                minWidth: 42,
                              }}
                              className={`absolute z-10 flex h-9 items-center justify-between overflow-hidden rounded-lg px-2 text-white shadow-xs cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${cor.bg} ${statusEstilo.borderStyle}`}
                              title={`${ordem.numero} — ${ordem.produto_nome}\n${pos.durDias} dias (${ordem.quantidade_planejada} pçs)`}
                            >
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-white/20 pointer-events-none"
                                style={{ width: `${ordem.percentual_conclusao}%` }}
                              />
                              <span className="relative z-10 text-[11px] font-bold truncate">
                                {ordem.numero} • {ordem.produto_codigo ?? ordem.produto_nome}
                              </span>
                              <span className="relative z-10 text-[10px] font-extrabold bg-black/20 rounded px-1">
                                {ordem.percentual_conclusao}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

          </div>
        </div>
      </div>

      {/* RODAPÉ DO GANTT COM LEGENDA RICA */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-gray-50/80 px-4 py-3 text-xs text-gray-600">
        {/* Prioridades */}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-700">Prioridade:</span>
          {Object.entries(PRIORIDADE_CORES).map(([p, cor]) => (
            <div key={p} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded-full ${cor.bg}`} />
              <span className="capitalize">{p}</span>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-700">Status:</span>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded border-2 border-dashed border-amber-500 bg-amber-100" />
            <span>Planejada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded border border-blue-600 bg-blue-600" />
            <span>Em Andamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded border-2 border-dotted border-orange-500 bg-orange-200" />
            <span>Pausada</span>
          </div>
        </div>

        {/* Indicadores especiais */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-1 bg-rose-500 rounded" />
            <span className="font-medium text-rose-700">Hoje</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded bg-gray-200 border border-gray-300" />
            <span>Fim de semana</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            <span className="text-rose-700 font-semibold">Conflito de Linha</span>
          </div>
        </div>
      </div>
    </div>
  );
}
