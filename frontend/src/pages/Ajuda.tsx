import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  BookOpen,
  Calculator,
  Gauge,
  Calendar,
  Factory,
  Layers,
  Clock,
  AlertTriangle,
  Play,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';

interface FaqItem {
  pergunta: string;
  resposta: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    pergunta: 'Como sei se a fábrica aguenta um novo pedido sem atrasar os outros?',
    resposta:
      'Vá até a tela "Calculadora", selecione o produto e a quantidade. O sistema calculará as horas necessárias em cada uma das 6 etapas, apontará a máquina gargalo e informará a data prevista de conclusão. Se quiser ver o impacto na fábrica inteira, use a aba "Carga Máquina" para verificar se alguma linha ficará em vermelho (>100%).',
  },
  {
    pergunta: 'O que significa quando uma máquina fica vermelha na Carga Máquina?',
    resposta:
      'Significa sobrecarga (ocupação superior a 100% das 17,15h diárias no mês). A linha não conseguirá produzir todo o volume nos 2 turnos habituais dentro dos dias úteis do mês. O PCP precisará planejar horas extras aos sábados, remanejar lotes para outra máquina similar ou estender o prazo de entrega.',
  },
  {
    pergunta: 'O que devo fazer quando o Gantt acusar "⚠️ Conflito de Linha"?',
    resposta:
      'O conflito ocorre quando duas ou mais ordens foram agendadas para a mesma máquina no mesmo período. Clique sobre uma das barras de OP no Gantt para abrir o modal de detalhes e altere a data de início/fim para sequenciar os lotes (uma após a outra), ou mude a máquina da OP para outra linha disponível.',
  },
  {
    pergunta: 'Por que o sistema usa 17,15 horas por dia por padrão?',
    resposta:
      'A Evoluttion opera em regime industrial de 2 turnos diários. Descontando pausas e intervalos regulamentares de troca de turno e refeição, a jornada produtiva útil padrão cadastrada para cada máquina é de 17,15 horas diárias.',
  },
  {
    pergunta: 'Como funciona o código do fundido nos produtos?',
    resposta:
      'Toda peça usinada necessita de uma matéria-prima bruta correspondente (o fundido). Ao cadastrar ou visualizar um produto, o campo "Código do Fundido" identifica a peça bruta que precisa estar fisicamente no almoxarifado antes de iniciar a usinagem na Linha 1 a 10.',
  },
  {
    pergunta: 'Onde ficam salvas as anotações do sistema no meu computador?',
    resposta:
      'Além deste guia interativo, você possui uma documentação técnica completa sincronizada no seu aplicativo Obsidian, localizada na pasta "Cofre Obsidian > Cofre Gabriel > Projetos > PCP Evoluttion".',
  },
];

