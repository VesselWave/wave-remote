#!/bin/sh
# Renders og/card.html with headless Chrome. Usage: og/render.sh (from site/).
set -eu
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
card="file://$(pwd)/og/card.html"
cover="$(pwd)/../docs/brand/cover.png"
"$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --screenshot="$(pwd)/public/og.png" "$card" 2>/dev/null
"$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=2 --window-size=1280,640 --screenshot="$cover" "$card" 2>/dev/null
sips -Z 1600 "$cover" >/dev/null
echo "public/og.png ../docs/brand/cover.png"
