#!/usr/bin/env node

/**
 * Video Optimization Script for World Quizzes
 * 
 * Converts and optimizes all MP4 videos in public/videos/ directory to WebM using FFmpeg with:
 * - VP9 codec (significantly smaller than H.264, ~40-50% savings)
 * - CRF 35 (good quality for small background videos)
 * - 480px width (2x retina for ~200-300px cards)
 * - No audio track (saves significant space)
 * - Two-pass encoding for optimal compression
 * 
 * Usage: node scripts/optimize-videos.js
 * Requirements: FFmpeg must be installed and in PATH
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const VIDEOS_DIR = path.join(__dirname, '..', 'public', 'videos');
const TEMP_DIR = path.join(__dirname, '..', 'public', 'videos', '_temp');
const BACKUP_DIR = path.join(__dirname, '..', 'public', 'videos', '_backup');

// FFmpeg settings for VP9 WebM
const CRF = 35; // VP9 CRF (30-40 is good for small background videos)
const SCALE_WIDTH = 480; // 480px width, height auto
const PRESET_SPEED = 2; // VP9 speed (0=slowest/best, 4=fast, lower = better compression)

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getVideoFiles() {
  return fs.readdirSync(VIDEOS_DIR)
    .filter(file => (file.endsWith('.mp4') || file.endsWith('.webm')) && !file.startsWith('_'))
    .map(file => path.join(VIDEOS_DIR, file));
}

function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function optimizeVideo(inputPath, outputPath) {
  // VP9 two-pass encoding for best compression
  const passLogFile = outputPath + '-passlog';
  
  // Pass 1
  await new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-c:v', 'libvpx-vp9',
      '-b:v', '0',
      '-crf', String(CRF),
      '-vf', `scale=${SCALE_WIDTH}:-2`,
      '-an',
      '-pass', '1',
      '-passlogfile', passLogFile,
      '-speed', '4', // Fast first pass
      '-pix_fmt', 'yuv420p',
      '-f', 'null',
      '-y',
      process.platform === 'win32' ? 'NUL' : '/dev/null'
    ];

    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg pass 1 exited with code ${code}: ${stderr.slice(-500)}`));
    });
    ffmpeg.on('error', reject);
  });

  // Pass 2
  await new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-c:v', 'libvpx-vp9',
      '-b:v', '0',
      '-crf', String(CRF),
      '-vf', `scale=${SCALE_WIDTH}:-2`,
      '-an',
      '-pass', '2',
      '-passlogfile', passLogFile,
      '-speed', String(PRESET_SPEED),
      '-pix_fmt', 'yuv420p',
      '-auto-alt-ref', '1',
      '-lag-in-frames', '25',
      '-row-mt', '1', // Multi-threaded row encoding
      '-y',
      outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });
    ffmpeg.on('close', (code) => {
      // Clean up pass log files
      try {
        fs.unlinkSync(passLogFile + '-0.log');
      } catch {}
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg pass 2 exited with code ${code}: ${stderr.slice(-500)}`));
    });
    ffmpeg.on('error', reject);
  });
}

async function main() {
  log('\n🎬 Video Optimization Script (MP4 → WebM VP9)\n', 'cyan');
  
  // Check FFmpeg
  if (!checkFFmpeg()) {
    log('❌ FFmpeg is not installed or not in PATH', 'red');
    log('   Install FFmpeg: https://ffmpeg.org/download.html', 'dim');
    process.exit(1);
  }
  log('✓ FFmpeg found', 'green');

  // Get video files
  const videos = getVideoFiles();
  if (videos.length === 0) {
    log('No video files found in public/videos/', 'yellow');
    process.exit(0);
  }
  log(`Found ${videos.length} videos to convert to WebM\n`, 'cyan');

  // Create temp and backup directories
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  const results = [];

  for (let i = 0; i < videos.length; i++) {
    const inputPath = videos[i];
    const fileName = path.basename(inputPath);
    const webmFileName = fileName.replace(/\.mp4$/, '.webm');
    const tempPath = path.join(TEMP_DIR, webmFileName);
    const backupPath = path.join(BACKUP_DIR, fileName);

    const originalSize = fs.statSync(inputPath).size;
    totalOriginalSize += originalSize;

    log(`[${i + 1}/${videos.length}] Converting: ${fileName} → ${webmFileName}`, 'yellow');
    log(`   Original: ${formatBytes(originalSize)}`, 'dim');

    try {
      await optimizeVideo(inputPath, tempPath);
      
      const optimizedSize = fs.statSync(tempPath).size;
      totalOptimizedSize += optimizedSize;
      
      const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
      
      // Backup original
      fs.copyFileSync(inputPath, backupPath);
      
      // Move WebM to videos directory
      const finalPath = path.join(VIDEOS_DIR, webmFileName);
      fs.renameSync(tempPath, finalPath);
      
      // Remove original MP4 if it was converted (not if already webm)
      if (fileName.endsWith('.mp4')) {
        fs.unlinkSync(inputPath);
        log(`   Converted: ${formatBytes(optimizedSize)} (${savings}% smaller) ✓ MP4 removed`, 'green');
      } else {
        log(`   Optimized: ${formatBytes(optimizedSize)} (${savings}% smaller)`, 'green');
      }
      
      results.push({ fileName, webmFileName, originalSize, optimizedSize, savings });
    } catch (error) {
      log(`   ❌ Failed: ${error.message}`, 'red');
      totalOptimizedSize += originalSize;
      results.push({ fileName, webmFileName, originalSize, optimizedSize: originalSize, savings: '0', error: true });
    }
  }

  // Clean up temp directory
  try {
    fs.rmdirSync(TEMP_DIR, { recursive: true });
  } catch {}

  // Summary
  const totalSavings = ((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(1);
  
  log('\n' + '═'.repeat(50), 'cyan');
  log('📊 CONVERSION SUMMARY (MP4 → WebM VP9)', 'cyan');
  log('═'.repeat(50), 'cyan');
  log(`   Videos processed: ${videos.length}`, 'reset');
  log(`   Original total:   ${formatBytes(totalOriginalSize)}`, 'dim');
  log(`   WebM total:       ${formatBytes(totalOptimizedSize)}`, 'green');
  log(`   Total savings:    ${totalSavings}% (${formatBytes(totalOriginalSize - totalOptimizedSize)})`, 'green');
  log(`   Backups saved to: public/videos/_backup/`, 'dim');
  log('═'.repeat(50) + '\n', 'cyan');

  // Settings used
  log('Settings used:', 'dim');
  log(`   CRF: ${CRF} | Width: ${SCALE_WIDTH}px | Speed: ${PRESET_SPEED}`, 'dim');
  log(`   Codec: VP9 (libvpx-vp9) | Format: WebM | Audio: Removed`, 'dim');
  log(`   Two-pass encoding | Row multi-threading enabled\n`, 'dim');
}

main().catch(console.error);
