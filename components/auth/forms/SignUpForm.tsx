/**
 * @file components/auth/SignUpForm.tsx
 * @fileoverview Sign up form: calls server route to create confirmed user,
 *              then attempts to sign in the user client-side for immediate access.
 */

'use client';

import { useState } from 'react';

import Spinner from '@/components/common/ui/Spinner';
import { useNotifications } from '@/contexts/NotificationContext';
import { exitDemoSession } from '@/lib/demo/client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignUpForm() {
  const supabase = createSupabaseBrowserClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotifications();

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    // Basic validation before sending request
    if (!name || !email || !password) {
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

    try {
      // Leave the demo first: with the demo cookie, /api/auth/sign-up would hit the fake backend
      await exitDemoSession();

      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const body = await res.json();
      if (!res.ok) {
        showNotification(body.error || "Erreur lors de l'inscription", 'error');
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        showNotification(
          'Compte créé mais échec de connexion automatique : ' + signInError.message,
          'error',
        );
        setLoading(false);
        return;
      }

      const redirectUrl =
        new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      window.location.href = redirectUrl;
    } catch (err) {
      console.error('Erreur signup client:', err);
      showNotification('Erreur inattendue, réessayez.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSignUp} className="space-y-4 px-6 w-full max-w-md">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white text-center">
        Créer un compte
      </h2>

      <input
        type="text"
        placeholder="Nom ou pseudo"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white focus:outline-none inset-shadow-sm"
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value.toLowerCase())}
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
            Création de compte...
          </div>
        ) : (
          "Valider l'inscription"
        )}
      </button>
    </form>
  );
}
