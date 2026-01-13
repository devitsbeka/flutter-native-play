import { useEffect, useRef } from 'react';
import { useBackgroundGeneration, GenerationJob } from '@/contexts/BackgroundGenerationContext';

export interface GenerationNotification {
  id: string;
  type: 'ai_generation';
  title: string;
  message: string | null;
  status: 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  startedAt: Date;
  estimatedTime: number;
  generationType: 'avatar' | 'cover';
  read_at: null;
  created_at: string;
  data: Record<string, unknown>;
}

export function useGenerationNotifications() {
  const { activeJobs } = useBackgroundGeneration();
  const previousJobsRef = useRef<Map<string, GenerationJob>>(new Map());

  // Convert active jobs to notification format
  const generationNotifications: GenerationNotification[] = activeJobs.map(job => ({
    id: `gen_${job.id}`,
    type: 'ai_generation' as const,
    title: job.type === 'avatar' ? 'ავატარის გენერაცია' : 'გარეკანის გენერაცია',
    message: getStatusMessage(job),
    status: job.status,
    imageUrl: job.imageUrl,
    startedAt: job.startedAt,
    estimatedTime: job.estimatedTime,
    generationType: job.type,
    read_at: null,
    created_at: job.startedAt.toISOString(),
    data: { ...job.metadata, generationType: job.type, status: job.status },
  }));

  // Track job state changes
  useEffect(() => {
    activeJobs.forEach(job => {
      previousJobsRef.current.set(job.id, job);
    });
  }, [activeJobs]);

  return {
    generationNotifications,
    hasActiveGenerations: activeJobs.some(j => j.status === 'generating'),
    completedCount: activeJobs.filter(j => j.status === 'completed').length,
    generatingCount: activeJobs.filter(j => j.status === 'generating').length,
  };
}

function getStatusMessage(job: GenerationJob): string {
  switch (job.status) {
    case 'generating':
      return 'მზადდება...';
    case 'completed':
      return 'მზადაა';
    case 'failed':
      return 'შეცდომა მოხდა';
  }
}
