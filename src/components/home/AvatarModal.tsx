import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, RefreshCw, Loader2, Check, ImageIcon, Wand2, Sparkles, Play, Trash2, Crown, Lock, Plus } from "lucide-react";

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
import {
  calculateAvatarQuota,
  needsSceneUpload,
  shouldResetSession,
} from "@/utils/avatarStudio";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { generateAndRecordPortrait } from "@/utils/portraitAvatar";
import { SCENE_ANIMATION_PROMPT } from "@/config/sceneAnimationPrompt";

// Import mascot avatars
import mascotAvatar1 from '@/assets/avatars/mascot-avatar-1.png';
import mascotAvatar2 from '@/assets/avatars/mascot-avatar-2.png';
import mascotAvatar3 from '@/assets/avatars/mascot-avatar-3.png';
import mascotAvatar4 from '@/assets/avatars/mascot-avatar-4.png';
import mascotAvatar5 from '@/assets/avatars/mascot-avatar-5.png';
import mascotAvatar6 from '@/assets/avatars/mascot-avatar-6.png';
import mascotAvatar7 from '@/assets/avatars/mascot-avatar-7.png';
import mascotAvatar8 from '@/assets/avatars/mascot-avatar-8.png';
import { SCENE_AVATAR_PROMPT } from "@/config/sceneAvatarPrompt";

// Homepage scenes only render on tablet/desktop (the hero is mounted at
// min-width 768px), so the scene picker is pointless on a phone — and the
// tiles would otherwise pull down scene videos nobody can see. Read
// synchronously so phones never paint the section for a frame.
function useIsSceneViewport(): boolean {
  const [isWide, setIsWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
  );
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isWide;
}

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
  /** Reports a running generation to the shell so it can show a floating
      progress chip while the modal is closed and reopen it when done. */
  onGeneratingChange?: (active: boolean, thumb?: string | null) => void;
}

interface AvatarGeneration {
  id: string;
  avatar_url: string;
  animated_avatar_url: string | null;
  is_current: boolean;
  created_at: string;
}

