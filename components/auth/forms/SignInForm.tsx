/**
 * @file components/auth/SignInForm.tsx
 * @fileoverview Sign-in form component for user authentication.
 *
 * This component handles user login by collecting email and password,
 * validating credentials with Supabase, and redirecting to dashboard on success.
 */

'use client';

import { useState } from 'react';

import Spinner from '@/components/common/ui/Spinner';
import { useNotifications } from '@/contexts/NotificationContext';
import { exitDemoSession } from '@/lib/demo/client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * SignInForm Component
 *
 * Handles user authentication via email/password.
 * On successful login, redirects to dashboard.
 * Displays error messages for failed login attempts.
 */
export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotifications();

  /**
   * Handles form submission for user login.
   *
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation before sending request
    if (!email || !password) {
      showNotification('Veuillez remplir tous les champs', 'error');
      return;
    }

    if (password.length < 6) {
      showNotification('Le mot de passe doit contenir au moins 6 caractères', 'error');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showNotification('Veuillez entrer une adresse email valide', 'error');
      return;
    }

    setLoading(true);

    // A real session must never stay stuck in demo mode
    await exitDemoSession();

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showNotification(error.message, 'error');
      setLoading(false);
    } else {
      const redirectUrl =
        new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      window.location.href = redirectUrl;
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4 px-6 w-full max-w-md">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white text-center">Connexion</h2>
      {errorMsg && (
        <p className="text-center text-red-500 dark:text-red-400 font-semibold">{errorMsg}</p>
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white focus:outline-none inset-shadow-sm"
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white focus:outline-none inset-shadow-sm"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors shadow-lg disabled:opacity-60 hover:cursor-pointer"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <Spinner color="white" />
            Connexion en cours...
          </div>
        ) : (
          'Se connecter'
        )}
      </button>
    </form>
  );
}
