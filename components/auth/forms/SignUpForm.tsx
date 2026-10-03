/**
 * @file components/auth/SignUpForm.tsx
 * @fileoverview Sign up form: calls server route to create confirmed user,
 *              then attempts to sign in the user client-side for immediate access.
 */

'use client';

import { useState } from 'react';

import Button from '@/components/common/ui/Button';
import { FormField, FormInput } from '@/components/common/ui/form';
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
    <form onSubmit={handleSignUp} className="space-y-4" noValidate>
      <FormField label="Nom ou pseudo" htmlFor="signup-name">
        <FormInput
          id="signup-name"
          type="text"
          autoComplete="nickname"
          placeholder="Sandy"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>
      <FormField label="Email" htmlFor="signup-email">
        <FormInput
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value.toLowerCase())}
        />
      </FormField>
      <FormField label="Mot de passe" htmlFor="signup-password" hint="6 caractères minimum">
        <FormInput
          id="signup-password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>

      <Button type="submit" size="lg" isLoading={loading} className="w-full">
        {loading ? 'Création de compte...' : 'Créer mon compte'}
      </Button>
    </form>
  );
}
