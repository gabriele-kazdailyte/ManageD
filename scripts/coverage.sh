#!/usr/bin/env bash
# Runs the backend tests with coverage and builds an HTML report in coverage/report/.
# Includes the frontend report (frontend/coverage/cobertura-coverage.xml) when it exists.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

rm -rf coverage/backend coverage/report
dotnet tool restore
dotnet test backend/ManageD.slnx \
  /p:CollectCoverage=true \
  /p:CoverletOutputFormat=cobertura \
  /p:CoverletOutput="$ROOT/coverage/backend/"

reports="coverage/backend/coverage.cobertura.xml"
if [ -f frontend/coverage/cobertura-coverage.xml ]; then
  reports="$reports;frontend/coverage/cobertura-coverage.xml"
fi

dotnet reportgenerator \
  "-reports:$reports" \
  "-targetdir:coverage/report" \
  "-classfilters:-*Migrations*;-Microsoft.AspNetCore.OpenApi.Generated*;-System.Runtime.CompilerServices*" \
  "-reporttypes:Html;MarkdownSummaryGithub"

echo "Report: $ROOT/coverage/report/index.html"
if [ "${CI:-}" != "true" ]; then
  case "$(uname)" in
    Darwin) open coverage/report/index.html ;;
    Linux) command -v xdg-open >/dev/null && xdg-open coverage/report/index.html || true ;;
  esac
fi
