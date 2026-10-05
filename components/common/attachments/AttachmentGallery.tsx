'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import Icon from '@/components/common/ui/Icon';
import Spinner from '@/components/common/ui/Spinner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import type { Attachment } from '@/types/attachment';

interface AttachmentGalleryProps {
  savedAttachments: Attachment[];
  pendingFiles?: File[];
  onDeleteSaved: (attachmentId: number) => void;
  onRemovePending?: (index: number) => void;
  isOwner?: boolean;
  deletingId?: number | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatType(mime: string): string {
  const [, subtype] = mime.split('/');
  return subtype ? subtype.toUpperCase() : mime;
}

interface AttachmentCardProps {
  name: string;
  size?: number;
  type: string;
  isImage: boolean;
  imageUrl?: string;
  openUrl?: string;
  pending?: boolean;
  isOwner?: boolean;
  isDeleting?: boolean;
  onDelete?: () => void;
}

function AttachmentCard({
  name,
  size,
  type,
  isImage,
  imageUrl,
  openUrl,
  pending,
  isOwner = true,
  isDeleting,
  onDelete,
}: AttachmentCardProps) {
  return (
    <div className="relative flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden w-40 shrink-0">
      {/* Whole card is clickable to open the file */}
      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex flex-col flex-1 ${openUrl ? 'cursor-pointer hover:opacity-90 transition-opacity' : 'cursor-default'}`}
        onClick={(e) => !openUrl && e.preventDefault()}
      >
        {/* Thumbnail */}
        {isImage && imageUrl && (
          <div className="h-20 bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative shrink-0">
            <Image src={imageUrl} alt={name} fill className="object-cover" sizes="112px" />

            {pending && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <span className="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded-full">
                  en attente
                </span>
              </div>
            )}
          </div>
        )}

        {/* File name, size and type */}
        <div className="px-2 py-1.5">
          <p className="text-[11px] text-gray-700 dark:text-gray-300 truncate" title={name}>
            {name}
          </p>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            {size !== undefined && (
              <p className="text-[10px] text-gray-500 dark:text-gray-500">{formatSize(size)}</p>
            )}
            <p className="text-[10px] text-gray-500 dark:text-gray-500">{formatType(type)}</p>
          </div>
        </div>
      </a>

      {/* Delete button — outside <a> so it doesn't trigger navigation */}
      {isOwner && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 dark:bg-gray-800/80
                     flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30
                     transition-colors disabled:opacity-50 cursor-pointer"
          title="Supprimer"
        >
          {isDeleting ? (
            <div className="scale-50">
              <Spinner />
            </div>
          ) : (
            <Icon name="delete" size={12} className="text-red-500" />
          )}
        </button>
      )}
    </div>
  );
}

export default function AttachmentGallery({
  savedAttachments,
  pendingFiles = [],
  onDeleteSaved,
  onRemovePending,
  isOwner = true,
  deletingId,
}: AttachmentGalleryProps) {
  // Signed URLs for saved attachments (private bucket requires signed access)
  const [signedUrls, setSignedUrls] = useState<Record<number, string>>({});
  const attachmentsKey = savedAttachments.map((a) => a.id).join(',');
  useEffect(() => {
    if (savedAttachments.length === 0) {
      setSignedUrls({});
      return;
    }
    const supabase = createSupabaseBrowserClient();
    void Promise.all(
      savedAttachments.map(async (a) => {
        const { data } = await supabase.storage
          .from('attachments')
          .createSignedUrl(a.file_path, 3600);
        return [a.id, data?.signedUrl ?? ''] as [number, string];
      }),
    ).then((entries) => setSignedUrls(Object.fromEntries(entries)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentsKey]);

  // Object URLs for pending (local) files
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const pendingKey = pendingFiles.map((f) => `${f.name}-${f.size}`).join(',');
  useEffect(() => {
    const urls = pendingFiles.map((f) =>
      f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
    );
    setPendingUrls(urls);
    return () => {
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey]);

  if (savedAttachments.length === 0 && pendingFiles.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {savedAttachments.map((a) => {
        const url = signedUrls[a.id] ?? '';
        return (
          <AttachmentCard
            key={a.id}
            name={a.file_name}
            size={a.file_size}
            type={a.file_type}
            isImage={a.file_type.startsWith('image/')}
            imageUrl={a.file_type.startsWith('image/') ? url : undefined}
            openUrl={url || undefined}
            isOwner={isOwner}
            isDeleting={deletingId === a.id}
            onDelete={() => onDeleteSaved(a.id)}
          />
        );
      })}
      {pendingFiles.map((f, i) => (
        <AttachmentCard
          key={`pending-${i}`}
          name={f.name}
          size={f.size}
          type={f.type}
          isImage={f.type.startsWith('image/')}
          imageUrl={pendingUrls[i] || undefined}
          pending
          isOwner={isOwner}
          onDelete={onRemovePending ? () => onRemovePending(i) : undefined}
        />
      ))}
    </div>
  );
}
