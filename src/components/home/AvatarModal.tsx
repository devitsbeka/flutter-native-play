import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, RefreshCw, Loader2, Check, ImageIcon, Wand2, Sparkles, Play, Trash2, Crown, Lock } from "lucide-react";

// Import 3D icons for avatar flow
import iconScissors from '@/assets/icons/icon-scissors.png';
import iconAiSparkle from '@/assets/icons/icon-ai-sparkle.png';
import iconPhotoUpload from '@/assets/icons/icon-photo-upload.png';
import iconHourglass from '@/assets/icons/icon-hourglass.png';
import iconSelfie from '@/assets/icons/icon-selfie.png';
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { t } from "@/lib/i18n";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { useNavigate } from "react-router-dom";

// Import mascot avatars
import mascotAvatar1 from '@/assets/avatars/mascot-avatar-1.png';
import mascotAvatar2 from '@/assets/avatars/mascot-avatar-2.png';
import mascotAvatar3 from '@/assets/avatars/mascot-avatar-3.png';
import mascotAvatar4 from '@/assets/avatars/mascot-avatar-4.png';
import mascotAvatar5 from '@/assets/avatars/mascot-avatar-5.png';
import mascotAvatar6 from '@/assets/avatars/mascot-avatar-6.png';
import mascotAvatar7 from '@/assets/avatars/mascot-avatar-7.png';
import mascotAvatar8 from '@/assets/avatars/mascot-avatar-8.png';

const DEFAULT_AVATARS = [
  mascotAvatar1, mascotAvatar2, mascotAvatar3, mascotAvatar4,
  mascotAvatar5, mascotAvatar6, mascotAvatar7, mascotAvatar8,
];

// Canonical paths that are stable across builds
// resolveAvatarUrl() converts these to valid bundled URLs at runtime
const DEFAULT_AVATAR_PATHS = [
  '/src/assets/avatars/mascot-avatar-1.png',
  '/src/assets/avatars/mascot-avatar-2.png',
  '/src/assets/avatars/mascot-avatar-3.png',
  '/src/assets/avatars/mascot-avatar-4.png',
  '/src/assets/avatars/mascot-avatar-5.png',
  '/src/assets/avatars/mascot-avatar-6.png',
  '/src/assets/avatars/mascot-avatar-7.png',
  '/src/assets/avatars/mascot-avatar-8.png',
];

// Map from bundled URL → canonical path for storage
const BUNDLED_TO_CANONICAL: Record<string, string> = {};
DEFAULT_AVATARS.forEach((bundledUrl, index) => {
  BUNDLED_TO_CANONICAL[bundledUrl] = DEFAULT_AVATAR_PATHS[index];
});

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const MAX_AVATAR_GENERATIONS = 5;

interface AvatarGeneration {
  id: string;
  avatar_url: string;
  animated_avatar_url: string | null;
  is_current: boolean;
  created_at: string;
}

