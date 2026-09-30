from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone

from app.models.models import RoteiroProduto, Produto, OPERACOES_FABRICA
from app.schemas.roteiro import RoteiroItemCreate, RoteiroItemUpdate, CalculoHorasResponse, CalculoOperacao


def get_roteiro_produto(db: Session, produto_id: int) -> List[RoteiroProduto]:
    return (
        db.query(RoteiroProduto)
        .options(joinedload(RoteiroProduto.maquina))
        .filter(RoteiroProduto.produto_id == produto_id)
        .order_by(RoteiroProduto.ordem)
        .all()
    )


def inicializar_roteiro(db: Session, produto_id: int) -> List[RoteiroProduto]:
    """Cria as 6 linhas de roteiro zeradas para um produto novo."""
    existentes = {r.operacao_codigo for r in get_roteiro_produto(db, produto_id)}
    novos = []
    for op in OPERACOES_FABRICA:
        if op["codigo"] not in existentes:
            item = RoteiroProduto(
                produto_id=produto_id,
                operacao_codigo=op["codigo"],
                operacao_nome=op["nome"],
                ordem=op["ordem"],
                pcs_hora=None,
                maquina_id=None,
                ativo=True,
            )
            db.add(item)
            novos.append(item)
    if novos:
        db.commit()
    return get_roteiro_produto(db, produto_id)


def atualizar_item_roteiro(
    db: Session, roteiro_id: int, update: RoteiroItemUpdate
) -> Optional[RoteiroProduto]:
    item = (
        db.query(RoteiroProduto)
        .options(joinedload(RoteiroProduto.maquina))
        .filter(RoteiroProduto.id == roteiro_id)
        .first()
    )
    if not item:
        return None
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    item.atualizado_em = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item


def salvar_roteiro_completo(
    db: Session, produto_id: int, itens_novos: list
) -> List[RoteiroProduto]:
    """Salva/atualiza em lote todas as taxas de produção e máquinas do roteiro de um produto."""
    roteiro = get_roteiro_produto(db, produto_id)
    if not roteiro:
        roteiro = inicializar_roteiro(db, produto_id)

    mapa = {r.operacao_codigo: r for r in roteiro}
    for item_data in itens_novos:
        codigo = item_data.operacao_codigo
        if codigo in mapa:
            mapa[codigo].pcs_hora = item_data.pcs_hora if (item_data.pcs_hora and item_data.pcs_hora > 0) else None
            mapa[codigo].maquina_id = item_data.maquina_id
            mapa[codigo].ativo = item_data.ativo
            mapa[codigo].atualizado_em = datetime.now(timezone.utc)

    db.commit()
    return get_roteiro_produto(db, produto_id)


def calcular_horas_pedido(
    db: Session, produto_id: int, quantidade: float
) -> Optional[CalculoHorasResponse]:
    """
    Dado um produto e uma quantidade, calcula as horas necessárias
    em cada operação do roteiro e a estimativa de dias na máquina alocada.
    """
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        return None

    roteiro = get_roteiro_produto(db, produto_id)
    if not roteiro:
        roteiro = inicializar_roteiro(db, produto_id)

    operacoes = []
    total_horas = 0.0

    for item in roteiro:
        if item.pcs_hora and item.pcs_hora > 0:
            horas = quantidade / item.pcs_hora
            total_horas += horas
        else:
            horas = None

        maq_nome = item.maquina.nome if item.maquina else None
        maq_h_dia = item.maquina.horas_por_dia if item.maquina else 17.15
        dias = round(horas / maq_h_dia, 2) if (horas is not None and maq_h_dia and maq_h_dia > 0) else None

        operacoes.append(CalculoOperacao(
            operacao_codigo=item.operacao_codigo,
            operacao_nome=item.operacao_nome,
            ordem=item.ordem,
            pcs_hora=item.pcs_hora,
            horas_necessarias=round(horas, 4) if horas is not None else None,
            maquina_id=item.maquina_id,
            maquina_nome=maq_nome,
            maquina_horas_por_dia=maq_h_dia,
            dias_necessarios=dias,
            disponivel=True,
        ))

    return CalculoHorasResponse(
        produto_id=produto_id,
        produto_nome=produto.nome,
        quantidade=quantidade,
        operacoes=operacoes,
        total_horas=round(total_horas, 4),
    )
