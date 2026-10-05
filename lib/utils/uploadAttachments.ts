import type { AttachmentEntityType } from '@/types/attachment';

/**
 * Uploads the files picked before the entity existed. Never throws: `warning` is the ready-to-show
 * French message when some files failed, with the server's reason (e.g. a quota) when it gave one.
 */
export async function uploadPendingAttachments(
  files: File[],
  entityType: AttachmentEntityType,
  entityId: number,
): Promise<{ failedCount: number; warning: string | null }> {
  if (!files.length) return { failedCount: 0, warning: null };

  const results = await Promise.allSettled(
    files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', entityType);
      formData.append('entity_id', String(entityId));

      const res = await fetch('/api/attachments/add', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Failed to upload attachment:', body?.error ?? 'Unknown error');
        throw new Error(typeof body?.error === 'string' ? body.error : '');
      }
    }),
  );

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (!failures.length) return { failedCount: 0, warning: null };

  const reason = failures
    .map((f) => (f.reason instanceof Error ? f.reason.message : ''))
    .find(Boolean);
  const warning =
    `${failures.length} pièce(s) jointe(s) n'ont pas pu être téléchargées` +
    (reason ? ` (${reason})` : '');
  return { failedCount: failures.length, warning };
}
