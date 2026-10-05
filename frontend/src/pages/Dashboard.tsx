import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, differenceInCalendarDays, isPast, isToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Factory,
  Package,
  Clock,
  Play,
  Gauge,
  Calendar,
  Calculator,
  ArrowUpRight,
  ShieldAlert,
  Flame,
  ChevronRight,
  Sparkles,
  Layers,
  Activity,
  Check,
  Users,
} from 'lucide-react';
import { ordemService } from '../services/ordemService';
import { maquinaService } from '../services/maquinaService';
import { produtoService } from '../services/produtoService';
import { cargaMaquinaService } from '../services/cargaMaquinaService';
import type { OrdemProducao, CargaSetorItem, CargaMaquinaItem } from '../types';

export default function Dashboard() {
  const hoje = new Date();

  // Queries
  const { data: carga } = useQuery({
    queryKey: ['carga-maquina-resumo', 22],
    queryFn: () => cargaMaquinaService.obterResumo({ dias_uteis: 22 }),
  });

  const { data: ordens = [] } = useQuery({
    queryKey: ['ordens'],
    queryFn: () => ordemService.listar(),
  });

  const { data: maquinas = [] } = useQuery({
    queryKey: ['maquinas'],
    queryFn: () => maquinaService.listar(),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => produtoService.listar(),
  });

  // Métricas e processamento de Ordens
  const resumoOrdens = useMemo(() => {
    const total = ordens.length;
    const emAndamento = ordens.filter((o) => o.status === 'em_andamento');
    const planejadas = ordens.filter((o) => o.status === 'planejada');
    const concluidas = ordens.filter((o) => o.status === 'concluida');
    const pausadas = ordens.filter((o) => o.status === 'pausada');
    const urgentes = ordens.filter((o) => o.prioridade === 'urgente' || o.prioridade === 'alta');

    // Total de peças planejadas e produzidas
    const totalPecasPlanejadas = ordens.reduce((acc, o) => acc + (o.quantidade_planejada || 0), 0);
    const totalPecasProduzidas = ordens.reduce((acc, o) => acc + (o.quantidade_produzida || 0), 0);

    // Próximas entregas (ativas, ordenadas por data de fim)
    const ativasComData = ordens
      .filter((o) => (o.status === 'em_andamento' || o.status === 'planejada') && o.data_fim_planejada)
      .sort((a, b) => new Date(a.data_fim_planejada!).getTime() - new Date(b.data_fim_planejada!).getTime());

    // Entregas da semana (próximos 7 dias)
    const seteDiasDepois = addDays(hoje, 7);
    const entregasSemana = ativasComData.filter((o) => {
      const d = new Date(o.data_fim_planejada!);
      return d <= seteDiasDepois;
    });

    // Ordens atrasadas (data_fim_planejada no passado e não concluída)
    const atrasadas = ativasComData.filter((o) => {
      const d = new Date(o.data_fim_planejada!);
      return isPast(d) && !isToday(d);
    });

    return {
      total,
      emAndamento,
      planejadas,
      concluidas,
      pausadas,
      urgentes,
      totalPecasPlanejadas,
      totalPecasProduzidas,
      ativasComData,
      entregasSemana,
      atrasadas,
    };
  }, [ordens, hoje]);

  // Lista unificada de todas as máquinas calculadas na carga
  const todasMaquinasCarga = useMemo(() => {
    if (!carga?.setores) return [];
    return carga.setores.flatMap((s) => s.maquinas);
  }, [carga]);

  // Máquinas críticas em sobrecarga (>100%)
  const maquinasCriticas = useMemo(() => {
    return todasMaquinasCarga.filter((m) => m.status_capacidade === 'sobrecarga');
  }, [todasMaquinasCarga]);

  // Setor gargalo da fábrica
  const setorGargalo = useMemo(() => {
    if (!carga?.setores || carga.setores.length === 0) return null;
    return [...carga.setores].sort((a, b) => b.percentual_ocupacao - a.percentual_ocupacao)[0];
  }, [carga]);

  // Máquinas mais carregadas (top 4)
  const maquinasTopCarga = useMemo(() => {
    return [...todasMaquinasCarga]
      .sort((a, b) => b.percentual_ocupacao - a.percentual_ocupacao)
      .slice(0, 4);
  }, [todasMaquinasCarga]);

  const percentualGeral = carga?.percentual_ocupacao_total ?? 0;

  return (
    <div className="space-y-7 pb-10">
      
      {/* CABEÇALHO EXECUTIVO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-500 text-white shadow-md shadow-blue-500/20">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Central de Comando PCP
              </h1>
              <p className="text-xs text-gray-500">
                Fábrica Evoluttion • {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {/* Ações Rápidas de Topo */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/calculadora"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <Calculator className="h-3.5 w-3.5 text-blue-600" />
            Calcular Pedido
          </Link>

          <Link
            to="/carga-maquina"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <Gauge className="h-3.5 w-3.5 text-emerald-600" />
            Carga Máquina
          </Link>

          <Link
            to="/programacao"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            <Calendar className="h-3.5 w-3.5" />
            Abrir Gantt
          </Link>
        </div>
      </div>

      {/* BANNER DE ALERTA SE HOUVER SOBRECARGA OU ATRASO */}
      {(resumoOrdens.atrasadas.length > 0 || maquinasCriticas.length > 0) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4.5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-rose-100 p-2 text-rose-600 mt-0.5">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">
                Pontos de Atenção Crítica no PCP
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-rose-800">
                {resumoOrdens.atrasadas.length > 0 && (
                  <span>
                    ⚠️ <strong>{resumoOrdens.atrasadas.length} OP(s)</strong> com prazo de término vencido.
                  </span>
                )}
                {maquinasCriticas.length > 0 && (
                  <span>
                    🔥 <strong>{maquinasCriticas.length} máquina(s)</strong> em sobrecarga (&gt;100% da capacidade mensal).
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link
            to="/carga-maquina"
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors shrink-0"
          >
            Analisar Sobrecarga
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* 6 CARDS KPIS EXECUTIVOS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        
        {/* Card 1: Utilização Global da Fábrica */}
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Ocupação Geral
            </span>
            <div className={`rounded-lg p-2 ${
              percentualGeral >= 100
                ? 'bg-rose-100 text-rose-700'
                : percentualGeral >= 80
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              <Gauge className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-gray-900 tracking-tight">
                {percentualGeral}%
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {Math.round(carga?.horas_ocupadas_total ?? 0)}h / {Math.round(carga?.horas_disponiveis_total ?? 0)}h
            </p>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentualGeral >= 100
                  ? 'bg-rose-600'
                  : percentualGeral >= 80
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, percentualGeral)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Lotes em Andamento */}
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Em Produção
            </span>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <Play className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-blue-700 tracking-tight">
              {resumoOrdens.emAndamento.length}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">
              {resumoOrdens.emAndamento.reduce((a, b) => a + (b.quantidade_planejada || 0), 0).toLocaleString('pt-BR')} peças em máquina
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-700 font-semibold">
            <span>{resumoOrdens.planejadas.length} aguardando início</span>
          </div>
        </div>

        {/* Card 3: Entregas da Semana */}
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Prazo 7 Dias
            </span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-700 tracking-tight">
              {resumoOrdens.entregasSemana.length}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">
              lote{resumoOrdens.entregasSemana.length === 1 ? '' : 's'} com entrega prevista
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-800 font-medium">
            <Calendar className="h-3 w-3" />
            <span>Foco de expedição</span>
          </div>
        </div>

        {/* Card 4: Gargalo Atual da Fábrica */}
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Setor Gargalo
            </span>
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-black text-gray-900 tracking-tight block truncate">
              {setorGargalo?.setor_nome ?? 'Equilibrado'}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">
              Ocupação: <strong className="text-gray-800">{setorGargalo?.percentual_ocupacao ?? 0}%</strong>
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-gray-500">
            <span>{setorGargalo?.maquinas?.length ?? 0} máquinas alocadas</span>
          </div>
        </div>

        {/* Card 5: Lotes Alta / Urgente */}
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Prioritários
            </span>
            <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-purple-700 tracking-tight">
              {resumoOrdens.urgentes.length}
            </span>
            <p className="text-[11px] text-gray-400 mt-1">
              ordens com prioridade alta/urgente
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-purple-700 font-medium">
            <span>Sequenciamento prioritário</span>
          </div>
        </div>

        {/* Card 6: Chão de Fábrica & MOD */}
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Equipe Fabril (MOD)
            </span>
            <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-gray-900 tracking-tight">
                {carga?.total_mod_disponivel ?? 35}
              </span>
              <span className="text-xs font-bold text-gray-500">operadores</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Demanda: <strong className="text-gray-700">{carga?.total_mod_necessaria.toFixed(1) ?? '0.0'} op.</strong> ({carga?.percentual_ocupacao_mod_total.toFixed(1) ?? '0.0'}% ocupação)
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-purple-700 font-semibold">
            <Check className="h-3.5 w-3.5 text-purple-600" />
            <span>{(carga?.saldo_mod_total ?? 0) >= 0 ? `Folga de +${carga?.saldo_mod_total.toFixed(1)} op.` : `Déficit de ${carga?.saldo_mod_total.toFixed(1)} op.!`}</span>
          </div>
        </div>

      </div>

      {/* BLOCO CENTRAL: PAINEL DE SETORES & CRONOGRAMA DE ENTREGAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA (7 colunas): Capacidade e Ocupação por Setor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-blue-600" />
                  Balanço de Capacidade por Setor Industrial
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Comparativo de horas de máquinas vs. mão de obra para 22 dias úteis
                </p>
              </div>
              <Link
                to="/carga-maquina"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Detalhar <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Lista dos Setores com Barras de Progresso e Indicador de MOD */}
            <div className="space-y-4">
              {carga?.setores.map((setor: CargaSetorItem) => {
                const pct = setor.percentual_ocupacao;
                const ehSobrecarga = pct >= 100;
                const ehAtencao = pct >= 80 && pct < 100;

                return (
                  <div key={setor.operacao_codigo ?? setor.setor_nome} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{setor.setor_nome}</span>
                        <span className="text-[10px] text-gray-400">
                          ({setor.maquinas.length} máq. • {setor.mod_disponivel} op.)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 font-mono">
                          {Math.round(setor.horas_ocupadas)}h / {Math.round(setor.horas_disponiveis)}h
                        </span>
                        <span
                          className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded-md ${
                            ehSobrecarga
                              ? 'bg-rose-100 text-rose-800'
                              : ehAtencao
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-50 text-blue-800'
                          }`}
                        >
                          {pct}%
                        </span>
                        <span
                          title={`Mão de Obra Direta: ${setor.mod_necessaria.toFixed(1)} de ${setor.mod_disponivel} operadores`}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            setor.status_mod === 'sobrecarga'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          MOD: {setor.percentual_ocupacao_mod.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ehSobrecarga
                            ? 'bg-rose-500'
                            : ehAtencao
                            ? 'bg-amber-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linhas com Maior Demanda */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Top Máquinas com Maior Ocupação
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {maquinasTopCarga.map((m: CargaMaquinaItem) => (
                  <div
                    key={m.maquina_id}
                    className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-semibold text-gray-400 block truncate">
                        {m.codigo}
                      </span>
                      <span className="text-xs font-bold text-gray-800 block truncate mt-0.5">
                        {m.nome}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-sm font-black text-gray-900">
                        {m.percentual_ocupacao}%
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {Math.round(m.horas_ocupadas)}h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* COLUNA DIREITA (5 colunas): Próximas Entregas e Foco de Expedição */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Próximas Entregas & Expedição
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Lotes com prazo programado mais próximo
                </p>
              </div>
              <Link
                to="/programacao"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Gantt <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {resumoOrdens.ativasComData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-center">
                <Clock className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-xs">Nenhuma ordem com prazo agendado no momento.</p>
                <Link
                  to="/programacao"
                  className="mt-3 text-xs text-blue-600 font-semibold hover:underline"
                >
                  Lançar ordem na programação
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[460px] pr-1">
                {resumoOrdens.ativasComData.slice(0, 6).map((ordem: OrdemProducao) => {
                  const dataFim = new Date(ordem.data_fim_planejada!);
                  const diasRestantes = differenceInCalendarDays(dataFim, hoje);
                  const vencida = diasRestantes < 0;
                  const hojeVence = diasRestantes === 0;

                  const pctReal = ordem.quantidade_planejada > 0
                    ? Math.round(((ordem.quantidade_produzida || 0) / ordem.quantidade_planejada) * 100)
                    : 0;

                  return (
                    <div
                      key={ordem.id}
                      className="rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 p-3 transition-colors flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900">{ordem.numero}</span>
                          {ordem.produto?.codigo && (
                            <span className="font-mono text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded font-medium">
                              {ordem.produto.codigo}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            vencida
                              ? 'bg-rose-100 text-rose-800'
                              : hojeVence
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-50 text-blue-800'
                          }`}
                        >
                          {vencida
                            ? `Atrasada (${Math.abs(diasRestantes)}d)`
                            : hojeVence
                            ? 'Vence Hoje'
                            : `Em ${diasRestantes} dias`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="truncate text-gray-700 font-medium">
                          {ordem.produto?.nome ?? 'Produto'}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono shrink-0 ml-2">
                          {ordem.quantidade_planejada.toLocaleString('pt-BR')} pçs
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                        <span>Linha: <strong>{ordem.maquina?.nome ?? 'A definir'}</strong></span>
                        <span className="font-semibold text-gray-700">{pctReal}% concluído</span>
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pctReal >= 100 ? 'bg-emerald-500' : pctReal > 0 ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                          style={{ width: `${pctReal}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 text-center">
              <Link
                to="/ordens"
                className="text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors"
              >
                Ver todas as ordens de produção →
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* BLOCO INFERIOR: STATUS DA CARTEIRA & NAVEGAÇÃO DE CADASTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Distribuição da Carteira */}
        <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-blue-600" />
            Distribuição da Carteira
          </h3>
          <div className="space-y-2 text-xs pt-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total de OPs em Sistema:</span>
              <strong className="text-gray-900 font-mono">{resumoOrdens.total}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Volume Total em Peças:</span>
              <strong className="text-gray-900 font-mono">
                {resumoOrdens.totalPecasPlanejadas.toLocaleString('pt-BR')} pçs
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Peças Já Produzidas:</span>
              <strong className="text-emerald-700 font-mono">
                {resumoOrdens.totalPecasProduzidas.toLocaleString('pt-BR')} pçs
              </strong>
            </div>
          </div>
        </div>

        {/* Card 2: Máquinas e Turnos */}
        <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Factory className="h-4 w-4 text-emerald-600" />
              Parque Fabril Evoluttion
            </h3>
            <Link to="/maquinas" className="text-xs text-blue-600 font-semibold hover:underline">
              Ver
            </Link>
          </div>
          <div className="space-y-2 text-xs pt-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Máquinas Cadastradas:</span>
              <strong className="text-gray-900 font-mono">{maquinas.length}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Regime de Turnos:</span>
              <span className="text-xs font-bold text-gray-800">2 turnos (17,15 h/dia)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Capacidade Mensal Fábrica:</span>
              <strong className="text-blue-700 font-mono">
                {Math.round(carga?.horas_disponiveis_total ?? 0)} horas
              </strong>
            </div>
          </div>
        </div>

        {/* Card 3: Produtos & Roteiros */}
        <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-purple-600" />
              Engenharia & Roteiros
            </h3>
            <Link to="/produtos" className="text-xs text-blue-600 font-semibold hover:underline">
              Ver
            </Link>
          </div>
          <div className="space-y-2 text-xs pt-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Produtos no Catálogo:</span>
              <strong className="text-gray-900 font-mono">{produtos.length}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Operações Padrão:</span>
              <span className="text-xs font-bold text-gray-800">6 etapas industriais</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Importação Excel:</span>
              <span className="text-xs font-semibold text-emerald-600">Disponível para carga</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
