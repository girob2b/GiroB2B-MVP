#!/usr/bin/env bash
# sb-sql.sh — wrapper restrito pra Supabase Management API.
#
# Por que existe: o agente IA tem permissão pra rodar SÓ esse script
# (não curl genérico). Limita o blast radius do token Personal Access:
#   - hardcoded project_ref (não pode atingir outros projetos)
#   - aceita SÓ SQL via stdin (não pode mudar headers, método, URL)
#   - token vem de SUPABASE_PAT no env, nunca em argv
#   - log de auditoria em /tmp pra rastrear
#
# Uso:
#   echo "SELECT 1" | SUPABASE_PAT=sbp_xxx ./scripts/sb-sql.sh
#   ./scripts/sb-sql.sh < migration.sql
#
# Output: JSON puro do response. Exit 0 se HTTP 2xx, 1 caso contrário.

set -euo pipefail

PROJECT_REF="gwsfovtcsggbdrerynbf"
ENDPOINT="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"

if [ -z "${SUPABASE_PAT:-}" ]; then
  echo "error: SUPABASE_PAT not set in environment" >&2
  exit 2
fi

# Lê SQL do stdin
sql=$(cat)
if [ -z "$sql" ]; then
  echo "error: empty SQL on stdin" >&2
  exit 2
fi

# Audit log (apenas o início do SQL pra evitar logar dados sensíveis)
ts=$(date +%Y-%m-%dT%H:%M:%S)
sql_preview=$(echo "$sql" | tr '\n' ' ' | cut -c1-120)
echo "[${ts}] sb-sql.sh → ${sql_preview}" >> /tmp/sb-sql-audit.log

# Body JSON com SQL escapado via jq
body=$(jq -n --arg q "$sql" '{query: $q}')

# Request
http_code=$(curl -s -o /tmp/sb-sql-response.json -w "%{http_code}" \
  -X POST "$ENDPOINT" \
  -H "Authorization: Bearer ${SUPABASE_PAT}" \
  -H "Content-Type: application/json" \
  -d "$body")

cat /tmp/sb-sql-response.json
echo

if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
  exit 0
else
  echo "error: HTTP ${http_code}" >&2
  exit 1
fi
