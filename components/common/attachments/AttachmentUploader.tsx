'use client';

import { useRef } from 'react';

import Icon from '@/components/common/ui/Icon';
import Spinner from '@/components/common/ui/Spinner';
import { useDemo } from '@/contexts/DemoContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { DEMO_ATTACHMENTS_LABEL } from '@/lib/demo/constants';
import { ATTACHMENT_ALLOWED_MIME, isAllowedAttachmentMime } from '@/types/attachment';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface AttachmentUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  uploading?: boolean;
  maxFiles?: number;
  currentCount?: number;
}

export default function AttachmentUploader({
  onFilesSelected,
  disabled,
  uploading = false,
  maxFiles,
  currentCount = 0,
}: AttachmentUploaderProps) {
  const isDemo = useDemo() !== null;
  const { showError } = useNotifications();
  const inputRef = useRef<HTMLInputElement>(null);

  const atLimit = maxFiles !== undefined && currentCount >= maxFiles;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const valid: File[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      if (!isAllowedAttachmentMime(file.type)) {
        errors.push(`${file.name} : type non autorisé (images et PDF uniquement)`);
      } else if (file.size === 0) {
        errors.push(`${file.name} : fichier vide`);
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} : fichier trop volumineux (max 10 Mo)`);
      } else {
        valid.push(file);
      }
    });

    if (errors.length > 0) {
      showError(errors[0]);
    }

    if (valid.length > 0) {
      onFilesSelected(valid);
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={disabled || atLimit || isDemo}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 w-full justify-center rounded-md
                   border border-dashed border-gray-300 dark:border-gray-600
                   text-sm text-gray-500 dark:text-gray-400
                   hover:border-gray-400 dark:hover:border-gray-500
                   hover:text-gray-700 dark:hover:text-gray-300
                   transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <div className="w-4 h-4 shrink-0">
            <Spinner />
          </div>
        ) : (
          <Icon name="add" size={16} />
        )}
        {uploading
          ? 'Envoi en cours…'
          : isDemo
            ? DEMO_ATTACHMENTS_LABEL
            : 'Ajouter des pièces jointes'}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ALLOWED_MIME.join(',')}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </button>
      {maxFiles !== undefined && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
          {currentCount}/{maxFiles} · images et PDF · max 10 Mo
        </p>
      )}
    </div>
  );
}
