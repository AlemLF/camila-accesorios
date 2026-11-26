import { supabase } from './supabase.js';

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/login.html';
}

export async function requerirSesionActiva() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/login.html';
    return null;
  }

  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !perfil || !perfil.activo) {
    await logout();
    return null;
  }

  return perfil;
}