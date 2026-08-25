'use client';

import { useActionState } from 'react';
import { requestMagicLink, type RequestLinkState } from './actions';

const initialState: RequestLinkState = { ok: false, message: '' };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold text-[var(--title-color)]">Klehomerie Vault</h1>
      <p className="mt-2 text-sm text-[var(--text-color)]">
        Enter your email and we will send you a sign-in link. No password needed.
      </p>
      <form action={formAction} className="mt-6 space-y-4">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[var(--accent-color)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Sending' : 'Send sign-in link'}
        </button>
      </form>
      {state.message && (
        <p className={`mt-4 text-sm ${state.ok ? 'text-emerald-600' : 'text-red-600'}`}>
          {state.message}
        </p>
      )}
    </main>
  );
}
