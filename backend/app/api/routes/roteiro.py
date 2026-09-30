from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.roteiro import (
    RoteiroItemResponse, RoteiroItemUpdate, RoteiroSalvarRequest,
    CalculoHorasRequest, CalculoHorasResponse,
)
from app.services import roteiro_service
from app.models.models import OPERACOES_FABRICA

router = APIRouter(prefix="/roteiro", tags=["Roteiro de Produção"])


@router.get("/operacoes")
def listar_operacoes():
    """Retorna as operações fixas da fábrica."""
    return OPERACOES_FABRICA


def _formatar_item(item):
    if item.pcs_hora and item.pcs_hora > 0:
        item.horas_por_peca = round(1 / item.pcs_hora, 6)
    else:
        item.horas_por_peca = None
    if item.maquina:
        item.maquina_nome = item.maquina.nome
        item.maquina_codigo = item.maquina.codigo
        item.maquina_horas_por_dia = item.maquina.horas_por_dia
    return item


@router.get("/produto/{produto_id}", response_model=List[RoteiroItemResponse])
def obter_roteiro_produto(produto_id: int, db: Session = Depends(get_db)):
    """Retorna o roteiro de produção de um produto, inicializando se necessário."""
    roteiro = roteiro_service.get_roteiro_produto(db, produto_id)
    if not roteiro:
        roteiro = roteiro_service.inicializar_roteiro(db, produto_id)
    return [_formatar_item(i) for i in roteiro]


@router.patch("/item/{roteiro_id}", response_model=RoteiroItemResponse)
def atualizar_item_roteiro(
    roteiro_id: int, update: RoteiroItemUpdate, db: Session = Depends(get_db)
):
    """Atualiza o pcs/hora e máquina de uma operação no roteiro."""
    item = roteiro_service.atualizar_item_roteiro(db, roteiro_id, update)
    if not item:
        raise HTTPException(status_code=404, detail="Item de roteiro não encontrado")
    return _formatar_item(item)


@router.put("/produto/{produto_id}", response_model=List[RoteiroItemResponse])
def salvar_roteiro_produto(
    produto_id: int, req: RoteiroSalvarRequest, db: Session = Depends(get_db)
):
    """Salva/atualiza em lote o roteiro de produção de um produto."""
    itens = roteiro_service.salvar_roteiro_completo(db, produto_id, req.itens)
    return [_formatar_item(i) for i in itens]




@router.post("/calcular-horas", response_model=CalculoHorasResponse)
def calcular_horas(req: CalculoHorasRequest, db: Session = Depends(get_db)):
    """
    Calcula as horas necessárias por operação para um pedido.
    Entrada: produto_id + quantidade.
    Saída: horas por operação + total.
    """
    resultado = roteiro_service.calcular_horas_pedido(db, req.produto_id, req.quantidade)
    if not resultado:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return resultado
