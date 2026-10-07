#!/bin/sh
# Na primeira execução, copia o banco inicial (com os dados atuais) para o volume persistente
if [ ! -f /data/pcp.db ] && [ -f /app/backend/pcp.db ]; then
  echo "Primeira execucao: copiando banco inicial para /data/pcp.db"
  cp /app/backend/pcp.db /data/pcp.db
fi

exec python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port "${PORT:-8000}"
