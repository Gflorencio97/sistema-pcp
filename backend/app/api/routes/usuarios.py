from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import exigir_admin, gerar_senha_temporaria, hash_senha, validar_politica_senha
from app.models.models import PerfilUsuario, Usuario
from app.schemas.auth import UsuarioComSenha, UsuarioCreate, UsuarioResponse, UsuarioUpdate

# Somente administradores gerenciam usuarios. Nao ha exclusao: a conta e desativada.
router = APIRouter(prefix="/usuarios", tags=["Usuários"], dependencies=[Depends(exigir_admin)])


def _admins_ativos(db: Session) -> int:
    return db.query(Usuario).filter(Usuario.perfil == PerfilUsuario.ADMIN.value, Usuario.ativo == True).count()  # noqa: E712


def _obter(db: Session, usuario_id: int) -> Usuario:
    u = db.get(Usuario, usuario_id)
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return u


@router.get("", response_model=List[UsuarioResponse])
def listar(db: Session = Depends(get_db)):
    return db.query(Usuario).order_by(Usuario.nome).all()


@router.post("", response_model=UsuarioComSenha, status_code=201)
def criar(dados: UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.login == dados.login).first():
        raise HTTPException(status_code=400, detail=f"O login '{dados.login}' já existe.")
    senha = dados.senha or gerar_senha_temporaria()
    erro = validar_politica_senha(senha, dados.login)
    if erro:
        raise HTTPException(status_code=400, detail=erro)
    novo = Usuario(
        nome=dados.nome.strip(), login=dados.login, perfil=dados.perfil,
        senha_hash=hash_senha(senha), ativo=True, deve_trocar_senha=True,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    resp = UsuarioComSenha.model_validate(novo)
    resp.senha_temporaria = senha          # aparece uma unica vez
    return resp


@router.patch("/{usuario_id}", response_model=UsuarioResponse)
def atualizar(
    usuario_id: int,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(exigir_admin),
):
    u = _obter(db, usuario_id)
    campos = dados.model_dump(exclude_unset=True)

    perde_admin = u.perfil == PerfilUsuario.ADMIN.value and (
        campos.get("perfil", u.perfil) != PerfilUsuario.ADMIN.value or campos.get("ativo", u.ativo) is False
    )
    if perde_admin:
        if u.id == admin.id:
            raise HTTPException(status_code=400, detail="Você não pode remover o seu próprio acesso de administrador.")
        if _admins_ativos(db) <= 1:
            raise HTTPException(status_code=400, detail="O sistema precisa ter pelo menos um administrador ativo.")
    if campos.get("ativo") is False and u.id == admin.id:
        raise HTTPException(status_code=400, detail="Você não pode desativar a sua própria conta.")

    desativou = campos.get("ativo") is False and u.ativo
    mudou_perfil = "perfil" in campos and campos["perfil"] != u.perfil
    for campo, valor in campos.items():
        setattr(u, campo, valor)
    if desativou or mudou_perfil:
        u.token_versao = (u.token_versao or 0) + 1     # derruba os logins em andamento
    db.commit()
    db.refresh(u)
    return u


@router.post("/{usuario_id}/redefinir-senha", response_model=UsuarioComSenha)
def redefinir_senha(
    usuario_id: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(exigir_admin),
):
    if usuario_id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Para trocar a sua própria senha use \"Trocar senha\" no topo da tela. "
                   "A redefinição serve para outras pessoas.",
        )
    u = _obter(db, usuario_id)
    senha = gerar_senha_temporaria()
    u.senha_hash = hash_senha(senha)
    u.deve_trocar_senha = True
    u.token_versao = (u.token_versao or 0) + 1
    db.commit()
    db.refresh(u)
    resp = UsuarioComSenha.model_validate(u)
    resp.senha_temporaria = senha
    return resp
