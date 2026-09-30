from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.produto import ProdutoCreate, ProdutoUpdate, ProdutoResponse
from app.services import produto_service

router = APIRouter(prefix="/produtos", tags=["Produtos"])


@router.get("/", response_model=List[ProdutoResponse])
def listar_produtos(
    skip: int = 0,
    limit: int = 100,
    ativo: Optional[bool] = None,
    search: Optional[str] = Query(None, description="Pesquisar por nome ou código"),
    db: Session = Depends(get_db),
):
    return produto_service.get_produtos(db, skip=skip, limit=limit, ativo=ativo, search=search)


@router.get("/{produto_id}", response_model=ProdutoResponse)
def obter_produto(produto_id: int, db: Session = Depends(get_db)):
    produto = produto_service.get_produto(db, produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto


@router.post("/", response_model=ProdutoResponse, status_code=201)
def criar_produto(produto: ProdutoCreate, db: Session = Depends(get_db)):
    if produto_service.get_produto_by_codigo(db, produto.codigo):
        raise HTTPException(status_code=400, detail=f"Código '{produto.codigo}' já está em uso")
    return produto_service.create_produto(db, produto)


@router.patch("/{produto_id}", response_model=ProdutoResponse)
def atualizar_produto(produto_id: int, produto: ProdutoUpdate, db: Session = Depends(get_db)):
    db_produto = produto_service.update_produto(db, produto_id, produto)
    if not db_produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return db_produto


@router.delete("/{produto_id}", status_code=204)
def deletar_produto(produto_id: int, db: Session = Depends(get_db)):
    if not produto_service.delete_produto(db, produto_id):
        raise HTTPException(status_code=404, detail="Produto não encontrado")
