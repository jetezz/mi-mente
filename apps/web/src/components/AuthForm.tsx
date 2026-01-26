import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isLogin = mode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Redirigir al dashboard
        window.location.href = '/dashboard';
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) throw error;

        setSuccess('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <a
        href="/"
        className="inline-flex items-center gap-2 text-dark-400 hover:text-primary-400 transition-colors mb-6 group"
      >
        <svg
          className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver al inicio
      </a>

      <div className="card p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${isLogin
            ? 'bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-500/25'
            : 'bg-gradient-to-br from-dark-600 to-dark-800 shadow-dark-500/25'
            } flex items-center justify-center text-3xl shadow-lg`}>
            {isLogin ? '🧠' : '🔒'}
          </div>
          <h1 className="text-2xl font-bold text-dark-100">
            {isLogin ? 'Iniciar Sesión' : 'Registro Cerrado'}
          </h1>
          <p className="text-dark-400 mt-2">
            {isLogin
              ? 'Accede a tu segundo cerebro'
              : 'Esta aplicación no está abierta al público de momento'}
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            ✅ {success}
          </div>
        )}

        {/* Form */}
        {isLogin ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-dark-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-dark-100 placeholder-dark-500 transition-colors"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-300 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-dark-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-dark-100 placeholder-dark-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        ) : (
          <div className="py-2 text-center text-dark-300 text-sm bg-dark-700/50 rounded-xl border border-dark-600/50 p-4">
            <p>
              Si necesitas acceso, por favor contacta con el administrador del sistema.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-sm">
          {!isLogin && (
            <p className="text-dark-400">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Inicia sesión
              </a>
            </p>
          )}
        </div>
      </div>
    </div>

  );
}
