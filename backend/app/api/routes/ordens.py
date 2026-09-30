from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.schemas.ordem import OrdemProducaoCreate, OrdemProducaoUpdate, OrdemProducaoResponse, OrdemGantt
from app.models.models import StatusOrdem, PrioridadeOrdem
from app.services import ordem_service

router = APIRouter(prefix="/ordens", tags=["Ordens de Produção"])


@router.get("/", response_model=List[OrdemProducaoResponse])
def listar_ordens(
    skip: int = 0,
    limit: int = 100,
    status: Optional[StatusOrdem] = None,
    maquina_id: Optional[int] = None,
    produto_id: Optional[int] = None,
    prioridade: Optional[PrioridadeOrdem] = None,
    search: Optional[str] = Query(None, description="Pesquisar por número da OP"),
    db: Session = Depends(get_db),
):
    return ordem_service.get_ordens(
        db, skip=skip, limit=limit, status=status,
        maquina_id=maquina_id, produto_id=produto_id,
        prioridade=prioridade, search=search,
    )


@router.get("/gantt", response_model=List[OrdemGantt])
def gantt_ordens(
    data_inicio: Optional[datetime] = Query(None, description="Filtrar ordens a partir de (ISO 8601)"),
    data_fim: Optional[datetime] = Query(None, description="Filtrar ordens até (ISO 8601)"),
    maquina_id: Optional[int] = None,
    incluir_concluidas: bool = Query(False, description="Incluir ordens concluídas"),
    db: Session = Depends(get_db),
):
    """Retorna ordens formatadas para visualização no Gantt."""
    return ordem_service.get_ordens_gantt(
        db,
        data_inicio=data_inicio,
        data_fim=data_fim,
        maquina_id=maquina_id,
        incluir_concluidas=incluir_concluidas,
    )


@router.get("/{ordem_id}", response_model=OrdemProducaoResponse)
def obter_ordem(ordem_id: int, db: Session = Depends(get_db)):
    ordem = ordem_service.get_ordem(db, ordem_id)
    if not ordem:
        raise HTTPException(status_code=404, detail="Ordem de produção não encontrada")
    return ordem


@router.post("/", response_model=OrdemProducaoResponse, status_code=201)
def criar_ordem(ordem: OrdemProducaoCreate, db: Session = Depends(get_db)):
    if ordem_service.get_ordem_by_numero(db, ordem.numero):
        raise HTTPException(status_code=400, detail=f"Número '{ordem.numero}' já está em uso")

    # Verifica conflitos se maquina e datas foram informadas
    if ordem.maquina_id and ordem.data_inicio_planejada and ordem.data_fim_planejada:
        conflitos = ordem_service.verificar_conflitos(
            db, ordem.maquina_id, ordem.data_inicio_planejada, ordem.data_fim_planejada
        )
        if conflitos:
            numeros = [c.numero for c in conflitos]
            raise HTTPException(
                status_code=409,
                detail=f"Conflito de agendamento com as ordens: {', '.join(numeros)}"
            )

    return ordem_service.create_ordem(db, ordem)


@router.patch("/{ordem_id}", response_model=OrdemProducaoResponse)
def atualizar_ordem(ordem_id: int, ordem: OrdemProducaoUpdate, db: Session = Depends(get_db)):
    # Verifica conflitos ao reagendar
    if ordem.maquina_id and ordem.data_inicio_planejada and ordem.data_fim_planejada:
        conflitos = ordem_service.verificar_conflitos(
            db, ordem.maquina_id, ordem.data_inicio_planejada, ordem.data_fim_planejada,
            excluir_ordem_id=ordem_id,
        )
        if conflitos:
            numeros = [c.numero for c in conflitos]
            raise HTTPException(
                status_code=409,
                detail=f"Conflito de agendamento com as ordens: {', '.join(numeros)}"
            )

    db_ordem = ordem_service.update_ordem(db, ordem_id, ordem)
    if not db_ordem:
        raise HTTPException(status_code=404, detail="Ordem de produção não encontrada")
    return db_ordem


@router.delete("/{ordem_id}", status_code=204)
def deletar_ordem(ordem_id: int, db: Session = Depends(get_db)):
    if not ordem_service.delete_ordem(db, ordem_id):
        raise HTTPException(status_code=404, detail="Ordem de produção não encontrada")
