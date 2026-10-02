/**
 * @file hooks/vehicle/useVehicleImageUpload.ts
 * @description Logic for uploading vehicle images to Supabase storage
 */

'use client';

import { useDemo } from '@/contexts/DemoContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { DEMO_PHOTOS_MESSAGE } from '@/lib/demo/constants';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface UseVehicleImageUploadProps {
  showNotification: (message: string, type: 'success' | 'error') => void;
}

export default function useVehicleImageUpload({ showNotification }: UseVehicleImageUploadProps) {
  const demo = useDemo();
  const { showInfo } = useNotifications();

  const uploadVehicleImage = async (file: File, vehicleId?: number): Promise<string | null> => {
    if (demo) {
      showInfo(DEMO_PHOTOS_MESSAGE);
      return null;
    }
    try {
      const supabase = createSupabaseBrowserClient();

      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Utilisateur non connecté');
      }

      // Upload file with unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop() || 'png';
      const vehicleFolder = vehicleId ? `vehicle_${vehicleId}` : `vehicle_temp_${timestamp}`;
      const fileName = `${user.id}/${vehicleFolder}_${timestamp}.${fileExt}`;

      // Upload to 'vehicles' bucket
      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from('vehicles')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('vehicles').getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      showNotification(error instanceof Error ? error.message : "Erreur lors de l'upload", 'error');
      return null;
    }
  };

  const deleteVehicleImage = async (imageUrl: string): Promise<boolean> => {
    if (demo) return true; // demo images are never stored
    try {
      const supabase = createSupabaseBrowserClient();

      // Extract the filename from the URL
      const filename = imageUrl.split('/vehicles/')[1];
      if (!filename) return true;

      const { error: deleteError } = await supabase.storage.from('vehicles').remove([filename]);

      if (deleteError) {
        console.error('Error deleting vehicle image:', deleteError);
      }

      return true;
    } catch (error) {
      console.error('Error deleting vehicle image:', error);
      return false;
    }
  };

  return {
    uploadVehicleImage,
    deleteVehicleImage,
  };
}
