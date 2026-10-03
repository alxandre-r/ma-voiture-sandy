export type AttachmentEntityType = 'vehicle' | 'expense' | 'insurance_contract' | 'reminder';

/** Mirrors the `attachments` storage bucket's allowed_mime_types (no SVG: it can carry script) */
export const ATTACHMENT_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;

export function isAllowedAttachmentMime(type: string): boolean {
  return (ATTACHMENT_ALLOWED_MIME as readonly string[]).includes(type);
}

export interface Attachment {
  id: number;
  owner_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  entity_type: AttachmentEntityType;
  entity_id: number;
  category: string | null;
  preview_path: string | null;
  created_at: string;
}
