import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Camera, Upload, Loader2, Check, ImageIcon, Trash2, AlertCircle } from "lucide-react";

// Import 3D icons for avatar flow
import iconScissors from '@/assets/icons/icon-scissors.png';
import iconAiSparkle from '@/assets/icons/icon-ai-sparkle.png';
import iconPhotoUpload from '@/assets/icons/icon-photo-upload.png';
import iconHourglass from '@/assets/icons/icon-hourglass.png';
import iconSelfie from '@/assets/icons/icon-selfie.png';
import gemIcon from '@/assets/icons/icon-gem.png';
import crownIcon from '@/assets/crown-icon.png';
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import confetti from "canvas-confetti";
import { t } from "@/lib/i18n";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import {
  calculateAvatarQuota,
  decideGeneration,
  shouldResetSession,
  EXTRA_GENERATION_GEM_COST,
  MAX_AVATAR_GENERATIONS,
  type KindQuota,
} from "@/utils/avatarStudio";
import { useCurrency } from "@/hooks/useCurrency";
import { preparePhoto } from "@/utils/imageInput";
import {
  isNativePhotoPickerAvailable,
  pickPhotoFromLibrary,
  takePhotoWithCamera,
} from "@/utils/nativePhotoPicker";
import { photoError, type PhotoError } from "@/utils/photoErrorMessage";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { generatePublicPortrait } from "@/utils/portraitAvatar";
import { MASCOTS, type MascotId } from "@/config/mascots";
import kingMascotThumb from "@/assets/play-chooser/icon-king.webp";
import { useHomeMascot } from "@/hooks/useHomeMascot";

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  /** Reports a running generation to the shell so it can show a floating
      progress chip while the modal is closed and reopen it when done.
      `kind` says whether finishing should bring the modal back: a new avatar
      has to be chosen, an animation applies itself. */
  onGeneratingChange?: (
    active: boolean,
    thumb?: string | null,
    kind?: "generation" | "animation",
  ) => void;
}

interface AvatarGeneration {
  id: string;
  avatar_url: string;
  animated_avatar_url: string | null;
  is_current: boolean;
  created_at: string;
}

/**
 * The diamond on a white disc.
 *
 * The artwork is a purple gem, so on the purple primary button it vanished
 * entirely and on the lavender note it read as a smudge. The disc gives it
 * a constant background to sit on, the way a coin reads on any surface.
 */
