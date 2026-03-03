#!/usr/bin/env bash
# Update vendored VisualEditor assets in public/ve/.
# Usage:
#   npm run update-ve              # Clone VE to a temp dir, build, copy, then remove temp
#   npm run update-ve -- /path/to/VisualEditor   # Use an existing clone (build and copy only)

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_VE="${ROOT}/public/ve"
CLEANUP_TMP=""

if [ -n "${1:-}" ]; then
	VE_SOURCE="$(cd "$1" && pwd)"
	echo "Using existing VisualEditor repo: $VE_SOURCE"
else
	TMP="$(mktemp -d)"
	trap 'rm -rf "$TMP"' EXIT
	echo "Cloning VisualEditor into $TMP ..."
	git clone --depth 1 https://github.com/wikimedia/VisualEditor.git "$TMP"
	VE_SOURCE="$TMP"
fi

echo "Installing dependencies and building ..."
(cd "$VE_SOURCE" && npm install && npx grunt build)

echo "Copying dist, lib, i18n into public/ve/ ..."
rm -rf "${PUBLIC_VE:?}/dist" "${PUBLIC_VE:?}/lib" "${PUBLIC_VE:?}/i18n"
cp -R "$VE_SOURCE/dist" "$PUBLIC_VE/"
cp -R "$VE_SOURCE/lib" "$PUBLIC_VE/"
cp -R "$VE_SOURCE/i18n" "$PUBLIC_VE/"

echo "Done. public/ve/ has been updated."
