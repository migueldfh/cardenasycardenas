import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  History,
  Warehouse,
  Users,
  LogOut,
  Settings as SettingsIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MODULES_CONFIG } from "@/config/modules";
 
export function AdminSidebar({ mobile }: { mobile?: boolean }) {
  const { profile, signOut } = useAuth();
  const { logoUrl } = useTheme();
  const location = useLocation();
 
  const isProjectManager = profile?.role === "project_manager";

  const navItems = isProjectManager
    ? [
        { name: "Proyectos & Procesos", href: "/projects", icon: ClipboardList },
        { name: "Clientes", href: "/clients", icon: Users },
      ]
    : ([
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        MODULES_CONFIG.orders.enabled && { name: "Órdenes de Producción", href: "/orders", icon: ClipboardList },
        MODULES_CONFIG.orders.enabled && { name: "Línea de Producción", href: "/line", icon: Package },
        MODULES_CONFIG.orders.enabled && { name: "Seguimiento de Órdenes", href: "/tracking", icon: ClipboardList },
        MODULES_CONFIG.orders.enabled && { name: "Historial de Producción", href: "/history", icon: History },
        MODULES_CONFIG.inventory.enabled && { name: "Inventario", href: "/inventory", icon: Warehouse },
        { name: "Usuarios", href: "/users", icon: Users },
        { name: "Configuración", href: "/settings", icon: SettingsIcon },
      ].filter(Boolean) as { name: string; href: string; icon: React.ComponentType<any> }[]);
 
  return (
    <aside className={cn("w-64 border-border bg-card flex flex-col h-full", mobile ? "w-full" : "border-r hidden md:flex")}>
      <div className="p-6">
        <img src={logoUrl || "/logo.png"} alt="Grafinsa Logo" className="h-30 w-auto" />
      </div>

      <nav className="flex-1 px-4 gap-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link key={item.name} to={item.href}>
              <span className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}>
                <Icon className="h-4 w-4" />
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex flex-col mb-4">
          <span className="text-sm font-medium text-foreground">{profile?.full_name}</span>
          <span className="text-xs text-muted-foreground">{profile?.email}</span>
        </div>
        <Button variant="outline" className="w-full justify-start" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
}
