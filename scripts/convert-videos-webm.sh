#!/bin/bash
# Convert all MP4 videos to WebM VP9 format with desktop and mobile variants
#
# Desktop: max 720px width, CRF 28, VP9 (high quality)
# Mobile:  max 480px width, CRF 30, VP9 (good quality)
# Both:    no audio, optimized for web playback
#
# Usage: bash scripts/convert-videos-webm.sh
# Requirements: ffmpeg with libvpx-vp9 support

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PUBLIC_VIDEOS="$PROJECT_DIR/public/videos"
ASSETS_DIR="$PROJECT_DIR/src/assets"
MOBILE_DIR="$PUBLIC_VIDEOS/mobile"
DESKTOP_HD_DIR="$PUBLIC_VIDEOS/desktop"

# VP9 encoding settings
DESKTOP_HD_CRF=26
DESKTOP_CRF=28
MOBILE_CRF=30
DESKTOP_HD_MAX_WIDTH=1280
DESKTOP_MAX_WIDTH=720
MOBILE_MAX_WIDTH=480
THREADS=4    # Parallel conversion jobs
CPU_USED=2   # VP9 speed (0=best quality, 8=fastest) — 2 = good quality/speed balance

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${CYAN}[convert]${NC} $1"; }
success() { echo -e "${GREEN}[done]${NC} $1"; }
warn() { echo -e "${YELLOW}[skip]${NC} $1"; }
error() { echo -e "${RED}[error]${NC} $1"; }

# Check ffmpeg
if ! command -v ffmpeg &>/dev/null; then
  error "ffmpeg not found. Install it first."
  exit 1
fi

# Create output directories
mkdir -p "$MOBILE_DIR"
mkdir -p "$DESKTOP_HD_DIR"

# Track stats
TOTAL_ORIGINAL=0
TOTAL_DESKTOP_WEBM=0
TOTAL_MOBILE_WEBM=0
CONVERTED=0
SKIPPED=0

