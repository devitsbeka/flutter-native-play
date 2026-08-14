import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationModalContext } from "@/contexts/NotificationModalContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { generateAndRecordPortrait } from "@/utils/portraitAvatar";
import { SCENE_AVATAR_PROMPT } from "@/config/sceneAvatarPrompt";

export type GenerationType = "avatar" | "cover";

export interface GenerationJob {
  id: string;
  type: GenerationType;
  status: "generating" | "completed" | "failed";
  imageUrl?: string;
  startedAt: Date;
  estimatedTime: number; // in seconds
  metadata?: Record<string, unknown>;
  onComplete?: (imageUrl: string) => void;
}

interface BackgroundGenerationContextType {
  activeJobs: GenerationJob[];
  startAvatarGeneration: (
    uploadedImageBase64: string, 
    onComplete?: (avatarUrl: string) => void
  ) => Promise<string>;
  startCoverGeneration: (
    params: { title: string; subject: string; roundId?: string; skipNotification?: boolean },
    onComplete?: (imageUrl: string) => void
  ) => Promise<string>;
  getJob: (id: string) => GenerationJob | undefined;
  isGenerating: (type?: GenerationType) => boolean;
}

const BackgroundGenerationContext = createContext<BackgroundGenerationContextType | undefined>(undefined);

