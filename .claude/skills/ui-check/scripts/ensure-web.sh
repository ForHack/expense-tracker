#!/usr/bin/env bash
# Поднимает dev-сервер web на :3000, если он ещё не запущен, и сообщает
# о состоянии API (:4000) и postgres (:5433) — они нужны страницам дашборда.
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)}"
LOG="$ROOT/.playwright-mcp/ui-check/web-dev.log"

up() { curl -sfo /dev/null --max-time 2 "http://localhost:$1" || nc -z localhost "$1" 2>/dev/null; }

if up 3000; then
  echo "web: уже запущен на http://localhost:3000"
else
  mkdir -p "$(dirname "$LOG")"
  echo "web: не запущен — стартую pnpm --filter @expense-tracker/web dev (лог: $LOG)"
  (cd "$ROOT" && nohup pnpm --filter @expense-tracker/web dev >"$LOG" 2>&1 &)

  for _ in $(seq 1 60); do
    up 3000 && break
    sleep 1
  done

  if up 3000; then
    echo "web: поднялся на http://localhost:3000"
  else
    echo "web: НЕ поднялся за 60с — смотри $LOG" >&2
    exit 1
  fi
fi

up 4000 && echo "api: ок на :4000" || echo "api: НЕ отвечает на :4000 — страницы дашборда упадут или уведут на /login (pnpm --filter @expense-tracker/api dev)"
up 5433 && echo "postgres: ок на :5433" || echo "postgres: НЕ отвечает на :5433 (docker compose up -d postgres)"
