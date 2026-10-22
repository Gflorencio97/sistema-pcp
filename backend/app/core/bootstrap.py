"""Primeira execucao: cria o administrador inicial quando nao existe nenhum usuario."""
import sys

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import gerar_senha_temporaria, hash_senha, validar_politica_senha
from app.models.models import PerfilUsuario, Usuario

LOGIN_ADMIN = "admin"


def garantir_admin_inicial() -> None:
    db = SessionLocal()
    try:
        if db.query(Usuario).count() > 0:
            return
        senha_do_ambiente = settings.PCP_ADMIN_SENHA
        if senha_do_ambiente and validar_politica_senha(senha_do_ambiente, LOGIN_ADMIN) is None:
            senha, gerada = senha_do_ambiente, False
        else:
            senha, gerada = gerar_senha_temporaria(12), True
        db.add(Usuario(
            nome="Administrador", login=LOGIN_ADMIN, perfil=PerfilUsuario.ADMIN.value,
            senha_hash=hash_senha(senha), ativo=True, deve_trocar_senha=True,
        ))
        db.commit()
        linhas = [
            "=" * 64,
            " PRIMEIRO ACESSO - usuario administrador criado",
            f"   login: {LOGIN_ADMIN}",
        ]
        if gerada:
            if senha_do_ambiente:
                linhas.append("   (PCP_ADMIN_SENHA nao atende a politica de senha e foi ignorada)")
            linhas += [
                f"   senha: {senha}",
                "   Esta senha aparece UMA unica vez, neste log. Troque-a no primeiro acesso.",
            ]
        else:
            linhas += [
                "   senha: a definida em PCP_ADMIN_SENHA",
                "   A troca da senha e obrigatoria no primeiro acesso.",
            ]
        linhas.append("=" * 64)
        print("\n".join(linhas), file=sys.stdout, flush=True)
    finally:
        db.close()
