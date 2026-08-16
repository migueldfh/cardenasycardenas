import * as React from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/contexts/ThemeContext"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
 
export function AdminLayout() {
  const { logoUrl } = useTheme()
  const location = useLocation()
  const pathnames = location.pathname.split("/").filter((x) => x)

  const getBreadcrumbLabel = (segment: string, index: number, array: string[]) => {
    const map: Record<string, string> = {
      admin: "Administración",
      dashboard: "Dashboard",
      orders: "Órdenes de Producción",
      new: "Nueva Órden",
      users: "Usuarios",
      settings: "Configuración",
      line: "Línea de Producción",
      tracking: "Seguimiento de Órdenes",
      history: "Historial de Producción",
    }
    
    if (map[segment]) {
      return map[segment]
    }
    
    if (index > 0 && array[index - 1] === "orders") {
      return "Detalle"
    }
    
    return segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  const breadcrumbs = pathnames
    .map((segment, index) => {
      const url = `/${pathnames.slice(0, index + 1).join("/")}`
      const label = getBreadcrumbLabel(segment, index, pathnames)
      return { segment, url, label }
    })
    .filter((item) => item.segment !== "admin")

  const breadcrumbElements = breadcrumbs.map((item, index) => {
    const isLast = index === breadcrumbs.length - 1

    return (
      <React.Fragment key={item.url}>
        {index > 0 && <BreadcrumbSeparator />}
        <BreadcrumbItem>
          {isLast ? (
            <BreadcrumbPage>{item.label}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link to={item.url}>{item.label}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
      </React.Fragment>
    )
  })

  return (
    <SidebarProvider className="h-svh overflow-hidden bg-sidebar">
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbElements}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex-1" />
          <img src={logoUrl || "/logo.png"} alt="Logo" className="h-8 w-auto md:hidden" />
        </header>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
