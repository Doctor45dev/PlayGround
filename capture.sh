#!/usr/bin/env bash
# Capture desktop and mobile screenshots of CAPTURE_URL into CAPTURE_DIR.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

timed() {
  /usr/bin/time -p "$@"
}

: "${CAPTURE_URL:?Set CAPTURE_URL to the app URL to capture.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the screenshot output directory.}"
: "${RUNTIME_DIR:?Set RUNTIME_DIR to the OMGithub runtime directory.}"

timed mkdir -p "$CAPTURE_DIR"

set +e
timed node "$RUNTIME_DIR/scripts/default-capture.mjs"
status=$?
set -e

if [[ "$status" -ne 0 ]]; then
  exit "$status"
fi

for name in desktop mobile; do
  file="$CAPTURE_DIR/final-$name.png"
  if [[ ! -s "$file" ]]; then
    echo "Capture finished without a screenshot: $file" >&2
    exit 1
  fi
  timed test -s "$file"
done

echo "Captured $CAPTURE_DIR/final-desktop.png and $CAPTURE_DIR/final-mobile.png"
