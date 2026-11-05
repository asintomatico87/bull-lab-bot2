#!/usr/bin/env bash
# Wrapper: la logica vive in setup.sh, nella radice del progetto.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/setup.sh"
