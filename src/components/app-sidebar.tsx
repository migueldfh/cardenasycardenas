import {
  Home,
  FileText,
  Users,
  DollarSign,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  HelpCircle,
} from "lucide-react"
import { Link } from "react-router-dom"

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
  SidebarMenuButton,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logoUrl } = useTheme()

  // Main navigation items matching Cárdenas & Cárdenas ERP design
  const mainNavItems = [
    {
      title: "Inicio",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Operaciones",
      url: "/control-mensual",
      icon: FileText,
      items: [
        {
          title: "Control mensual",
          url: "/control-mensual",
        },
        {
          title: "Contabilidades",
          url: "/contabilidades",
        },
        {
          title: "Opiniones de cumplimiento",
          url: "/opiniones",
        },
        {
          title: "Pendientes",
          url: "/pendientes",
        },
        {
          title: "Calendario fiscal",
          url: "/calendario-fiscal",
        },
      ],
    },
    {
      title: "Clientes",
      url: "/clients",
      icon: Users,
    },
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
          title: "Ingresos (Cobranza)",
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
      ],
    },
    {
      title: "Facturación",
      url: "/facturas",
      icon: Receipt,
    },
    {
      title: "Reportes",
      url: "/reportes",
      icon: BarChart3,
    },
  ]

  const adminNavItems = [
    {
      title: "Contadores / Usuarios",
      url: "/users",
      icon: Users,
    },
    {
      title: "Configuración",
      url: "/settings",
      icon: SettingsIcon,
    },
  ]

  return (
    <Sidebar variant="inset" {...props} className="bg-sidebar border-r border-border/80">
      <SidebarHeader className="p-5 bg-sidebar border-b border-border/40">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Cárdenas & Cárdenas" className="w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs">
                  C&C
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs tracking-wider text-foreground leading-tight">
                    CARDENAS
                  </span>
                  <span className="font-bold text-xs tracking-wider text-foreground leading-tight">
                    & CARDENAS
                  </span>
                  <span className="text-[8px] text-muted-foreground uppercase font-medium tracking-tight">
                    Consultoría Legal Fiscal Contable
                  </span>
                </div>
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar gap-1 py-3 px-2">
        <NavMain items={mainNavItems} />
        <NavMain title="ADMINISTRACIÓN" items={adminNavItems} />
      </SidebarContent>

      <SidebarFooter className="p-3 bg-sidebar border-t border-border/40 flex flex-col gap-2">
        {/* Ayuda Link */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Centro de Ayuda">
              <Link to="/settings" className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                <span>Ayuda</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
