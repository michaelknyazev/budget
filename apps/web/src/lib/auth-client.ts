import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [magicLinkClient()],
});

export const {
  useSession,
  signIn,
  signOut,
} = authClient;
