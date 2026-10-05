/**
 * @file FamilyCardMembers.tsx
 * @fileoverview Async Server Component affichant les membres d'une famille en pills compacts.
 * Streamé via Suspense depuis FamilyCard.
 */

import ProfilePicture from '@/components/user/ProfilePicture';
import { getFamilyMembers } from '@/lib/data/family/getFamilyMembers';

interface FamilyCardMembersProps {
  familyId: string;
  currentUserId: string;
}

export default async function FamilyCardMembers({
  familyId,
  currentUserId,
}: FamilyCardMembersProps) {
  const members = await getFamilyMembers(familyId);

  if (!members || members.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-500 italic">Aucun membre trouvé.</p>;
  }

  // Current user first, then others by joined_at
  const sorted = [...members].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
  });

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((member) => {
        const isCurrentUser = member.user_id === currentUserId;
        const isOwner = member.role === 'owner';

        return (
          <div
            key={member.user_id}
            className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full pr-3 pl-1 py-1 border border-gray-100 dark:border-gray-700"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
              <ProfilePicture
                avatarUrl={member.avatar_url}
                name={member.user_name}
                size="sm"
                className="!w-full !h-full"
              />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {member.user_name}
              {isCurrentUser && (
                <span className="text-gray-500 font-normal ml-1 text-xs">(Vous)</span>
              )}
              {isOwner && !isCurrentUser && (
                <span className="text-custom-1 font-normal ml-1 text-xs">★</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Skeleton pour le Suspense fallback
export function FamilyCardMembersSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-9 w-28 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
}
