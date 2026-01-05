import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';

interface UseCameraResult {
  photo: Photo | null;
  photoDataUrl: string | null;
  isLoading: boolean;
  error: string | null;
  takePhoto: () => Promise<Photo | null>;
  selectFromGallery: () => Promise<Photo | null>;
  clearPhoto: () => void;
}

export function useCamera(): UseCameraResult {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const processPhoto = useCallback(async (capturedPhoto: Photo): Promise<Photo> => {
    // For web, we get a webPath directly
    // For native, we might get a base64 or file path
    if (capturedPhoto.dataUrl) {
      setPhotoDataUrl(capturedPhoto.dataUrl);
    } else if (capturedPhoto.webPath) {
      setPhotoDataUrl(capturedPhoto.webPath);
    } else if (capturedPhoto.base64String) {
      const mimeType = capturedPhoto.format === 'png' ? 'image/png' : 'image/jpeg';
      setPhotoDataUrl(`data:${mimeType};base64,${capturedPhoto.base64String}`);
    }
    return capturedPhoto;
  }, []);

  const takePhoto = useCallback(async (): Promise<Photo | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check permissions first on native
      if (isNative) {
        const permissions = await Camera.checkPermissions();
        if (permissions.camera !== 'granted') {
          const requested = await Camera.requestPermissions({ permissions: ['camera'] });
          if (requested.camera !== 'granted') {
            throw new Error('Camera permission denied');
          }
        }
      }

      const capturedPhoto = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: isNative ? CameraResultType.Base64 : CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 512,
        height: 512,
        correctOrientation: true,
      });

      const processed = await processPhoto(capturedPhoto);
      setPhoto(processed);
      return processed;
    } catch (err: any) {
      // User cancelled is not an error
      if (err.message?.includes('cancelled') || err.message?.includes('canceled')) {
        return null;
      }
      console.error('Camera error:', err);
      setError(err.message || 'Failed to take photo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isNative, processPhoto]);

  const selectFromGallery = useCallback(async (): Promise<Photo | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check permissions first on native
      if (isNative) {
        const permissions = await Camera.checkPermissions();
        if (permissions.photos !== 'granted') {
          const requested = await Camera.requestPermissions({ permissions: ['photos'] });
          if (requested.photos !== 'granted') {
            throw new Error('Photo library permission denied');
          }
        }
      }

      const capturedPhoto = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: isNative ? CameraResultType.Base64 : CameraResultType.DataUrl,
        source: CameraSource.Photos,
        width: 512,
        height: 512,
        correctOrientation: true,
      });

      const processed = await processPhoto(capturedPhoto);
      setPhoto(processed);
      return processed;
    } catch (err: any) {
      // User cancelled is not an error
      if (err.message?.includes('cancelled') || err.message?.includes('canceled')) {
        return null;
      }
      console.error('Gallery error:', err);
      setError(err.message || 'Failed to select photo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isNative, processPhoto]);

  const clearPhoto = useCallback(() => {
    setPhoto(null);
    setPhotoDataUrl(null);
    setError(null);
  }, []);

  return {
    photo,
    photoDataUrl,
    isLoading,
    error,
    takePhoto,
    selectFromGallery,
    clearPhoto,
  };
}
