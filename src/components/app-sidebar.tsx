import * as React from "react"
import {
  LayoutDashboard,
  ClipboardList,
  History,
  Warehouse,
  Users,
  DollarSign,
  Truck,
  Briefcase,
  Layers,
  Activity,
  Settings as SettingsIcon,
  Receipt,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useTheme } from "@/contexts/ThemeContext"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { MODULES_CONFIG } from "@/config/modules"
import { useAuth } from "@/hooks/useAuth"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logoUrl } = useTheme()
  const { profile } = useAuth()
  const isProjectManager = profile?.role === "project_manager"
  const isAdmin = profile?.role === "admin"

  const mainItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
  ]

  const processItems = [
    {
      title: "Proyectos & Procesos",
      url: "/projects",
      icon: Briefcase,
    },
    {
      title: "Línea de Producción",
      url: "/line",
      icon: Layers,
    },
    {
      title: "Órdenes de Trabajo",
      url: "/orders",
      icon: ClipboardList,
      items: [
        {
          title: "Todas las Órdenes",
          url: "/orders",
        },
        ...(isAdmin
          ? [
              {
                title: "Nueva Orden",
                url: "/orders/new",
              },
            ]
          : []),
      ],
    },
    {
      title: "Seguimiento en Vivo",
      url: "/tracking",
      icon: Activity,
    },
    {
      title: "Historial de Producción",
      url: "/history",
      icon: History,
    },
  ]

  const financeItems = [
    {
      title: "Finanzas",
      url: "/finances",
      icon: DollarSign,
      items: [
        {
          title: "Resumen General",
          url: "/finances",
        },
        {
          title: "Control Mensual",
          url: "/finances/control-mensual",
        },
        {
          title: "Cotizaciones",
          url: "/finances/cotizaciones",
        },
        {
          title: "Facturas",
          url: "/finances/facturas",
        },
        {
          title: "Ingresos (Ventas)",
          url: "/finances/ingresos",
        },
        {
          title: "Gastos (Compras)",
          url: "/finances/gastos",
        },
        {
          title: "Cuentas por Cobrar",
          url: "/finances/cuentas-por-cobrar",
        },
        {
          title: "Cuentas por Pagar",
          url: "/finances/cuentas-por-pagar",
        },
        {
          title: "Conciliación Bancaria",
          url: "/finances/transferencias",
        },
        {
          title: "Reportes",
          url: "/finances/reportes",
        },
        {
          title: "Categorías",
          url: "/finances/categorias",
        },
        {
          title: "Métodos de Pago",
          url: "/finances/metodos-pago",
        },
        ...(isAdmin
          ? [
              {
                title: "Configuración",
                url: "/finances/configuracion",
              },
            ]
          : []),
      ],
    },
  ]

  const inventoryItems = [
    {
      title: "Inventario de Almacén",
      url: "/inventory",
      icon: Warehouse,
    },
  ]

  const coreItems = isProjectManager
    ? [
        {
          title: "Proyectos & Procesos",
          url: "/projects",
          icon: Briefcase,
        },
        {
          title: "Línea de Producción",
          url: "/line",
          icon: Layers,
        },
        {
          title: "Seguimiento",
          url: "/tracking",
          icon: Activity,
        },
        {
          title: "Cotizaciones",
          url: "/finances/cotizaciones",
          icon: Receipt,
        },
        {
          title: "Clientes",
          url: "/clients",
          icon: Users,
        },
      ]
    : [
        {
          title: "Clientes",
          url: "/clients",
          icon: Users,
        },
        {
          title: "Proveedores",
          url: "/providers",
          icon: Truck,
        },
        ...(isAdmin
          ? [
              {
                title: "Usuarios",
                url: "/users",
                icon: Users,
              },
              {
                title: "Configuración",
                url: "/settings",
                icon: SettingsIcon,
              },
            ]
          : []),
      ]

  return (
    <Sidebar variant="inset" {...props} className="bg-sidebar">
      <SidebarHeader className="p-6 bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem className="flex justify-center items-center">
            <img src={logoUrl || "/logo.png"} alt="Logo" className="h-16 w-auto" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar gap-0 py-2">
        <NavMain items={mainItems} />

        {!isProjectManager && MODULES_CONFIG.orders.enabled && (
          <NavMain title="Manufactura & Procesos" items={processItems} />
        )}

        {!isProjectManager && MODULES_CONFIG.finances.enabled && (
          <NavMain title="Finanzas & Cobros" items={financeItems} />
        )}

        {!isProjectManager && MODULES_CONFIG.inventory.enabled && (
          <NavMain title="Logística" items={inventoryItems} />
        )}

        <NavMain title={isProjectManager ? "Gestión de Proyectos" : "Administración & Catálogos"} items={coreItems} />
      </SidebarContent>
      <SidebarFooter className="p-4 bg-sidebar">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
