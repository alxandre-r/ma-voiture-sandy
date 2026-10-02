/**
 * @file components/LogoutButton.tsx
 * @fileoverview Logout button component for user authentication.
 *
 * This component handles user logout by calling Supabase auth.signOut()
 * and redirecting to the home page. In demo mode it leaves the demo instead.
 */

'use client';

import { useDemo } from '@/contexts/DemoContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * LogoutButton Component
 *
 * Button that initiates user logout process.
 * Clears session and redirects to home page.
 */
export default function LogoutButton({ className = '' }: { className?: string }) {
  const demo = useDemo();
  const label = demo ? 'Quitter la démo' : 'Se déconnecter';

  const handleLogout = async () => {
    if (demo) {
      await demo.exit();
      return;
    }
    await createSupabaseBrowserClient().auth.signOut();
    // Use window.location for full page reload to ensure session is cleared before middleware runs
    window.location.href = '/';
  };

  return (
    <button
      onClick={handleLogout}
      className={`bg-red-500 hover:bg-red-600 text-white px-4 py-3 hover:cursor-pointer rounded-lg w-full sm:px-6 sm:py-3 ${className}`}
      aria-label={label}
    >
      {label}
    </button>
  );
}
