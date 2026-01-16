import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase, getUser, getSession, onAuthStateChange } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar sesión inicial
    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // Verificar si el usuario existe realmente en la DB (para evitar fantasmas)
          const { data: { user }, error: userError } = await supabase.auth.getUser();

          if (userError || !user) {
            console.warn('Ghost user detected or session invalid, signing out...');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            setSession(session);
            setUser(user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading session:', error);
        // En caso de error crítico, limpiar estado por seguridad
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      // Supabase envía email de confirmación por defecto
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Intentamos cerrar sesión en Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error from Supabase:', error);
    } finally {
      // SIEMPRE limpiamos el estado local pase lo que pase
      setSession(null);
      setUser(null);
      setLoading(false);

      // Limpiar localStorage manualmente para ser extra seguros
      if (typeof window !== 'undefined') {
        const projectRef = import.meta.env.PUBLIC_SUPABASE_URL?.split('.')[0].split('//')[1];
        if (projectRef) {
          localStorage.removeItem(`sb-${projectRef}-auth-token`);
        }
        // Redirigir al inicio para limpiar cualquier estado persistente en la UI
        window.location.href = '/';
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook para requerir autenticación
export function useRequireAuth() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  return { user, loading };
}
