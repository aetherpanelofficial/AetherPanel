#!/usr/bin/env bash
# Verify a downloaded AetherPanel release before running anything.
# usage: verify-release.sh <tag> [dir]
set -Eeuo pipefail
TAG="${1:?usage: verify-release.sh <tag> [dir]}"
SLUG="aetherpanelofficial/aetherpanel"
BASE="https://github.com/${SLUG}/releases/download/${TAG}"
D="${2:-$(mktemp -d)}"; mkdir -p "$D"; cd "$D"

command -v minisign >/dev/null || { echo "install minisign first"; exit 1; }

curl -fsSLO "$BASE/SHA256SUMS"
curl -fsSLO "$BASE/SHA256SUMS.minisig"
curl -fsSLo aetherpanel.pub "https://raw.githubusercontent.com/${SLUG}/main/keys/aetherpanel.pub"

echo "pubkey sha256: $(sha256sum aetherpanel.pub | cut -d' ' -f1)"
minisign -Vm SHA256SUMS -p aetherpanel.pub || { echo "SIGNATURE INVALID"; exit 1; }
sha256sum -c --strict --ignore-missing SHA256SUMS || { echo "CHECKSUM FAILED"; exit 1; }
echo "OK - verified in $D"
