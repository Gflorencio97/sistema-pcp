"""Auditoria: registra quem criou, editou ou excluiu cada registro.

As alteracoes de produtos, roteiros, maquinas, setores MOD, ordens e usuarios sao capturadas
automaticamente por eventos da sessao do SQLAlchemy, desde que a sessao tenha vindo de uma
requisicao autenticada (usuario_do_token marca db.info['auditar']).
Logins e falhas de login sao gravados por registrar_evento.
"""
import json
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, Optional

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from app.models.models import (
    Auditoria, Maquina, OrdemProducao, Produto, RoteiroProduto, SetorMOD, Usuario,
)

ENTIDADES = {
    Produto: "produto",
    RoteiroProduto: "roteiro",
    Maquina: "maquina",
    SetorMOD: "setor_mod",
    OrdemProducao: "ordem",
    Usuario: "usuario",
}
OCULTAR = {"senha_hash"}                       # nunca vai para o registro
IGNORAR_NA_EDICAO = {"atualizado_em", "criado_em"}


def _valor(v: Any) -> Any:
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, Enum):
        return v.value
    return v


def _snapshot(obj: Any) -> Dict[str, Any]:
    mapper = inspect(obj).mapper
    return {c.key: _valor(getattr(obj, c.key)) for c in mapper.column_attrs if c.key not in OCULTAR}


def _mudancas(obj: Any):
    """(antes, depois) so com os campos que realmente mudaram."""
    antes: Dict[str, Any] = {}
    depois: Dict[str, Any] = {}
    estado = inspect(obj)
    for c in estado.mapper.column_attrs:
        if c.key in OCULTAR or c.key in IGNORAR_NA_EDICAO:
            continue
        hist = estado.attrs[c.key].history
        if not hist.has_changes():
            continue
        novo = _valor(hist.added[0]) if hist.added else None
        velho = _valor(hist.deleted[0]) if hist.deleted else None
        if novo != velho:
            antes[c.key] = velho
            depois[c.key] = novo
    return antes, depois


def _json(d: Optional[Dict[str, Any]]) -> Optional[str]:
    return json.dumps(d, ensure_ascii=False, default=str) if d else None


@event.listens_for(Session, "before_flush")
def _antes_do_flush(session: Session, flush_context, instances) -> None:
    if not session.info.get("auditar"):
        return
    pend = []
    for obj in list(session.new):
        if type(obj) in ENTIDADES:
            pend.append(("criar", obj, None))
    for obj in list(session.dirty):
        if type(obj) in ENTIDADES and session.is_modified(obj, include_collections=False):
            antes, depois = _mudancas(obj)
            if depois:
                pend.append(("editar", obj, (antes, depois)))
    for obj in list(session.deleted):
        if type(obj) in ENTIDADES:
            pend.append(("excluir", obj, _snapshot(obj)))
    session.info["_auditoria_pend"] = pend


@event.listens_for(Session, "after_flush")
def _depois_do_flush(session: Session, flush_context) -> None:
    pend = session.info.pop("_auditoria_pend", None)
    if not pend:
        return
    conexao = session.connection()
    agora = datetime.now()
    for acao, obj, extra in pend:
        if acao == "criar":
            antes, depois = None, _snapshot(obj)
        elif acao == "editar":
            antes, depois = extra
        else:
            antes, depois = extra, None
        conexao.execute(
            Auditoria.__table__.insert().values(
                usuario_id=session.info.get("usuario_id"),
                usuario_login=session.info.get("usuario_login"),
                acao=acao,
                entidade=ENTIDADES[type(obj)],
                entidade_id=str(getattr(obj, "id", "") or ""),
                dados_antes=_json(antes),
                dados_depois=_json(depois),
                ip=session.info.get("ip"),
                data_hora=agora,
            )
        )


def registrar_evento(
    db: Session,
    acao: str,
    usuario_id: Optional[int],
    usuario_login: Optional[str],
    ip: str = "",
    entidade: Optional[str] = None,
    entidade_id: Optional[Any] = None,
    antes: Optional[Dict[str, Any]] = None,
    depois: Optional[Dict[str, Any]] = None,
) -> None:
    """Grava um evento diretamente (login, login_falhou...) e confirma."""
    db.add(Auditoria(
        usuario_id=usuario_id,
        usuario_login=usuario_login,
        acao=acao,
        entidade=entidade,
        entidade_id=str(entidade_id) if entidade_id is not None else None,
        dados_antes=_json(antes),
        dados_depois=_json(depois),
        ip=ip or None,
    ))
    db.commit()
