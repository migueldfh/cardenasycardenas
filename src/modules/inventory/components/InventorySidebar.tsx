import { Link } from "react-router-dom"
import { ArrowLeft, LayoutDashboard, Warehouse } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/nav-main"

const warehouses = [
  { id: "B8", label: "Bodega 8" },
  { id: "B7", label: "Bodega 7" },
  { id: "WP", label: "Warehouse Principal" },
  { id: "Schumacher", label: "Schumacher / Lasko / Damar" },
]

export function InventorySidebar() {
  const mainItems = [
    {
      title: "Resumen",
      url: "/inventory",
      icon: LayoutDashboard,
    },
  ]

  const warehouseItems = warehouses.map((w) => ({
    title: w.label,
    url: `/inventory/warehouse/${w.id}`,
    icon: Warehouse,
  }))

  return (
    <Sidebar variant="inset" className="bg-sidebar">
      <SidebarHeader className="p-6 bg-sidebar flex flex-row items-center gap-3">
        <Button variant="secondary" size="icon" className="h-8 w-8" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="text-lg text-foreground font-semibold tracking-tight">Inventario</span>
      </SidebarHeader>
      <SidebarContent className="bg-sidebar gap-0 py-2">
        <NavMain items={mainItems} />
        <NavMain title="Bodegas" items={warehouseItems} />
      </SidebarContent>
      <SidebarFooter className="p-4 bg-sidebar">
        <p className="text-xs text-muted-foreground text-center">
          Módulo de Inventario v1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