convert_video() {
  local input="$1"
  local output_desktop="$2"
  local output_mobile="$3"
  local output_desktop_hd="$4"
  local filename="$(basename "$input")"

  # Get original file size
  local orig_size=$(stat -f%z "$input" 2>/dev/null || stat -c%s "$input" 2>/dev/null)

  # Convert to desktop HD WebM (max 1280px width, high quality)
  if [ -n "$output_desktop_hd" ] && [ ! -f "$output_desktop_hd" ]; then
    log "Desktop HD: $filename"
    ffmpeg -i "$input" \
      -c:v libvpx-vp9 \
      -crf $DESKTOP_HD_CRF -b:v 0 \
      -vf "scale='min($DESKTOP_HD_MAX_WIDTH,iw)':-2" \
      -deadline good -cpu-used $CPU_USED \
      -row-mt 1 \
      -an \
      -y "$output_desktop_hd" 2>/dev/null

    local hd_size=$(stat -f%z "$output_desktop_hd" 2>/dev/null || stat -c%s "$output_desktop_hd" 2>/dev/null)
    local hd_savings=$(( (orig_size - hd_size) * 100 / orig_size ))
    success "Desktop HD $filename: $(numfmt --to=iec $orig_size) -> $(numfmt --to=iec $hd_size) (${hd_savings}% smaller)"
  elif [ -n "$output_desktop_hd" ]; then
    warn "Desktop HD $filename already exists"
  fi

  # Convert to desktop WebM (max 720px width, maintain aspect ratio)
  if [ ! -f "$output_desktop" ]; then
    log "Desktop: $filename"
    ffmpeg -i "$input" \
      -c:v libvpx-vp9 \
      -crf $DESKTOP_CRF -b:v 0 \
      -vf "scale='min($DESKTOP_MAX_WIDTH,iw)':-2" \
      -deadline good -cpu-used $CPU_USED \
      -row-mt 1 \
      -an \
      -y "$output_desktop" 2>/dev/null

    local desk_size=$(stat -f%z "$output_desktop" 2>/dev/null || stat -c%s "$output_desktop" 2>/dev/null)
    local savings=$(( (orig_size - desk_size) * 100 / orig_size ))
    success "Desktop $filename: $(numfmt --to=iec $orig_size) -> $(numfmt --to=iec $desk_size) (${savings}% smaller)"
  else
    warn "Desktop $filename already exists"
  fi

  # Convert to mobile WebM (max 480px width) - only for public videos
  if [ -n "$output_mobile" ] && [ ! -f "$output_mobile" ]; then
    log "Mobile: $filename"
    ffmpeg -i "$input" \
      -c:v libvpx-vp9 \
      -crf $MOBILE_CRF -b:v 0 \
      -vf "scale='min($MOBILE_MAX_WIDTH,iw)':-2" \
      -deadline good -cpu-used $CPU_USED \
      -row-mt 1 \
      -an \
      -y "$output_mobile" 2>/dev/null

    local mob_size=$(stat -f%z "$output_mobile" 2>/dev/null || stat -c%s "$output_mobile" 2>/dev/null)
    local mob_savings=$(( (orig_size - mob_size) * 100 / orig_size ))
    success "Mobile  $filename: $(numfmt --to=iec $orig_size) -> $(numfmt --to=iec $mob_size) (${mob_savings}% smaller)"
  fi
}

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  WebM VP9 Video Conversion${NC}"
echo -e "${CYAN}  Desktop HD: ${DESKTOP_HD_MAX_WIDTH}px, CRF ${DESKTOP_HD_CRF}${NC}"
echo -e "${CYAN}  Desktop:    ${DESKTOP_MAX_WIDTH}px, CRF ${DESKTOP_CRF}${NC}"
echo -e "${CYAN}  Mobile:     ${MOBILE_MAX_WIDTH}px, CRF ${MOBILE_CRF}${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Convert public videos (desktop + mobile)
log "Processing public videos..."
for mp4 in "$PUBLIC_VIDEOS"/*.mp4; do
  [ -f "$mp4" ] || continue
  filename="$(basename "${mp4%.mp4}")"
  convert_video "$mp4" "$PUBLIC_VIDEOS/$filename.webm" "$MOBILE_DIR/$filename.webm" "$DESKTOP_HD_DIR/$filename.webm"
done

# Convert asset videos (desktop only - these are UI animations)
log "Processing asset videos..."
for mp4 in "$ASSETS_DIR"/*.mp4; do
  [ -f "$mp4" ] || continue
  filename="$(basename "${mp4%.mp4}")"
  convert_video "$mp4" "$ASSETS_DIR/$filename.webm" ""
done

# Convert animation assets (desktop only)
if [ -d "$ASSETS_DIR/animations" ]; then
  for mp4 in "$ASSETS_DIR/animations"/*.mp4; do
    [ -f "$mp4" ] || continue
    filename="$(basename "${mp4%.mp4}")"
    convert_video "$mp4" "$ASSETS_DIR/animations/$filename.webm" ""
  done
fi

# Summary
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Conversion Complete!${NC}"
echo -e "${CYAN}========================================${NC}"

# Calculate totals
ORIG_TOTAL=$(du -sb "$PUBLIC_VIDEOS"/*.mp4 2>/dev/null | awk '{s+=$1}END{print s}')
DESK_TOTAL=$(du -sb "$PUBLIC_VIDEOS"/*.webm 2>/dev/null | awk '{s+=$1}END{print s+0}')
MOB_TOTAL=$(du -sb "$MOBILE_DIR"/*.webm 2>/dev/null | awk '{s+=$1}END{print s+0}')

echo "Original MP4 total:  $(numfmt --to=iec ${ORIG_TOTAL:-0})"
echo "Desktop WebM total:  $(numfmt --to=iec ${DESK_TOTAL:-0})"
echo "Mobile WebM total:   $(numfmt --to=iec ${MOB_TOTAL:-0})"
if [ "${ORIG_TOTAL:-0}" -gt 0 ] && [ "${DESK_TOTAL:-0}" -gt 0 ]; then
  SAVINGS=$(( (ORIG_TOTAL - DESK_TOTAL) * 100 / ORIG_TOTAL ))
  echo "Desktop savings:     ${SAVINGS}%"
fi
if [ "${ORIG_TOTAL:-0}" -gt 0 ] && [ "${MOB_TOTAL:-0}" -gt 0 ]; then
  MOB_SAVINGS=$(( (ORIG_TOTAL - MOB_TOTAL) * 100 / ORIG_TOTAL ))
  echo "Mobile savings:      ${MOB_SAVINGS}%"
fi
echo ""
