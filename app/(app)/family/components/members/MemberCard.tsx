'use client';

import React from 'react';

import ProfilePicture from '@/components/user/ProfilePicture';

interface MemberCardProps {
  member: {
    user_id: string;
    user_name: string;
    email: string;
    role: string;
    joined_at: string;
    avatar_url?: string;
  };
  isCurrentUser: boolean;
  canRemove: boolean;
  onRemove?: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  isCurrentUser,
  canRemove,
  onRemove,
}) => {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Propriétaire';
      case 'member':
        return 'Membre';
      default:
        return role;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col group min-w-0">
      <div className="flex justify-between items-start mb-4">
        {/* Avatar */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-gray-50 dark:border-white/10 shadow-sm overflow-hidden box-border">
            <ProfilePicture
              avatarUrl={member.avatar_url}
              name={member.user_name}
              size="lg"
              className="!w-full !h-full"
            />
          </div>
          {isCurrentUser && (
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
          )}
        </div>

        {/* Role Badge */}
        <span
          className={`
          text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border
          ${
            member.role === 'owner'
              ? 'bg-custom-1/10 text-custom-1 border-custom-1/20'
              : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10'
          }
        `}
        >
          {getRoleLabel(member.role)}
        </span>
      </div>

      {/* Name & Email */}
      <div>
        <div className="flex items-center gap-1.5">
          <h4 className="font-bold text-gray-900 dark:text-gray-100">{member.user_name}</h4>
          {isCurrentUser && <span className="text-gray-500 text-xs font-medium">(Vous)</span>}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Rejoint le {new Date(member.joined_at).toLocaleDateString('fr-FR')}
        </span>

        {canRemove && onRemove && (
          <button
            aria-label={`Supprimer ${member.user_name || 'ce membre'} de la famille`}
            onClick={onRemove}
            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
            title={`Supprimer ${member.user_name || 'ce membre'} de la famille`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}

        {member.role === 'owner' && (
          <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
          </svg>
        )}
      </div>
    </div>
  );
};
