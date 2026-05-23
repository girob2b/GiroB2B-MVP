#!/usr/bin/env bash
#
# sync-design-tokens.sh
#
# A landing-page (apps/girob2b-landing-page) tem repo git proprio — esta fora do
# monorepo via .gitignore. Como nao consome o workspace npm, precisa de copia
# fisica do tokens.css.
#
# Rodar:
#   bash scripts/sync-design-tokens.sh
#
# CI: o workflow da landing roda esse script no preflight pra garantir que o
# arquivo copiado esta em sync com a fonte de verdade.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_ROOT/packages/shared/src/design/tokens.css"
DST="$REPO_ROOT/apps/girob2b-landing-page/src/styles/design-tokens.css"

if [[ ! -f "$SRC" ]]; then
  echo "ERROR: source nao encontrado: $SRC" >&2
  exit 1
fi

mkdir -p "$(dirname "$DST")"

# Cabecalho de aviso anti-edicao no destino.
{
  echo "/* ──────────────────────────────────────────────────────────────"
  echo " * AUTO-GENERATED — NAO EDITAR ESTE ARQUIVO."
  echo " *"
  echo " * Fonte: packages/shared/src/design/tokens.css"
  echo " * Sync:  bash scripts/sync-design-tokens.sh"
  echo " *"
  echo " * Editado aqui = sobrescrito no proximo sync."
  echo " * ────────────────────────────────────────────────────────────── */"
  echo
  cat "$SRC"
} > "$DST"

echo "✓ Tokens sincronizados: $DST"
