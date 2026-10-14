import { useEffect, useRef, useState } from 'react';
import { ordemService } from '../services/ordemService';

interface Params {
  produto_id?: number;
  maquina_id?: number;
  quantidade?: number;
  data_inicio?: string;
}

export interface InfoSugestao {
  horas: number;
  pcs_hora: number;
  horas_por_dia: number;
}

/**
 * Calcula a data de fim pelas pecas/hora do roteiro do produto e pelos turnos da linha.
 * Roda quando produto, linha, quantidade ou inicio mudam, ou ao chamar recalcular().
 * Editar o fim a mao nao dispara o calculo.
 */
export function useSugestaoFim(
  { produto_id, maquina_id, quantidade, data_inicio }: Params,
  onSugestao: (fimLocal: string) => void,
  ativo: boolean,
  pularInicial = false,
) {
  const [info, setInfo] = useState<InfoSugestao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const cb = useRef(onSugestao);
  cb.current = onSugestao;
  const primeira = useRef(true);

  useEffect(() => {
    const ehPrimeira = primeira.current;
    primeira.current = false;
    if (pularInicial && ehPrimeira && tick === 0) return;

    if (!ativo || !produto_id || !maquina_id || !quantidade || quantidade <= 0 || !data_inicio) {
      setInfo(null);
      setErro(null);
      return;
    }
    let cancelado = false;
    const t = setTimeout(async () => {
      try {
        const r = await ordemService.sugerirFim({
          produto_id,
          maquina_id,
          quantidade,
          data_inicio: data_inicio.slice(0, 16),
        });
        if (cancelado) return;
        setInfo({ horas: r.horas_necessarias, pcs_hora: r.pcs_hora, horas_por_dia: r.horas_por_dia });
        setErro(null);
        cb.current(r.data_fim.slice(0, 16));
      } catch (e: any) {
        if (cancelado) return;
        setInfo(null);
        setErro(
          e?.response?.data?.detail ??
            'Nao foi possivel sugerir a data de fim. Preencha manualmente.',
        );
      }
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [produto_id, maquina_id, quantidade, data_inicio, ativo, tick]);

  return { info, erro, recalcular: () => setTick(n => n + 1) };
}
