/**
 * @file components/auth/SignInForm.tsx
 * @fileoverview Sign-in form component for user authentication.
 *
 * This component handles user login by collecting email and password,
 * validating credentials with Supabase, and redirecting to dashboard on success.
 */

'use client';

import { useState } from 'react';

import Button from '@/components/common/ui/Button';
import { FormField, FormInput } from '@/components/common/ui/form';
import { useNotifications } from '@/contexts/NotificationContext';
import { exitDemoSession } from '@/lib/demo/client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getSafeRedirect } from '@/lib/utils/safeRedirect';

/**
 * SignInForm Component
 *
 * Handles user authentication via email/password.
 * On successful login, redirects to dashboard.
 * Errors are reported through notifications.
 */
export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotifications();

  /**
   * Handles form submission for user login.
   *
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const redirectUrl = getSafeRedirect(new URLSearchParams(window.location.search).get('redirect'));
      window.location.href = redirectUrl;
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4" noValidate>
      <FormField label="Email" htmlFor="signin-email">
        <FormInput
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField label="Mot de passe" htmlFor="signin-password">
        <FormInput
          id="signin-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>

      <Button type="submit" size="lg" isLoading={loading} className="w-full">
        {loading ? 'Connexion en cours...' : 'Se connecter'}
      </Button>
    </form>
  );
}
