from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import exigir_admin
from app.models.models import Auditoria
from app.schemas.auth import AuditoriaResponse

router = APIRouter(prefix="/auditoria", tags=["Auditoria"], dependencies=[Depends(exigir_admin)])


@router.get("", response_model=List[AuditoriaResponse])
def consultar(
    usuario_id: Optional[int] = None,
    entidade: Optional[str] = Query(None, max_length=50),
    acao: Optional[str] = Query(None, max_length=20),
    data_inicio: Optional[datetime] = None,
    data_fim: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Registros mais recentes primeiro. Somente administradores."""
    q = db.query(Auditoria)
    if usuario_id is not None:
        q = q.filter(Auditoria.usuario_id == usuario_id)
    if entidade:
        q = q.filter(Auditoria.entidade == entidade)
    if acao:
        q = q.filter(Auditoria.acao == acao)
    if data_inicio:
        q = q.filter(Auditoria.data_hora >= data_inicio)
    if data_fim:
        q = q.filter(Auditoria.data_hora <= data_fim)
    return q.order_by(Auditoria.id.desc()).offset(skip).limit(limit).all()
