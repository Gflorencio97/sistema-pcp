from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.models.models import Maquina, StatusMaquina
from app.schemas.maquina import MaquinaCreate, MaquinaUpdate
from datetime import datetime, timezone


def get_maquina(db: Session, maquina_id: int) -> Optional[Maquina]:
    return db.query(Maquina).filter(Maquina.id == maquina_id).first()


def get_maquina_by_codigo(db: Session, codigo: str) -> Optional[Maquina]:
    return db.query(Maquina).filter(Maquina.codigo == codigo).first()


def get_maquinas(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[StatusMaquina] = None,
    setor: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Maquina]:
    query = db.query(Maquina)
    if status:
        query = query.filter(Maquina.status == status)
    if setor:
        query = query.filter(Maquina.setor == setor)
    if search:
        query = query.filter(
            or_(Maquina.nome.ilike(f"%{search}%"), Maquina.codigo.ilike(f"%{search}%"))
        )
    return query.offset(skip).limit(limit).all()


def create_maquina(db: Session, maquina: MaquinaCreate) -> Maquina:
    db_maquina = Maquina(**maquina.model_dump())
    db.add(db_maquina)
    db.commit()
    db.refresh(db_maquina)
    return db_maquina


def update_maquina(db: Session, maquina_id: int, maquina_update: MaquinaUpdate) -> Optional[Maquina]:
    db_maquina = get_maquina(db, maquina_id)
    if not db_maquina:
        return None
    update_data = maquina_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_maquina, field, value)
    db_maquina.atualizado_em = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_maquina)
    return db_maquina


def delete_maquina(db: Session, maquina_id: int) -> bool:
    db_maquina = get_maquina(db, maquina_id)
    if not db_maquina:
        return False
    db.delete(db_maquina)
    db.commit()
    return True