export function BackgroundGenerationProvider({ children }: { children: ReactNode }) {
  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
  const { user, updateProfile } = useAuth();
  const { showNotification } = useNotificationModalContext();
  const queryClient = useQueryClient();
  const jobsRef = useRef<Map<string, GenerationJob>>(new Map());

  const updateJob = useCallback((id: string, updates: Partial<GenerationJob>) => {
    setActiveJobs(prev => prev.map(job => 
      job.id === id ? { ...job, ...updates } : job
    ));
    const job = jobsRef.current.get(id);
    if (job) {
      jobsRef.current.set(id, { ...job, ...updates });
    }
  }, []);

  const removeJob = useCallback((id: string) => {
    setActiveJobs(prev => prev.filter(job => job.id !== id));
    jobsRef.current.delete(id);
  }, []);

  // Clear completed/failed jobs after a longer delay (5 minutes) so they show in dropdown
  const scheduleJobCleanup = useCallback((jobId: string, delayMs: number = 300000) => {
    setTimeout(() => removeJob(jobId), delayMs);
  }, [removeJob]);

  const getJob = useCallback((id: string) => {
    return jobsRef.current.get(id);
  }, []);

  const isGenerating = useCallback((type?: GenerationType) => {
    if (type) {
      return activeJobs.some(job => job.type === type && job.status === "generating");
    }
    return activeJobs.some(job => job.status === "generating");
  }, [activeJobs]);

  const startAvatarGeneration = useCallback(async (
    uploadedImageBase64: string,
    onComplete?: (avatarUrl: string) => void
  ) => {
    if (!user) throw new Error("User not authenticated");

    // Check avatar generation limit
    const { count } = await supabase
      .from("avatar_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    
    if ((count || 0) >= 5) {
      toast.error("მაქსიმუმ 5 ავატარის გენერაცია შეგიძლიათ");
      throw new Error("Avatar generation limit reached");
    }

    const jobId = `avatar_${Date.now()}`;
    const job: GenerationJob = {
      id: jobId,
      type: "avatar",
      status: "generating",
      startedAt: new Date(),
      estimatedTime: 15,
      onComplete,
    };

    jobsRef.current.set(jobId, job);
    setActiveJobs(prev => [...prev, job]);

    // Show toast with estimated time
    toast.info(t("avatar.generatingBackground"), {
      description: t("avatar.generatingBackgroundDesc"),
      duration: 5000,
    });

    // Run generation in background
    (async () => {
      try {
        // Upload the image to storage
        const fileName = `${user.id}/temp_${Date.now()}.jpg`;
        
        const base64Data = uploadedImageBase64.split(",")[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, blob, { upsert: true });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        const imageUrl = urlData.publicUrl;

        // Generate avatar via edge function
        const { data, error } = await supabase.functions.invoke("generate-avatar", {
          body: { imageUrl, prompt: SCENE_AVATAR_PROMPT },
        });

        if (error) throw new Error(error.message);
        if (!data.success) throw new Error(data.error || "Failed to generate avatar");

        const avatarUrl = data.avatarUrl;

        updateJob(jobId, { status: "completed", imageUrl: avatarUrl });

        // Show success notification with generated avatar
        showNotification("success", {
          title: t("avatar.avatarReady"),
          description: t("avatar.avatarReadyDesc"),
          icon: "✨",
          imageUrl: avatarUrl,
          actionButton: {
            label: t("avatar.useAsProfile"),
            onClick: async () => {
              try {
                // The generated artifact is a 16:9 homepage scene — save it
                // under the scene_ marker the homepage hero reads
                const response = await fetch(avatarUrl);
                const avatarBlob = await response.blob();

                const finalFileName = `${user.id}/scene_${Date.now()}.png`;

                const { error: saveError } = await supabase.storage
                  .from("avatars")
                  .upload(finalFileName, avatarBlob, {
                    upsert: true,
                    contentType: 'image/png'
                  });

                if (saveError) throw saveError;

                const { data: finalUrlData } = supabase.storage
                  .from("avatars")
                  .getPublicUrl(finalFileName);

                // Save to avatar_generations table
                await supabase.from('avatar_generations').update({ is_current: false }).eq('user_id', user.id);

                await supabase.from('avatar_generations').insert({
                  user_id: user.id,
                  avatar_url: finalUrlData.publicUrl,
                  source_image_url: imageUrl,
                  is_current: true,
                });

                // The public circle avatar: a mini stylized portrait derived
                // from the SCENE, so it matches the character exactly. The
                // raw photo is never published — on failure the previous
                // avatar simply stays.
                const portraitUrl = await generateAndRecordPortrait(user.id, finalUrlData.publicUrl);
                await updateProfile({
                  ...(portraitUrl ? { avatar_url: portraitUrl, animated_avatar_url: null } : {}),
                  has_face_photo: true,
                } as any);
                queryClient.invalidateQueries({ queryKey: ["user-scene", user.id] });
                toast.success(t("avatar.avatarSaved"));

                onComplete?.(finalUrlData.publicUrl);
              } catch (err) {
                console.error("Error saving avatar:", err);
                toast.error(t("errors.generationFailed"));
              }
            },
          },
          duration: 30000, // Keep visible longer for action
        });

        // Clean up job after 5 minutes so it stays in dropdown
        scheduleJobCleanup(jobId);

      } catch (error) {
        console.error("Background avatar generation failed:", error);
        updateJob(jobId, { status: "failed" });
        toast.error(error instanceof Error ? error.message : t("errors.generationFailed"));
        scheduleJobCleanup(jobId, 60000); // Failed jobs clean up after 1 minute
      }
    })();

    return jobId;
  }, [user, updateProfile, showNotification, updateJob, scheduleJobCleanup]);

  const startCoverGeneration = useCallback(async (
    params: { title: string; subject: string; roundId?: string; skipNotification?: boolean },
    onComplete?: (imageUrl: string) => void
  ) => {
    if (!user) throw new Error("User not authenticated");

    const MAX_GENERATIONS = 3;

    // Get current generation count for this round
    let currentCount = 0;
    if (params.roundId) {
      const { count } = await supabase
        .from("cover_image_generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("round_id", params.roundId);
      currentCount = count || 0;
    }

    const remainingAfterThis = MAX_GENERATIONS - currentCount - 1;

    const jobId = `cover_${Date.now()}`;
    const job: GenerationJob = {
      id: jobId,
      type: "cover",
      status: "generating",
      startedAt: new Date(),
      estimatedTime: 20,
      metadata: { ...params, remainingTries: remainingAfterThis },
      onComplete,
    };

    jobsRef.current.set(jobId, job);
    setActiveJobs(prev => [...prev, job]);

    // Show toast with estimated time
    toast.info("სურათი გენერირდება...", {
      description: "⏱ დაახლოებით 20-30 წამი. შეგიძლიათ გააგრძელოთ მუშაობა.",
      duration: 5000,
    });

    // Run generation in background
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-cover-image", {
          body: {
            title: params.title,
            subject: params.subject,
            roundId: params.roundId
          }
        });

        if (error) throw error;

        if (data?.imageUrl) {
          updateJob(jobId, { status: "completed", imageUrl: data.imageUrl });

          // Always auto-apply cover without blocking popup
          onComplete?.(data.imageUrl);
          toast.success("გარეკანი შეიქმნა!");
          
          // Invalidate cache so My Trivia shows latest cover image if user saved
          queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
          queryClient.invalidateQueries({ queryKey: ["cover-generations"] });
        }

        scheduleJobCleanup(jobId);

      } catch (error) {
        console.error("Background cover generation failed:", error);
        updateJob(jobId, { status: "failed" });
        toast.error("სურათის გენერაცია ვერ მოხერხდა");
        scheduleJobCleanup(jobId, 60000);
      }
    })();

    return jobId;
  }, [user, showNotification, updateJob, scheduleJobCleanup]);

  return (
    <BackgroundGenerationContext.Provider value={{
      activeJobs,
      startAvatarGeneration,
      startCoverGeneration,
      getJob,
      isGenerating,
    }}>
      {children}
    </BackgroundGenerationContext.Provider>
  );
}

export function useBackgroundGeneration() {
  const context = useContext(BackgroundGenerationContext);
  if (!context) {
    throw new Error("useBackgroundGeneration must be used within BackgroundGenerationProvider");
  }
  return context;
}

// Safe version that returns null if outside provider (for conditional usage)
export function useBackgroundGenerationSafe() {
  return useContext(BackgroundGenerationContext);
}
