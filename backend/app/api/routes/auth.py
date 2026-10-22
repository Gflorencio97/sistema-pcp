from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.auditoria import registrar_evento
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    criar_token, hash_falso, hash_senha, ip_da_requisicao, tentativas_login, usuario_do_token,
    validar_politica_senha, verificar_senha,
)
from app.models.models import Usuario
from app.schemas.auth import LoginRequest, TokenResponse, TrocarSenhaRequest, UsuarioResponse

router = APIRouter(prefix="/auth", tags=["Autenticação"])

MSG_LOGIN_INVALIDO = "Login ou senha inválidos."


@router.post("/login", response_model=TokenResponse)
def login(dados: LoginRequest, request: Request, db: Session = Depends(get_db)):
    chave = dados.login.strip().lower()
    ip = ip_da_requisicao(request)

    restante = tentativas_login.segundos_de_bloqueio(chave)
    if restante > 0:
        registrar_evento(db, "login_falhou", None, chave, ip, depois={"motivo": "bloqueado por excesso de tentativas"})
        minutos = max(1, (restante + 59) // 60)
        raise HTTPException(
            status_code=429,
            detail=f"Muitas tentativas erradas. Tente novamente em {minutos} minuto(s).",
            headers={"Retry-After": str(restante)},
        )

    usuario = db.query(Usuario).filter(Usuario.login == chave).first()
    # confere sempre uma senha (mesmo sem usuario) para o tempo de resposta nao revelar quem existe
    senha_ok = verificar_senha(dados.senha, usuario.senha_hash if usuario else hash_falso())
    if usuario is None or not senha_ok or not usuario.ativo:
        bloqueou = tentativas_login.falha(chave)
        motivo = "login inexistente" if usuario is None else ("usuário inativo" if not usuario.ativo else "senha incorreta")
        registrar_evento(
            db, "login_falhou", usuario.id if usuario else None, chave, ip,
            depois={"motivo": motivo, "bloqueado": bloqueou},
        )
        raise HTTPException(status_code=401, detail=MSG_LOGIN_INVALIDO)

    tentativas_login.sucesso(chave)
    usuario.ultimo_acesso = datetime.now()
    db.commit()
    registrar_evento(db, "login", usuario.id, usuario.login, ip)
    token, expira = criar_token(usuario)
    return TokenResponse(access_token=token, expires_in=expira, usuario=UsuarioResponse.model_validate(usuario))


@router.get("/me", response_model=UsuarioResponse)
def me(usuario: Usuario = Depends(usuario_do_token)):
    return usuario


@router.post("/trocar-senha", response_model=TokenResponse)
def trocar_senha(
    dados: TrocarSenhaRequest,
    usuario: Usuario = Depends(usuario_do_token),
    db: Session = Depends(get_db),
):
    if not verificar_senha(dados.senha_atual, usuario.senha_hash):
        raise HTTPException(status_code=400, detail="A senha atual está incorreta.")
    if dados.nova_senha == dados.senha_atual:
        raise HTTPException(status_code=400, detail="A nova senha precisa ser diferente da atual.")
    erro = validar_politica_senha(dados.nova_senha, usuario.login)
    if erro:
        raise HTTPException(status_code=400, detail=erro)

    usuario.senha_hash = hash_senha(dados.nova_senha)
    usuario.deve_trocar_senha = False
    usuario.token_versao = (usuario.token_versao or 0) + 1      # invalida os logins antigos
    db.commit()
    db.refresh(usuario)
    token, expira = criar_token(usuario)                         # continua logado com um token novo
    return TokenResponse(access_token=token, expires_in=expira, usuario=UsuarioResponse.model_validate(usuario))
