import * as React from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function AdminLayout() {
  const location = useLocation()
  const pathnames = location.pathname.split("/").filter((x) => x)

  const getBreadcrumbLabel = (segment: string, index: number, array: string[]) => {
    const map: Record<string, string> = {
      admin: "Administración",
      dashboard: "Inicio",
      operations: "Operaciones",
      "control-mensual": "Control Mensual",
      contabilidades: "Contabilidades",
      opiniones: "Opiniones de Cumplimiento",
      pendientes: "Pendientes",
      "calendario-fiscal": "Calendario Fiscal",
      clients: "Clientes",
      finances: "Finanzas",
      ingresos: "Ingresos",
      gastos: "Gastos",
      "cuentas-por-cobrar": "Cuentas por Cobrar",
      "cuentas-por-pagar": "Cuentas por Pagar",
      transferencias: "Conciliación Bancaria",
      facturas: "Facturación",
      reportes: "Reportes",
      users: "Contadores / Usuarios",
      settings: "Configuración",
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
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 md:px-6 border-b border-border/60 bg-background/95 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block" />
            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList>
                {breadcrumbElements}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Right actions: Month Selector, Notification Bell, User Initial */}

        </header>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