export default function Ajuda() {
  const [tabAtiva, setTabAtiva] = useState<'fluxo' | 'calculadora' | 'carga' | 'gantt' | 'regras' | 'faq'>('fluxo');
  const [faqAberto, setFaqAberto] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setFaqAberto(faqAberto === index ? null : index);
  };

  return (
    <div className="space-y-7 pb-12 max-w-6xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Guia & Manual do Usuário PCP
              </h1>
              <p className="text-xs text-gray-500">
                Instruções práticas, regras de fábrica e procedimentos de operação da Evoluttion
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-1.5 text-xs font-semibold text-blue-800 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-600" />
            Versão do Sistema 1.0
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS DO GUIA */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl bg-gray-100 p-1.5 border border-gray-200">
        <button
          onClick={() => setTabAtiva('fluxo')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            tabAtiva === 'fluxo'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          1. Fluxo do PCP
        </button>

        <button
          onClick={() => setTabAtiva('calculadora')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            tabAtiva === 'calculadora'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calculator className="h-4 w-4" />
          2. Calculadora & Gargalos
        </button>

        <button
          onClick={() => setTabAtiva('carga')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            tabAtiva === 'carga'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Gauge className="h-4 w-4" />
          3. Carga Máquina
        </button>

        <button
          onClick={() => setTabAtiva('gantt')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            tabAtiva === 'gantt'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="h-4 w-4" />
          4. Linha do Tempo (Gantt)
        </button>

        <button
          onClick={() => setTabAtiva('regras')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            tabAtiva === 'regras'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Factory className="h-4 w-4" />
          5. Regras & 25 Máquinas
        </button>

        <button
          onClick={() => setTabAtiva('faq')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            tabAtiva === 'faq'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          6. Perguntas Frequentes
        </button>
      </div>

      {/* CONTEÚDO DA ABA: 1. FLUXO DO PCP */}
      {tabAtiva === 'fluxo' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              O Ciclo de Vida da Produção no Sistema
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              O sistema foi modelado para guiar o profissional de PCP e os líderes de produção desde a entrada de uma cotação até o embarque do lote faturado.
            </p>

            {/* Passo a Passo em Cards Conectados */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-3">
              
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xs mb-3">
                    1
                  </div>
                  <h3 className="font-bold text-xs text-gray-900">Simulação do Pedido</h3>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Na <strong>Calculadora</strong>, insira o produto e volume para descobrir horas e gargalo.
                  </p>
                </div>
                <Link to="/calculadora" className="mt-3 text-[11px] font-bold text-blue-700 flex items-center gap-1 hover:underline">
                  Ir para Calculadora <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-xs mb-3">
                    2
                  </div>
                  <h3 className="font-bold text-xs text-gray-900">Checagem de Capacidade</h3>
                  <p className="text-[11px] text-gray-500 mt-1">
                    No <strong>Carga Máquina</strong>, confira se as linhas suportam a demanda sem estourar 100%.
                  </p>
                </div>
                <Link to="/carga-maquina" className="mt-3 text-[11px] font-bold text-emerald-700 flex items-center gap-1 hover:underline">
                  Ver Carga Máquina <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white font-black text-xs mb-3">
                    3
                  </div>
                  <h3 className="font-bold text-xs text-gray-900">Lançamento da OP</h3>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Com 1 clique em <em>"Lançar na Produção"</em>, crie a OP com datas e máquina vinculada.
                  </p>
                </div>
                <Link to="/ordens" className="mt-3 text-[11px] font-bold text-amber-700 flex items-center gap-1 hover:underline">
                  Ver Ordens <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs mb-3">
                    4
                  </div>
                  <h3 className="font-bold text-xs text-gray-900">Sequenciamento (Gantt)</h3>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Na <strong>Programação</strong>, organize a fila da linha e previna conflitos de máquina.
                  </p>
                </div>
                <Link to="/programacao" className="mt-3 text-[11px] font-bold text-indigo-700 flex items-center gap-1 hover:underline">
                  Abrir Gantt <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white font-black text-xs mb-3">
                    5
                  </div>
                  <h3 className="font-bold text-xs text-gray-900">Gestão & Expedição</h3>
                  <p className="text-[11px] text-gray-500 mt-1">
                    No <strong>Dashboard</strong>, monitore prazos dos próximos 7 dias e controle lotes atrasados.
                  </p>
                </div>
                <Link to="/" className="mt-3 text-[11px] font-bold text-purple-700 flex items-center gap-1 hover:underline">
                  Abrir Dashboard <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: 2. CALCULADORA */}
      {tabAtiva === 'calculadora' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Como Funciona o Cálculo de Horas e Gargalos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs leading-relaxed text-gray-700">
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 space-y-2">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    1. Fórmula de Horas por Operação
                  </h3>
                  <p className="text-gray-600">
                    O tempo de cada etapa depende da taxa de produtividade cadastrada no roteiro técnico da peça:
                  </p>
                  <div className="rounded-lg bg-white border border-gray-200 p-2.5 font-mono text-[11px] text-blue-900 font-bold">
                    Horas Necessárias = Quantidade de Peças ÷ Peças por Hora (pçs/h)
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Exemplo: 4.000 peças com produtividade de 32 pçs/h na Usinagem = <strong>125,0 horas de máquina</strong>.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 space-y-2">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    2. Cálculo de Dias de Produção
                  </h3>
                  <p className="text-gray-600">
                    Considerando o padrão de 2 turnos industriais da fábrica (17,15 h/dia):
                  </p>
                  <div className="rounded-lg bg-white border border-gray-200 p-2.5 font-mono text-[11px] text-emerald-900 font-bold">
                    Dias de Linha = Horas Necessárias ÷ 17,15 h/dia
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Exemplo: 125 horas ÷ 17,15 h/dia = <strong>7,3 dias úteis</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 space-y-2">
                  <h3 className="font-bold text-rose-950 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    3. Identificação Automática do Gargalo
                  </h3>
                  <p className="text-rose-900">
                    O sistema compara o tempo demandado nas 6 etapas. A operação que exigir a maior quantidade de horas de máquina é classificada automaticamente como o <strong>Gargalo da Peça</strong> (destacada com badge vermelho).
                  </p>
                  <p className="text-[11px] text-rose-800">
                    💡 <em>Dica de PCP:</em> A data de entrega do pedido deve ser prometida com base no tempo do gargalo mais o tempo das operações seguintes.
                  </p>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
                  <h3 className="font-bold text-blue-950 flex items-center gap-2">
                    <Play className="h-4 w-4 text-blue-600" />
                    4. Botão "Lançar na Produção"
                  </h3>
                  <p className="text-blue-900">
                    Depois de simular, não precisa redigitar tudo. Clique no botão verde <em>"Lançar na Produção"</em> no rodapé da calculadora. O sistema abre o formulário pré-preenchido com número de OP sugerido, datas planejadas calculadas e linha de usinagem selecionada.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: 3. CARGA MÁQUINA */}
      {tabAtiva === 'carga' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-600" />
              Interpretando o Dashboard de Carga Máquina
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              O módulo de Carga Máquina compara as <strong>Horas Disponíveis</strong> (capacidade máxima de 2 turnos no mês) com as <strong>Horas Ocupadas</strong> (soma das ordens de produção ativas).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  Verde: Normal (&lt; 80%)
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  A máquina ou setor possui ampla folga de capacidade. Há saldo de horas livres para receber novos lotes e pedidos sem risco de atraso.
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  Âmbar: Atenção (80% a 99%)
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  A linha está operando perto do teto de capacidade dos 2 turnos. Qualquer parada técnica ou quebra de máquina pode gerar atrasos.
                </p>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
                  <span className="h-3 w-3 rounded-full bg-rose-500" />
                  Vermelho: Sobrecarga (&ge; 100%)
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Alerta crítico! As ordens programadas superam a capacidade disponível no mês. É necessário autorizar horas extras aos sábados ou remanejar lotes.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-900 space-y-2 mt-2">
              <h3 className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Dica: Simulador de Pedidos Pontuais
              </h3>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Na tela de Carga Máquina, há uma aba chamada <strong>"Simulador"</strong>. Nela você pode adicionar múltiplos produtos e quantidades hypotéticas para ver em tempo real quais setores ficariam sobrecarregados <em>antes</em> de fechar o contrato com o cliente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: 4. GANTT */}
      {tabAtiva === 'gantt' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Operação da Linha do Tempo Visual (Gantt)
            </h2>
            <div className="space-y-4 text-xs leading-relaxed text-gray-700">
              
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 space-y-2">
                <h3 className="font-bold text-gray-900">1. Visão por Máquina vs. Visão por Ordem</h3>
                <p>
                  - <strong>Por Máquina / Linha:</strong> Mostra cada uma das 25 máquinas da fábrica como uma trilha horizontal. Permite ver quais linhas estão com lotes agendados, quais estão desocupadas (ociosas) e o sequenciamento de quem entra primeiro.
                  <br />
                  - <strong>Por Ordem:</strong> Lista cada OP individualmente em ordem cronológica de data de entrega.
                </p>
              </div>

              <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-4 space-y-2">
                <h3 className="font-bold text-rose-950 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  2. Alerta de Conflito de Linha
                </h3>
                <p className="text-rose-900">
                  Se duas ou mais ordens forem programadas para a mesma máquina com datas de início e fim que se cruzam, o sistema destaca as barras em vermelho piscante com o ícone <strong>⚠️ Conflito</strong>. As barras são ligeiramente deslocadas para cima/baixo para você enxergar ambas e poder reagendar uma delas.
                </p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 space-y-2">
                <h3 className="font-bold text-blue-950 flex items-center gap-1.5">
                  <Play className="h-4 w-4 text-blue-600" />
                  3. Reagendamento com 1 Clique (Modal de Detalhes)
                </h3>
                <p className="text-blue-900">
                  Clique diretamente sobre qualquer barra de ordem no Gantt. O <strong>Modal de Detalhes</strong> abrirá permitindo:
                </p>
                <ul className="list-disc list-inside text-blue-800 space-y-1 pl-2">
                  <li>Alterar as datas de Início e Fim (o sistema recalcula a duração em dias na hora).</li>
                  <li>Trocar a máquina alocada da OP (ex: passar da Linha 4 para a Linha 2).</li>
                  <li>Mudar o status da ordem (*Planejada &rarr; Em Produção &rarr; Pausada &rarr; Concluída*).</li>
                  <li>Registrar a quantidade física produzida para ver a barra de progresso encher.</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: 5. REGRAS & 25 MÁQUINAS */}
      {tabAtiva === 'regras' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Factory className="h-5 w-5 text-blue-600" />
              Parque Fabril e as 6 Operações Industriais
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Toda peça fabricada na Evoluttion obedece a este roteiro padronizado com as seguintes linhas alocadas:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
              
              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <span className="font-bold text-blue-700 uppercase tracking-wider text-[11px] block">
                  1. Usinagem (`USINAGEM`) • 10 Máquinas
                </span>
                <p className="text-gray-500 text-[11px]">
                  Linha 1, Linha 2, Linha 3, Linha 4, Linha 5, Linha 6, Linha 7, Linha 8, Linha 9, Linha 10.
                </p>
                <span className="text-[10px] text-gray-400">Capacidade: 17,15 h/dia cada (3.773 h/mês no setor)</span>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <span className="font-bold text-amber-700 uppercase tracking-wider text-[11px] block">
                  2. Furação Inclinada (`FUR_INC`) • 2 Máquinas
                </span>
                <p className="text-gray-500 text-[11px]">
                  Linha Akira Seiki (`AKIRA-01`), Linha FUB Bancada (`FUB-01`).
                </p>
                <span className="text-[10px] text-gray-400">Capacidade: 17,15 h/dia cada (754,6 h/mês no setor)</span>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <span className="font-bold text-orange-700 uppercase tracking-wider text-[11px] block">
                  3. Furação 07 (`FUR_07`) • 3 Máquinas
                </span>
                <p className="text-gray-500 text-[11px]">
                  Linha Mekano 1 (`MEK-01`), Linha Mekano 2 (`MEK-02`), Linha Mekano 3 (`MEK-03`).
                </p>
                <span className="text-[10px] text-gray-400">Capacidade: 17,15 h/dia cada (1.131,9 h/mês no setor)</span>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <span className="font-bold text-purple-700 uppercase tracking-wider text-[11px] block">
                  4. Brunimento (`BRUNIMENTO`) • 4 Máquinas
                </span>
                <p className="text-gray-500 text-[11px]">
                  Linha Brunideira 1, Linha Brunideira 2, Linha Brunideira 3, Linha Brunideira 4.
                </p>
                <span className="text-[10px] text-gray-400">Capacidade: 17,15 h/dia cada (1.509,2 h/mês no setor)</span>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <span className="font-bold text-emerald-700 uppercase tracking-wider text-[11px] block">
                  5. Roletamento (`ROLETAMENTO`) • 4 Máquinas
                </span>
                <p className="text-gray-500 text-[11px]">
                  Linha Roletamento 1, Linha Roletamento 2, Linha Roletamento 3, Linha Roletamento 4.
                </p>
                <span className="text-[10px] text-gray-400">Capacidade: 17,15 h/dia cada (1.509,2 h/mês no setor)</span>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                  6. Lavagem & Inspeção (`LAV_INSP`) • 2 Máquinas
                </span>
                <p className="text-gray-500 text-[11px]">
                  Linha de Lavagem (`LAV-01`), Linha de Inspeção (`INSP-01`).
                </p>
                <span className="text-[10px] text-gray-400">Capacidade: 17,15 h/dia cada (754,6 h/mês no setor)</span>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: 6. PERGUNTAS FREQUENTES (FAQ) */}
      {tabAtiva === 'faq' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              Perguntas Frequentes (FAQ do PCP)
            </h2>
            <p className="text-xs text-gray-500">
              Clique em qualquer pergunta abaixo para abrir a explicação detalhada.
            </p>

            <div className="space-y-2.5 pt-2">
              {FAQ_LIST.map((item, index) => {
                const aberto = faqAberto === index;

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-200 overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between p-4 text-left bg-gray-50/70 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-bold text-xs text-gray-800 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-black">
                          ?
                        </span>
                        {item.pergunta}
                      </span>
                      {aberto ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </button>

                    {aberto && (
                      <div className="p-4 bg-white text-xs text-gray-600 leading-relaxed border-t border-gray-100 animate-in fade-in duration-150">
                        {item.resposta}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
