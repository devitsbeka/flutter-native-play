#!/bin/bash
# Generate the mobile H.264 MP4 variants that iOS actually plays.
#
# Why this exists, separately from convert-videos-webm.sh:
#
# Only WebM variants were ever generated, and **WKWebView cannot play WebM
# below iOS 17.4**. This app supports iOS 15. So on most iPhones in service the
# <source> chain skips every WebM and falls through to the *desktop* MP4 —
# 720p, several megabytes each, dozens of them. The mobile tier exists and is
# empty for exactly the devices that need it most.
#
# `toMobileMp4Url()` in src/config/videoConfig.ts rewrites
# /videos/<name>.mp4 to /videos/mobile/<name>.mp4, so the output must land
# there under the same basename. The code already prefers it — gated behind
# VITE_MOBILE_MP4_AVAILABLE, which stays false until these files exist so the
# app never requests a 404.
#
# Encoding choices are about the iOS 15 floor, not about size:
#   - libx264 main profile, level 4.0 — baseline for the oldest hardware
#     decoders, and what Safari guarantees
#   - yuv420p — iOS refuses to decode 4:2:0 alternatives silently, showing a
#     black frame rather than an error
#   - +faststart — moves the moov atom to the front so playback starts before
#     the file finishes downloading. These stream from a CDN now, so without
#     it the first frame waits for the whole file
#   - -an — no audio, matching the WebM variants; these are background loops
#
# Usage:  bash scripts/convert-videos-mobile-mp4.sh
# Then:   set VITE_MOBILE_MP4_AVAILABLE=true and rebuild
#
# Requires ffmpeg with libx264. Safe to re-run: existing outputs are skipped.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PUBLIC_VIDEOS="$PROJECT_DIR/public/videos"
MOBILE_DIR="$PUBLIC_VIDEOS/mobile"

MOBILE_MAX_WIDTH=480
MOBILE_CRF=28          # visually clean at 480px; 23 is near-lossless, 30 soft
PRESET=slow            # encode once, ship forever — spend the time here

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
log()     { echo -e "${CYAN}[mp4]${NC} $1"; }
success() { echo -e "${GREEN}[done]${NC} $1"; }
warn()    { echo -e "${YELLOW}[skip]${NC} $1"; }
error()   { echo -e "${RED}[error]${NC} $1"; }

if ! command -v ffmpeg &>/dev/null; then
  error "ffmpeg not found. On macOS: brew install ffmpeg"
  exit 1
fi

if ! ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libx264; then
  error "This ffmpeg has no libx264. H.264 is the only codec the iOS 15 floor"
  error "can rely on, so there is no useful fallback — install a build with it."
  exit 1
fi

if [ ! -d "$PUBLIC_VIDEOS" ]; then
  error "No public/videos directory at $PUBLIC_VIDEOS"
  exit 1
fi

mkdir -p "$MOBILE_DIR"

filesize() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null; }
human()    { numfmt --to=iec "$1" 2>/dev/null || echo "${1}B"; }

TOTAL_IN=0
TOTAL_OUT=0
CONVERTED=0
SKIPPED=0

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Mobile H.264 MP4 — ${MOBILE_MAX_WIDTH}px, CRF ${MOBILE_CRF}${NC}"
echo -e "${CYAN}  For iOS below 17.4, which cannot play WebM${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

shopt -s nullglob
for mp4 in "$PUBLIC_VIDEOS"/*.mp4; do
  filename="$(basename "$mp4")"
  output="$MOBILE_DIR/$filename"

  if [ -f "$output" ]; then
    warn "$filename already exists"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  in_size=$(filesize "$mp4")
  log "Encoding $filename"

  # Scale to at most MOBILE_MAX_WIDTH, never upscale a smaller source, and
  # force even dimensions — H.264 requires them and odd heights fail the
  # encode outright.
  ffmpeg -nostdin -hide_banner -loglevel error -i "$mp4" \
    -c:v libx264 \
    -profile:v main -level:v 4.0 \
    -crf "$MOBILE_CRF" -preset "$PRESET" \
    -pix_fmt yuv420p \
    -vf "scale='min($MOBILE_MAX_WIDTH,iw)':-2" \
    -movflags +faststart \
    -an \
    -y "$output"

  out_size=$(filesize "$output")
  savings=$(( (in_size - out_size) * 100 / in_size ))
  success "$filename: $(human "$in_size") -> $(human "$out_size") (${savings}% smaller)"

  TOTAL_IN=$((TOTAL_IN + in_size))
  TOTAL_OUT=$((TOTAL_OUT + out_size))
  CONVERTED=$((CONVERTED + 1))
done
shopt -u nullglob

echo ""
if [ "$CONVERTED" -eq 0 ] && [ "$SKIPPED" -eq 0 ]; then
  error "No .mp4 files found in $PUBLIC_VIDEOS — nothing to convert."
  exit 1
fi

echo -e "${CYAN}========================================${NC}"
echo -e "  Converted: ${CONVERTED}   Skipped: ${SKIPPED}"
if [ "$CONVERTED" -gt 0 ]; then
  total_savings=$(( (TOTAL_IN - TOTAL_OUT) * 100 / TOTAL_IN ))
  echo -e "  $(human "$TOTAL_IN") -> $(human "$TOTAL_OUT") (${total_savings}% smaller)"
fi
echo -e "${CYAN}========================================${NC}"
echo ""
echo "Next:"
echo "  1. Set VITE_MOBILE_MP4_AVAILABLE=true in .env"
echo "  2. npm run build:ios"
echo "  3. Confirm the host serving VITE_VIDEO_BASE_URL exposes /videos/mobile/"
echo ""
echo "Until step 1, getResponsiveVideoSrc() keeps pointing phones at the"
echo "desktop MP4 — the files being present is not what switches this on."
