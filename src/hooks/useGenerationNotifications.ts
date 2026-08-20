import { useEffect, useRef } from 'react';
import { useBackgroundGenerationSafe, GenerationJob } from '@/contexts/BackgroundGenerationContext';
import { en } from '@/locales/en';
import { ka } from '@/locales/ka';
import { readAppLanguage } from '@/utils/appLanguage';

const locales: Record<string, any> = { en, ka };

function getT() {
  const lang = readAppLanguage();
  const loc = locales[lang] || ka;
  return (key: string) => {
    const parts = key.split('.');
    let val: any = loc;
    for (const p of parts) val = val?.[p];
    return val || key;
  };
}

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
  const context = useBackgroundGenerationSafe();
  const activeJobs = context?.activeJobs ?? [];
  const previousJobsRef = useRef<Map<string, GenerationJob>>(new Map());

  const t = getT();

  const generationNotifications: GenerationNotification[] = activeJobs.map(job => ({
    id: `gen_${job.id}`,
    type: 'ai_generation' as const,
    title: job.type === 'avatar' ? t('extra.genAvatarTitle') : t('extra.genCoverTitle'),
    message: getStatusMessage(job, t),
    status: job.status,
    imageUrl: job.imageUrl,
    startedAt: job.startedAt,
    estimatedTime: job.estimatedTime,
    generationType: job.type,
    read_at: null,
    created_at: job.startedAt.toISOString(),
    data: { ...job.metadata, generationType: job.type, status: job.status },
  }));

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

function getStatusMessage(job: GenerationJob, t: (key: string) => string): string {
  switch (job.status) {
    case 'generating':
      return t('extra.genPreparing');
    case 'completed':
      return t('extra.genReady');
    case 'failed':
      return t('extra.genError');
  }
}
