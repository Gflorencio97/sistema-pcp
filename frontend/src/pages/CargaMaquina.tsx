import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Calendar,
  Layers
} from 'lucide-react';
import { cargaMaquinaService } from '../services/cargaMaquinaService';

function BarraCapacidade({ percentual }: { percentual: number }) {
  let cor = 'bg-emerald-500';
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

export default function CargaMaquina() {
  const [diasUteis, setDiasUteis] = useState<number>(22);
  const [horasDia, setHorasDia] = useState<number>(17.15);

  const { data, isLoading } = useQuery({
    queryKey: ['carga-maquina', diasUteis, horasDia],
    queryFn: () => cargaMaquinaService.obterResumo({ dias_uteis: diasUteis, horas_dia: horasDia }),
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-600 p-2 text-white">
              <Gauge className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Carga Máquina & Capacidade</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Balanço de horas disponíveis vs ocupação por centro de trabalho no mês
          </p>
        </div>

        {/* Controles de Parâmetros do Mês */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">Dias Úteis:</span>
            <select
              value={diasUteis}
              onChange={e => setDiasUteis(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[19, 20, 21, 22, 23, 24, 25].map(d => (
                <option key={d} value={d}>
                  {d} dias
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-[1px] bg-gray-200" />

          <div className="flex items-center gap-1.5 px-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">Turnos:</span>
            <select
              value={horasDia}
              onChange={e => setHorasDia(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={17.15}>2 Turnos (17.15h/dia)</option>
              <option value={8.8}>1º Turno (8.8h/dia)</option>
              <option value={24.0}>3 Turnos (24.0h/dia)</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="py-20 text-center text-sm text-gray-400">
          Calculando balanço de capacidade fabril...
        </div>
      ) : (
        <>
          {/* Cards de KPIs Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
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

            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
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

            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Saldo Livre de Fábrica
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${data.saldo_horas_total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {data.saldo_horas_total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}h
                </span>
                <span className="text-xs text-gray-500">disponíveis</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">Capacidade ociosa para novos pedidos</p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Status dos Gargalos
              </span>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Flame className={`h-5 w-5 ${data.maquinas_sobrecarregadas > 0 ? 'text-red-500' : 'text-gray-300'}`} />
                  <span className={`text-2xl font-bold ${data.maquinas_sobrecarregadas > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {data.maquinas_sobrecarregadas}
                  </span>
                  <span className="text-xs text-gray-400">críticas</span>
                </div>
                <div className="h-6 w-[1px] bg-gray-200" />
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-2xl font-bold text-gray-700">
                    {data.maquinas_normais}
                  </span>
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
                <strong className="font-semibold">Alerta de Sobrecarga:</strong> Existem {data.maquinas_sobrecarregadas} máquina(s) com capacidade superior a 100%. Avalie horas extras ou redistribuição de lotes.
              </div>
            </div>
          )}

          {/* Setores e Linhas */}
          <div className="space-y-6">
            {data.setores.map((setor) => (
              <div key={setor.setor_nome} className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                {/* Cabeçalho do Setor */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/70 p-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-5 w-5 text-blue-600" />
                    <div>
                      <h2 className="text-base font-bold text-gray-900">{setor.setor_nome}</h2>
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
                          {' '}/ {setor.horas_disponiveis.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}h
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
                            <span className="text-xs font-mono font-bold text-gray-400">
                              {maq.codigo}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-800">{maq.nome}</h3>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-gray-400">Ocupação</span>
                          <div className="text-sm font-bold text-gray-900">
                            {maq.horas_ocupadas.toFixed(1)}h
                          </div>
                        </div>
                      </div>

                      <BarraCapacidade percentual={maq.percentual_ocupacao} />

                      <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500 border-t border-gray-50">
                        <span>Disponível: <strong>{maq.horas_disponiveis.toFixed(0)}h</strong></span>
                        <span className={maq.saldo_horas >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                          Saldo: {maq.saldo_horas.toFixed(0)}h
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
