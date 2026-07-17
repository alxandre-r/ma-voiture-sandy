/**
 * @file Header.tsx
 * @description Header component for each page, containing the title and optional custom content.
 * The title and other content is passed as props, allowing for dynamic content based on the current page.
 * User info is retrieved from the UserProvider via useUser() hook.
 */

'use client';

import Link from 'next/link';

import Icon from '@/components/common/ui/Icon';
import { useUser } from '@/contexts/UserContext';

import ProfilePicture from './user/ProfilePicture';

import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  content?: ReactNode;
  onMenuOpen?: () => void;
  onSearchOpen?: () => void;
}

/**
 * Header component with customizable right side content.
 * User is automatically retrieved from UserProvider.
 * @param title - The page title to display
 * @param content - Optional content to display on the right side of the header on desktop, and below the title on mobile (e.g. selectors)
 */
export default function Header({ title, content, onMenuOpen, onSearchOpen }: HeaderProps) {
  // Get user from UserProvider (set up in layout)
  const user = useUser();

  return (
    <header className="sticky top-0 z-30 mb-4 flex flex-col gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 sm:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Burger button — mobile only */}
          {onMenuOpen && (
            <button
              onClick={onMenuOpen}
              className="md:hidden p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{title}</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {onSearchOpen && (
            <>
              {/* Desktop: barre fantôme avec hint ⌘K */}
              <button
                onClick={onSearchOpen}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-600 dark:hover:text-gray-400 bg-white dark:bg-gray-800 transition-colors min-w-[180px]"
                aria-label="Ouvrir la recherche"
              >
                <Icon name="search" size={14} className="shrink-0" />
                <span className="flex-1 text-left">Rechercher…</span>
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 shrink-0">
                  Ctrl+K
                </span>
              </button>
              {/* Mobile: icône seule */}
              <button
                onClick={onSearchOpen}
                className="md:hidden p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Ouvrir la recherche"
              >
                <Icon name="search" size={20} />
              </button>
            </>
          )}
          <div className="hidden sm:flex items-center gap-4">
            {content}
            {user && (
              <Link href="/settings" className="flex items-center gap-2">
                <ProfilePicture avatarUrl={user.avatar_url} name={user.name} size="md" />
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* Mobile content */}
      {content && <div className="bottom-row sm:hidden w-full min-w-0">{content}</div>}
    </header>
  );
}
