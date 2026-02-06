#!/usr/bin/env node

/**
 * Video Optimization Script for World Quizzes
 * 
 * Optimizes all MP4 videos in public/videos/ directory using FFmpeg with:
 * - H.264 High Profile encoding (best compatibility)
 * - CRF 28-32 (visually lossless for small backgrounds)
 * - 480px width (2x retina for ~200-300px cards)
 * - No audio track (saves significant space)
 * - movflags +faststart (instant first frame, progressive download)
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

// FFmpeg settings
const CRF = 30; // Quality (18-28 = high quality, 28-32 = good for small videos)
const SCALE_WIDTH = 480; // 480px width, height auto
const PRESET = 'slow'; // slower = better compression (options: ultrafast, fast, medium, slow, slower, veryslow)

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
    .filter(file => file.endsWith('.mp4') && !file.startsWith('_'))
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
  return new Promise((resolve, reject) => {
    // Single-pass encoding with CRF (simpler and usually just as good)
    const args = [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-profile:v', 'high',
      '-level:v', '4.1',
      '-crf', String(CRF),
      '-preset', PRESET,
      '-vf', `scale=${SCALE_WIDTH}:-2`, // -2 ensures even height
      '-an', // No audio
      '-movflags', '+faststart', // Metadata at start for progressive download
      '-pix_fmt', 'yuv420p', // Maximum compatibility
      '-y', // Overwrite output
      outputPath
    ];

    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

async function main() {
  log('\n🎬 Video Optimization Script for World Quizzes\n', 'cyan');
  
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
    log('No MP4 files found in public/videos/', 'yellow');
    process.exit(0);
  }
  log(`Found ${videos.length} videos to optimize\n`, 'cyan');

  // Create temp and backup directories
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  const results = [];

  for (let i = 0; i < videos.length; i++) {
    const inputPath = videos[i];
    const fileName = path.basename(inputPath);
    const tempPath = path.join(TEMP_DIR, fileName);
    const backupPath = path.join(BACKUP_DIR, fileName);

    const originalSize = fs.statSync(inputPath).size;
    totalOriginalSize += originalSize;

    log(`[${i + 1}/${videos.length}] Optimizing: ${fileName}`, 'yellow');
    log(`   Original: ${formatBytes(originalSize)}`, 'dim');

    try {
      await optimizeVideo(inputPath, tempPath);
      
      const optimizedSize = fs.statSync(tempPath).size;
      totalOptimizedSize += optimizedSize;
      
      const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
      
      // Backup original
      fs.copyFileSync(inputPath, backupPath);
      
      // Replace with optimized
      fs.renameSync(tempPath, inputPath);
      
      log(`   Optimized: ${formatBytes(optimizedSize)} (${savings}% smaller)`, 'green');
      results.push({ fileName, originalSize, optimizedSize, savings });
    } catch (error) {
      log(`   ❌ Failed: ${error.message}`, 'red');
      totalOptimizedSize += originalSize; // Count original size for failed files
      results.push({ fileName, originalSize, optimizedSize: originalSize, savings: '0', error: true });
    }
  }

  // Clean up temp directory
  try {
    fs.rmdirSync(TEMP_DIR, { recursive: true });
  } catch {}

  // Summary
  const totalSavings = ((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(1);
  
  log('\n' + '═'.repeat(50), 'cyan');
  log('📊 OPTIMIZATION SUMMARY', 'cyan');
  log('═'.repeat(50), 'cyan');
  log(`   Videos processed: ${videos.length}`, 'reset');
  log(`   Original total:   ${formatBytes(totalOriginalSize)}`, 'dim');
  log(`   Optimized total:  ${formatBytes(totalOptimizedSize)}`, 'green');
  log(`   Total savings:    ${totalSavings}% (${formatBytes(totalOriginalSize - totalOptimizedSize)})`, 'green');
  log(`   Backups saved to: public/videos/_backup/`, 'dim');
  log('═'.repeat(50) + '\n', 'cyan');

  // Settings used
  log('Settings used:', 'dim');
  log(`   CRF: ${CRF} | Width: ${SCALE_WIDTH}px | Preset: ${PRESET}`, 'dim');
  log(`   Codec: H.264 High Profile | Audio: Removed`, 'dim');
  log(`   Faststart: Enabled (progressive download)\n`, 'dim');
}

main().catch(console.error);
