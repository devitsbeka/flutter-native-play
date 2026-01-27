import { useState, useRef } from 'react';
import { AlertCircle, Volume2, VolumeX, Play, Pause, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QuestionType } from '@/hooks/useQuestionStudio';

interface MediaPreviewProps {
  type: QuestionType;
  url: string;
  className?: string;
}

export function MediaPreview({ type, url, className }: MediaPreviewProps) {
  const [error, setError] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!url) {
    return (
      <div className={cn('flex items-center justify-center bg-muted/50 rounded-lg', className)}>
        <span className="text-sm text-muted-foreground">URL-ის მითითება საჭიროა</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 bg-destructive/10 rounded-lg', className)}>
        <AlertCircle className="h-8 w-8 text-destructive" />
        <span className="text-sm text-destructive">მედია ვერ ჩაიტვირთა</span>
      </div>
    );
  }

  // Check for YouTube URL
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const youtubeId = isYouTube ? extractYouTubeId(url) : null;

  if (type === 'image') {
    return (
      <div className={cn('relative overflow-hidden rounded-lg bg-muted/50', className)}>
        <img
          src={url}
          alt="Preview"
          className="w-full h-full object-contain"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  if (type === 'video') {
    if (youtubeId) {
      return (
        <div className={cn('relative overflow-hidden rounded-lg bg-black', className)}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&mute=1&loop=1&playlist=${youtubeId}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className={cn('relative overflow-hidden rounded-lg bg-black', className)}>
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full object-contain"
          muted={muted}
          loop
          autoPlay
          playsInline
          onError={() => setError(true)}
        />
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-2 right-2 h-8 w-8"
          onClick={() => setMuted(!muted)}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  if (type === 'audio') {
    const togglePlay = () => {
      if (audioRef.current) {
        if (playing) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setPlaying(!playing);
      }
    };

    return (
      <div className={cn('flex items-center justify-center gap-4 bg-muted/50 rounded-lg p-4', className)}>
        <audio
          ref={audioRef}
          src={url}
          onError={() => setError(true)}
          onEnded={() => setPlaying(false)}
        />
        <Button size="icon" variant="outline" onClick={togglePlay} className="h-12 w-12 rounded-full">
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <div className="flex-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary w-0" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">აუდიო პრევიუ</p>
        </div>
      </div>
    );
  }

  return null;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
