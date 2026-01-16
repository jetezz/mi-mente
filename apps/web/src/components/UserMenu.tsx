import { useState, useEffect, useRef } from 'react';
import { supabase, getUser } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cargar usuario
    const loadUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full bg-dark-700 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/login"
          className="text-dark-400 hover:text-dark-100 transition-colors font-medium"
        >
          Iniciar Sesión
        </a>
        <a href="/register" className="btn-primary">
          Registrarse
        </a>
      </div>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1 rounded-full hover:bg-dark-700/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-pink flex items-center justify-center text-sm font-bold text-white">
          {initials}
        </div>
        <span className="hidden sm:block text-dark-200 font-medium max-w-[120px] truncate">
          {displayName}
        </span>
        <svg
          className={`w-4 h-4 text-dark-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 py-2 rounded-xl bg-dark-700 border border-dark-600 shadow-xl z-50">
          <div className="px-4 py-3 border-b border-dark-600">
            <p className="text-sm font-medium text-dark-100 truncate">{displayName}</p>
            <p className="text-xs text-dark-500 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <a
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-2 text-dark-300 hover:bg-dark-600 transition-colors"
            >
              <span>📥</span>
              Dashboard
            </a>
            <a
              href="/chat"
              className="flex items-center gap-3 px-4 py-2 text-dark-300 hover:bg-dark-600 transition-colors"
            >
              <span>🧠</span>
              Chat
            </a>
            <a
              href="/categories"
              className="flex items-center gap-3 px-4 py-2 text-dark-300 hover:bg-dark-600 transition-colors"
            >
              <span>📂</span>
              Categorías
            </a>
          </div>

          <div className="border-t border-dark-600 pt-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-dark-600 transition-colors text-left"
            >
              <span>🚪</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