export function AvatarModal({ isOpen, onClose, onComplete, onGeneratingChange }: AvatarModalProps) {
  const finishAndClose = onComplete || onClose;
  const { user, profile, updateProfile } = useAuth();
  const { isVip } = useVipStatus();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const isSceneViewport = useIsSceneViewport();

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
  // "default" = the Trivia King mascot loop backs the homepage instead of a
  // generated scene; anything else = the picked generated scene. Local
  // preference, read by useUserScene.
  const [scenePref, setScenePref] = useState<string | null>(null);
  useEffect(() => {
    if (isOpen && user) setScenePref(localStorage.getItem(`scene_pref_${user.id}`));
  }, [isOpen, user?.id]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Reset transient state ONLY on a real closed -> open transition, and
  // never mid-generation — see shouldResetSession in avatarStudio.ts for
  // the regression this guards against.
  const generationInFlight = useRef(false);
  const wasOpen = useRef(false);
  // The scene generated in this session, already uploaded and recorded.
  // Applying it later only has to flip which scene is current.
  const storedScene = useRef<{ sceneUrl: string; sourceUrl: string | null } | null>(null);
  useEffect(() => {
    if (
      shouldResetSession({
        isOpen,
        wasOpen: wasOpen.current,
        generationInFlight: generationInFlight.current,
      })
    ) {
      setIsLoading(false);
      setIsProcessingFile(false);
      setIsAnimating(false);
      setSelectedForAction(null);
      setStep("gallery");
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  // Keyed on the stable user id, never the user object
  useEffect(() => {
    if (isOpen && user?.id) loadGenerations();
  }, [isOpen, user?.id]);

  const loadGenerations = async () => {
    if (!user) return;

    // Each type gets its own budget. One combined LIMIT meant a run of
    // background portraits could push every scene out of the window: "my
    // scenes" came back empty and the scene count the new-scene tile is
    // gated on read zero, on an account that plainly had scenes.
    const byType = (scenesOnly: boolean) => {
      const base = supabase.from('avatar_generations').select('*').eq('user_id', user.id);
      const scoped = scenesOnly
        ? base.like('avatar_url', '%/scene_%')
        : base.not('avatar_url', 'like', '%/scene_%');
      return scoped.order('created_at', { ascending: false }).limit(12);
    };

    const [scenes, portraits] = await Promise.all([byType(true), byType(false)]);
    if (scenes.error || portraits.error) return;

    setGenerations(
      [...(scenes.data || []), ...(portraits.data || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );
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

  // Opens the picker from a real button press. A silent no-op here is what
  // "the tile does nothing" looks like from the outside, so if the input is
  // somehow not mounted, say so rather than swallow the tap.
  const openFilePicker = () => {
    const input = fileInputRef.current;
    if (!input) {
      toast.error(t("errors.generic"));
      return;
    }
    // Clear first: an input holds its last value, and re-picking the same
    // photo fires no change event.
    input.value = "";
    input.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Captured up front and cleared on EVERY exit below. An input keeps the
    // value it was given, and re-picking the same file fires no change event
    // — so one rejected or failed photo used to leave the tile permanently
    // unresponsive to that photo, with no way to tell from the outside.
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    // Allow empty type for HEIC (some browsers don't report MIME type for HEIC)
    // Check extension as fallback
    const isImageByExtension = /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/i.test(file.name);
    if (!file.type.startsWith("image/") && !isImageByExtension) {
      toast.error(t("errors.selectImageFile"));
      input.value = "";
      return;
    }

    // Increased limit for mobile (compression will reduce final size)
    if (file.size > 15 * 1024 * 1024) {
      toast.error(t("errors.imageTooLarge"));
      input.value = "";
      return;
    }

    setIsProcessingFile(true);

    try {
      // Canvas compression resizes + converts to JPEG. HEIC/HEIF (iPhone/Mac
      // photos) can't be decoded by <img> outside Safari, so on failure they
      // are converted with heic2any (lazy-loaded) and retried.
      let dataUrl: string;
      try {
        dataUrl = await compressImage(file, 1024, 0.85);
      } catch (firstError) {
        const looksHeic =
          /\.(heic|heif)$/i.test(file.name) ||
          file.type === "image/heic" ||
          file.type === "image/heif" ||
          file.type === "";
        if (!looksHeic) throw firstError;
        const { default: heic2any } = await import("heic2any");
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
        dataUrl = await compressImage(
          new File([jpegBlob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }),
          1024,
          0.85
        );
      }
      setUploadedImage(dataUrl);
      setStep("upload");
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error(t("errors.failedToReadImage") || "Failed to process image");
    } finally {
      // Reset the input that fired (allows selecting the same file again)
      input.value = "";
      setIsProcessingFile(false);
    }
  };

  // Scenes and portraits count against SEPARATE caps — see avatarStudio.ts.
  const { maxPerType, isLimitReached, remainingGenerations } = calculateAvatarQuota(
    generations,
    isVip
  );

  const generateAvatar = async () => {
    if (!uploadedImage || !user) return;

    if (isLimitReached) {
      toast.error(t("extra.avatarMaxGenReachedShort"));
      return;
    }

    setIsLoading(true);
    setStep("generating");
    generationInFlight.current = true;
    onGeneratingChange?.(true, uploadedImage);

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
        body: { imageUrl, prompt: SCENE_AVATAR_PROMPT },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to generate avatar");

      // Persist the scene IMMEDIATELY. It used to live only in component
      // state until the user pressed save, so any interruption — closing the
      // modal, the auto-reopen, a re-render — silently threw the finished
      // generation away and the scenes list looked untouched.
      const sceneResponse = await fetch(data.avatarUrl);
      const sceneBlob = await sceneResponse.blob();
      const sceneFileName = `${user.id}/scene_${Date.now()}.png`;
      const { error: sceneUploadError } = await supabase.storage
        .from("avatars")
        .upload(sceneFileName, sceneBlob, { upsert: true, contentType: "image/png" });
      if (sceneUploadError) throw new Error(`Failed to store scene: ${sceneUploadError.message}`);

      const storedSceneUrl = supabase.storage.from("avatars").getPublicUrl(sceneFileName).data.publicUrl;

      // Recorded but NOT current yet — applying it is still the user's call
      await supabase.from("avatar_generations").insert({
        user_id: user.id,
        avatar_url: storedSceneUrl,
        source_image_url: imageUrl,
        is_current: false,
      });

      storedScene.current = { sceneUrl: storedSceneUrl, sourceUrl: imageUrl };
      await loadGenerations();

      setGeneratedAvatar(storedSceneUrl);
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
      generationInFlight.current = false;
      onGeneratingChange?.(false);
    }
  };

  const saveAvatar = async (avatarUrl?: string) => {
    const urlToSave = avatarUrl || generatedAvatar;
    if (!urlToSave || !user) return;

    setIsLoading(true);

    try {
      // Generation already stored this scene, so applying it just flips the
      // current flag — no re-upload, and nothing to lose if this step never
      // happens.
      if (needsSceneUpload(storedScene.current?.sceneUrl, urlToSave)) {
        const response = await fetch(urlToSave);
        const blob = await response.blob();
        const fileName = `${user.id}/scene_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, blob, { upsert: true, contentType: 'image/png' });
        if (uploadError) {
          throw new Error(`Failed to save avatar: ${uploadError.message}`);
        }
        storedScene.current = {
          sceneUrl: supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl,
          sourceUrl: null,
        };
      }

      const finalUrl = storedScene.current!.sceneUrl;

      // Make this the current scene. The row already exists (generation
      // recorded it), so this only moves the flag; a row is inserted only for
      // the legacy path where the scene was not stored during generation.
      await supabase
        .from('avatar_generations')
        .update({ is_current: false })
        .eq('user_id', user.id)
        .like('avatar_url', '%/scene_%');

      const { data: existingRow } = await supabase
        .from('avatar_generations')
        .select('id')
        .eq('user_id', user.id)
        .eq('avatar_url', finalUrl)
        .maybeSingle();

      if (existingRow) {
        await supabase
          .from('avatar_generations')
          .update({ is_current: true })
          .eq('id', existingRow.id);
      } else {
        await supabase.from('avatar_generations').insert({
          user_id: user.id,
          avatar_url: finalUrl,
          source_image_url: storedScene.current!.sourceUrl,
          is_current: true,
        });
      }

      // Update profile - AI generation implies a face was present. The old
      // animated avatar belongs to the previous face, so it retires too —
      // surfaces that prefer the animation would otherwise keep showing
      // the old avatar.
      await updateProfile({ has_face_photo: true } as any);
      queryClient.invalidateQueries({ queryKey: ["user-scene", user.id] });

      toast.success(t("avatar.avatarSaved"));
      finishAndClose();

      // Background portrait generation from the SCENE — never blocks the
      // apply. When it lands it becomes the public circle avatar and joins
      // "my avatars" so it can be re-picked later.
      //
      // A scene that already has its portrait reuses it. This used to
      // regenerate unconditionally, so every switch between two existing
      // scenes paid for another generation AND inserted another row — the
      // portrait shelf filled up from ordinary browsing, which is what
      // killed the "+ new scene" tile.
      void (async () => {
        const { data: existing } = await supabase
          .from("avatar_generations")
          .select("id, avatar_url")
          .eq("user_id", user.id)
          .eq("source_image_url", finalUrl)
          .not("avatar_url", "like", "%/scene_%")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let portraitUrl: string | null;
        if (existing) {
          await supabase
            .from("avatar_generations")
            .update({ is_current: false })
            .eq("user_id", user.id)
            .not("avatar_url", "like", "%/scene_%");
          await supabase
            .from("avatar_generations")
            .update({ is_current: true })
            .eq("id", existing.id);
          portraitUrl = existing.avatar_url;
        } else {
          portraitUrl = await generateAndRecordPortrait(user.id, finalUrl);
        }

        if (portraitUrl) {
          await updateProfile({ avatar_url: portraitUrl, animated_avatar_url: null } as any);
        }
      })();

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

  // Scene generations live in the same history table; picking one only flips
  // is_current (the homepage scene), never the circular profile avatar.
  const isSceneUrl = (url: string) => url.includes("/scene_");

  // Horizontal scenes ticker: touch scrolls natively with momentum; mouse
  // gets drag-to-scroll with velocity tracking and an inertia glide.
  const scenesRowRef = useRef<HTMLDivElement | null>(null);
  const sceneDrag = useRef({ down: false, moved: false, startX: 0, startScroll: 0, lastX: 0, lastT: 0, v: 0, raf: 0 });

  const scenesPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = scenesRowRef.current;
    if (!el) return;
    cancelAnimationFrame(sceneDrag.current.raf);
    sceneDrag.current = {
      down: true,
      moved: false,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      lastX: e.clientX,
      lastT: performance.now(),
      v: 0,
      raf: 0,
    };
  };

  const scenesPointerMove = (e: React.PointerEvent) => {
    const s = sceneDrag.current;
    if (!s.down) return;
    const el = scenesRowRef.current;
    if (!el) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    el.scrollLeft = s.startScroll - dx;
    const now = performance.now();
    const dt = now - s.lastT;
    if (dt > 0) {
      s.v = (e.clientX - s.lastX) / dt;
      s.lastX = e.clientX;
      s.lastT = now;
    }
  };

  const scenesPointerUp = () => {
    const s = sceneDrag.current;
    if (!s.down) return;
    s.down = false;
    const el = scenesRowRef.current;
    if (el) {
      let velocity = s.v * 16; // px per ~frame
      const glide = () => {
        if (Math.abs(velocity) < 0.5) return;
        el.scrollLeft -= velocity;
        velocity *= 0.95;
        s.raf = requestAnimationFrame(glide);
      };
      s.raf = requestAnimationFrame(glide);
    }
    // Let the click that follows pointerup see the moved flag, then reset it
    window.setTimeout(() => {
      sceneDrag.current.moved = false;
    }, 50);
  };

  // Shared apply/delete action row, rendered directly under the section of
  // the item the user tapped (scenes ticker or avatars grid).
  const selectedGen = generations.find((g) => g.id === selectedForAction) || null;
  const renderGenActions = () =>
    selectedGen && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className="flex justify-center gap-4 mt-3"
      >
        <motion.button
          onClick={() => deleteAvatar(selectedGen.id, selectedGen.avatar_url)}
          disabled={isLoading}
          className="w-12 h-12 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Trash2 className="w-5 h-5 text-destructive" />
        </motion.button>
        <motion.button
          onClick={() => {
            if (isSceneUrl(selectedGen.avatar_url)) {
              selectScene(selectedGen);
            } else {
              selectPreviousAvatar(selectedGen.avatar_url);
            }
          }}
          disabled={isLoading}
          className="w-12 h-12 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Check className="w-5 h-5 text-primary" />
        </motion.button>
      </motion.div>
    );

  // Picking the mascot tile: the homepage falls back to the default Trivia
  // King loop; generated scenes keep their rows untouched for switching back.
  const selectDefaultScene = () => {
    if (!user) return;
    localStorage.setItem(`scene_pref_${user.id}`, "default");
    setScenePref("default");
    queryClient.invalidateQueries({ queryKey: ["user-scene", user.id] });
    toast.success(t("avatar.avatarUpdated"));
  };

  const selectScene = async (gen: AvatarGeneration) => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Only scene rows swap their flag — the current portrait keeps its own
      await supabase.from("avatar_generations").update({ is_current: false }).eq("user_id", user.id).like("avatar_url", "%/scene_%");
      const { error } = await supabase.from("avatar_generations").update({ is_current: true }).eq("id", gen.id);
      if (error) throw error;
      localStorage.setItem(`scene_pref_${user.id}`, "generated");
      setScenePref("generated");
      queryClient.invalidateQueries({ queryKey: ["user-scene", user.id] });
      setSelectedForAction(null);
      toast.success(t("avatar.avatarUpdated"));
      await new Promise((resolve) => setTimeout(resolve, 100));
      finishAndClose();
    } catch (error) {
      console.error("Error selecting scene:", error);
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
      
      // Update portraits to not current — scene rows keep their selection
      await supabase.from('avatar_generations').update({ is_current: false }).eq('user_id', user.id).not('avatar_url', 'like', '%/scene_%');

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
      
      // Refresh the list and the homepage scene (a current scene may be gone)
      await loadGenerations();
      queryClient.invalidateQueries({ queryKey: ["user-scene", user.id] });
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

  // Animate the current homepage scene into a seamless idle-loop video
  // (Kling v2.5 turbo pro via the animate-avatar edge function). The loop
  // replaces the static scene on the homepage; the still stays as poster.
  const animateScene = async () => {
    if (!user) return;
    // Resolve the scene fresh from the DB (same pick order as the homepage:
    // explicitly selected first, else newest) — component state can lag
    // right after a new scene is saved.
    const { data: scene } = await supabase
      .from("avatar_generations")
      .select("avatar_url")
      .eq("user_id", user.id)
      .like("avatar_url", "%/scene_%")
      .order("is_current", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!scene?.avatar_url) {
      toast.error(t("errors.noAvatarToAnimate"));
      return;
    }

    setIsAnimating(true);

    try {
      toast.info(t("avatar.startingAnimation"), { duration: 5000 });

      const { data, error } = await supabase.functions.invoke("animate-avatar", {
        body: {
          mode: "scene",
          imageUrl: scene.avatar_url,
          userId: user.id,
          promptOverride: SCENE_ANIMATION_PROMPT,
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to start animation");

      const { requestId, statusUrl, responseUrl } = data;
      if (!requestId || !statusUrl || !responseUrl) {
        throw new Error("No request ID or URLs received");
      }

      toast.info(t("avatar.animationStarted"), { duration: 3000 });

      // Kling takes a few minutes — poll every 5 seconds for up to 8 minutes
      const maxAttempts = 96;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const { data: statusData, error: statusError } = await supabase.functions.invoke("animate-avatar", {
          body: {
            mode: "scene",
            imageUrl: scene.avatar_url,
            userId: user.id,
            requestId,
            statusUrl,
            responseUrl,
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
          // The homepage picks the loop up through the scene query
          queryClient.invalidateQueries({ queryKey: ["user-scene", user.id] });
          loadGenerations();
          setIsAnimating(false);
          return;
        }

        // Show progress every 30 seconds (every 6th attempt)
        if ((attempt + 1) % 6 === 0) {
          toast.info(t("avatar.stillProcessing", { time: Math.round((attempt + 1) * 5 / 60) }), { duration: 2000 });
        }
      }

      toast.error(t("avatar.animationTakingLong"));
    } catch (error) {
      console.error("Error animating scene:", error);
      toast.error(error instanceof Error ? error.message : "Failed to animate scene");
    } finally {
      setIsAnimating(false);
    }
  };

  // Content based on step
  const renderContent = () => {
    // The scene the animate button would bring to life (selected, else newest).
    // Phones never show the homepage scene, so there's nothing to animate there.
    const sceneRows = isSceneViewport
      ? generations.filter((g) => g.avatar_url.includes("/scene_"))
      : [];
    const currentScene = sceneRows.find((g) => g.is_current) || sceneRows[0] || null;

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
            
            {/* Animate Scene Button - PRO gated; turns the current homepage
                scene into a seamless idle-loop video */}
            {currentScene && (
              isVip ? (
                <motion.button
                  onClick={animateScene}
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
                      <span>{currentScene?.animated_avatar_url ? t("avatar.reAnimate") : t("avatar.animateAvatar")}</span>
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
              <p className="text-xs text-muted-foreground text-center">{t("avatar.maxGenReached", { max: maxPerType })}</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-1">{t("avatar.remainingGen", { remaining: remainingGenerations, max: maxPerType })}</p>
              <p className="text-xs text-muted-foreground mb-2">{t("avatar.facePhotoHint")}</p>
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

                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={isProcessingFile}
                  className={`relative flex-1 aspect-square max-w-[100px] rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer ${isProcessingFile ? 'opacity-50' : ''}`}
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
                </button>
              </div>
            </>
          )}
          </div>

          {/* The one file input in the modal, opened by ref from the tiles
              above and from "+ new scene" below. Every tile used to carry its
              own transparent full-size input instead — a pattern that depends
              on hit-testing an invisible control inside a transform-animated
              dialog, which WebKit and the Capacitor WebView do not reliably
              honour. When it failed it failed silently: the tile looked
              enabled, the click landed on the input, and no picker opened.
              This ref-triggered input was already here, wired to nothing. */}
          <input
            id="avatar-file-input"
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileSelect}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />

          {/* My Scenes - homepage scene generations. Picking one makes it the
              active homepage scene; the plus tile starts a new generation
              from a different selfie/photo. Tablet/desktop only — the scene
              hero itself doesn't exist below 768px. */}
          {isSceneViewport && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t("avatar.myScenes")}</p>
            {/* Wrapping grid — every tile always fully visible, no cropped
                scroll row. First the new-scene tile, then the default mascot
                scene, then the generated ones. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {isLimitReached ? (
                // A blocked tile has to say so on sight. It used to be the
                // same plus sign at half opacity, so a full shelf was
                // indistinguishable from a tile that simply refused to open
                // a file picker — the reason the block reads as "broken".
                <button
                  type="button"
                  onClick={() => toast.error(t("extra.avatarMaxGenReachedShort"))}
                  className="aspect-video rounded-xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-1 px-2"
                >
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[11px] leading-tight text-center text-muted-foreground">
                    {t("avatar.maxGenReached", { max: maxPerType })}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={isLoading || isProcessingFile}
                  className={`relative aspect-video rounded-xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer ${isLoading || isProcessingFile ? "opacity-50" : ""}`}
                >
                  {isProcessingFile ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : (
                    <Plus className="w-6 h-6 text-primary" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {isProcessingFile ? t("common.processing") || "Processing..." : t("avatar.newScene")}
                  </span>
                </button>
              )}
              <motion.button
                onClick={selectDefaultScene}
                disabled={isLoading}
                className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                  scenePref === "default"
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50"
                } disabled:opacity-50`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <video
                  src="/videos/trivia-king-scene.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover pointer-events-none"
                />
                <span className="absolute bottom-1 left-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white">
                  MyTrivia
                </span>
                {scenePref === "default" && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </motion.button>
              {generations.filter((g) => isSceneUrl(g.avatar_url)).map((gen) => (
                <motion.button
                  key={gen.id}
                  onClick={() => setSelectedForAction(selectedForAction === gen.id ? null : gen.id)}
                  disabled={isLoading}
                  className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                    selectedForAction === gen.id
                      ? "border-primary ring-2 ring-primary/30"
                      : gen.is_current && scenePref !== "default"
                        ? "border-primary"
                        : "border-border hover:border-primary/50"
                  } disabled:opacity-50`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <img src={gen.avatar_url} alt="Scene" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                  {gen.is_current && scenePref !== "default" && selectedForAction !== gen.id && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                      <Check className="w-3 h-3 text-white" />
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

            {/* Apply/delete for the tapped scene - right under the ticker */}
            {selectedGen && isSceneUrl(selectedGen.avatar_url) && renderGenActions()}
          </div>
          )}

          {/* My Generated Avatars (portrait/photo generations only) */}
          {generations.some((g) => !isSceneUrl(g.avatar_url)) && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t("avatar.myAvatars")}</p>
              <div className="grid grid-cols-5 gap-2">
                {generations.filter((g) => !isSceneUrl(g.avatar_url)).slice(0, 10).map((gen) => (
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

              {/* Apply/delete for the tapped avatar - right under the grid */}
              {selectedGen && !isSceneUrl(selectedGen.avatar_url) && renderGenActions()}
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
                  animateScene();
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
