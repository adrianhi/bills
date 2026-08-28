import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { bootstrapResponseSchema } from '@bills/contracts';
import { httpClient, parseResponse } from '@/shared/api';
import { supabase } from '@/shared/lib';
import { z } from 'zod';

function requireSupabase() {
  if (!supabase) throw new Error('Supabase Auth no está configurado.');
  return supabase;
}

export const authService = {
  async getSession() {
    const { data, error } = await requireSupabase().auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onSessionChange(listener: (event: AuthChangeEvent, session: Session | null) => void) {
    return requireSupabase().auth.onAuthStateChange(listener).data.subscription;
  },

  async bootstrap(token: string) {
    const response = await httpClient.post('/me/bootstrap', undefined, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseResponse(bootstrapResponseSchema, response.data).data;
  },

  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async signInWithGoogle(redirectTo: string) {
    const { error } = await requireSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  },

  async sendMagicLink(email: string, emailRedirectTo: string) {
    const { error } = await requireSupabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo },
    });
    if (error) throw error;
  },

  async verifyPin(pin: string) {
    const response = await httpClient.post('/auth/verify-pin', { pin });
    return z.object({ success: z.literal(true), token: z.string() }).parse(response.data).token;
  },
};
