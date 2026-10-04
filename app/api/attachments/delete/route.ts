import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badRequest, INVALID_BODY, isId, readJsonObject } from '@/lib/validation/body';

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await readJsonObject(request);
    if (!body) return badRequest(INVALID_BODY);
    const { attachment_id } = body;

    if (!isId(attachment_id)) {
      return NextResponse.json({ error: 'attachment_id requis' }, { status: 400 });
    }

    // Fetch attachment and verify ownership
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('id, owner_id, file_path, preview_path')
      .eq('id', attachment_id)
      .eq('owner_id', user.id)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Pièce jointe introuvable' }, { status: 404 });
    }

    // Delete from storage
    const pathsToDelete = [attachment.file_path];
    if (attachment.preview_path) {
      pathsToDelete.push(attachment.preview_path);
    }
    await supabase.storage.from('attachments').remove(pathsToDelete);

    // Soft-delete in DB
    const { error: updateError } = await supabase
      .from('attachments')
      .update({ is_deleted: true })
      .eq('id', attachment_id)
      .eq('owner_id', user.id);

    if (updateError) {
      console.error('Attachment soft-delete error:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 });
  }
}