function GemCoin({ size = "md" }: { size?: "sm" | "md" }) {
  const disc = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const gem = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${disc}`}
    >
      <img src={gemIcon} alt="" className={`${gem} object-contain`} />
    </span>
  );
}

/**
 * What this kind of generation costs right now, said before it is spent.
 *
 * The old version of this line only ever appeared while there was allowance
 * left; running out swapped the whole section for a locked box. So the two
 * states a person needs to tell apart — "you have used your generations" and
 * "this button is broken" — looked exactly alike.
 */
function QuotaNote({
  quota,
  isVip,
  gems,
  onGetPro,
}: {
  quota: KindQuota;
  isVip: boolean;
  gems: number;
  onGetPro: () => void;
}) {
  if (!quota.isLimitReached) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        {t("avatar.remainingGen", { remaining: quota.remaining, max: quota.max })}
      </p>
    );
  }

  const canAfford = gems >= EXTRA_GENERATION_GEM_COST;

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/40 px-3 py-2">
      <p className="text-xs text-foreground">
        {t("avatar.limitUsedUp", { max: quota.max })}{" "}
{t("avatar.extraCostsGems")}{" "}
        {/* The price wears the same white pill the gem balance does on the
            home card, so what it costs and what you hold are read the same
            way rather than one being a sentence and the other a chip. The
            gem goes in bare — the pill is already the white background it
            needs, and the disc made a second white shape inside the first. */}
        <span
          className="ml-0.5 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 align-middle text-[13px] font-bold leading-none text-[#402666]"
          style={{ boxShadow: "0 2.5px 0 0 #d8d0e8, 0 4px 10px 0 rgba(0,0,0,0.08)" }}
        >
          <img src={gemIcon} alt="" className="h-4 w-4 shrink-0 object-contain" />
          {EXTRA_GENERATION_GEM_COST}
        </span>
      </p>
      {!canAfford && (
        <p className="mt-1 text-[11px] text-destructive">
          {t("avatar.needGemsForExtra", { cost: EXTRA_GENERATION_GEM_COST })}
        </p>
      )}
      {!isVip && (
        <button
          type="button"
          onClick={onGetPro}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary underline underline-offset-2"
        >
          <img src={crownIcon} alt="" className="w-3.5 h-3.5 object-contain" />
          {t("avatar.proGetsFive", { max: MAX_AVATAR_GENERATIONS })}
        </button>
      )}
    </div>
  );
}

/** The last failure, kept on screen instead of only in a toast. */
function FailureNote({ failure }: { failure: PhotoError }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
      <div className="min-w-0">
        <p className="text-[11px] leading-snug text-destructive">{failure.message}</p>
        {/* What the file actually was. It is here so a screenshot of this
            box is enough to tell which photo the app choked on — otherwise
            "unsupported format" is a guess the person has to confirm for us. */}
        {failure.diagnosis && (
          <p className="mt-0.5 break-words font-mono text-[10px] leading-snug text-muted-foreground">
            {failure.diagnosis}
          </p>
        )}
      </div>
    </div>
  );
}

export function AvatarModal({ isOpen, onClose, onComplete, onGeneratingChange }: AvatarModalProps) {
  const finishAndClose = onComplete || onClose;
  const { user, profile, updateProfile } = useAuth();
  const { isVip } = useVipStatus();
  const { gems, spendGems } = useCurrency();
  const { t } = useLanguage();
  const navigate = useNavigate();
  // Which mascot backs the home screen — the mascots grid below sets it.
  const { mascotId, setMascot } = useHomeMascot(user?.id);
  const [step, setStep] = useState<"gallery" | "upload" | "camera" | "generating" | "preview">("gallery");

  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  // The last thing that went wrong, shown IN the modal. A toast can be
  // missed, scrolled past, or — as it turned out — never rendered at all;
  // the step that failed should carry its own explanation.
  const [failure, setFailure] = useState<PhotoError | null>(null);
  const [selectedForAction, setSelectedForAction] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Reset transient state ONLY on a real closed -> open transition, and
  // never mid-generation — see shouldResetSession in avatarStudio.ts for
  // the regression this guards against.
  const generationInFlight = useRef(false);
  const wasOpen = useRef(false);
  // A finished generation nobody has looked at yet. Set when the result
  // lands on the preview step, consumed by the reset below — without it the
  // reopen that exists to show the result resets straight past it.
  const awaitingPreview = useRef(false);
  useEffect(() => {
    if (
      shouldResetSession({
        isOpen,
        wasOpen: wasOpen.current,
        generationInFlight: generationInFlight.current,
        awaitingPreview: awaitingPreview.current,
      })
    ) {
      setIsLoading(false);
      setIsProcessingFile(false);
      setSelectedForAction(null);
      // Otherwise last session's error is on screen the moment the modal
      // opens, describing a photo nobody has picked yet.
      setFailure(null);
      setStep("gallery");
    }
    // Consumed on the open transition either way: the result has now been
    // shown, and the next opening is an ordinary one.
    if (isOpen && !wasOpen.current) awaitingPreview.current = false;
    wasOpen.current = isOpen;
  }, [isOpen]);

  // Cached across openings, keyed on the stable user id and never the user
  // object. This used to be component state refetched from zero on every
  // open, so the shelves were empty for a round trip EVERY time the modal
  // came up and the scenes visibly appeared a moment later. Now only the
  // first open in a session waits, and that wait shows skeletons.
  const {
    data: generations = [],
    isLoading: generationsLoading,
    refetch: refetchGenerations,
  } = useQuery({
    queryKey: ["avatar-generations", user?.id],
    enabled: !!user?.id && isOpen,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AvatarGeneration[]> => {
      // Portraits only. Scene rows (`<user>/scene_<ts>.png`) are what the
      // old "my scenes" picker showed; the home screen is backed by a mascot
      // now and nothing here reads them.
      const { data, error } = await supabase
        .from("avatar_generations")
        // Named columns rather than *: the row carries fields this screen
        // never reads, and this payload is what the player waits for.
        .select("id, avatar_url, animated_avatar_url, is_current, created_at")
        .eq("user_id", user!.id)
        .not("avatar_url", "like", "%/scene_%")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  const loadGenerations = async () => {
    await refetchGenerations();
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
    setFailure(null);

    // In the native app the system camera takes the photo. The in-webview
    // path below needs `getUserMedia`, which a WKWebView only grants to an
    // app that declares app-bound domains — so on a phone it opened the
    // "camera" step and sat there on a black rectangle. There is no camera
    // step to enter here: the sheet returns a finished photo.
    if (isNativePhotoPickerAvailable()) {
      try {
        const { dataUrl, cancelled } = await takePhotoWithCamera(1024);
        if (cancelled) return;
        if (!dataUrl) throw new Error("No photo returned");
        setUploadedImage(dataUrl);
        setStep("upload");
      } catch (error) {
        console.error("Native camera failed:", error);
        toast.error(t("errors.cameraPermission"));
      }
      return;
    }

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


  // Opens the picker from a real button press. A silent no-op here is what
  // "the tile does nothing" looks like from the outside, so if the input is
  // somehow not mounted, say so rather than swallow the tap.
  const goToPro = () => {
    onClose();
    navigate("/profile?tab=PRO");
  };

  const openFilePicker = async () => {
    setFailure(null);

    // In the native app, ask the phone for the photo. iOS and Android hand
    // back a JPEG from their own pipeline, already upright — no format for
    // a JavaScript decoder to get wrong, because the platform that wrote
    // the file is the one reading it.
    if (isNativePhotoPickerAvailable()) {
      setIsProcessingFile(true);
      try {
        const { dataUrl, cancelled } = await pickPhotoFromLibrary(1024);
        if (cancelled) return;
        if (!dataUrl) throw new Error("No photo returned");
        setUploadedImage(dataUrl);
        setStep("upload");
      } catch (error) {
        console.error("Native photo picker failed:", error);
        const failed = photoError(error);
        setFailure(failed);
        toast.error(failed.message);
      } finally {
        setIsProcessingFile(false);
      }
      return;
    }

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
    setFailure(null);
    setIsProcessingFile(true);

    try {
      // Every decoder the browser has, then the JS HEIC transcoder — see
      // imageInput.ts. A phone photo must not be turned away for what its
      // filename or MIME type claims to be.
      const dataUrl = await preparePhoto(file, 1024, 0.85);
      setUploadedImage(dataUrl);
      setStep("upload");
    } catch (error) {
      console.error("Error processing image:", error);
      // This is the failure that looked like "it loads for a second and does
      // nothing", so it names what actually happened and stays on screen
      // instead of vanishing with the spinner.
      const failed = photoError(error);
      setFailure(failed);
      toast.error(failed.message);
    } finally {
      // Reset the input that fired (allows selecting the same file again)
      input.value = "";
      setIsProcessingFile(false);
    }
  };

  /**
   * Step out of the way once the work is plainly under way.
   *
   * Generating a portrait takes a minute, and
   * this modal is a full-screen page — sitting on a spinner for that long is
   * the app doing nothing while the player watches. It is already built to
   * be closed mid-generation: the request is a plain promise that does not
   * care whether anything is rendering, the shell shows a floating bubble
   * while it runs, and a finished generation brings this back on the preview.
   * Nothing used the door.
   *
   * A beat rather than immediately: the modal has just changed to the
   * generating step, and closing on the same frame reads as the tap having
   * dismissed the screen rather than started anything.
   */
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAutoClose = useCallback(() => {
    if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    autoCloseTimer.current = setTimeout(() => {
      autoCloseTimer.current = null;
      // Only if it is still running. A generation that failed or came back
      // fast has already put something on screen worth staying for.
      if (generationInFlight.current) onClose();
    }, 2500);
  }, [onClose]);

  useEffect(() => () => {
    if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
  }, []);

  // Only portraits are generated here now — see avatarStudio.ts for the budget.
  const quota = calculateAvatarQuota(generations, isVip);
  const activeQuota = quota.avatar;

  const generateAvatar = async () => {
    if (!uploadedImage || !user) return;

    // Over the included allowance, one more costs a gem. Refusing outright
    // was the old behaviour and it read as a broken button; charging for it
    // at least gives the tap somewhere to go.
    const decision = decideGeneration(activeQuota, gems);
    if (decision.action === "blocked") {
      const message = t("avatar.needGemsForExtra", { cost: decision.gems });
      setFailure({ message });
      toast.error(message);
      return;
    }
    if (decision.action === "charge") {
      const paid = await spendGems(decision.gems, {
        productType: "avatar_generation",
        productId: "avatar",
        valueReceived: { kind: "avatar", generations: 1 },
      });
      if (!paid) {
        const message = t("avatar.needGemsForExtra", { cost: decision.gems });
        setFailure({ message });
        toast.error(message);
        return;
      }
      toast.success(t("avatar.paidWithGems", { cost: decision.gems }));
    }

    setFailure(null);
    setIsLoading(true);
    setStep("generating");
    generationInFlight.current = true;
    onGeneratingChange?.(true, uploadedImage, "generation");
    scheduleAutoClose();

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

      // The upload makes a PORTRAIT: the circle avatar every profile
      // placement shows. Scenes are no longer generated — the home screen
      // is backed by the chosen mascot instead.
      const portraitUrl = await generatePublicPortrait(user.id, imageUrl, "portrait");
      if (!portraitUrl) throw new Error(t("errors.generationFailed"));

      // Recorded but NOT current yet — applying it is still the user's call
      await supabase.from("avatar_generations").insert({
        user_id: user.id,
        avatar_url: portraitUrl,
        source_image_url: imageUrl,
        is_current: false,
      });

      await loadGenerations();
      setGeneratedAvatar(portraitUrl);
      awaitingPreview.current = true;
      setStep("preview");
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#A855F7", "#EC4899", "#FFD700"],
      });
    } catch (error) {
      console.error("Error generating avatar:", error);
      const message = error instanceof Error ? error.message : t("errors.generationFailed");
      // Shown on the step it dropped back to, not only as a toast — landing
      // back on the photo with nothing said is the whole complaint.
      setFailure({ message });
      toast.error(message);
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
      // A generated portrait is already the finished circle — it becomes the
      // profile picture directly. Only portrait rows swap their flag.
      await supabase
        .from("avatar_generations")
        .update({ is_current: false })
        .eq("user_id", user.id)
        .not("avatar_url", "like", "%/scene_%");
      await supabase
        .from("avatar_generations")
        .update({ is_current: true })
        .eq("user_id", user.id)
        .eq("avatar_url", urlToSave);

      // The old animation belongs to the previous face, so it retires with it
      await updateProfile({
        avatar_url: urlToSave,
        animated_avatar_url: null,
        has_face_photo: true,
      });

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

  // Shared apply/delete action row, rendered directly under the section of
  // the item the user tapped in the avatars grid.
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
          onClick={() => selectPreviousAvatar(selectedGen.avatar_url)}
          disabled={isLoading}
          className="w-12 h-12 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Check className="w-5 h-5 text-primary" />
        </motion.button>
      </motion.div>
    );

  const selectPreviousAvatar = async (avatarUrl: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Find the generation record to get its animated_avatar_url
      const generation = generations.find(g => g.avatar_url === avatarUrl);
      
      // Only portrait rows swap their flag
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

  // Picking a mascot changes the HOME SCREEN only: its scene replaces the
  // Trivia King loop there. The circle avatar — the selfie, the upload, the
  // generated portrait — is a separate choice and is what every other
  // profile placement shows.
  //
  // `null` is the King. He has no scene of his own — the home screen plays
  // his idle loop when nothing is picked — so choosing him is clearing the
  // choice. He was left out of this grid as "the default, not a choice",
  // which made him a one-way door: pick any animal once and the blue mascot
  // was gone with no way back.
  const chooseMascot = async (id: MascotId | null) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await setMascot(id);
      toast.success(t("avatar.mascotUpdated"));
      // Small delay to ensure state propagates before modal closes
      await new Promise((resolve) => setTimeout(resolve, 100));
      finishAndClose();
    } finally {
      setIsLoading(false);
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
          </div>

          {/* Generate New Section - MOVED UP */}
          <div className="pt-2">
            <p className="text-sm font-medium text-foreground mb-2">{t("avatar.createNew")}</p>
            <>
              <div className="flex gap-3 mt-2">
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
                  onClick={() => openFilePicker()}
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
            {/* Under the tiles, not over them: the allowance describes what
                the tiles will do, so it reads after them rather than as a
                heading over the section. The tiles stay live once it is
                spent — the next one is simply priced. */}
            <QuotaNote quota={quota.avatar} isVip={isVip} gems={gems} onGetPro={goToPro} />
            {failure && <FailureNote failure={failure} />}
          </div>

          {/* The one file input in the modal, opened by ref from the tiles
              above. Every tile used to carry its
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
            /* `image/*` ALONE, on purpose. Naming .heic/.heif here tells iOS
               the app wants HEIC and it hands over the raw camera file;
               with a plain image/* it transcodes the photo to JPEG itself,
               on the device, losing nothing and needing no JS decoder. The
               two screens that listed the extensions are the two that could
               not open an iPhone selfie. Desktop pickers still show HEIC
               under image/*, and anything they do let through goes to the
               transcoder in imageInput.ts. */
            accept="image/*"
            onChange={handleFileSelect}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />

          {/* My Generated Avatars (portrait/photo generations only). While
              the first fetch is in flight the shelf shows its shape rather
              than nothing, so the tiles fade in where they were always going
              to be instead of appearing out of blank space. */}
          {generationsLoading && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t("avatar.myAvatars")}</p>
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-square rounded-xl bg-muted/60 animate-pulse" />
                ))}
              </div>
            </div>
          )}
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

              {/* Apply/delete for the tapped avatar - right under the grid */}
              {selectedGen && renderGenActions()}
            </div>
          )}

          {/* Mascots — the home-screen scene. One tile per mascot; the chosen
              one is what the home screen paints behind the widgets. Until a
              pick is made the home screen plays the Trivia King loop, which
              is not itself a choice. This replaced "my scenes", where a scene
              was generated from a photo, and the preset-avatar grid under
              it: the face tiles here are the mascots' own. */}
          <div>
            <p className="text-sm font-medium text-foreground">{t("avatar.mascots")}</p>
            <p className="mb-2 text-xs text-muted-foreground">{t("avatar.mascotsHint")}</p>
            <div className="grid grid-cols-4 gap-2">
              {/* The King leads, because he is the one every player starts
                  with and the only way back to him. Selected when nothing is
                  picked. `contain` on a soft ground, not `cover`: his art is
                  a full character on transparency, where the animals' tiles
                  are square face crops. */}
              <motion.button
                type="button"
                onClick={() => chooseMascot(null)}
                disabled={isLoading}
                aria-label={t("avatar.mascotNames.king")}
                aria-pressed={mascotId === null}
                className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-[linear-gradient(160deg,#efe7ff_0%,#e2d4ff_100%)] transition-all ${
                  mascotId === null ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                } disabled:opacity-50`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img
                  src={kingMascotThumb}
                  alt=""
                  draggable={false}
                  className="pointer-events-none h-full w-full object-contain p-1"
                />
                {mascotId === null && (
                  <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </motion.button>
              {MASCOTS.map((mascot) => {
                const isSelected = mascot.id === mascotId;
                return (
                  <motion.button
                    key={mascot.id}
                    type="button"
                    onClick={() => chooseMascot(mascot.id)}
                    disabled={isLoading}
                    aria-label={t(`avatar.mascotNames.${mascot.id}`)}
                    aria-pressed={isSelected}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                    } disabled:opacity-50`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img
                      src={mascot.thumb}
                      alt=""
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                        <Check className="w-3 h-3 text-white" />
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
          
          {/* Generating is no longer PRO-only. Everyone gets one of each
              kind, PRO gets five, and past that it is priced in gems — so
              this step offers the same two choices to everybody and the
              button says what the next one costs. */}
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
              icon={
                activeQuota.isLimitReached ? (
                  <GemCoin />
                ) : (
                  <img src={iconAiSparkle} alt="" className="w-5 h-5 object-contain" />
                )
              }
            >
              {activeQuota.isLimitReached
                ? t("avatar.generateForGems", { cost: EXTRA_GENERATION_GEM_COST })
                : t("avatar.generate")}
            </ChunkyButton>
          </div>

          <QuotaNote quota={activeQuota} isVip={isVip} gems={gems} onGetPro={goToPro} />
          {failure && <FailureNote failure={failure} />}
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