export function AvatarModal({ isOpen, onClose, onComplete }: AvatarModalProps) {
  const finishAndClose = onComplete || onClose;
  const { user, profile, updateProfile } = useAuth();
  const { isVip } = useVipStatus();
  const { t } = useLanguage();

  // Detect if current avatar is a preset mascot/bot avatar
  const isCurrentAvatarMascot = (() => {
    const url = profile?.avatar_url;
    if (!url) return true; // No avatar = treat as mascot
    if (DEFAULT_AVATAR_PATHS.some(p => url.includes(p) || p.includes(url))) return true;
    if (DEFAULT_AVATARS.some(b => url === b)) return true;
    if (/mascot-avatar-\d+/.test(url) || /bot-avatar-\d+/.test(url)) return true;
    return false;
  })();
  const navigate = useNavigate();
  const [step, setStep] = useState<"gallery" | "upload" | "camera" | "generating" | "preview">("gallery");
  const [generations, setGenerations] = useState<AvatarGeneration[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [selectedForAction, setSelectedForAction] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load avatar generations
  useEffect(() => {
    if (isOpen && user) {
      loadGenerations();
    }
  }, [isOpen, user]);

  const loadGenerations = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('avatar_generations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12);

    if (!error && data) {
      setGenerations(data);
    }
  };

  // Camera controls
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setStep("camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: "user" },
          width: { min: 320, ideal: 720, max: 1280 },
          height: { min: 320, ideal: 720, max: 1280 }
        },
        audio: false,
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error(t("errors.cameraPermission"));
      setStep("upload");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setUploadedImage(imageData);
    stopCamera();
    setStep("upload");
  }, [stopCamera]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStep("gallery");
      setUploadedImage(null);
      setGeneratedAvatar(null);
      setSelectedAvatar(null);
      setSelectedForAction(null);
    }
  }, [isOpen, stopCamera]);

  // Compress image using canvas - handles HEIC, resizes, and converts to JPEG
  const compressImage = useCallback((file: File, maxWidth = 1024, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        let { width, height } = img;
        
        // Scale down if larger than maxWidth
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxWidth) {
          width = (width * maxWidth) / height;
          height = maxWidth;
        }
        
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG data URL
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      
      img.src = url;
    });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allow empty type for HEIC (some browsers don't report MIME type for HEIC)
    // Check extension as fallback
    const isImageByExtension = /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/i.test(file.name);
    if (!file.type.startsWith("image/") && !isImageByExtension) {
      toast.error(t("errors.selectImageFile"));
      return;
    }

    // Increased limit for mobile (compression will reduce final size)
    if (file.size > 15 * 1024 * 1024) {
      toast.error(t("errors.imageTooLarge"));
      return;
    }

    setIsProcessingFile(true);

    try {
      // Use canvas compression - handles HEIC, resizes, and converts to JPEG
      const dataUrl = await compressImage(file, 1024, 0.85);
      setUploadedImage(dataUrl);
      setStep("upload");
      
      // Reset input for iOS Safari (allows selecting same file again)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error(t("errors.failedToReadImage") || "Failed to process image");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const isLimitReached = generations.length >= MAX_AVATAR_GENERATIONS;
  const remainingGenerations = MAX_AVATAR_GENERATIONS - generations.length;

  const generateAvatar = async () => {
    if (!uploadedImage || !user) return;

    if (isLimitReached) {
      toast.error(t("extra.avatarMaxGenReachedShort"));
      return;
    }

    setIsLoading(true);
    setStep("generating");

    try {
      // Upload the image to storage
      const fileName = `${user.id}/temp_${Date.now()}.jpg`;
      
      const base64Data = uploadedImage.split(",")[1];
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
        body: { imageUrl },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to generate avatar");

      setGeneratedAvatar(data.avatarUrl);
      setStep("preview");
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#A855F7", "#EC4899", "#FFD700"],
      });

    } catch (error) {
      console.error("Error generating avatar:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate avatar");
      setStep("upload");
    } finally {
      setIsLoading(false);
    }
  };

  const saveAvatar = async (avatarUrl?: string) => {
    const urlToSave = avatarUrl || generatedAvatar;
    if (!urlToSave || !user) return;

    setIsLoading(true);

    try {
      // Download and re-upload to our storage
      const response = await fetch(urlToSave);
      const blob = await response.blob();
      
      const fileName = `${user.id}/avatar_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { 
          upsert: true,
          contentType: 'image/png'
        });

      if (uploadError) {
        throw new Error(`Failed to save avatar: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const finalUrl = urlData.publicUrl;

      // Save to avatar_generations table
      await supabase.from('avatar_generations').update({ is_current: false }).eq('user_id', user.id);
      
      await supabase.from('avatar_generations').insert({
        user_id: user.id,
        avatar_url: finalUrl,
        source_image_url: uploadedImage || null,
        is_current: true,
      });

      // Update profile - AI-generated avatar implies face was present
      await updateProfile({ avatar_url: finalUrl, has_face_photo: true } as any);

      toast.success(t("avatar.avatarSaved"));
      finishAndClose();

    } catch (error) {
      console.error("Error saving avatar:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save avatar");
    } finally {
      setIsLoading(false);
    }
  };

  // Save original photo without AI generation
  const saveOriginalPhoto = async () => {
    if (!uploadedImage || !user) return;

    setIsLoading(true);

    try {
      const response = await fetch(uploadedImage);
      const blob = await response.blob();
      
      const fileName = `${user.id}/avatar_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { 
          upsert: true,
          contentType: 'image/png'
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      await updateProfile({ avatar_url: urlData.publicUrl });

      // Detect face in background (non-blocking)
      if (user) {
        supabase.functions.invoke("detect-face", {
          body: { imageUrl: urlData.publicUrl, userId: user.id },
        }).catch(err => console.warn("Face detection failed:", err));
      }

      toast.success(t("avatar.avatarSaved"));
      finishAndClose();

    } catch (error) {
      console.error("Error saving photo:", error);
      toast.error(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  };

  const selectPreviousAvatar = async (avatarUrl: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Find the generation record to get its animated_avatar_url
      const generation = generations.find(g => g.avatar_url === avatarUrl);
      
      // Update all to not current
      await supabase.from('avatar_generations').update({ is_current: false }).eq('user_id', user.id);
      
      // Set selected as current
      await supabase.from('avatar_generations').update({ is_current: true }).eq('avatar_url', avatarUrl);
      
      // Update profile - restore the animated_avatar_url if this avatar has one
      const result = await updateProfile({ 
        avatar_url: avatarUrl,
        animated_avatar_url: generation?.animated_avatar_url || null 
      });
      
      if (result?.error) {
        throw result.error;
      }
      
      setSelectedForAction(null);
      toast.success(t("avatar.avatarUpdated"));
      
      // Small delay to ensure state propagates before modal closes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      finishAndClose();
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error(t("errors.generationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAvatar = async (avatarId: string, avatarUrl: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Delete from avatar_generations table
      const { error } = await supabase
        .from('avatar_generations')
        .delete()
        .eq('id', avatarId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // If this was the current avatar, clear the profile avatar
      if (profile?.avatar_url === avatarUrl) {
        await updateProfile({ avatar_url: null, animated_avatar_url: null });
      }
      
      // Refresh the list
      await loadGenerations();
      setSelectedForAction(null);
      toast.success(t("avatar.avatarDeleted"));
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast.error(t("errors.deleteFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const selectDefaultAvatar = async (avatarBundledUrl: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Convert bundled URL to canonical path for stable storage across builds
      const canonicalPath = BUNDLED_TO_CANONICAL[avatarBundledUrl] || avatarBundledUrl;
      
      // Update profile - clear animated_avatar_url since default avatars don't have animations
      // Mascots are not faces, so set has_face_photo to false
      const result = await updateProfile({ 
        avatar_url: canonicalPath,
        animated_avatar_url: null,
        has_face_photo: false,
      } as any);
      
      if (result?.error) {
        throw result.error;
      }
      
      toast.success(t("avatar.avatarUpdated"));
      
      // Small delay to ensure state propagates before modal closes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      finishAndClose();
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error(t("errors.generationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const animateAvatar = async () => {
    if (!profile?.avatar_url || !user) {
      toast.error(t("errors.noAvatarToAnimate"));
      return;
    }

    setIsAnimating(true);

    try {
      // Check if the current avatar is already AI-generated
      const { data: existingGen } = await supabase
        .from('avatar_generations')
        .select('id, avatar_url')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .single();

      let imageUrlToAnimate = profile.avatar_url;

      // If no AI-generated record exists for this avatar, generate one first
      if (!existingGen) {
        if (isLimitReached) {
          toast.error(t("extra.avatarMaxGenReachedShort"));
          setIsAnimating(false);
          return;
        }
        toast.info(t("extra.avatarAiGenerating"), { duration: 10000 });

        // Call generate-avatar with the current raw photo
        const { data: genData, error: genError } = await supabase.functions.invoke("generate-avatar", {
          body: { imageUrl: profile.avatar_url },
        });

        if (genError) throw new Error(genError.message);
        if (!genData?.success || !genData?.avatarUrl) throw new Error(genData?.error || "Failed to generate AI avatar");

        // Save the AI-generated avatar (same logic as saveAvatar)
        const response = await fetch(genData.avatarUrl);
        const blob = await response.blob();
        const fileName = `${user.id}/avatar_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, blob, { upsert: true, contentType: 'image/png' });

        if (uploadError) throw new Error(`Failed to save AI avatar: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        const aiAvatarUrl = urlData.publicUrl;

        // Update avatar_generations table
        await supabase.from('avatar_generations').update({ is_current: false }).eq('user_id', user.id);
        await supabase.from('avatar_generations').insert({
          user_id: user.id,
          avatar_url: aiAvatarUrl,
          source_image_url: profile.avatar_url,
          is_current: true,
        });

        // Update profile to use AI avatar
        await updateProfile({ avatar_url: aiAvatarUrl });

        imageUrlToAnimate = aiAvatarUrl;
        toast.success(t("extra.avatarAiCreated"), { duration: 3000 });
      }

      // Now animate the AI-generated avatar
      toast.info(t("avatar.startingAnimation"), { duration: 5000 });

      const { data, error } = await supabase.functions.invoke("animate-avatar", {
        body: { 
          imageUrl: imageUrlToAnimate,
          userId: user.id
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to start animation");

      // If completed immediately (unlikely)
      if (data.videoUrl) {
        await updateProfile({ animated_avatar_url: data.videoUrl });
        toast.success(t("avatar.avatarAnimated"), { duration: 5000 });
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#A855F7", "#EC4899", "#3B82F6"],
        });
        setIsAnimating(false);
        return;
      }

      // Get polling info
      const requestId = data.requestId;
      const statusUrl = data.statusUrl;
      const responseUrl = data.responseUrl;
      
      if (!requestId || !statusUrl || !responseUrl) {
        throw new Error("No request ID or URLs received");
      }

      toast.info(t("avatar.animationStarted"), { duration: 3000 });

      // Poll every 5 seconds for up to 3 minutes (36 attempts)
      const maxAttempts = 36;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const { data: statusData, error: statusError } = await supabase.functions.invoke("animate-avatar", {
          body: { 
            requestId,
            statusUrl,
            responseUrl,
            userId: user.id
          },
        });

        if (statusError) {
          console.error("Status check error:", statusError);
          continue;
        }

        if (statusData?.success && statusData?.videoUrl) {
          toast.success(t("avatar.avatarAnimated"), { duration: 5000 });
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#A855F7", "#EC4899", "#3B82F6"],
          });
          // Profile is updated by the edge function, trigger a refresh
          window.location.reload();
          return;
        }

        // Show progress every 15 seconds (every 3rd attempt)
        if ((attempt + 1) % 3 === 0) {
          toast.info(t("avatar.stillProcessing", { time: Math.round((attempt + 1) * 5 / 60) }), { duration: 2000 });
        }
      }

      toast.error(t("avatar.animationTakingLong"));

    } catch (error) {
      console.error("Error animating avatar:", error);
      toast.error(error instanceof Error ? error.message : "Failed to animate avatar");
    } finally {
      setIsAnimating(false);
    }
  };

  // Content based on step
  const renderContent = () => {
    if (step === "gallery") {
      return (
        <div className="space-y-4">
          {/* Current Avatar */}
          <div className="flex flex-col items-center">
            {/* Wrapper for proper badge positioning */}
            <div className="relative mb-2">
              {/* Avatar circle with overflow-hidden */}
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary/30">
                {profile?.avatar_url ? (
                  <img 
                    src={resolveAvatarUrl(profile.avatar_url) || profile.avatar_url} 
                    alt="Current avatar" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t("avatar.uploadEncouragement")}</p>
            
            {/* Animate Avatar Button - PRO gated, only for user-uploaded photos */}
            {!isCurrentAvatarMascot && profile?.avatar_url && (
              isVip ? (
                <motion.button
                  onClick={animateAvatar}
                  disabled={isAnimating}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-xs font-medium text-primary hover:from-primary/30 hover:to-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isAnimating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{t("avatar.animating")}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>{profile?.animated_avatar_url ? t("avatar.reAnimate") : t("avatar.animateAvatar")}</span>
                    </>
                  )}
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => {
                    onClose();
                    navigate("/profile?tab=PRO");
                  }}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-xs font-medium text-muted-foreground"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Lock className="w-3 h-3" />
                  <span>{t("avatar.animationPro")}</span>
                  <Crown className="w-3 h-3 text-amber-500" />
                </motion.button>
              )
            )}
          </div>

          {/* Generate New Section - MOVED UP */}
          <div className="pt-2">
            <p className="text-sm font-medium text-foreground mb-2">{t("avatar.createNew")}</p>
          {isLimitReached ? (
            <div className="flex items-center justify-center py-3 px-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground text-center">{t("avatar.maxGenReached", { max: MAX_AVATAR_GENERATIONS })}</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-1">{t("avatar.remainingGen", { remaining: remainingGenerations, max: MAX_AVATAR_GENERATIONS })}</p>
              <div className="flex gap-3">
                <motion.button
                  onClick={startCamera}
                  className="flex-1 aspect-square max-w-[100px] rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <img 
                    src={iconSelfie} 
                    alt="Selfie" 
                    className="w-10 h-10 object-contain"
                  />
                  <span className="text-xs text-muted-foreground">{t("avatar.takeSelfie")}</span>
                </motion.button>

                <motion.button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className={`flex-1 aspect-square max-w-[100px] rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all ${isProcessingFile ? 'opacity-50' : ''}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isProcessingFile ? (
                    <>
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">{t("common.processing") || "Processing..."}</span>
                    </>
                  ) : (
                    <>
                      <img 
                        src={iconPhotoUpload} 
                        alt="Upload" 
                        className="w-10 h-10 object-contain"
                      />
                      <span className="text-xs text-muted-foreground">{t("avatar.uploadPhoto")}</span>
                    </>
                  )}
                </motion.button>
              </div>
            </>
          )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* My Generated Avatars */}
          {generations.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t("avatar.myAvatars")}</p>
              <div className="grid grid-cols-5 gap-2">
                {generations.slice(0, 10).map((gen) => (
                  <motion.button
                    key={gen.id}
                    onClick={() => setSelectedForAction(
                      selectedForAction === gen.id ? null : gen.id
                    )}
                    disabled={isLoading}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      selectedForAction === gen.id 
                        ? "border-primary ring-2 ring-primary/30" 
                        : gen.is_current 
                          ? "border-primary" 
                          : "border-border hover:border-primary/50"
                    } disabled:opacity-50`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img 
                      src={gen.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                    {gen.is_current && selectedForAction !== gen.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    {selectedForAction === gen.id && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
              
              {/* Action buttons when avatar is selected */}
              <AnimatePresence>
                {selectedForAction && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-center gap-4 mt-3"
                  >
                    <motion.button
                      onClick={() => {
                        const gen = generations.find(g => g.id === selectedForAction);
                        if (gen) deleteAvatar(gen.id, gen.avatar_url);
                      }}
                      disabled={isLoading}
                      className="w-12 h-12 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors disabled:opacity-50"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        const gen = generations.find(g => g.id === selectedForAction);
                        if (gen) selectPreviousAvatar(gen.avatar_url);
                      }}
                      disabled={isLoading}
                      className="w-12 h-12 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors disabled:opacity-50"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Check className="w-5 h-5 text-primary" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Default Avatars */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t("avatar.avatarsList")}</p>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_AVATARS.map((avatar, index) => {
                // Check against both bundled URL and canonical path for selection indicator
                const canonicalPath = DEFAULT_AVATAR_PATHS[index];
                const isSelected = profile?.avatar_url === avatar || profile?.avatar_url === canonicalPath;
                return (
                  <motion.button
                    key={index}
                    onClick={() => selectDefaultAvatar(avatar)}
                    disabled={isLoading}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected ? "border-amber-500" : "border-border hover:border-amber-400/50"
                    } disabled:opacity-50`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img 
                      src={avatar} 
                      alt={`Default avatar ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-amber-500" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (step === "upload" && uploadedImage) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30">
            <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
          </div>
          
          {isVip ? (
            // PRO USER: Show both options
            <>
              <p className="text-sm text-muted-foreground text-center">
                {t("avatar.description")}
              </p>
              <div className="flex gap-2 w-full">
                <ChunkyButton
                  variant="secondary"
                  size="md"
                  onClick={saveOriginalPhoto}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {t("extra.avatarOriginal")}
                </ChunkyButton>
                <ChunkyButton
                  variant="primary"
                  size="md"
                  onClick={generateAvatar}
                  disabled={isLoading}
                  className="flex-1"
                  icon={<img src={iconAiSparkle} alt="" className="w-5 h-5 object-contain" />}
                >
                  {t("avatar.generate")}
                </ChunkyButton>
              </div>
            </>
          ) : (
            // NON-PRO USER: Show save option + PRO upsell
            <>
              <ChunkyButton
                variant="secondary"
                size="md"
                onClick={saveOriginalPhoto}
                disabled={isLoading}
                className="w-full"
              >
                {t("extra.avatarSaveAsPhoto")}
              </ChunkyButton>
              
              <div className="w-full h-px bg-border my-2" />
              
              {/* PRO Upsell Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                    <img src={iconAiSparkle} alt="" className="w-6 h-6 object-contain" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t("extra.avatarAiGenTitle")}</p>
                    <p className="text-xs text-muted-foreground">{t("extra.avatarProFeature")}</p>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mb-3">
                  {t("extra.avatarAiDesc")}
                </p>
                
                <ChunkyButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    navigate("/profile?tab=PRO");
                  }}
                  className="w-full"
                  icon={<Crown className="w-4 h-4" />}
                >
                  {t("extra.avatarBecomePro")}
                </ChunkyButton>
              </motion.div>
            </>
          )}
        </div>
      );
    }

    if (step === "camera") {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary/30">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {!isCameraReady && (
              <div className="absolute inset-0 bg-muted flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2 w-full">
            <ChunkyButton
              variant="secondary"
              size="md"
              onClick={() => {
                stopCamera();
                setStep("gallery");
              }}
              className="flex-1"
            >
              {t("common.cancel")}
            </ChunkyButton>
            <ChunkyButton
              variant="primary"
              size="md"
              onClick={capturePhoto}
              disabled={!isCameraReady}
              className="flex-1"
              icon={<Camera className="w-4 h-4" />}
            >
              {t("avatar.capture")}
            </ChunkyButton>
          </div>
        </div>
      );
    }

    if (step === "generating") {
      return (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            {/* Background circle with uploaded image */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 opacity-50">
              <img src={uploadedImage || ""} alt="Uploading" className="w-full h-full object-cover" />
            </div>
            
            {/* Spinning border */}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Hourglass icon in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-background rounded-full shadow-lg flex items-center justify-center">
                <motion.img 
                  src={iconHourglass} 
                  alt="Loading" 
                  className="w-8 h-8 object-contain"
                  animate={{ rotate: [0, 180, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="font-semibold text-foreground">{t("avatar.generating")}</p>
            <p className="text-sm text-muted-foreground">{t("avatar.generatingTime")}</p>
          </div>
        </div>
      );
    }

    if (step === "preview" && generatedAvatar) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <motion.div 
              className="w-36 h-36 rounded-full overflow-hidden border-4 border-primary shadow-lg bg-[#E9CCFF]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <img 
                src={generatedAvatar} 
                alt="Generated Avatar" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  if (uploadedImage) {
                    e.currentTarget.src = uploadedImage;
                  }
                  toast.error(t("extra.avatarLoadFailed"));
                }}
              />
            </motion.div>
            {uploadedImage && (
              <div className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full border-2 border-white shadow-md overflow-hidden">
                <img src={uploadedImage} alt="Original" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center">{t("avatar.avatarReady")}</p>
          <div className="flex flex-col gap-2 w-full">
            <ChunkyButton
              variant="secondary"
              size="md"
              onClick={() => {
                setStep("gallery");
                setGeneratedAvatar(null);
                setUploadedImage(null);
              }}
              disabled={isLoading || isAnimating}
              className="w-full"
              icon={<img src={iconScissors} alt="" className="w-5 h-5 object-contain shrink-0" />}
            >
              {t("avatar.regenerate")}
            </ChunkyButton>
            <ChunkyButton
              variant="success"
              size="md"
              onClick={() => saveAvatar()}
              disabled={isLoading || isAnimating}
              className="w-full"
              icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            >
              {t("avatar.useAsProfile")}
            </ChunkyButton>
            
            {/* Animate button - save + animate in one tap */}
            {isVip ? (
              <ChunkyButton
                variant="primary"
                size="md"
                onClick={async () => {
                  await saveAvatar();
                  animateAvatar();
                }}
                disabled={isLoading || isAnimating}
                className="w-full"
                icon={isAnimating ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Sparkles className="w-4 h-4 shrink-0" />}
              >
                {isAnimating ? t("avatar.animating") : t("extra.avatarAnimateEmoji")}
              </ChunkyButton>
            ) : (
              <ChunkyButton
                variant="outline"
                size="md"
                onClick={() => {
                  onClose();
                  navigate("/profile?tab=PRO");
                }}
                className="w-full"
                icon={<Lock className="w-4 h-4 shrink-0" />}
              >
                <span className="flex items-center gap-1.5">
                  {t("extra.avatarAnimatePro")}
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                </span>
              </ChunkyButton>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="primary"
      title={t("avatar.title")}
      subtitle=""
      showSparkles
    >
      {renderContent()}
    </GameModal>
  );
}
