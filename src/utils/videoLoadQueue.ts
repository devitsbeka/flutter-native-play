// Video load queue to limit concurrent video downloads
// Prevents network congestion when many videos are on screen

type QueueItem = {
  url: string;
  resolve: () => void;
  reject: (error: Error) => void;
};

class VideoLoadQueue {
  private queue: QueueItem[] = [];
  private loading: Set<string> = new Set();
  private maxConcurrent: number;

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  async acquire(url: string): Promise<void> {
    // Already loading or loaded this URL
    if (this.loading.has(url)) {
      return;
    }

    // Can start immediately
    if (this.loading.size < this.maxConcurrent) {
      this.loading.add(url);
      return;
    }

    // Must wait in queue
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject });
    });
  }

  release(url: string): void {
    this.loading.delete(url);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.loading.size < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        this.loading.add(next.url);
        next.resolve();
      }
    }
  }

  // Cancel a queued request (e.g., when component unmounts)
  cancel(url: string): void {
    const index = this.queue.findIndex(item => item.url === url);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
    this.loading.delete(url);
  }

  get activeCount(): number {
    return this.loading.size;
  }

  get queuedCount(): number {
    return this.queue.length;
  }
}

// Global singleton for video loading
export const videoLoadQueue = new VideoLoadQueue(3);
