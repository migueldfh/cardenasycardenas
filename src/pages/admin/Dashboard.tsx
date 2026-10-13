import { Link } from "react-router-dom";
import { useProjects } from "@/modules/finances/hooks";
import { useActiveWorkOrders } from "@/hooks/useWorkOrders";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Package,
  Layers,
  Activity,
  Warehouse,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export function Dashboard() {
  const { data: projects = [] } = useProjects();
  const { data: workOrders = [] } = useActiveWorkOrders();

  const activeProjects = projects.filter(
    (p) => p.status !== "completed" && p.current_stage !== "finiquito"
  );
  const completedProjects = projects.filter(
    (p) => p.status === "completed" || p.current_stage === "finiquito"
  );

  const totalPiecesInProcess = activeProjects.reduce(
    (acc, p) => acc + (p.roster_list?.length || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Panel Principal ERP</h2>
          <p className="text-muted-foreground mt-1">
            Resumen global de finanzas, procesos de manufactura, logística e inventario.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/finances">
              <DollarSign className="mr-1.5 h-4 w-4 text-emerald-500" /> Módulo Finanzas
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/line">
              <Layers className="mr-1.5 h-4 w-4 text-primary" /> Línea de Producción
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/projects">
              <Package className="mr-1.5 h-4 w-4" /> Gestionar Proyectos
            </Link>
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Proyectos en Proceso</span>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPiecesInProcess.toLocaleString()} prendas registradas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Línea de Fabricación</span>
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{workOrders.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Órdenes de trabajo activas</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Módulo Finanzas</span>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600">Activo</div>
            <p className="text-xs text-muted-foreground mt-1">Facturas, cobros y flujo de caja</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Proyectos Concluidos</span>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{completedProjects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Entregas liquidadas con éxito</p>
          </CardContent>
        </Card>
      </div>

      {/* Modules Hub Grid */}
      <div>
        <h3 className="text-xl font-bold tracking-tight mb-4">Módulos del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card: Procesos & Fabricación */}
          <Card className="border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Layers className="h-5 w-5" />
              </div>
              <CardTitle>Procesos & Manufactura</CardTitle>
              <CardDescription>
                Flujo completo en 14 etapas: desde diseño digital y corte hasta sublimado, confección y empaque.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-between h-9 text-sm" asChild>
                <Link to="/projects">
                  <span>Proyectos & Procesos</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-9 text-sm" asChild>
                <Link to="/line">
                  <span>Tablero de Línea de Producción</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-9 text-sm" asChild>
                <Link to="/tracking">
                  <span>Seguimiento en Tiempo Real</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-9 text-sm" asChild>
                <Link to="/history">
                  <span>Historial de Producción</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card: Finanzas & Facturación */}
          <Card className="border-border hover:border-emerald-500/50 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                <DollarSign className="h-5 w-5" />
              </div>
              <CardTitle>Finanzas & Facturación</CardTitle>
              <CardDescription>
                Administración de cotizaciones, anticipos, cuentas por cobrar, cuentas por pagar y conciliación bancaria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-between h-9 text-sm" asChild>
                <Link to="/finances">
                  <span>Resumen Financiero</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-9 text-sm" asChild>
                <Link to="/finances/cotizaciones">
                  <span>Cotizaciones a Clientes</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-9 text-sm" asChild>
                <Link to="/finances/cuentas-por-cobrar">
                  <span>Cuentas por Cobrar</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-9 text-sm" asChild>
                <Link to="/finances/cuentas-por-pagar">
                  <span>Cuentas por Pagar</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card: Logística & Inventario */}
          <Card className="border-border hover:border-blue-500/50 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2">
                <Warehouse className="h-5 w-5" />
              </div>
              <CardTitle>Inventario & Logística</CardTitle>
              <CardDescription>
                Gestión de bodegas, racks, stock por cliente y catálogo de insumos y materias primas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-between h-9 text-sm" asChild>
                <Link to="/inventory">
                  <span>Explorador de Almacén</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-9 text-sm" asChild>
                <Link to="/clients">
                  <span>Stock por Cliente</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-9 text-sm" asChild>
                <Link to="/providers">
                  <span>Directorio de Proveedores</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
