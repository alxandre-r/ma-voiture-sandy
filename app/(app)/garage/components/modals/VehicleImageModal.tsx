'use client';

import NextImage from 'next/image';
import { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';

import Icon from '@/components/common/ui/Icon';
import { Modal } from '@/components/common/ui/Modal';
import Spinner from '@/components/common/ui/Spinner';
import useVehicleImageUpload from '@/hooks/vehicle/useVehicleImageUpload';
import getCroppedImg from '@/lib/utils/image/getCroppedImg';

interface VehicleImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  onSave: (imageUrl: string) => void;
  onRemove?: () => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
}

export default function VehicleImageModal({
  isOpen,
  onClose,
  imageUrl,
  onSave,
  onRemove,
  showNotification,
}: VehicleImageModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Only uploads: the old file is deleted by VehicleForm once the vehicle row is saved (B17)
  const { uploadVehicleImage } = useVehicleImageUpload({ showNotification });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens with a new image URL
  useEffect(() => {
    if (isOpen) {
      // Reset crop and zoom when opening
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);

      // If we have an existing image URL and no selected file, we need to trigger a re-render
      // The imageUrl prop is already available, so the modal should display it
    }
  }, [isOpen]);

  const hasSelectedFile = !!selectedFile;
  const hasExistingImage = !!imageUrl;

  const onCropComplete = useCallback(
    (_: unknown, croppedAreaPixels: { width: number; height: number; x: number; y: number }) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showNotification('Format non supporté. Utilisez JPEG, PNG ou WebP.', 'error');
      return;
    }
    if (file.size > 15728640) {
      // 15MB max
      showNotification('Image trop volumineuse. Maximum 15 Mo.', 'error');
      return;
    }

    setSelectedFile(file);
    setImageSrc(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSave = async () => {
    setIsUploading(true);
    try {
      let finalImageUrl: string | null = null;

      if (selectedFile && croppedAreaPixels && imageSrc) {
        // Crop the image first
        const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
        const croppedFile = new File([croppedBlob], selectedFile.name, { type: selectedFile.type });

        // Upload the cropped image
        finalImageUrl = await uploadVehicleImage(croppedFile);

        if (!finalImageUrl) {
          throw new Error("Erreur lors de l'upload de l'image");
        }
      }

      onSave(finalImageUrl || '');
      handleClose();
    } catch (error) {
      console.error('Error saving vehicle image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Only clears the form field: the stored file goes once the vehicle row no longer references it
  const handleRemove = () => {
    if (!onRemove) return;
    onRemove();
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const openFileDialog = () => fileInputRef.current?.click();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Photo du véhicule" size="lg">
      <div className="flex flex-col items-center space-y-6 w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Cropper container - 16:9 aspect ratio for vehicles */}
        <div className="relative w-full max-w-3xl h-64 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : imageUrl ? (
            <NextImage src={imageUrl} alt="Vehicle" fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
              <Icon name="car" size={64} />
              <p className="mt-2">Aucune image</p>
            </div>
          )}

          {imageUrl && !hasSelectedFile && onRemove && (
            <button
              aria-label="Supprimer la photo"
              onClick={handleRemove}
              disabled={isUploading}
              className="absolute top-2 right-2 w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg 
                flex items-center justify-center text-red-500 hover:text-red-700 hover:scale-110 
                disabled:opacity-50 transition-all cursor-pointer"
              title="Supprimer la photo"
            >
              <Icon name="delete" size={18} />
            </button>
          )}
        </div>

        {/* Zoom slider */}
        {hasSelectedFile && (
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full max-w-3xl"
          />
        )}

        {/* Action buttons */}
        <div className="flex gap-3 w-full max-w-3xl">
          {hasSelectedFile ? (
            <>
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 font-medium cursor-pointer
                hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={openFileDialog}
                disabled={isUploading}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 font-medium cursor-pointer
                hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Changer
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="flex-1 px-4 py-3 rounded-lg bg-custom-1 text-white font-medium cursor-pointer
                hover:bg-custom-1-hover disabled:bg-custom-1 disabled:opacity-50 transition-colors"
              >
                {isUploading ? <Spinner color="white" /> : 'Enregistrer'}
              </button>
            </>
          ) : (
            <button
              onClick={openFileDialog}
              disabled={isUploading}
              className="w-full px-4 py-3 rounded-lg bg-custom-1 text-white font-medium cursor-pointer
              hover:bg-custom-1-hover disabled:bg-custom-1 disabled:opacity-50 transition-colors"
            >
              {hasExistingImage ? 'Choisir une autre photo' : 'Choisir une photo'}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          JPEG, PNG ou WebP. Max 15 Mo.
        </p>
      </div>
    </Modal>
  );
}
