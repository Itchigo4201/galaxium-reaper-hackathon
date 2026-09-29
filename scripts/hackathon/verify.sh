#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:-quick}"

say() { printf '\n==> %s\n' "$1"; }

frontend() {
  say "Frontend lint"
  cd "$ROOT/booking_system_frontend"
  npm run lint

  say "Frontend tests"
  npm test

  say "Frontend production build"
  npm run build

  say "Hackathon Pages build"
  VITE_HACKATHON_DEMO=true \
  VITE_BASE_PATH=/galaxium-reaper-hackathon/ \
  npm run build
}

backend() {
  say "Backend tests"
  cd "$ROOT/booking_system_backend"

  if [[ -x .venv/bin/python ]]; then
    if ! .venv/bin/python -c "import fastapi_mcp" >/dev/null 2>&1; then
      say "Refreshing backend virtualenv dependencies"
      .venv/bin/python -m pip install -q -r requirements.txt
    fi
    .venv/bin/python -m pytest -q tests/test_services.py tests/test_booking_confirmation_backend.py
    if [[ "${GALAXIUM_STRICT_BACKEND:-0}" == "1" ]]; then
      .venv/bin/python -m pytest -q tests/test_rest.py
    else
      printf 'NOTE: REST endpoint tests are skipped locally by default because the upstream unconstrained fastapi-mcp/mcp dependency set is currently incompatible. Set GALAXIUM_STRICT_BACKEND=1 to run them.\n'
    fi
  else
    python3 -m pytest -q tests/test_services.py tests/test_booking_confirmation_backend.py
  fi
}

java_tests() {
  say "Java hold-service tests"
  cd "$ROOT/booking_system_inventory_hold_service"
  if command -v mvn >/dev/null 2>&1; then
    mvn -B test
  else
    printf 'SKIP: Maven is not installed locally. CI will run Java tests.\n'
  fi
}

diff_check() {
  say "Git diff sanity check"
  cd "$ROOT"
  git diff --check
  git status --short
}

case "$MODE" in
  quick)
    frontend
    diff_check
    ;;
  full)
    frontend
    backend
    java_tests
    diff_check
    ;;
  live)
    "$ROOT/scripts/hackathon/smoke-live.sh"
    ;;
  *)
    echo "Usage: $0 [quick|full|live]" >&2
    exit 2
    ;;
esac

say "Verification complete ($MODE)"
