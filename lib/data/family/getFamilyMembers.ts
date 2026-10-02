// lib/data/family/getFamilyMembers.tsx
// SSR fetch des membres de la famille via l'ID de famille.
// Utilisé dans family/page.tsx pour passer les infos aux composants enfants.

import { cache } from 'react';

import * as demoData from '@/lib/demo/data';
import { getDemoSession } from '@/lib/demo/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { FamilyMemberDisplay } from '@/types/family';

export const getFamilyMembers = cache(async (familyId: string): Promise<FamilyMemberDisplay[]> => {
  const demo = await getDemoSession();
  if (demo) return demoData.getFamilyMembers(demo.state, familyId);

  const supabase = await createSupabaseServerClient();

  // Get family members from the view
  const { data: members, error } = await supabase
    .from('family_for_display')
    .select('*')
    .eq('family_id', familyId);

  if (error) {
    console.error(`Failed to fetch family members: ${error.message}`);
    return [];
  }

  if (!members || members.length === 0) {
    return [];
  }

  // Get user IDs to fetch avatar URLs
  const userIds = members.map((m) => m.user_id);

  // Fetch avatar URLs from users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, avatar_url')
    .in('id', userIds);

  if (usersError) {
    console.error(`Failed to fetch user avatars: ${usersError.message}`);
  }

  // Create a map of avatar URLs by user ID
  const avatarMap = new Map<string, string>();
  if (users) {
    users.forEach((user) => {
      if (user.avatar_url) {
        avatarMap.set(user.id, user.avatar_url);
      }
    });
  }

  // Add avatar URLs to members
  const membersWithAvatars: FamilyMemberDisplay[] = members.map((member) => ({
    user_id: member.user_id,
    user_name: member.user_name,
    email: member.email,
    role: member.role,
    joined_at: member.joined_at,
    avatar_url: avatarMap.get(member.user_id) || undefined,
  }));

  return membersWithAvatars;
});
