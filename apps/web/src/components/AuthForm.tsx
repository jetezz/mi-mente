import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isLogin = mode === "login";

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

        window.location.href = "/dashboard";
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) throw error;

        setSuccess("¡Registro exitoso! Revisa tu email para confirmar tu cuenta.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
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

      <Card variant="glow" padding="lg">
        <CardHeader className="text-center pb-6">
          <div
            className={cn(
              "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl shadow-lg",
              isLogin
                ? "bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-500/25"
                : "bg-gradient-to-br from-dark-600 to-dark-800 shadow-dark-500/25",
            )}
          >
            {isLogin ? "🧠" : "🔒"}
          </div>
          <CardTitle className="text-2xl">{isLogin ? "Iniciar Sesión" : "Registro Cerrado"}</CardTitle>
          <CardDescription className="mt-2">
            {isLogin ? "Accede a tu segundo cerebro" : "Esta aplicación no está abierta al público de momento"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2 animate-fade-in">
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-start gap-2 animate-fade-in">
              <span>✅</span>
              <span>{success}</span>
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  }
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>
          ) : (
            <div className="py-4 text-center text-dark-300 text-sm bg-dark-700/50 rounded-xl border border-dark-600/50 p-4">
              <p>Si necesitas acceso, por favor contacta con el administrador del sistema.</p>
            </div>
          )}

          <div className="text-center text-sm">
            {!isLogin && (
              <p className="text-dark-400">
                ¿Ya tienes cuenta?{" "}
                <a href="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                  Inicia sesión
                </a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
