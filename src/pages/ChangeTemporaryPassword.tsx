import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { logActivity } from "@/api/logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { sileo } from "sileo";

export function ChangeTemporaryPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logoUrl, loginImageUrl } = useTheme();

  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showTemp, setShowTemp] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password rules validation
  const hasMinLength = newPassword.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const isDifferentFromTemp = newPassword.trim() !== "" && newPassword !== temporaryPassword;
  const passwordsMatch = newPassword !== "" && newPassword === confirmPassword;
  const isFormValid =
    email.trim() !== "" &&
    temporaryPassword.trim() !== "" &&
    hasMinLength &&
    hasNumberOrSymbol &&
    isDifferentFromTemp &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isFormValid) {
      if (!hasMinLength) {
        setErrorMessage("La nueva contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (!hasNumberOrSymbol) {
        setErrorMessage("La nueva contraseña debe incluir al menos un número o símbolo especial.");
        return;
      }
      if (!isDifferentFromTemp) {
        setErrorMessage("La nueva contraseña debe ser distinta a la contraseña temporal.");
        return;
      }
      if (!passwordsMatch) {
        setErrorMessage("Las contraseñas no coinciden. Por favor verifícalas.");
        return;
      }
      setErrorMessage("Por favor completa todos los campos correctamente.");
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Sign in with the temporary password to establish authenticated session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: temporaryPassword,
      });

      if (signInError) {
        if (
          signInError.message.includes("Invalid login credentials") ||
          signInError.message.includes("invalid_grant")
        ) {
          throw new Error("El correo electrónico o la contraseña temporal ingresada son incorrectos.");
        }
        throw signInError;
      }

      if (!signInData.user) {
        throw new Error("No se pudo autenticar el usuario.");
      }

      // 2. Update user with the new definitive password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          temporary_password_used: false,
          password_updated_at: new Date().toISOString(),
        },
      });

      if (updateError) {
        throw updateError;
      }

      // 3. Log audit activity
      await logActivity("CAMBIO_PASSWORD_TEMPORAL_EXITOSO", {
        user_id: signInData.user.id,
        email: cleanEmail,
      });

      setIsSuccess(true);
      sileo.success({
        title: "¡Contraseña actualizada exitosamente!",
        description: "Tu nueva contraseña personal ha sido guardada.",
      });
    } catch (err: any) {
      console.error("Error setting password:", err);
      setErrorMessage(err.message || "Ocurrió un error al actualizar la contraseña.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background text-foreground">
      {/* Left Column - Form Container */}
      <div className="flex flex-col justify-between w-full lg:w-[45%] xl:w-[40%] p-6 sm:p-10 md:p-14 lg:p-16 bg-card border-r border-border">
        {/* Top bar with back to login */}
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Volver a Iniciar Sesión</span>
          </Link>

          <span className="text-[11px] font-mono text-muted-foreground/70 bg-muted px-2 py-0.5 rounded">
            Portal Contable
          </span>
        </div>

        {/* Center Form */}
        <div className="w-full max-w-sm mx-auto my-8 space-y-6">
          {/* Logo / Brand Header */}
          <div className="space-y-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Cárdenas & Cárdenas" className="h-14 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-lg bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-base shadow-sm">
                  C&C
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs tracking-wider text-foreground leading-tight">
                    CARDENAS & CARDENAS
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-tight">
                    Consultoría Legal Fiscal Contable
                  </span>
                </div>
              </div>
            )}

            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Establecer Nueva Contraseña</span>
                <KeyRound className="h-4 w-4 text-primary" />
              </h1>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Ingresa tu correo institucional y tu contraseña temporal para definir tu nueva contraseña personal.
              </p>
            </div>
          </div>

          {isSuccess ? (
            /* Success State */
            <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground">¡Contraseña Guardada con Éxito!</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tu contraseña definitiva ha sido configurada correctamente. Ya puedes ingresar al ERP con tus nuevas credenciales.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={() => navigate("/dashboard", { replace: true })}
                  className="w-full bg-[#1e3a5f] hover:bg-[#152a45] text-white"
                >
                  Continuar al Sistema
                </Button>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Ir a la pantalla de Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Password Change Form */
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="leading-tight">{errorMessage}</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Correo Institucional</span>
                </label>
                <Input
                  type="email"
                  placeholder="ejemplo@cardenasycardenas.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="text-xs bg-muted/20"
                />
              </div>

              {/* Temporary Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Contraseña Temporal / Actual</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">Genérica: Cardenas2026!</span>
                </div>
                <div className="relative">
                  <Input
                    type={showTemp ? "text" : "password"}
                    placeholder="Ingresa la contraseña temporal asignada"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    required
                    className="text-xs pr-8 bg-muted/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTemp(!showTemp)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showTemp ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Nueva Contraseña Definitiva</span>
                </label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="text-xs pr-8 bg-muted/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Confirmar Nueva Contraseña</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repite la nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="text-xs pr-8 bg-muted/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Real-time Checklist */}
              {newPassword.length > 0 && (
                <div className="p-2.5 bg-muted/30 rounded-lg border border-border/50 space-y-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                    <CheckCircle2 className={`h-3 w-3 ${hasMinLength ? "text-emerald-600" : "text-muted-foreground/40"}`} />
                    <span>Mínimo 8 caracteres</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumberOrSymbol ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                    <CheckCircle2 className={`h-3 w-3 ${hasNumberOrSymbol ? "text-emerald-600" : "text-muted-foreground/40"}`} />
                    <span>Contiene al menos un número o símbolo</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${isDifferentFromTemp ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                    <CheckCircle2 className={`h-3 w-3 ${isDifferentFromTemp ? "text-emerald-600" : "text-muted-foreground/40"}`} />
                    <span>Diferente a la contraseña temporal</span>
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-500 font-medium"}`}>
                      <CheckCircle2 className={`h-3 w-3 ${passwordsMatch ? "text-emerald-600" : "text-rose-500/40"}`} />
                      <span>{passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1e3a5f] hover:bg-[#152a45] text-white py-2 text-xs font-semibold gap-1.5 shadow-sm mt-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando nueva contraseña...
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Establecer Contraseña y Entrar
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-muted-foreground">
          © 2026 Cárdenas & Cárdenas Consultoría Legal Fiscal Contable.
        </div>
      </div>

      {/* Right Column - Hero Banner */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] p-4 bg-background items-center justify-center">
        <div className="w-full h-full rounded-[24px] overflow-hidden relative shadow-inner">
          <img
            src={loginImageUrl || "/login.webp"}
            alt="Cárdenas & Cárdenas"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-12 text-white">
            <div className="max-w-md space-y-2">
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-mono font-semibold">
                Seguridad & Acceso
              </span>
              <h2 className="text-2xl font-bold leading-tight">
                Plataforma de Control Fiscal y Contabilidad Integral
              </h2>
              <p className="text-xs text-white/80 leading-relaxed">
                Acceso exclusivo para el equipo de contadores de Cárdenas & Cárdenas. Protege tus credenciales y no compartas tu contraseña personal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
