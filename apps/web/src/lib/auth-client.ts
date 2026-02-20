/**
 * Better Auth Client for AICR
 * 
 * VITE_API_URL: The public URL of the backend API server.
 * - Used for authentication requests (sign-in, sign-up, session)
 * - Must match the backend's BETTER_AUTH_URL
 */
import { createAuthClient } from 'better-auth/svelte';
import { API_BASE } from './api';

export const authClient = createAuthClient({ baseURL: API_BASE });

export const { signIn, signUp, signOut, useSession } = authClient;
