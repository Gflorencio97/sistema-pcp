from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.models.models import Produto
from app.schemas.produto import ProdutoCreate, ProdutoUpdate
from app.services import roteiro_service
from datetime import datetime, timezone


def get_produto(db: Session, produto_id: int) -> Optional[Produto]:
    return db.query(Produto).filter(Produto.id == produto_id).first()


def get_produto_by_codigo(db: Session, codigo: str) -> Optional[Produto]:
    return db.query(Produto).filter(Produto.codigo == codigo).first()


def get_produtos(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    ativo: Optional[bool] = None,
    search: Optional[str] = None,
) -> List[Produto]:
    query = db.query(Produto)
    if ativo is not None:
        query = query.filter(Produto.ativo == ativo)
    if search:
        query = query.filter(
            or_(Produto.nome.ilike(f"%{search}%"), Produto.codigo.ilike(f"%{search}%"))
        )
    return query.offset(skip).limit(limit).all()


def create_produto(db: Session, produto: ProdutoCreate) -> Produto:
    db_produto = Produto(**produto.model_dump())
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    # Inicializa automaticamente as 6 operações de roteiro para o novo produto
    roteiro_service.inicializar_roteiro(db, db_produto.id)
    return db_produto


def update_produto(db: Session, produto_id: int, produto_update: ProdutoUpdate) -> Optional[Produto]:
    db_produto = get_produto(db, produto_id)
    if not db_produto:
        return None
    update_data = produto_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_produto, field, value)
    db_produto.atualizado_em = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_produto)
    return db_produto


def delete_produto(db: Session, produto_id: int) -> bool:
    db_produto = get_produto(db, produto_id)
    if not db_produto:
        return False
    db.delete(db_produto)
    db.commit()
    return True
