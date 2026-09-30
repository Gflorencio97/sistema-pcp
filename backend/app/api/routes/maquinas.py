from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.maquina import MaquinaCreate, MaquinaUpdate, MaquinaResponse
from app.models.models import StatusMaquina
from app.services import maquina_service

router = APIRouter(prefix="/maquinas", tags=["Máquinas"])


@router.get("/", response_model=List[MaquinaResponse])
def listar_maquinas(
    skip: int = 0,
    limit: int = 100,
    status: Optional[StatusMaquina] = None,
    setor: Optional[str] = None,
    search: Optional[str] = Query(None, description="Pesquisar por nome ou código"),
    db: Session = Depends(get_db),
):
    return maquina_service.get_maquinas(db, skip=skip, limit=limit, status=status, setor=setor, search=search)


@router.get("/{maquina_id}", response_model=MaquinaResponse)
def obter_maquina(maquina_id: int, db: Session = Depends(get_db)):
    maquina = maquina_service.get_maquina(db, maquina_id)
    if not maquina:
        raise HTTPException(status_code=404, detail="Máquina não encontrada")
    return maquina


@router.post("/", response_model=MaquinaResponse, status_code=201)
def criar_maquina(maquina: MaquinaCreate, db: Session = Depends(get_db)):
    if maquina_service.get_maquina_by_codigo(db, maquina.codigo):
        raise HTTPException(status_code=400, detail=f"Código '{maquina.codigo}' já está em uso")
    return maquina_service.create_maquina(db, maquina)


@router.patch("/{maquina_id}", response_model=MaquinaResponse)
def atualizar_maquina(maquina_id: int, maquina: MaquinaUpdate, db: Session = Depends(get_db)):
    db_maquina = maquina_service.update_maquina(db, maquina_id, maquina)
    if not db_maquina:
        raise HTTPException(status_code=404, detail="Máquina não encontrada")
    return db_maquina


@router.delete("/{maquina_id}", status_code=204)
def deletar_maquina(maquina_id: int, db: Session = Depends(get_db)):
    if not maquina_service.delete_maquina(db, maquina_id):
        raise HTTPException(status_code=404, detail="Máquina não encontrada")
