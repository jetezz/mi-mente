/**
 * Supabase Client para el Frontend
 * Maneja autenticación y acceso a datos
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase no configurado. Añade PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY al .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ============ AUTH HELPERS ============

export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out from Supabase:', error.message);
    }
  } catch (err) {
    console.error('Unexpected error during signOut:', err);
  }

  // Limpiar localStorage manualmente por si acaso (Supabase suele hacerlo pero a veces falla si el estado está corrupto)
  if (typeof window !== 'undefined') {
    // Buscar todas las llaves que empiezan por sb- (prefijo por defecto de supabase)
    // y eliminarlas si es necesario, pero supabase-js ya debería hacerlo.
    // Una forma más drástica es:
    localStorage.removeItem('supabase.auth.token'); // Para versiones antiguas
    // Para v2, el nombre de la llave suele ser sb-<project-ref>-auth-token
    const projectRef = supabaseUrl?.split('.')[0].split('//')[1];
    if (projectRef) {
      localStorage.removeItem(`sb-${projectRef}-auth-token`);
    }
  }
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Listener para cambios de sesión
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

// ============ CATEGORIES WITH USER ============

export async function getUserCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createCategory(name: string, parentId?: string) {
  const user = await getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name,
      parent_id: parentId || null,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: { name?: string; parent_id?: string | null }) {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Obtener árbol de categorías
export async function getCategoryTree() {
  const categories = await getUserCategories();

  const roots = categories.filter(c => !c.parent_id);
  const buildTree = (parent: any): any => ({
    ...parent,
    children: categories
      .filter(c => c.parent_id === parent.id)
      .map(buildTree),
  });

  return roots.map(buildTree);
}
