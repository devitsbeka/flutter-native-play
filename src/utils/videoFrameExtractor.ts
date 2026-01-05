// Extract first frame from video as image data URL
const frameCache = new Map<string, string>();

export function extractFirstFrame(videoUrl: string): Promise<string> {
  // Return cached frame if available
  if (frameCache.has(videoUrl)) {
    return Promise.resolve(frameCache.get(videoUrl)!);
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    video.onloadeddata = () => {
      // Seek to first frame
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 400;
        canvas.height = video.videoHeight || 400;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          frameCache.set(videoUrl, dataUrl);
          resolve(dataUrl);
        } else {
          reject(new Error('Could not get canvas context'));
        }
      } catch (err) {
        reject(err);
      } finally {
        video.remove();
      }
    };

    video.onerror = () => {
      reject(new Error(`Failed to load video: ${videoUrl}`));
    };

    video.src = videoUrl;
    video.load();
  });
}

// Preload frames for multiple videos
export async function preloadVideoFrames(videoUrls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  await Promise.allSettled(
    videoUrls.map(async (url) => {
      try {
        const frame = await extractFirstFrame(url);
        results.set(url, frame);
      } catch (err) {
        console.warn(`Failed to extract frame from ${url}:`, err);
      }
    })
  );
  
  return results;
}

export function getCachedFrame(videoUrl: string): string | undefined {
  return frameCache.get(videoUrl);
}
