#!/usr/bin/env bash
set -euo pipefail

URL="${1:-https://itchigo4201.github.io/galaxium-reaper-hackathon/}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

echo "Checking $URL"
code="$(curl -L -sS -o "$TMP" -w '%{http_code}' "$URL")"
[[ "$code" == "200" ]] || { echo "FAIL: page returned HTTP $code" >&2; exit 1; }

mapfile -t assets < <(grep -oE '(src|href)="[^"]+"' "$TMP" | cut -d'"' -f2 | grep '/galaxium-reaper-hackathon/' | sort -u)

if [[ "${#assets[@]}" -eq 0 ]]; then
  echo "FAIL: no deployed assets found in index.html" >&2
  exit 1
fi

origin="$(printf '%s' "$URL" | sed -E 's#(https?://[^/]+).*#\1#')"
for asset in "${assets[@]}"; do
  asset_url="$origin$asset"
  asset_code="$(curl -L -sS -o /dev/null -w '%{http_code}' "$asset_url")"
  [[ "$asset_code" == "200" ]] || { echo "FAIL: $asset_url -> HTTP $asset_code" >&2; exit 1; }
  echo "OK $asset_code $asset_url"
done

echo "PASS: live demo and assets are reachable."
