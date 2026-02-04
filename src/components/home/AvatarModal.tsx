import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, RefreshCw, Loader2, Check, ImageIcon, Wand2, Sparkles, Play, Trash2, Crown, Lock } from "lucide-react";

// Import 3D icons for avatar flow
import iconScissors from '@/assets/icons/icon-scissors.png';
import iconAiSparkle from '@/assets/icons/icon-ai-sparkle.png';
import iconPhotoUpload from '@/assets/icons/icon-photo-upload.png';
import iconHourglass from '@/assets/icons/icon-hourglass.png';
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

// Import default bot avatars
import botAvatar1 from '@/assets/avatars/bot-avatar-1.png';
import botAvatar2 from '@/assets/avatars/bot-avatar-2.png';
import botAvatar3 from '@/assets/avatars/bot-avatar-3.png';
import botAvatar4 from '@/assets/avatars/bot-avatar-4.png';
import botAvatar5 from '@/assets/avatars/bot-avatar-5.png';
import botAvatar6 from '@/assets/avatars/bot-avatar-6.png';
import botAvatar7 from '@/assets/avatars/bot-avatar-7.png';
import botAvatar8 from '@/assets/avatars/bot-avatar-8.png';
import botAvatar9 from '@/assets/avatars/bot-avatar-9.png';
import botAvatar10 from '@/assets/avatars/bot-avatar-10.png';

const DEFAULT_AVATARS = [
  botAvatar1, botAvatar2, botAvatar3, botAvatar4, botAvatar5,
  botAvatar6, botAvatar7, botAvatar8, botAvatar9, botAvatar10,
];

// Canonical paths that are stable across builds
// resolveAvatarUrl() converts these to valid bundled URLs at runtime
const DEFAULT_AVATAR_PATHS = [
  '/src/assets/avatars/bot-avatar-1.png',
  '/src/assets/avatars/bot-avatar-2.png',
  '/src/assets/avatars/bot-avatar-3.png',
  '/src/assets/avatars/bot-avatar-4.png',
  '/src/assets/avatars/bot-avatar-5.png',
  '/src/assets/avatars/bot-avatar-6.png',
  '/src/assets/avatars/bot-avatar-7.png',
  '/src/assets/avatars/bot-avatar-8.png',
  '/src/assets/avatars/bot-avatar-9.png',
  '/src/assets/avatars/bot-avatar-10.png',
];

// Map from bundled URL → canonical path for storage
const BUNDLED_TO_CANONICAL: Record<string, string> = {};
DEFAULT_AVATARS.forEach((bundledUrl, index) => {
  BUNDLED_TO_CANONICAL[bundledUrl] = DEFAULT_AVATAR_PATHS[index];
});

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AvatarGeneration {
  id: string;
  avatar_url: string;
  animated_avatar_url: string | null;
  is_current: boolean;
  created_at: string;
}

export function AvatarModal({ isOpen, onClose }: AvatarModalProps) {
  const { user, profile, updateProfile } = useAuth();
  const { isVip } = useVipStatus();
  const navigate = useNavigate();
  const [step, setStep] = useState<"gallery" | "upload" | "camera" | "generating" | "preview">("gallery");
  const [generations, setGenerations] = useState<AvatarGeneration[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("errors.selectImageFile"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("errors.imageTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setStep("upload");
    };
    reader.readAsDataURL(file);
  };

  const generateAvatar = async () => {
    if (!uploadedImage || !user) return;

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

      // Update profile
      await updateProfile({ avatar_url: finalUrl });

      toast.success(t("avatar.avatarSaved"));
      onClose();

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

      toast.success(t("avatar.avatarSaved"));
      onClose();

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
      
      onClose();
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
      const result = await updateProfile({ 
        avatar_url: canonicalPath,
        animated_avatar_url: null 
      });
      
      if (result?.error) {
        throw result.error;
      }
      
      toast.success(t("avatar.avatarUpdated"));
      
      // Small delay to ensure state propagates before modal closes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onClose();
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
    toast.info(t("avatar.startingAnimation"), { duration: 5000 });

    try {
      // Start the animation
      const { data, error } = await supabase.functions.invoke("animate-avatar", {
        body: { 
          imageUrl: profile.avatar_url,
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
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-primary/30 mb-2">
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
              {profile?.animated_avatar_url && (
                <div className="absolute top-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                  <Play className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{t("avatar.currentAvatar")}</p>
            
            {/* Animate Avatar Button - PRO gated */}
            {profile?.avatar_url && (
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
                // Non-PRO: Show locked animation button
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
                  <span>ანიმაცია (PRO)</span>
                  <Crown className="w-3 h-3 text-amber-500" />
                </motion.button>
              )
            )}
          </div>

          {/* Generate New Section - MOVED UP */}
          <div className="pt-2">
            <p className="text-sm font-medium text-foreground mb-2">{t("avatar.createNew")}</p>
            <div className="flex gap-3">
              <motion.button
                onClick={startCamera}
                className="flex-1 aspect-square max-w-[100px] rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{t("avatar.takeSelfie")}</span>
              </motion.button>

              <motion.button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 aspect-square max-w-[100px] rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <img 
                  src={iconPhotoUpload} 
                  alt="Upload" 
                  className="w-10 h-10 object-contain"
                />
                <span className="text-xs text-muted-foreground">{t("avatar.uploadPhoto")}</span>
              </motion.button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
            <p className="text-sm font-medium text-foreground mb-2">{t("avatar.defaultAvatars")}</p>
            <div className="grid grid-cols-5 gap-2">
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
                  ორიგინალი
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
                შენახვა ფოტოდ
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
                    <p className="font-bold text-sm">AI ავატარის გენერაცია</p>
                    <p className="text-xs text-muted-foreground">PRO ფუნქცია</p>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mb-3">
                  გადააქციე ფოტო ულამაზეს 3D ავატარად! 
                  ანიმაციის საშუალებაც გექნება ✨
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
                  გახდი PRO - ₾9.99/თვე
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
          <motion.div 
            className="w-36 h-36 rounded-full overflow-hidden border-4 border-primary shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <img src={generatedAvatar} alt="Generated Avatar" className="w-full h-full object-cover" />
          </motion.div>
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
              disabled={isLoading}
              className="w-full"
              icon={<img src={iconScissors} alt="" className="w-5 h-5 object-contain shrink-0" />}
            >
              {t("avatar.regenerate")}
            </ChunkyButton>
            <ChunkyButton
              variant="success"
              size="md"
              onClick={() => saveAvatar()}
              disabled={isLoading}
              className="w-full"
              icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            >
              {t("avatar.useAsProfile")}
            </ChunkyButton>
          </div>
          
          {/* Animation Hint for PRO users */}
          {isVip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/30"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <Play className="w-4 h-4 text-accent" fill="currentColor" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">შეგიძლია გააცოცხლო!</p>
                  <p className="text-xs text-muted-foreground">შენახვის შემდეგ ანიმაცია ხელმისაწვდომია</p>
                </div>
              </div>
            </motion.div>
          )}
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
      subtitle={t("avatar.subtitle")}
      showSparkles
    >
      {renderContent()}
    </GameModal>
  );
}
