#!/bin/bash

# Check that a directory argument was passed
if [ -z "$1" ]; then
  echo "Usage: $0 <folder>"
  echo "Example: $0 myproject"
  exit 1
fi

# Check that the folder exists
if [ ! -d "$1" ]; then
  echo "❌ Folder not found: $1"
  exit 1
fi

# Root folder (without trailing slash)
ROOT="${1%/}"

if command -v cwebp >/dev/null 2>&1; then
  echo "🔄 Converting PNG → WebP in $ROOT/images ..."
  find "$ROOT/images" -name "*.png" -exec sh -c 'cwebp -q 90 "$1" -o "${1%.*}.webp"' _ {} \;

  echo "🗑️  Deleting original PNG files ..."
  find "$ROOT/images" -name "*.png" -type f -delete

  echo "📝 Updating references in story.js ..."
  sed -i '' 's/\.png/\.webp/g' "$ROOT/data/story.js"

  echo "✅ Done: $ROOT"
else
  echo "❌ cwebp not found. Installation instructions:"
  echo ""
  echo "Option 1 (recommended) — precompiled build from Google:"
  echo "  1. Download the archive from:"
  echo "     https://developers.google.com/speed/webp/docs/precompiled"
  echo "     (for Apple Silicon — libwebp-*-mac-arm64.tar.gz,"
  echo "      for Intel — libwebp-*-mac-x86-64.tar.gz)"
  echo "  2. Unpack it:"
  echo "     tar -xzf ~/Downloads/libwebp-*-mac-arm64.tar.gz"
  echo "  3. Copy the utility:"
  echo "     sudo cp ~/Downloads/libwebp-*-mac-arm64/bin/cwebp /usr/local/bin/"
  echo "  4. Verify in a new Terminal window:"
  echo "     cwebp -version"
  echo ""
  echo "Option 2 — via Homebrew:"
  echo "     brew install webp"
fi