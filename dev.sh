#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo ""
echo "  GiroB2B — Ambiente local (sem Docker)"
echo ""
echo "  API      → http://localhost:3001"
echo "  WEB      → http://localhost:3000"
echo ""
echo "  ⚠  Scraper/Redis/SearXNG NÃO estão rodando."
echo "     Features que dependem deles (ex.: pesquisa na web) ficam indisponíveis."
echo "     Para subir apenas esses auxiliares:"
echo "         docker compose --profile scraper up -d"
echo ""

# Libera 3000/3001 caso processo zumbi de sessão anterior ainda esteja segurando.
# Sem isso, Next cai silenciosamente pra 3002 ("port in use") e você acessa a versão velha
# em :3000 sem perceber. SIGKILL porque alguns processos sandbox-isolados ignoram SIGTERM.
for port in 3000 3001; do
  pids=$(fuser "$port"/tcp 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  ✂  liberando porta $port (pids:$pids)"
    kill -9 $pids 2>/dev/null || true
    sleep 1
    # Se ainda assim sobrou (proc de root), avisa
    still=$(fuser "$port"/tcp 2>/dev/null || true)
    if [ -n "$still" ]; then
      echo "  ⚠  porta $port ainda ocupada — rode: sudo kill -9 $still"
    fi
  fi
done

# Lockfile do Next pode ficar apontando pro PID antigo.
rm -f apps/web/.next/dev/lock 2>/dev/null || true

exec npm run dev
