#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-8765}"
PDF_OUT="香港购房计划书.pdf"
HTML="香港购房计划书.print.html"

python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/hk_pdf_http.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
sleep 1

google-chrome \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --disable-dev-shm-usage \
  --font-render-hinting=none \
  --run-all-compositor-stages-before-draw \
  --virtual-time-budget=15000 \
  --no-pdf-header-footer \
  --print-to-pdf="$PDF_OUT" \
  "http://127.0.0.1:${PORT}/$(python3 -c 'import urllib.parse; print(urllib.parse.quote("'"$HTML"'"))')"

echo "Wrote $(pwd)/$PDF_OUT"
