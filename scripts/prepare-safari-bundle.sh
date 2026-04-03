#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
BUNDLE_DIR="$ROOT_DIR/safari-web-extension"

mkdir -p "$BUNDLE_DIR"
rm -f \
  "$BUNDLE_DIR/background.js" \
  "$BUNDLE_DIR/content.css" \
  "$BUNDLE_DIR/content.js" \
  "$BUNDLE_DIR/logo.png" \
  "$BUNDLE_DIR/manifest.json" \
  "$BUNDLE_DIR/options.css" \
  "$BUNDLE_DIR/options.html" \
  "$BUNDLE_DIR/options.js"

cp "$ROOT_DIR/background.js" "$BUNDLE_DIR/background.js"
cp "$ROOT_DIR/content.css" "$BUNDLE_DIR/content.css"
cp "$ROOT_DIR/content.js" "$BUNDLE_DIR/content.js"
cp "$ROOT_DIR/logo.png" "$BUNDLE_DIR/logo.png"
cp "$ROOT_DIR/manifest.json" "$BUNDLE_DIR/manifest.json"
cp "$ROOT_DIR/options.css" "$BUNDLE_DIR/options.css"
cp "$ROOT_DIR/options.html" "$BUNDLE_DIR/options.html"
cp "$ROOT_DIR/options.js" "$BUNDLE_DIR/options.js"

printf '%s\n' "Prepared Safari bundle at: $BUNDLE_DIR"
