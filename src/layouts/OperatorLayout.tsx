import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function OperatorLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
        <h1 className="text-xl font-bold text-primary">Grafinsa Operador</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium hidden sm:inline-block">{profile?.full_name}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full bg-background">
        <Outlet />
      </main>
    </div>
  );
}
