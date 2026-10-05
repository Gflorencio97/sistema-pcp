import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfDay, subDays } from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Factory,
} from 'lucide-react';
import { ordemService } from '../services/ordemService';
import { maquinaService } from '../services/maquinaService';
import { produtoService } from '../services/produtoService';
import GanttChart from '../components/GanttChart';
import GanttModalDetalhes from '../components/GanttModalDetalhes';
import type { OrdemGantt, OrdemCreate } from '../types';

export default function Programacao() {
  const queryClient = useQueryClient();

  // Estados de navegação temporal
  const [dataBase, setDataBase] = useState<Date>(startOfDay(new Date()));
  const [diasVisiveis, setDiasVisiveis] = useState<number>(30);
  const [ocultarFimSemana, setOcultarFimSemana] = useState<boolean>(false);
  const [incluirConcluidas, setIncluirConcluidas] = useState<boolean>(false);

  // Estados de visualização e filtros
  const [visao, setVisao] = useState<'maquina' | 'ordem'>('maquina');
  const [setorFiltro, setSetorFiltro] = useState<string>('');
  const [maquinaFiltro, setMaquinaFiltro] = useState<number | undefined>();
  const [buscaTexto, setBuscaTexto] = useState<string>('');

  // Modal de detalhes / reagendamento
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemGantt | null>(null);

  // Modal de criação de OP rápida
  const [modalNovaOrdem, setModalNovaOrdem] = useState<boolean>(false);
  const [novaOrdemForm, setNovaOrdemForm] = useState<OrdemCreate>({
    numero: '',
    produto_id: 0,
    maquina_id: undefined,
    quantidade_planejada: 1000,
    prioridade: 'normal',
    data_inicio_planejada: format(new Date(), "yyyy-MM-dd'T'07:00"),
    data_fim_planejada: format(addDays(new Date(), 5), "yyyy-MM-dd'T'17:00"),
    observacoes: '',
  });
  const [erroNovaOrdem, setErroNovaOrdem] = useState<string | null>(null);

  const dataInicioIso = format(dataBase, "yyyy-MM-dd'T'00:00:00");
  const dataFimIso = format(addDays(dataBase, diasVisiveis), "yyyy-MM-dd'T'23:59:59");

  // Buscar Ordens para o Gantt
  const { data: ordensBrutas = [], isLoading: carregandoOrdens } = useQuery({
    queryKey: ['gantt', dataInicioIso, dataFimIso, maquinaFiltro, incluirConcluidas],
    queryFn: () =>
      ordemService.gantt({
        data_inicio: dataInicioIso,
        data_fim: dataFimIso,
        maquina_id: maquinaFiltro,
        incluir_concluidas: incluirConcluidas,
      }),
  });

  // Buscar Máquinas ativas
  const { data: maquinas = [], isLoading: carregandoMaquinas } = useQuery({
    queryKey: ['maquinas'],
    queryFn: () => maquinaService.listar({ status: 'ativa' }),
  });

  // Buscar Produtos para o modal de nova OP
  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => produtoService.listar({ ativo: true }),
    enabled: modalNovaOrdem,
  });

  // Filtragem local por busca e setor
  const ordensFiltradas = useMemo(() => {
    return ordensBrutas.filter((o) => {
      // Filtro por texto (número da OP, produto ou fundido)
      if (buscaTexto.trim()) {
        const t = buscaTexto.toLowerCase();
        const matchNumero = o.numero.toLowerCase().includes(t);
        const matchProdNome = o.produto_nome.toLowerCase().includes(t);
        const matchProdCod = o.produto_codigo?.toLowerCase().includes(t);
        const matchFundido = o.produto_codigo_fundido?.toLowerCase().includes(t);
        if (!matchNumero && !matchProdNome && !matchProdCod && !matchFundido) {
          return false;
        }
      }

      // Filtro por setor
      if (setorFiltro) {
        const maquinaDaOp = maquinas.find((m) => m.id === o.maquina_id);
        const opSetor = (maquinaDaOp?.operacao_codigo ?? maquinaDaOp?.setor ?? '').toUpperCase();
        if (opSetor !== setorFiltro.toUpperCase()) {
          return false;
        }
      }

      return true;
    });
  }, [ordensBrutas, buscaTexto, setorFiltro, maquinas]);

  // Máquinas filtradas por setor para a visão por máquina
  const maquinasExibidas = useMemo(() => {
    if (!setorFiltro) return maquinas;
    return maquinas.filter(
      (m) => (m.operacao_codigo ?? m.setor ?? '').toUpperCase() === setorFiltro.toUpperCase()
    );
  }, [maquinas, setorFiltro]);

  // Métricas do Topo
  const metricas = useMemo(() => {
    const total = ordensFiltradas.length;
    const emAndamento = ordensFiltradas.filter((o) => o.status === 'em_andamento').length;
    const planejadas = ordensFiltradas.filter((o) => o.status === 'planejada').length;
    const concluidas = ordensFiltradas.filter((o) => o.status === 'concluida').length;
    const urgentes = ordensFiltradas.filter((o) => o.prioridade === 'urgente' || o.prioridade === 'alta').length;

    // Checar conflitos de máquina
    let maquinasComConflito = 0;
    maquinas.forEach((m) => {
      const ops = ordensFiltradas.filter((o) => o.maquina_id === m.id && o.status !== 'concluida' && o.status !== 'cancelada');
      for (let i = 0; i < ops.length; i++) {
        for (let j = i + 1; j < ops.length; j++) {
          const ini1 = new Date(ops[i].data_inicio_planejada!).getTime();
          const fim1 = new Date(ops[i].data_fim_planejada!).getTime();
          const ini2 = new Date(ops[j].data_inicio_planejada!).getTime();
          const fim2 = new Date(ops[j].data_fim_planejada!).getTime();
          if (ini1 < fim2 && fim1 > ini2) {
            maquinasComConflito++;
            return;
          }
        }
      }
    });

    return { total, emAndamento, planejadas, concluidas, urgentes, maquinasComConflito };
  }, [ordensFiltradas, maquinas]);

  // Mutação para criar Nova OP
  const criarOrdemMutation = useMutation({
    mutationFn: (nova: OrdemCreate) => ordemService.criar(nova),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt'] });
      queryClient.invalidateQueries({ queryKey: ['ordens'] });
      queryClient.invalidateQueries({ queryKey: ['carga-maquina-resumo'] });
      setModalNovaOrdem(false);
      setNovaOrdemForm({
        numero: '',
        produto_id: 0,
        maquina_id: undefined,
        quantidade_planejada: 1000,
        prioridade: 'normal',
        data_inicio_planejada: format(new Date(), "yyyy-MM-dd'T'07:00"),
        data_fim_planejada: format(addDays(new Date(), 5), "yyyy-MM-dd'T'17:00"),
        observacoes: '',
      });
      setErroNovaOrdem(null);
    },
    onError: (err: any) => {
      setErroNovaOrdem(err?.response?.data?.detail ?? 'Erro ao criar ordem de produção.');
    },
  });

  const handleSalvarNovaOrdem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaOrdemForm.numero.trim() || !novaOrdemForm.produto_id) {
      setErroNovaOrdem('Número da OP e Produto são obrigatórios.');
      return;
    }
    criarOrdemMutation.mutate(novaOrdemForm);
  };

  return (
    <div className="space-y-6">
      {/* Título e Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="h-7 w-7 text-blue-600" />
            Programação Visual da Produção (Gantt)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sequenciamento de lotes e alocação de carga por linha de fabricação
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalNovaOrdem(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nova Ordem (OP)
          </button>
        </div>
      </div>

      {/* KPI Cards de Resumo Rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <Layers className="h-4 w-4 text-blue-600" />
            Total de OPs
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900">{metricas.total}</div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
            <Play className="h-4 w-4 text-blue-600" />
            Em Produção
          </div>
          <div className="mt-2 text-2xl font-black text-blue-700">{metricas.emAndamento}</div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-600">
            <Clock className="h-4 w-4 text-amber-600" />
            Planejadas
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">{metricas.planejadas}</div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Concluídas
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{metricas.concluidas}</div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-rose-600">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            Alta / Urgente
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">{metricas.urgentes}</div>
        </div>

        <div className={`rounded-xl border p-3.5 shadow-xs ${
          metricas.maquinasComConflito > 0
            ? 'border-rose-300 bg-rose-50/50'
            : 'border-gray-100 bg-white'
        }`}>
          <div className={`flex items-center gap-2 text-xs font-medium ${
            metricas.maquinasComConflito > 0 ? 'text-rose-700 font-bold' : 'text-gray-500'
          }`}>
            <AlertTriangle className={`h-4 w-4 ${metricas.maquinasComConflito > 0 ? 'text-rose-600 animate-pulse' : 'text-gray-400'}`} />
            Conflitos de Linha
          </div>
          <div className={`mt-2 text-2xl font-black ${
            metricas.maquinasComConflito > 0 ? 'text-rose-700' : 'text-gray-900'
          }`}>
            {metricas.maquinasComConflito}
          </div>
        </div>
      </div>

      {/* BARRA DE CONTROLES, NAVEGAÇÃO E FILTROS */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        
        {/* Linha 1: Alternador de Visão, Navegação Temporal e Escala */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          
          {/* Alternador de Modo: Por Máquina vs Por Ordem */}
          <div className="flex items-center rounded-xl bg-gray-100 p-1 border border-gray-200">
            <button
              onClick={() => setVisao('maquina')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                visao === 'maquina'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Factory className="h-3.5 w-3.5" />
              Por Máquina / Linha
            </button>
            <button
              onClick={() => setVisao('ordem')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                visao === 'ordem'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Por Ordem (Linear)
            </button>
          </div>

          {/* Navegação de Datas */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDataBase((d) => subDays(d, Math.floor(diasVisiveis / 2)))}
              className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              title="Voltar período"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => setDataBase(startOfDay(new Date()))}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Hoje
            </button>

            <button
              onClick={() => setDataBase((d) => addDays(d, Math.floor(diasVisiveis / 2)))}
              className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              title="Avançar período"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <span className="text-xs font-bold text-gray-700 ml-2">
              {format(dataBase, 'dd/MM/yyyy')} — {format(addDays(dataBase, diasVisiveis - 1), 'dd/MM/yyyy')}
            </span>
          </div>

          {/* Seletor de Escala (14, 30, 60, 90 dias) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Período:</span>
            <div className="flex rounded-lg bg-gray-100 p-0.5 border border-gray-200">
              {[14, 30, 60, 90].map((dias) => (
                <button
                  key={dias}
                  onClick={() => setDiasVisiveis(dias)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    diasVisiveis === dias
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {dias}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Linha 2: Filtros de Setor, Máquina, Busca e Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Campo de Busca Rápida */}
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                placeholder="Buscar OP, produto ou fundido..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-8 pr-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Filtro por Setor */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={setorFiltro}
                onChange={(e) => {
                  setSetorFiltro(e.target.value);
                  setMaquinaFiltro(undefined);
                }}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos os Setores</option>
                <option value="USINAGEM">Usinagem</option>
                <option value="FUR_INC">Furação Inclinada</option>
                <option value="FUR_07">Furação 07</option>
                <option value="BRUNIMENTO">Brunimento</option>
                <option value="ROLETAMENTO">Roletamento</option>
                <option value="LAV_INSP">Lavagem & Inspeção</option>
              </select>
            </div>

            {/* Filtro por Máquina */}
            <select
              value={maquinaFiltro ?? ''}
              onChange={(e) => setMaquinaFiltro(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todas as máquinas</option>
              {maquinasExibidas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo} — {m.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles: Fins de semana e Concluídas */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-900 select-none">
              <input
                type="checkbox"
                checked={ocultarFimSemana}
                onChange={(e) => setOcultarFimSemana(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span>Ocultar fins de semana</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-900 select-none">
              <input
                type="checkbox"
                checked={incluirConcluidas}
                onChange={(e) => setIncluirConcluidas(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span>Incluir concluídas</span>
            </label>
          </div>

        </div>

      </div>

      {/* ÁREA DO GRÁFICO GANTT */}
      {carregandoOrdens || carregandoMaquinas ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-24 text-gray-400 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <span className="text-sm font-medium">Carregando programação das linhas...</span>
        </div>
      ) : (
        <GanttChart
          ordens={ordensFiltradas}
          maquinas={maquinasExibidas}
          dataInicio={dataBase}
          totalDias={diasVisiveis}
          visao={visao}
          onSelecionarOrdem={(ordem) => setOrdemSelecionada(ordem)}
          ocultarFinaisSemana={ocultarFimSemana}
        />
      )}

      {/* MODAL DE DETALHES / REAGENDAMENTO DA OP SELECIONADA */}
      {ordemSelecionada && (
        <GanttModalDetalhes
          ordem={ordemSelecionada}
          maquinas={maquinas}
          onClose={() => setOrdemSelecionada(null)}
          onSuccess={() => setOrdemSelecionada(null)}
        />
      )}

      {/* MODAL RÁPIDO: NOVA ORDEM DE PRODUÇÃO */}
      {modalNovaOrdem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-4">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-base">Nova Ordem de Produção (OP)</h3>
              </div>
              <button
                onClick={() => setModalNovaOrdem(false)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarNovaOrdem} className="p-6 space-y-4">
              {erroNovaOrdem && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                  {erroNovaOrdem}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Produto Fabricado *
                  </label>
                  <select
                    required
                    value={novaOrdemForm.produto_id}
                    onChange={(e) => {
                      const novoId = Number(e.target.value);
                      const prod = produtos.find(p => p.id === novoId);
                      setNovaOrdemForm(f => ({
                        ...f,
                        produto_id: novoId,
                        numero: (!f.numero || f.numero.includes('.')) && prod ? `${prod.codigo}.0` : f.numero,
                      }));
                    }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-medium"
                  >
                    <option value={0}>Selecione um produto...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} — {p.nome} {p.codigo_fundido ? `(Fundido: ${p.codigo_fundido})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Identificador do Lote / OP *
                    </label>
                    <input
                      type="text"
                      required
                      value={novaOrdemForm.numero}
                      onChange={(e) => setNovaOrdemForm((f) => ({ ...f, numero: e.target.value }))}
                      placeholder="Ex: EVCM-7013.0 ou Nº ERP"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Código.0 automático ou informe o nº do ERP.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      value={novaOrdemForm.prioridade}
                      onChange={(e) => setNovaOrdemForm((f) => ({ ...f, prioridade: e.target.value as any }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="normal">Normal</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Linha / Máquina Inicial
                  </label>
                  <select
                    value={novaOrdemForm.maquina_id ?? ''}
                    onChange={(e) =>
                      setNovaOrdemForm((f) => ({
                        ...f,
                        maquina_id: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Sem máquina definida</option>
                    {maquinas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.codigo} — {m.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Qtd. Planejada (peças) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={novaOrdemForm.quantidade_planejada}
                    onChange={(e) =>
                      setNovaOrdemForm((f) => ({
                        ...f,
                        quantidade_planejada: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Início Planejado
                  </label>
                  <input
                    type="datetime-local"
                    value={novaOrdemForm.data_inicio_planejada}
                    onChange={(e) =>
                      setNovaOrdemForm((f) => ({ ...f, data_inicio_planejada: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Fim Planejado
                  </label>
                  <input
                    type="datetime-local"
                    value={novaOrdemForm.data_fim_planejada}
                    onChange={(e) =>
                      setNovaOrdemForm((f) => ({ ...f, data_fim_planejada: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalNovaOrdem(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarOrdemMutation.isPending}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {criarOrdemMutation.isPending ? 'Criando...' : 'Lançar Ordem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
