'use client';

import NextImage from 'next/image';
import { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';

import Icon from '@/components/common/ui/Icon';
import { Modal } from '@/components/common/ui/Modal';
import Spinner from '@/components/common/ui/Spinner';
import getAvatarCroppedImg from '@/lib/utils/image/getAvatarCroppedImg';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl?: string | null;
  name?: string;
  onSave: (file: File) => Promise<boolean>;
  onRemove?: () => Promise<boolean>;
  isLoading?: boolean;
}

export default function AvatarModal({
  isOpen,
  onClose,
  avatarUrl,
  name,
  onSave,
  onRemove,
  isLoading = false,
}: AvatarModalProps) {
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const initial = name?.charAt(0).toUpperCase() || '?';
  const hasSelectedFile = !!selectedFile;
  const hasExistingAvatar = !!avatarUrl;

  const onCropComplete = useCallback(
    (_: unknown, croppedAreaPixels: { width: number; height: number; x: number; y: number }) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    if (file.size > 1048576) return;

    setSelectedFile(file);
    setImageSrc(URL.createObjectURL(file));

    // Reset input pour pouvoir re-sÃƒÆ’Ã‚Â©lectionner le mÃƒÆ’Ã‚Âªme fichier
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!selectedFile || !croppedAreaPixels || !imageSrc) return;
    const croppedBlob = await getAvatarCroppedImg(imageSrc, croppedAreaPixels);
    const croppedFile = new File([croppedBlob], selectedFile.name, { type: selectedFile.type });

    const success = await onSave(croppedFile);
    if (success) handleClose();
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    const success = await onRemove();
    if (success) handleClose();
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Photo de profil" size="lg">
      <div className="flex flex-col items-center space-y-6 w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Conteneur cropper rectangulaire */}
        <div className="relative w-full max-w-3xl h-96 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
          <div
            className="w-auto h-full flex items-center justify-center"
            style={{ maxWidth: '100%' }}
          >
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            ) : avatarUrl ? (
              <div className="w-56 h-56 rounded-full overflow-hidden shadow-lg">
                <NextImage
                  src={avatarUrl}
                  alt="Avatar"
                  width={224}
                  height={224}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-56 h-56 rounded-full flex items-center justify-center text-6xl text-white font-bold bg-custom-2 shadow-lg">
                {initial}
              </div>
            )}
          </div>

          {avatarUrl && !hasSelectedFile && onRemove && (
            <button
              aria-label="Supprimer la photo"
              onClick={handleRemove}
              disabled={isLoading}
              className="absolute top-1 right-1 w-10 h-10 rounded-full bg-white/50 dark:bg-gray-800/50 shadow-lg 
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
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 font-medium cursor-pointer
                hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={openFileDialog}
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 font-medium cursor-pointer
                hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Changer
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-lg bg-custom-1 text-white font-medium cursor-pointer
                hover:bg-custom-1/90 disabled:bg-custom-1/70 transition-colors"
              >
                {isLoading ? <Spinner color="white" /> : 'Enregistrer'}
              </button>
            </>
          ) : (
            <button
              onClick={openFileDialog}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-lg bg-custom-1 text-white font-medium cursor-pointer
              hover:bg-custom-1/90 disabled:bg-custom-1/70 transition-colors"
            >
              {hasExistingAvatar ? 'Choisir une autre photo' : 'Choisir une photo'}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          JPEG, PNG ou WebP. Max 1 Mo.
        </p>
      </div>
    </Modal>
  );
}
