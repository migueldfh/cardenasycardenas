import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Mail, Lock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function Login() {
  const { session, profile } = useAuth();
  const { logoUrl, loginImageUrl } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (session) {
    if (profile?.role === "project_manager") {
      return <Navigate to="/projects" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background text-foreground">
      {/* Left Column - Login Form */}
      <div className="flex flex-col justify-between items-center w-full lg:w-[40%] p-8 sm:p-12 md:p-16 lg:p-20 xl:p-24 bg-card border-r border-border">
        {/* Top spacer to align content nicely */}
        <div />

        <div className="w-full max-w-sm mx-auto flex flex-col gap-8">
          {/* Logo */}
          <div className="flex justify-start">
            <img src={logoUrl || "/logo.png"} alt="Grafinsa Logo" className="h-20 w-auto" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight">Iniciar Sesión</h1>
            </div>

            <div className="flex flex-col gap-6">
              {/* Email Input */}
              <div className="flex items-center gap-3 border-b border-border pb-2 focus-within:border-primary transition-colors">
                <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 focus-visible:ring-0 text-foreground"
                />
              </div>

              {/* Password Input */}
              <div className="flex items-center gap-3 border-b border-border pb-2 focus-within:border-primary transition-colors">
                <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  type="password"
                  placeholder="Contraseña"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 focus-visible:ring-0 text-foreground"
                />
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between w-full text-xs sm:text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground">
                  <input
                    type="checkbox"
                    className="rounded border-border text-primary focus:ring-primary bg-background"
                  />
                  <span>Recordarme</span>
                </label>
                <Link
                  to="/cambiar-password"
                  className="text-primary hover:underline underline-offset-2 font-medium"
                >
                  ¿Olvidaste la contraseña?
                </Link>
              </div>

              {error && <p className="text-xs text-destructive font-medium">{error}</p>}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold py-3 px-4 rounded-md transition-all duration-200 text-center text-sm disabled:opacity-50 shadow-sm"
              >
                {loading ? "Iniciando sesión..." : "Acceder"}
              </button>

              {/* First-time / Temporary password setup link */}
              <div className="pt-3 border-t border-border/60 text-center text-xs space-y-1">
                <p className="text-muted-foreground">¿Primer ingreso o contraseña temporal?</p>
                <Link
                  to="/cambiar-password"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold"
                >
                  <span>Establece tu contraseña personal aquí</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] leading-relaxed text-muted-foreground mt-8">
          <div>© 2026 Decreto</div>
          <div>Todos los derechos reservados.</div>
        </div>
      </div>

      {/* Right Column - Inset Image with rounded corners */}
      <div className="hidden lg:block lg:w-[60%] p-3 bg-background">
        <div className="w-full h-full overflow-hidden rounded-[24px]">
          <img
            src={loginImageUrl || "/login.webp"}
            alt="Grafinsa Press"
            className="w-full h-full object-cover object-center select-none"
          />
        </div>
      </div>
    </div>
  );
}
