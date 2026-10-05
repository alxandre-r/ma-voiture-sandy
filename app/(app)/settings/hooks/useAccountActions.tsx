/**
 * @file hooks/useAccountActions.ts
 * @description Encapsule toute la logique métier liée au compte utilisateur
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { useDemo } from '@/contexts/DemoContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { DEMO_PHOTOS_MESSAGE } from '@/lib/demo/constants';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import type { User } from '@/types/user';

/**
 * Storage path (`<userId>/avatar_<ts>.<ext>`) of an `avatars` public URL, as built by the upload
 * below, or null when the URL is not one of ours.
 */
export function avatarStoragePath(publicUrl: string): string | null {
  const marker = '/avatars/';
  const at = publicUrl.indexOf(marker);
  if (at === -1) return null;
  const path = decodeURIComponent(publicUrl.slice(at + marker.length).split(/[?#]/)[0]);
  return path || null;
}

interface UseAccountActionsProps {
  user: User;
  showNotification: (message: string, type: 'success' | 'error') => void;
}

export default function useAccountActions({ user, showNotification }: UseAccountActionsProps) {
  const router = useRouter();
  const demo = useDemo();
  const { showInfo } = useNotifications();

  const [localUser, setLocalUser] = useState<User>(user);

  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);

  const [isPending, startTransition] = useTransition();

  /* =============================
     PROFILE UPDATE
  ============================== */
  const updateProfile = async (name: string, email: string) => {
    if (!name.trim()) {
      showNotification('Le nom ne peut pas être vide', 'error');
      return false;
    }

    if (!email.trim()) {
      showNotification('Email invalide', 'error');
      return false;
    }

    const previousUser = localUser;

    // Optimistic update
    setLocalUser((u) => ({
      ...u,
      name,
      email,
    }));

    setIsProfileLoading(true);

    try {
      const res = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? 'Erreur lors de la mise à jour');
      }

      if (body?.emailPending) {
        // The address only changes once the user confirms it (P3.19): keep showing the current one
        setLocalUser((u) => ({ ...u, email: previousUser.email }));
        showInfo(body.message);
      } else {
        showNotification('Profil mis à jour', 'success');
      }

      // Revalidation non bloquante
      startTransition(() => {
        router.refresh();
      });

      return true;
    } catch (error) {
      // rollback
      setLocalUser(previousUser);

      showNotification(error instanceof Error ? error.message : 'Erreur', 'error');

      return false;
    } finally {
      setIsProfileLoading(false);
    }
  };

  /* =============================
     PASSWORD UPDATE
  ============================== */
  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!oldPassword || !newPassword) {
      showNotification('Tous les champs sont requis', 'error');
      return false;
    }

    setIsPasswordLoading(true);

    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur');
      }

      showNotification('Mot de passe mis à jour', 'success');
      return true;
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erreur', 'error');

      return false;
    } finally {
      setIsPasswordLoading(false);
    }
  };

  /* =============================
     AVATAR UPDATE
  ============================== */
  const updateAvatar = async (file: File | null) => {
    if (demo) {
      showInfo(DEMO_PHOTOS_MESSAGE);
      return false;
    }

    setIsAvatarLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      // Get current user
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(`Erreur d'authentification: ${authError.message}`);
      }

      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      let avatarUrl: string | null = null;
      let newPath: string | null = null;

      if (file) {
        // Upload new avatar with unique filename (timestamp to force update)
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `${currentUser.id}/avatar_${timestamp}.${fileExt}`;
        newPath = fileName;

        // Upload new file (don't use upsert to force a fresh upload)
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = urlData.publicUrl;
      }

      // Update user record
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', currentUser.id);

      if (updateError) {
        // The new file is referenced by nothing: drop it (best effort)
        if (newPath) await supabase.storage.from('avatars').remove([newPath]);
        throw new Error(`Erreur lors de la mise à jour du profil: ${updateError.message}`);
      }

      // Only now that the row points elsewhere, delete the old file (best effort, B17).
      // Restricted to the user's own folder (an external avatar URL is never touched).
      const oldPath = localUser.avatar_url ? avatarStoragePath(localUser.avatar_url) : null;
      if (oldPath && oldPath !== newPath && oldPath.startsWith(`${currentUser.id}/`)) {
        const { error: removeError } = await supabase.storage.from('avatars').remove([oldPath]);
        if (removeError) console.error('Error deleting old avatar:', removeError);
      }

      // Update local state
      setLocalUser((u) => ({
        ...u,
        avatar_url: avatarUrl,
      }));

      // Show success notification
      if (avatarUrl) {
        showNotification('Photo de profil mise à jour', 'success');
      } else {
        showNotification('Photo de profil supprimée', 'success');
      }

      // Refresh to get updated data
      startTransition(() => {
        router.refresh();
      });

      return true;
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Erreur', 'error');
      return false;
    } finally {
      setIsAvatarLoading(false);
    }
  };

  return {
    localUser,
    updateProfile,
    changePassword,
    updateAvatar,
    isProfileLoading: isProfileLoading || isPending,
    isPasswordLoading,
    isAvatarLoading,
  };
}
