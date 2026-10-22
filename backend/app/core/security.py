"""Seguranca: hash de senha, JWT, protecao contra tentativas de login e dependencias de acesso."""
import secrets
import string
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.models import PerfilUsuario, Usuario

_bearer = HTTPBearer(auto_error=False)

SENHA_MIN = 8
SENHA_MAX_BYTES = 72   # limite do bcrypt


# ----------------------------------------------------------------------- senhas
def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    try:
        return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


_hash_falso: Optional[str] = None


def hash_falso() -> str:
    """Hash usado quando o login nao existe, para o tempo de resposta nao revelar usuarios."""
    global _hash_falso
    if _hash_falso is None:
        _hash_falso = hash_senha("senha-que-nunca-sera-usada-1")
    return _hash_falso


def validar_politica_senha(senha: str, login: str = "") -> Optional[str]:
    """Devolve a mensagem de erro, ou None se a senha for aceitavel."""
    if len(senha) < SENHA_MIN:
        return f"A senha precisa ter pelo menos {SENHA_MIN} caracteres."
    if len(senha.encode("utf-8")) > SENHA_MAX_BYTES:
        return "A senha e longa demais (maximo 72 bytes)."
    if not any(c.isalpha() for c in senha) or not any(c.isdigit() for c in senha):
        return "A senha precisa ter letras e numeros."
    if login and senha.lower() == login.lower():
        return "A senha nao pode ser igual ao login."
    return None


def gerar_senha_temporaria(tamanho: int = 10) -> str:
    letras = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"   # sem l, I, O (confundem)
    numeros = "23456789"
    while True:
        senha = "".join(secrets.choice(letras + numeros) for _ in range(tamanho))
        if any(c in letras for c in senha) and any(c in numeros for c in senha):
            return senha


# ------------------------------------------------------------------------- JWT
def criar_token(usuario: Usuario) -> Tuple[str, int]:
    """Devolve (token, validade em segundos)."""
    agora = datetime.now(timezone.utc)
    expira = agora + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = jwt.encode(
        {"sub": str(usuario.id), "v": usuario.token_versao, "iat": agora, "exp": expira},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return token, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def ip_da_requisicao(request: Request) -> str:
    return request.client.host if request.client else ""


# ------------------------------------------------- bloqueio por tentativas erradas
class ControleTentativas:
    """Conta falhas de login por usuario e bloqueia por alguns minutos (em memoria)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._dados: Dict[str, Dict[str, float]] = {}

    def segundos_de_bloqueio(self, chave: str) -> int:
        with self._lock:
            d = self._dados.get(chave)
            if not d:
                return 0
            restante = d.get("bloqueado_ate", 0) - time.monotonic()
            if restante <= 0:
                if d.get("bloqueado_ate"):
                    self._dados.pop(chave, None)   # bloqueio terminou
                return 0
            return int(restante) + 1

    def falha(self, chave: str) -> bool:
        """Registra uma falha. Devolve True se este erro disparou o bloqueio."""
        with self._lock:
            d = self._dados.setdefault(chave, {"falhas": 0, "bloqueado_ate": 0})
            d["falhas"] += 1
            if d["falhas"] >= settings.LOGIN_MAX_TENTATIVAS:
                d["falhas"] = 0
                d["bloqueado_ate"] = time.monotonic() + settings.LOGIN_BLOQUEIO_MINUTOS * 60
                return True
            return False

    def sucesso(self, chave: str) -> None:
        with self._lock:
            self._dados.pop(chave, None)

    def limpar(self) -> None:
        with self._lock:
            self._dados.clear()


tentativas_login = ControleTentativas()


# ------------------------------------------------------- dependencias de acesso
def _nao_autenticado(detalhe: str = "Faça login para continuar.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detalhe,
        headers={"WWW-Authenticate": "Bearer"},
    )


def usuario_do_token(
    request: Request,
    credenciais: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    """Identifica o usuario pelo token (sem exigir a troca de senha, usado em /auth/me e trocar-senha)."""
    if credenciais is None or credenciais.scheme.lower() != "bearer":
        raise _nao_autenticado()
    try:
        dados = jwt.decode(credenciais.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        usuario_id = int(dados["sub"])
        versao = int(dados.get("v", 0))
    except (JWTError, KeyError, ValueError, TypeError):
        raise _nao_autenticado("Sessão inválida ou expirada. Entre novamente.")
    usuario = db.get(Usuario, usuario_id)
    if usuario is None or not usuario.ativo or usuario.token_versao != versao:
        raise _nao_autenticado("Sessão inválida ou expirada. Entre novamente.")
    # A auditoria registra quem fez cada alteracao feita nesta sessao de banco
    db.info["auditar"] = True
    db.info["usuario_id"] = usuario.id
    db.info["usuario_login"] = usuario.login
    db.info["ip"] = ip_da_requisicao(request)
    request.state.usuario = usuario
    return usuario


def usuario_atual(usuario: Usuario = Depends(usuario_do_token)) -> Usuario:
    """Usuario logado e liberado para usar o sistema (senha provisoria ja trocada)."""
    if usuario.deve_trocar_senha:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Troque a senha provisória para continuar.")
    return usuario


# POST que apenas calculam (nao gravam nada): liberados para qualquer perfil
POSTS_SOMENTE_LEITURA = {
    "/api/v1/carga-maquina/simular",
    "/api/v1/roteiro/calcular-horas",
}


def autorizar_requisicao(request: Request, usuario: Usuario = Depends(usuario_atual)) -> Usuario:
    """Regra de permissao por metodo HTTP, aplicada a todas as rotas de negocio.

    GET -> qualquer usuario logado | POST/PUT/PATCH -> editor ou admin | DELETE -> somente admin
    """
    metodo = request.method.upper()
    if metodo in ("GET", "HEAD", "OPTIONS"):
        return usuario
    if request.url.path.rstrip("/") in POSTS_SOMENTE_LEITURA:
        return usuario
    if metodo == "DELETE":
        if usuario.perfil != PerfilUsuario.ADMIN.value:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente o administrador pode excluir.")
        return usuario
    if usuario.perfil not in (PerfilUsuario.ADMIN.value, PerfilUsuario.EDITOR.value):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seu perfil só permite consultar.")
    return usuario


def exigir_admin(usuario: Usuario = Depends(usuario_atual)) -> Usuario:
    if usuario.perfil != PerfilUsuario.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao administrador.")
    return usuario
