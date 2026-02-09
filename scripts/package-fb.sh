#!/usr/bin/env bash
#
# Package the Facebook Instant Games build into a zip file for upload
# to the Facebook Developer Dashboard.
#
# Usage:
#   npm run package:fb      (builds + packages)
#   bash scripts/package-fb.sh  (packages only, assumes dist-fb/ exists)
#
# Output: fb-build.zip in the project root

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_DIR/dist-fb"
OUTPUT="$PROJECT_DIR/fb-build.zip"

if [ ! -d "$DIST_DIR" ]; then
  echo "Error: dist-fb/ directory not found. Run 'npm run build:fb' first."
  exit 1
fi

# Copy fbapp-config.json into the build directory (Facebook requires it at the root)
cp "$PROJECT_DIR/fbapp-config.json" "$DIST_DIR/fbapp-config.json"

# Remove any existing zip
rm -f "$OUTPUT"

# Create the zip from within dist-fb/ so paths are relative
cd "$DIST_DIR"
zip -r "$OUTPUT" . -x "*.map"

# Report
SIZE=$(du -sh "$OUTPUT" | cut -f1)
echo ""
echo "Facebook Instant Games build packaged:"
echo "  Output: fb-build.zip ($SIZE)"
echo "  Upload at: https://developers.facebook.com/apps/2784020051933983/instant-games/hosting/"
echo ""
