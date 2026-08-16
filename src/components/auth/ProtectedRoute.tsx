import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/models";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, profile, isLoading, signOut } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Session exists but no profile row — the trigger may have failed
  if (!profile) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <h2 className="text-xl font-semibold text-foreground">Cuenta no configurada</h2>
        <p className="max-w-md text-muted-foreground">
          Tu cuenta de autenticación existe, pero no se encontró un perfil de usuario asociado. 
          Contacta al administrador para que te asigne un rol.
        </p>
        <Button variant="outline" onClick={signOut}>Cerrar sesión</Button>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    if (profile.role === "project_manager") {
      return <Navigate to="/projects" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
