/**
 * @file __tests__/components/landing/AuthCard.test.tsx
 * @description Sign in / sign up card of the landing page
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';

import AuthCard from '@/components/landing/AuthCard';
import type { AuthMode } from '@/components/landing/AuthCard';

vi.mock('@/components/common/ui/Icon', () => ({ default: () => null }));
vi.mock('@/components/auth/forms/SignInForm', () => ({
  default: () => <form aria-label="sign-in-form" />,
}));
vi.mock('@/components/auth/forms/SignUpForm', () => ({
  default: () => <form aria-label="sign-up-form" />,
}));

function Harness({ initial = 'signin', notice }: { initial?: AuthMode; notice?: string }) {
  const [mode, setMode] = useState<AuthMode>(initial);
  return <AuthCard mode={mode} onModeChange={setMode} notice={notice} />;
}

describe('AuthCard', () => {
  it('shows the sign-in form with the Connexion tab selected by default', () => {
    render(<Harness />);
    expect(screen.getByRole('tab', { name: 'Connexion' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('form', { name: 'sign-in-form' })).toBeTruthy();
    expect(screen.queryByRole('form', { name: 'sign-up-form' })).toBeNull();
  });

  it('starts on the sign-up form when asked to', () => {
    render(<Harness initial="signup" />);
    expect(screen.getByRole('tab', { name: 'Inscription' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('form', { name: 'sign-up-form' })).toBeTruthy();
  });

  it('switches forms from the toggle', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('tab', { name: 'Inscription' }));
    expect(await screen.findByRole('form', { name: 'sign-up-form' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Inscription' }).getAttribute('aria-selected')).toBe(
      'true',
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Connexion' }));
    expect(await screen.findByRole('form', { name: 'sign-in-form' })).toBeTruthy();
  });

  it('links to the demo with a plain anchor', () => {
    render(<Harness />);
    const link = screen.getByRole('link', { name: /démo/i });
    expect(link.getAttribute('href')).toBe('/demo');
  });

  it('displays the session notice when provided', () => {
    render(<Harness notice="Votre session a expiré. Veuillez vous reconnecter." />);
    expect(screen.getByRole('status').textContent).toContain('Votre session a expiré');
  });
});
