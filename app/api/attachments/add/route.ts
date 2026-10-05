import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { dbErrorResponse } from '@/lib/api/dbErrors';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isAllowedAttachmentMime } from '@/types/attachment';

import type { AttachmentEntityType } from '@/types/attachment';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_ENTITY_TYPES: AttachmentEntityType[] = [
  'vehicle',
  'expense',
  'insurance_contract',
  'reminder',
];

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const entityType = formData.get('entity_type') as string | null;
    const entityIdStr = formData.get('entity_id') as string | null;

    if (!file || !entityType || !entityIdStr) {
      return NextResponse.json(
        { error: 'Champs requis manquants (file, entity_type, entity_id)' },
        { status: 400 },
      );
    }

    if (!ALLOWED_ENTITY_TYPES.includes(entityType as AttachmentEntityType)) {
      return NextResponse.json({ error: "Type d'entité invalide" }, { status: 400 });
    }

    const entityId = parseInt(entityIdStr, 10);
    if (isNaN(entityId) || entityId <= 0) {
      return NextResponse.json({ error: 'entity_id invalide' }, { status: 400 });
    }

    if (!isAllowedAttachmentMime(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé (images et PDF uniquement)' },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Fichier vide' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 });
    }

    // Build storage path: {owner_id}/{entity_type}_{entity_id}/{timestamp}_{sanitized_name}
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${entityType}_${entityId}/${Date.now()}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: "Erreur lors de l'upload du fichier" }, { status: 500 });
    }

    const { data: attachment, error: insertError } = await supabase
      .from('attachments')
      .insert({
        owner_id: user.id,
        file_path: storagePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        entity_type: entityType,
        entity_id: entityId,
        is_deleted: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Attachment insert error:', insertError);
      // Clean up the uploaded file
      await supabase.storage.from('attachments').remove([storagePath]);
      // The DB triggers enforce the quotas (10 per item, 200 per account)
      return dbErrorResponse(insertError, "Erreur lors de l'enregistrement de la pièce jointe");
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
