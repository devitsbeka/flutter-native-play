import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Image, X, Check, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useCamera } from '@/hooks/useCamera';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChunkyButton } from '@/components/ui/chunky-button';

interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  onAvatarChange?: (newUrl: string) => void;
  onClose?: () => void;
}

export function AvatarUploader({ currentAvatarUrl, onAvatarChange, onClose }: AvatarUploaderProps) {
  const { photoDataUrl, isLoading: cameraLoading, takePhoto, selectFromGallery, clearPhoto } = useCamera();
  const { user, updateProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const handleTakePhoto = async () => {
    setError(null);
    await takePhoto();
  };

  const handleSelectPhoto = async () => {
    setError(null);
    await selectFromGallery();
  };

  const handleUpload = async () => {
    if (!photoDataUrl || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      // Convert data URL to blob
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();
      
      // Generate unique filename
      const fileExt = blob.type === 'image/png' ? 'png' : 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile
      const { error: profileError } = await updateProfile({
        avatar_url: publicUrl,
      });

      if (profileError) throw profileError;

      onAvatarChange?.(publicUrl);
      clearPhoto();
      onClose?.();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const previewUrl = photoDataUrl || currentAvatarUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Preview */}
      <div className="relative w-32 h-32 rounded-full overflow-hidden bg-muted border-4 border-primary/20">
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Avatar preview" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {(cameraLoading || isUploading) && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-destructive text-center"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Actions */}
      {!photoDataUrl ? (
        <div className="flex gap-3">
          {isNative && (
            <ChunkyButton
              variant="secondary"
              size="sm"
              onClick={handleTakePhoto}
              disabled={cameraLoading}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </ChunkyButton>
          )}
          
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={handleSelectPhoto}
            disabled={cameraLoading}
          >
            <Image className="w-4 h-4 mr-2" />
            {isNative ? 'Gallery' : 'Upload'}
          </ChunkyButton>
        </div>
      ) : (
        <div className="flex gap-3">
          <ChunkyButton
            variant="secondary"
            size="sm"
            onClick={clearPhoto}
            disabled={isUploading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </ChunkyButton>
          
          <ChunkyButton
            variant="primary"
            size="sm"
            onClick={handleUpload}
            disabled={isUploading}
          >
            <Check className="w-4 h-4 mr-2" />
            Save
          </ChunkyButton>
        </div>
      )}
    </div>
  );
}
