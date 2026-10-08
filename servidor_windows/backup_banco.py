"""Backup diario do banco do PCP.

Uso: python backup_banco.py <caminho_do_pcp.db> <pasta_destino> [dias_retencao]

Usa a API de backup do SQLite (segura mesmo com o sistema rodando), confere a
integridade da copia e apaga backups mais antigos que o prazo de retencao.
"""
import os
import sqlite3
import sys
import time
from datetime import datetime


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2

    origem = os.path.abspath(sys.argv[1])
    destino = sys.argv[2]
    retencao_dias = int(sys.argv[3]) if len(sys.argv) > 3 else 30

    if not os.path.isfile(origem):
        print(f"[ERRO] Banco nao encontrado: {origem}")
        return 1

    os.makedirs(destino, exist_ok=True)

    nome = f"pcp_{datetime.now():%Y-%m-%d_%H%M%S}.db"
    final = os.path.join(destino, nome)
    parcial = final + ".tmp"

    src = sqlite3.connect(f"file:{origem}?mode=ro", uri=True)
    dst = sqlite3.connect(parcial)
    try:
        src.backup(dst)
        resultado = dst.execute("PRAGMA integrity_check").fetchone()[0]
    finally:
        dst.close()
        src.close()

    if resultado != "ok":
        os.remove(parcial)
        print(f"[ERRO] Copia corrompida ({resultado}). Backup descartado.")
        return 1

    os.replace(parcial, final)
    print(f"[OK] Backup criado: {final} ({os.path.getsize(final)} bytes)")

    limite = time.time() - retencao_dias * 86400
    for arq in os.listdir(destino):
        caminho = os.path.join(destino, arq)
        if arq.startswith("pcp_") and arq.endswith(".db") and os.path.getmtime(caminho) < limite:
            os.remove(caminho)
            print(f"[OK] Removido backup antigo: {arq}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
