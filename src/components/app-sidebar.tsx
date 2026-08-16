import * as React from "react"
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  History,
  Warehouse,
  Users,
  DollarSign,
  Truck,
  Briefcase,
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

  const mainItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
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
        title: "Clientes",
        url: "/clients",
        icon: Users,
      },
    ]
    : [
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
      {
        title: "Proveedores",
        url: "/providers",
        icon: Truck,
      },
      {
        title: "Usuarios",
        url: "/users",
        icon: Users,
      },
    ]

  const orderItems = [
    {
      title: "Órdenes de Producción",
      url: "/orders",
      icon: ClipboardList,
    },
    {
      title: "Línea de Producción",
      url: "/line",
      icon: Package,
    },
    {
      title: "Seguimiento de Órdenes",
      url: "/tracking",
      icon: ClipboardList,
    },
    {
      title: "Historial de Producción",
      url: "/history",
      icon: History,
    },
  ]

  const inventoryItems = [
    {
      title: "Inventario",
      url: "/inventory",
      icon: Warehouse,
    },
  ]

  const financeItems = [
    {
      title: "Finanzas",
      url: "/finances",
      icon: DollarSign,
    },
  ]

  return (
    <Sidebar variant="inset" {...props} className="bg-sidebar">
      <SidebarHeader className="p-6 bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem className="flex justify-center items-center">
            <img src={logoUrl || "/logo.png"} alt="Logo" className="h-20 w-auto" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar gap-0 py-2">
        {!isProjectManager && <NavMain items={mainItems} />}

        {!isProjectManager && MODULES_CONFIG.orders.enabled && (
          <NavMain title="Órdenes & Producción" items={orderItems} />
        )}

        {!isProjectManager && MODULES_CONFIG.inventory.enabled && (
          <NavMain title="Logística" items={inventoryItems} />
        )}

        {!isProjectManager && MODULES_CONFIG.finances.enabled && (
          <NavMain title="Finanzas & Cobros" items={financeItems} />
        )}
        <NavMain title={isProjectManager ? "Proyectos" : "Administración"} items={coreItems} />
      </SidebarContent>
      <SidebarFooter className="p-4 bg-sidebar">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
