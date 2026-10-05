export type FamilyRole = 'owner' | 'member';

export interface Family {
  id: string;
  name: string;
  owner_id: string;
  invite_token: string;
  created_at: string | null;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
}

export interface FamilyWithMembers extends Family {
  members: FamilyMember[];
}

// Extended FamilyMember type for UI display (includes user info)
export interface FamilyMemberDisplay {
  user_id: string;
  user_name: string;
  email: string;
  role: string;
  joined_at: string;
  avatar_url?: string;
}
