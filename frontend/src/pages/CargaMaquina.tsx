import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Calendar,
  Layers,
  Users,
  UserCheck,
  UserX,
  Sparkles,
  ShieldAlert,
  Check,
  X,
  Edit3,
  HelpCircle,
  Save,
  TrendingUp,
} from 'lucide-react';
import { cargaMaquinaService } from '../services/cargaMaquinaService';
import type { SetorMODUpdate, CargaSetorItem } from '../types';

function BarraCapacidade({ percentual, corPadrao = 'bg-blue-600' }: { percentual: number; corPadrao?: string }) {
  let cor = corPadrao;
  let badgeCor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let texto = 'Normal';

  if (percentual > 100) {
    cor = 'bg-red-500 animate-pulse';
    badgeCor = 'bg-red-50 text-red-700 border-red-200';
    texto = 'Sobrecarga';
  } else if (percentual >= 80) {
    cor = 'bg-amber-500';
    badgeCor = 'bg-amber-50 text-amber-700 border-amber-200';
    texto = 'Atenção';
  } else if (corPadrao === 'bg-blue-600') {
    cor = 'bg-emerald-500';
  }

  const larguraVisual = Math.min(100, percentual);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-gray-800">{percentual.toFixed(1)}%</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeCor}`}>
          {texto}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cor}`}
          style={{ width: `${larguraVisual}%` }}
        />
      </div>
    </div>
  );
}

function BadgeGargalo({ tipo }: { tipo: string }) {
  switch (tipo) {
    case 'critico_total':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
          <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
          Crítico: Falta Máquina & Pessoal
        </span>
      );
    case 'gargalo_mao_de_obra':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
          <UserX className="h-3.5 w-3.5 text-purple-600" />
          Gargalo de Pessoal (MOD)
        </span>
      );
    case 'gargalo_maquina':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Flame className="h-3.5 w-3.5 text-amber-600" />
          Gargalo Físico de Máquina
        </span>
      );
    case 'atencao':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
          Atenção (Próximo do Limite)
        </span>
      );
    case 'equilibrado':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Capacidade Equilibrada
        </span>
      );
  }
}

export default function CargaMaquina() {
  const queryClient = useQueryClient();
  const [diasUteis, setDiasUteis] = useState<number>(22);
  const [horasDia, setHorasDia] = useState<number>(8.8);
  const [abaAtiva, setAbaAtiva] = useState<'maquina' | 'homem_maquina'>('homem_maquina');
  const [modalAjusteMODAberto, setModalAjusteMODAberto] = useState(false);
  const [valoresEdicaoMOD, setValoresEdicaoMOD] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['carga-maquina', diasUteis, horasDia],
    queryFn: () => cargaMaquinaService.obterResumo({ dias_uteis: diasUteis, horas_dia: horasDia }),
  });

  const { data: listaMOD = [] } = useQuery({
    queryKey: ['setores-mod'],
    queryFn: () => cargaMaquinaService.listarMOD(),
  });

  const mutationSalvarMOD = useMutation({
    mutationFn: (updates: SetorMODUpdate[]) => cargaMaquinaService.atualizarMOD(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carga-maquina'] });
      queryClient.invalidateQueries({ queryKey: ['setores-mod'] });
      queryClient.invalidateQueries({ queryKey: ['carga-maquina-resumo'] });
      setModalAjusteMODAberto(false);
    },
  });

  const abrirModalAjuste = () => {
    const estadoInicial: Record<string, number> = {};
    listaMOD.forEach((s) => {
      estadoInicial[s.operacao_codigo] = s.quantidade_operadores;
    });
    setValoresEdicaoMOD(estadoInicial);
    setModalAjusteMODAberto(true);
  };

  const salvarAjusteEquipe = () => {
    const updates: SetorMODUpdate[] = Object.entries(valoresEdicaoMOD).map(([opCod, qtd]) => ({
      operacao_codigo: opCod,
      quantidade_operadores: Number(qtd) || 0,
      horas_dia_operador: 8.8,
    }));
    mutationSalvarMOD.mutate(updates);
  };

  const totalOperadoresEditados = Object.values(valoresEdicaoMOD).reduce((acc, v) => acc + (Number(v) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-600 p-2 text-white">
              <Gauge className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Carga Máquina & Homem (MOD)</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Balanço de capacidade fabril: 1º Turno (8,8 h/dia) • {diasUteis} dias úteis
          </p>
        </div>

        {/* Controles de Parâmetros do Mês & Botão Ajustar Equipe */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={abrirModalAjuste}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 shadow-xs transition"
          >
            <Users className="h-4 w-4" />
            <span>Ajustar Equipe (MOD)</span>
          </button>

          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">Dias Úteis:</span>
              <select
                value={diasUteis}
                onChange={(e) => setDiasUteis(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[19, 20, 21, 22, 23, 24, 25].map((d) => (
                  <option key={d} value={d}>
                    {d} dias
                  </option>
                ))}
              </select>
            </div>

            <div className="h-4 w-[1px] bg-gray-200" />

            <div className="flex items-center gap-1.5 px-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">Turno:</span>
              <select
                value={horasDia}
                onChange={(e) => setHorasDia(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={8.8}>1º Turno (8.8h/dia) — Atual</option>
                <option value={17.15}>2 Turnos (17.15h/dia)</option>
                <option value={24.0}>3 Turnos (24.0h/dia)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Selector: Homem x Máquina vs Carga Máquina Focada */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setAbaAtiva('homem_maquina')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            abaAtiva === 'homem_maquina'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>👥 Balanço Homem × Máquina (MOD)</span>
          {data && data.setores_sobrecarregados_mod > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-700 font-extrabold">
              {data.setores_sobrecarregados_mod}
            </span>
          )}
        </button>

        <button
          onClick={() => setAbaAtiva('maquina')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition ${
            abaAtiva === 'maquina'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Gauge className="h-4 w-4" />
          <span>🏭 Carga Máquina (Horas & Linhas)</span>
        </button>
      </div>

      {isLoading || !data ? (
        <div className="py-20 text-center text-sm text-gray-400">
          Calculando balanço de capacidade fabril e mão de obra...
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* ABA 1: BALANÇO HOMEM X MÁQUINA (MOD) */}
          {/* ============================================================== */}
          {abaAtiva === 'homem_maquina' && (
            <div className="space-y-6">
              {/* Callout Explicativo da Regra Fabril */}
              <div className="rounded-2xl bg-linear-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 p-4 text-purple-950 flex items-start gap-3 shadow-xs">
                <Sparkles className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong className="font-bold text-purple-900 block text-sm mb-0.5">
                    Como funciona o cálculo de Mão de Obra Direta (MOD)?
                  </strong>
                  Cada operador trabalha <strong>{horasDia.toFixed(2)} horas/dia</strong> (1º Turno operacional). Em um mês com{' '}
                  <strong>{diasUteis} dias úteis</strong>, a capacidade mensal de cada operador é de{' '}
                  <strong>{(diasUteis * horasDia).toFixed(1)} horas/mês</strong>. A{' '}
                  <strong>MOD Necessária</strong> reflete quantos operadores são necessários para cumprir as horas de máquina programadas.
                </div>
              </div>

              {/* Cards de KPIs Principais de MOD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Equipe Disponível */}
                <div className="rounded-2xl bg-white p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Efetivo Disponível
                    </span>
                    <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900">
                      {data.total_mod_disponivel}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">operadores</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {data.horas_mod_disponiveis_total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}h disponíveis/mês
                  </p>
                </div>

                {/* 2. Equipe Necessária */}
                <div className="rounded-2xl bg-white p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      MOD Necessária
                    </span>
                    <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                      <UserCheck className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-indigo-700">
                      {data.total_mod_necessaria.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">operadores</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {data.horas_ocupadas_total.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h demandadas
                  </p>
                </div>

                {/* 3. Taxa de Ocupação da Equipe */}
                <div className="rounded-2xl bg-white p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Ocupação da MOD
                    </span>
                    <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-blue-600">
                      {data.percentual_ocupacao_mod_total.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500">da equipe</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-purple-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, data.percentual_ocupacao_mod_total)}%` }}
                    />
                  </div>
                </div>

                {/* 4. Saldo Geral de Equipe */}
                <div className="rounded-2xl bg-white p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Saldo de Pessoal
                    </span>
                    <div
                      className={`rounded-lg p-2 ${
                        data.saldo_mod_total >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {data.saldo_mod_total >= 0 ? <Check className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-extrabold ${
                        data.saldo_mod_total >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {data.saldo_mod_total >= 0 ? `+${data.saldo_mod_total.toFixed(1)}` : data.saldo_mod_total.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500">operadores</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {data.saldo_mod_total >= 0 ? 'Folga operacional na fábrica' : 'Déficit geral de mão de obra!'}
                  </p>
                </div>

                {/* 5. Setores com Sobrecarga */}
                <div className="rounded-2xl bg-white p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Gargalo de Pessoal
                    </span>
                    <div
                      className={`rounded-lg p-2 ${
                        data.setores_sobrecarregados_mod > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-extrabold ${
                        data.setores_sobrecarregados_mod > 0 ? 'text-rose-600' : 'text-gray-800'
                      }`}
                    >
                      {data.setores_sobrecarregados_mod}
                    </span>
                    <span className="text-xs text-gray-500">setores</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {data.setores_sobrecarregados_mod > 0
                      ? 'Operadores insuficientes para a demanda'
                      : 'Nenhum setor com falta de pessoal'}
                  </p>
                </div>
              </div>

              {/* Alerta de Déficit de MOD */}
              {data.setores_sobrecarregados_mod > 0 && (
                <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-900 shadow-xs">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                  <div className="text-sm">
                    <strong className="font-bold">Atenção Crítica de Mão de Obra:</strong> Existem{' '}
                    {data.setores_sobrecarregados_mod} setor(es) onde a carga de máquinas exige mais operadores do que o
                    efetivo atual. As máquinas podem ficar paradas por falta de operadores. Considere remanejar operadores ou horas extras.
                  </div>
                </div>
              )}

              {/* Matriz Comparativa Setor por Setor: Homem x Máquina */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-purple-600" />
                    Balanço Setorial Homem × Máquina
                  </h2>
                  <span className="text-xs text-gray-500">
                    Base: {(diasUteis * 8.35).toFixed(1)}h/mês por operador
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {data.setores.map((setor: CargaSetorItem) => {
                    const saldoPessoal = setor.mod_saldo;
                    const temFaltaPessoal = saldoPessoal < 0;

                    return (
                      <div
                        key={setor.setor_nome}
                        className="rounded-2xl bg-white border border-gray-200 shadow-xs overflow-hidden hover:shadow-md transition"
                      >
                        {/* Topo do Card do Setor */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50/80 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                              <Users className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-gray-900">{setor.setor_nome}</h3>
                                <BadgeGargalo tipo={setor.tipo_gargalo} />
                              </div>
                              <span className="text-xs text-gray-500">
                                {setor.maquinas.length} linha(s) de produção • {setor.mod_disponivel} operador(es) alocado(s)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={abrirModalAjuste}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-purple-600" />
                              Ajustar Efetivo
                            </button>
                          </div>
                        </div>

                        {/* Corpo com Grid Comparativo: Máquina vs Mão de Obra */}
                        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          {/* Coluna 1: Capacidade de Máquinas (5 colunas) */}
                          <div className="lg:col-span-5 rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Gauge className="h-4 w-4 text-blue-600" />
                                1. Capacidade de Máquinas
                              </span>
                              <span className="text-xs font-bold text-gray-800">
                                {setor.horas_ocupadas.toFixed(1)}h / {setor.horas_disponiveis.toFixed(0)}h
                              </span>
                            </div>

                            <BarraCapacidade percentual={setor.percentual_ocupacao} />

                            <div className="text-[11px] text-gray-500 flex justify-between border-t border-gray-200/60 pt-2">
                              <span>Total de Equipamentos: <strong>{setor.maquinas.length} linhas</strong></span>
                              <span>Disponibilidade: <strong>{horasDia}h/dia</strong></span>
                            </div>
                          </div>

                          {/* Divisor Visual de Comparação (2 colunas) */}
                          <div className="lg:col-span-2 flex flex-col items-center justify-center text-center">
                            <div className="h-6 w-[1px] bg-gray-200 hidden lg:block" />
                            <div className="rounded-full bg-purple-100 px-3 py-1 text-[11px] font-bold text-purple-800 border border-purple-200 my-1">
                              VS
                            </div>
                            <div className="h-6 w-[1px] bg-gray-200 hidden lg:block" />
                          </div>

                          {/* Coluna 2: Mão de Obra Direta (MOD) (5 colunas) */}
                          <div className="lg:col-span-5 rounded-xl border border-purple-100 bg-purple-50/30 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-purple-600" />
                                2. Mão de Obra Direta (MOD)
                              </span>
                              <div className="text-right">
                                <span className="text-xs font-extrabold text-purple-950">
                                  {setor.mod_necessaria.toFixed(2)} / {setor.mod_disponivel} op.
                                </span>
                              </div>
                            </div>

                            <BarraCapacidade percentual={setor.percentual_ocupacao_mod} corPadrao="bg-purple-600" />

                            <div className="text-[11px] flex justify-between items-center border-t border-purple-200/60 pt-2">
                              <span className="text-gray-500">
                                Horas MOD: <strong>{setor.horas_mod_disponivel.toFixed(0)}h disp.</strong>
                              </span>
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full ${
                                  temFaltaPessoal ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {temFaltaPessoal
                                  ? `Faltam ${Math.abs(saldoPessoal).toFixed(2)} op.`
                                  : `Folga de +${saldoPessoal.toFixed(2)} op.`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Rodapé com Diagnóstico Textual Rápido */}
                        <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="h-4 w-4 text-gray-400 shrink-0" />
                            <span>
                              {setor.tipo_gargalo === 'critico_total' &&
                                '🚨 Ambas as capacidades (máquinas e operadores) estão estouradas neste setor.'}
                              {setor.tipo_gargalo === 'gargalo_mao_de_obra' &&
                                '⚠️ As máquinas têm tempo disponível, mas falta equipe de operadores para rodar toda a carga.'}
                              {setor.tipo_gargalo === 'gargalo_maquina' &&
                                '🏭 Há operadores suficientes, mas o tempo físico das máquinas deste setor está saturado.'}
                              {setor.tipo_gargalo === 'atencao' &&
                                '⚠️ O setor opera próximo do limite seguro de capacidade (80% a 99%).'}
                              {setor.tipo_gargalo === 'equilibrado' &&
                                '✅ Setor equilibrado com folga saudável de máquinas e equipe.'}
                            </span>
                          </div>

                          <span className="font-mono text-[11px] text-gray-400">
                            Demanda: {setor.horas_ocupadas.toFixed(1)}h
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 2: CARGA MÁQUINA TRADICIONAL (HORAS & LINHAS) */}
          {/* ============================================================== */}
          {abaAtiva === 'maquina' && (
            <div className="space-y-6">
              {/* Cards de KPIs Principais de Máquina */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-white p-5 shadow-xs border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Disponibilidade Total
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {data.horas_disponiveis_total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}h
                    </span>
                    <span className="text-xs text-gray-500">no mês</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {data.total_maquinas} máquinas ativas × {(diasUteis * horasDia).toFixed(0)}h
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-xs border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Ocupação Alocada
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-600">
                      {data.horas_ocupadas_total.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h
                    </span>
                    <span className="text-xs text-blue-500 font-medium">
                      ({data.percentual_ocupacao_total.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-blue-600"
                      style={{ width: `${Math.min(100, data.percentual_ocupacao_total)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-xs border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Saldo Livre de Fábrica
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-bold ${
                        data.saldo_horas_total >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {data.saldo_horas_total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}h
                    </span>
                    <span className="text-xs text-gray-500">disponíveis</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Capacidade ociosa para novos pedidos</p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-xs border border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status dos Gargalos
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Flame
                        className={`h-5 w-5 ${
                          data.maquinas_sobrecarregadas > 0 ? 'text-red-500' : 'text-gray-300'
                        }`}
                      />
                      <span
                        className={`text-2xl font-bold ${
                          data.maquinas_sobrecarregadas > 0 ? 'text-red-600' : 'text-gray-700'
                        }`}
                      >
                        {data.maquinas_sobrecarregadas}
                      </span>
                      <span className="text-xs text-gray-400">críticas</span>
                    </div>
                    <div className="h-6 w-[1px] bg-gray-200" />
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="text-2xl font-bold text-gray-700">{data.maquinas_normais}</span>
                      <span className="text-xs text-gray-400">ok</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {data.maquinas_sobrecarregadas > 0 ? 'Atenção: Linhas acima de 100%' : 'Nenhum gargalo excedido'}
                  </p>
                </div>
              </div>

              {/* Alerta de Linhas Críticas se houver */}
              {data.maquinas_sobrecarregadas > 0 && (
                <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 p-4 text-red-800">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="text-sm">
                    <strong className="font-semibold">Alerta de Sobrecarga:</strong> Existem{' '}
                    {data.maquinas_sobrecarregadas} máquina(s) com capacidade superior a 100%. Avalie horas extras ou
                    redistribuição de lotes.
                  </div>
                </div>
              )}

              {/* Setores e Linhas com MOD pills */}
              <div className="space-y-6">
                {data.setores.map((setor) => (
                  <div
                    key={setor.setor_nome}
                    className="rounded-2xl bg-white shadow-xs border border-gray-100 overflow-hidden"
                  >
                    {/* Cabeçalho do Setor */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/70 p-4 border-b border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <Layers className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-gray-900">{setor.setor_nome}</h2>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
                              <Users className="h-3 w-3" />
                              {setor.mod_disponivel} op. ({setor.percentual_ocupacao_mod.toFixed(1)}% MOD)
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {setor.maquinas.length} linhas de produção alocadas
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-xs text-gray-400">Ocupação / Disponível</span>
                          <div className="text-sm font-bold text-gray-800">
                            {setor.horas_ocupadas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h
                            <span className="text-xs text-gray-400 font-normal">
                              {' '}
                              / {setor.horas_disponiveis.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}h
                            </span>
                          </div>
                        </div>

                        <div className="min-w-[130px] text-right">
                          <span className="text-xs text-gray-400">Capacidade Utilizada TT</span>
                          <div className="text-base font-bold text-blue-600">
                            {setor.percentual_ocupacao.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Grid de Linhas do Setor */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {setor.maquinas.map((maq) => (
                        <div
                          key={maq.maquina_id}
                          className="rounded-xl border border-gray-100 bg-white p-3.5 hover:shadow-md transition space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono font-bold text-gray-400">{maq.codigo}</span>
                              </div>
                              <h3 className="text-sm font-bold text-gray-800">{maq.nome}</h3>
                            </div>

                            <div className="text-right">
                              <span className="text-[11px] text-gray-400">Ocupação</span>
                              <div className="text-sm font-bold text-gray-900">{maq.horas_ocupadas.toFixed(1)}h</div>
                            </div>
                          </div>

                          <BarraCapacidade percentual={maq.percentual_ocupacao} />

                          <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500 border-t border-gray-50">
                            <span>
                              Disponível: <strong>{maq.horas_disponiveis.toFixed(0)}h</strong>
                            </span>
                            <span
                              className={
                                maq.saldo_horas >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'
                              }
                            >
                              Saldo: {maq.saldo_horas.toFixed(0)}h
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* MODAL INTERATIVO: CONFIGURAÇÃO DE EQUIPE (MOD) */}
      {/* ============================================================== */}
      {modalAjusteMODAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Configurar Mão de Obra Direta (MOD)
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Ajuste o número de operadores disponíveis em cada centro produtivo.
                </p>
              </div>
              <button
                onClick={() => setModalAjusteMODAberto(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Informações de cálculo */}
            <div className="rounded-xl bg-purple-50 p-3 text-xs text-purple-800 space-y-1">
              <div className="flex justify-between">
                <span>Jornada Diária Padrão:</span>
                <strong>8,80 h/dia por operador (1º Turno)</strong>
              </div>
              <div className="flex justify-between">
                <span>Capacidade Mensal ({diasUteis} dias úteis):</span>
                <strong>{(diasUteis * 8.8).toFixed(1)} h/operador</strong>
              </div>
            </div>

            {/* Lista de Setores para Edição */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {listaMOD.map((s) => {
                const qtdAtual = valoresEdicaoMOD[s.operacao_codigo] ?? s.quantidade_operadores;
                const horasMensais = (qtdAtual * diasUteis * 8.8).toFixed(0);

                return (
                  <div
                    key={s.operacao_codigo}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                  >
                    <div>
                      <span className="text-xs font-mono font-bold text-purple-700 block">
                        {s.operacao_codigo}
                      </span>
                      <span className="text-sm font-bold text-gray-800">{s.setor_nome}</span>
                      <span className="text-[11px] text-gray-400 block">{horasMensais} h/mês disponíveis</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={qtdAtual}
                        onChange={(e) =>
                          setValoresEdicaoMOD((prev) => ({
                            ...prev,
                            [s.operacao_codigo]: Math.max(0, parseFloat(e.target.value) || 0),
                          }))
                        }
                        className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-center text-sm font-bold text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                      />
                      <span className="text-xs text-gray-500 font-medium">op.</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totalizador */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
              <span className="font-bold text-gray-600">Total Equipe Fábrica:</span>
              <span className="text-lg font-black text-purple-700">
                {totalOperadoresEditados} operadores
              </span>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalAjusteMODAberto(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarAjusteEquipe}
                disabled={mutationSalvarMOD.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-sm transition disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{mutationSalvarMOD.isPending ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
