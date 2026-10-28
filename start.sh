#!/usr/bin/env bash
# Install, build, and serve the project in the foreground on $PORT.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

timed() {
  /usr/bin/time -p "$@"
}

PORT="${PORT:-3000}"
[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "PORT must be numeric: $PORT" >&2; exit 1; }
export PORT

WEB_DIR="${OPENCODE_WEB_DIR:-$PROJECT_DIR/.omgithub-runtime}"
timed mkdir -p "$WEB_DIR"

deploy_dir="$PROJECT_DIR"
if [[ -f "$PROJECT_DIR/package.json" ]]; then
  if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then
    timed npm ci --no-audit --no-fund
  else
    timed npm install --no-audit --no-fund
  fi

  build_script="$(timed node -e 'const p=require(process.argv[1]);process.stdout.write(p.scripts?.build?"yes":"no")' "$PROJECT_DIR/package.json")"
  if [[ "$build_script" == "yes" ]]; then
    timed npm run build
  fi

  for candidate in dist build out .output/public public; do
    if [[ -f "$PROJECT_DIR/$candidate/index.html" ]]; then
      deploy_dir="$PROJECT_DIR/$candidate"
      break
    fi
  done
else
  [[ -d "$PROJECT_DIR/site" ]] || { echo "Missing static source directory: $PROJECT_DIR/site" >&2; exit 1; }
  timed rm -rf "$PROJECT_DIR/dist"
  timed mkdir -p "$PROJECT_DIR/dist"
  timed cp -R "$PROJECT_DIR/site/." "$PROJECT_DIR/dist/"
  deploy_dir="$PROJECT_DIR/dist"
fi

[[ -f "$deploy_dir/index.html" ]] || { echo "Static deployment output is missing index.html: $deploy_dir" >&2; exit 1; }
deploy_dir="$(cd "$deploy_dir" && pwd)"

timed node -e '
  const { mkdirSync, writeFileSync } = require("node:fs");
  const [webDir, project, directory] = process.argv.slice(1);
  mkdirSync(webDir, { recursive: true });
  writeFileSync(`${webDir}/deployment-output.json`, JSON.stringify({ project, directory }));
' "$WEB_DIR" "$PROJECT_DIR" "$deploy_dir"

PYTHON_BIN="$(command -v python3 || true)"
[[ -n "$PYTHON_BIN" ]] || { echo "python3 is required to serve the static build." >&2; exit 1; }
timed test -x "$PYTHON_BIN"
echo "Serving $deploy_dir on port $PORT"
exec "$PYTHON_BIN" -m http.server "$PORT" --bind 0.0.0.0 --directory "$deploy_dir"
