import { createAuthClient } from 'better-auth/svelte';

const getAuthUrl = (): string => {
  if (typeof window !== 'undefined') {
    return import.meta.env.VITE_API_URL || window.location.origin;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

export const authClient = createAuthClient({
  baseURL: getAuthUrl()
});

export const { signIn, signUp, signOut, useSession } = authClient;
