'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function signInAction(
  email: string,
  password: string,
  redirectTo: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: error.message };
  }
  // Cookies are committed to the response by the supabase server client.
  // redirect() throws a NEXT_REDIRECT that the framework turns into a
  // navigation on the caller's side — must run OUTSIDE the try/catch.
  redirect(redirectTo || '/admin');
}

export async function signUpAction(
  email: string,
  password: string,
  name: string,
  redirectTo: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  // No session means Supabase requires email confirmation first — let the
  // client render that notice. Otherwise redirect into the dashboard.
  if (!data.session) {
    return { ok: true };
  }
  redirect(redirectTo || '/admin');
}
