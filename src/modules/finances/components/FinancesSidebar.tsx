import { Link } from "react-router-dom"
import {
  ArrowLeft,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Tags,
  Coins,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Briefcase,
  FileText,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/nav-main"

import { useAuth } from "@/hooks/useAuth"

export function FinancesSidebar() {
  const { profile } = useAuth()
  const isProjectManager = profile?.role === "project_manager"

  const mainItems = isProjectManager
    ? [
        {
          title: "Proyectos & Procesos",
          url: "/projects",
          icon: Briefcase,
        },
        {
          title: "Clientes",
          url: "/clients",
          icon: Users,
        },
      ]
    : [
        {
          title: "Resumen",
          url: "/finances",
          icon: LayoutDashboard,
        },
        {
          title: "Proyectos & Procesos",
          url: "/projects",
          icon: Briefcase,
        },
        {
          title: "Cotizaciones",
          url: "/finances/cotizaciones",
          icon: FileText,
        },
        {
          title: "Facturas",
          url: "/finances/facturas",
          icon: FileText,
        },
        {
          title: "Ingresos (Ventas)",
          url: "/finances/ingresos",
          icon: TrendingUp,
        },
        {
          title: "Gastos (Compras)",
          url: "/finances/gastos",
          icon: TrendingDown,
        },
        {
          title: "Cuentas por Pagar",
          url: "/finances/cuentas-por-pagar",
          icon: CalendarDays,
        },
        {
          title: "Cuentas por Cobrar",
          url: "/finances/cuentas-por-cobrar",
          icon: Coins,
        },
      ]

  const settingsItems = isProjectManager
    ? []
    : [
        {
          title: "Categorías",
          url: "/finances/categorias",
          icon: Tags,
        },
        {
          title: "Métodos de Pago",
          url: "/finances/metodos-pago",
          icon: Coins,
        },
        {
          title: "Conciliación (Efectivo)",
          url: "/finances/transferencias",
          icon: ArrowLeftRight,
        },
        {
          title: "Reportes",
          url: "/finances/reportes",
          icon: BarChart3,
        },
        {
          title: "Configuración",
          url: "/finances/configuracion",
          icon: Settings,
        },
      ]

  return (
    <Sidebar variant="inset" className="bg-sidebar">
      <SidebarHeader className="p-6 bg-sidebar flex flex-row items-center gap-3">
        <Button variant="secondary" size="icon" className="h-8 w-8" asChild>
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="text-lg text-foreground font-semibold tracking-tight">Finanzas</span>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar gap-0 py-2">
        <NavMain items={mainItems} />
        {!isProjectManager && <NavMain title="Operaciones & Config" items={settingsItems} />}
      </SidebarContent>
      <SidebarFooter className="p-4 bg-sidebar">
        <p className="text-xs text-muted-foreground text-center">
          Módulo de Finanzas v1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
