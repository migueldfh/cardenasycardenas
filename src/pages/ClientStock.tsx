import { useParams } from "react-router-dom";
import { useClientStockByToken, useClientByToken, useClientProjectsByToken } from "@/modules/inventory/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Warehouse,
  Clock,
  AlertTriangle,
  Loader2,
  FileText,
  Boxes,
  DollarSign,
  CreditCard,
  Briefcase,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTheme } from "@/contexts/ThemeContext";
import { MODULES_CONFIG } from "@/config/modules";

export function ClientStock() {
  const { token } = useParams<{ token: string }>();
  const { logoUrl } = useTheme();

  const isInventoryActive = MODULES_CONFIG.inventory.enabled;

  const { data: client, isLoading: isClientLoading, error: clientError } = useClientByToken(token || "");
  const { data: stockItems = [], isLoading: isStockLoading } = useClientStockByToken(isInventoryActive ? (token || "") : "");
  const { data: projects = [], isLoading: isProjectsLoading } = useClientProjectsByToken(!isInventoryActive ? (token || "") : "");

  const isLoading = isClientLoading || (isInventoryActive ? isStockLoading : isProjectsLoading);

  // Format currency helper
  const formatCurrency = (val: number | undefined | null) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(val || 0);
  };

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "dd MMM yyyy, h:mm a", { locale: es });
    } catch (e) {
      return dateStr;
    }
  };

  // Warehouse label mapper
  const getWarehouseLabel = (code: string | null) => {
    if (!code) return "Sin Ubicación";
    const labelMap: Record<string, string> = {
      B8: "Bodega 8",
      B7: "Bodega 7",
      WP: "Warehouse Principal",
      Schumacher: "Schumacher / Lasko / Damar",
    };
    return labelMap[code] || `Almacén ${code}`;
  };

  const projectStatusTranslations: Record<string, string> = {
    draft: "borrador",
    pending_approval: "pendiente de aprobación",
    approved: "aprobado",
    completed: "completado",
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "approved":
        return "secondary";
      case "pending_approval":
        return "outline";
      default:
        return "destructive";
    }
  };

  const getProjectEffectiveTotal = (p: any) => {
    const subtotal = Number(p.custom_price_total);
    return p.requires_invoice
      ? subtotal + (subtotal * (Number(p.iva_rate) ?? 0.16)) - (subtotal * ((Number(p.isr_retention_rate) ?? 0) + (Number(p.iva_retention_rate) ?? 0)))
      : subtotal;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-semibold animate-pulse">
          {isInventoryActive ? "Cargando información del inventario..." : "Cargando información de proyectos..."}
        </p>
      </div>
    );
  }

  // Invalid token or no client found
  if (clientError || !client) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-lg border-destructive/20 bg-card">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold">Enlace no válido</CardTitle>
            <CardDescription className="mt-1">
              El enlace ingresado es incorrecto, expiró o no cuenta con un cliente válido.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-2 pb-6 text-xs text-muted-foreground">
            Comunícate con el administrador para solicitar un nuevo enlace de acceso.
          </CardContent>
        </Card>
      </div>
    );
  }

  const clientName = client.name;

  // Analytics/Totals calculation
  const totalProducts = new Set(stockItems.map(item => item.part_number)).size;
  const totalQuantity = stockItems.reduce((acc, item) => acc + Number(item.quantity), 0);
  const totalProjectsPrice = projects.reduce((acc, p) => acc + getProjectEffectiveTotal(p), 0);

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-lg text-primary">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{clientName}</h1>
              <p className="text-sm text-muted-foreground">
                {isInventoryActive
                  ? "Reporte de inventario en tiempo real de productos resguardados en almacén."
                  : "Seguimiento y cotizaciones de tus proyectos activos."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center">
            <img src={logoUrl || "/logo.png"} alt="Company Logo" className="h-10 w-auto object-contain bg-muted p-1 rounded border" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isInventoryActive ? (
            <>
              <Card className="shadow-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <Boxes className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Modelos / Códigos de Parte</p>
                    <h3 className="text-2xl font-bold mt-0.5">{totalProducts}</h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="bg-blue-500/10 p-3 rounded-lg text-blue-600 dark:text-blue-400">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total de Unidades Disponibles</p>
                    <h3 className="text-2xl font-bold mt-0.5">{totalQuantity.toLocaleString()}</h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="bg-green-500/10 p-3 rounded-lg text-green-600 dark:text-green-400">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Cobrado (Pagado)</p>
                    <h3 className="text-2xl font-bold mt-0.5 text-green-600 dark:text-green-400">
                      {formatCurrency(client.total_paid)}
                    </h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`p-3 rounded-lg ${Number(client.total_debt) > 0 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Saldo Pendiente (Deuda)</p>
                    <h3 className={`text-2xl font-bold mt-0.5 ${Number(client.total_debt) > 0 ? 'text-yellow-600 dark:text-yellow-500' : 'text-green-600 dark:text-green-400'}`}>
                      {Number(client.total_debt) > 0 ? formatCurrency(client.total_debt) : 'Liquidado'}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="shadow-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total de Proyectos</p>
                    <h3 className="text-2xl font-bold mt-0.5">{projects.length}</h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="bg-blue-500/10 p-3 rounded-lg text-blue-600 dark:text-blue-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Monto Total Contratado</p>
                    <h3 className="text-2xl font-bold mt-0.5">{formatCurrency(totalProjectsPrice)}</h3>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Detailed Table */}
        {isInventoryActive ? (
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-card">
              <CardTitle className="text-lg flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-primary" />
                Detalle de Stock en Almacén
              </CardTitle>
              <CardDescription>
                A continuación se listan todos tus productos y las cantidades disponibles en cada bodega.
              </CardDescription>
            </CardHeader>
            <CardContent className={stockItems.length === 0 ? "p-6" : "p-0"}>
              {stockItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Boxes className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <h3 className="text-lg font-semibold text-foreground">Sin productos vinculados</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Este cliente no tiene productos de inventario asociados en este momento.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold py-3 pl-6">Número de Parte</TableHead>
                        <TableHead className="font-semibold py-3">Descripción</TableHead>
                        <TableHead className="font-semibold py-3">Ubicación / Bodega</TableHead>
                        <TableHead className="font-semibold py-3 text-right">Cantidad Disponible</TableHead>
                        <TableHead className="font-semibold py-3 pr-6 text-right">Última Actualización</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockItems.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="font-bold py-4 pl-6 text-foreground">
                            {item.part_number}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[250px] truncate" title={item.description || "N/A"}>
                            {item.description || "Sin descripción"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-muted/50 font-semibold gap-1 py-1">
                              <Warehouse className="h-3 w-3 text-muted-foreground" />
                              {getWarehouseLabel(item.warehouse)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-base py-4 text-foreground">
                            {Number(item.quantity) === 0 ? (
                              <span className="text-muted-foreground">0</span>
                            ) : (
                              Number(item.quantity).toLocaleString()
                            )}
                          </TableCell>
                          <TableCell className="text-right py-4 pr-6 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5 justify-end">
                              <Clock className="h-3 w-3" />
                              {formatDate(item.updated_at)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-card">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Proyectos y Cotizaciones Registrados
              </CardTitle>
              <CardDescription>
                A continuación se listan los presupuestos y órdenes de venta asociadas a tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent className={projects.length === 0 ? "p-6" : "p-0"}>
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <h3 className="text-lg font-semibold text-foreground">Sin proyectos registrados</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    No hay proyectos ni cotizaciones vinculadas a tu cuenta en este momento.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold py-3 pl-6">Nombre del Proyecto</TableHead>
                        <TableHead className="font-semibold py-3">Fecha de Registro</TableHead>
                        <TableHead className="font-semibold py-3">Estado</TableHead>
                        <TableHead className="font-semibold py-3 text-right">Importe / Total</TableHead>
                        <TableHead className="font-semibold py-3 pr-6 text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="font-bold py-4 pl-6 text-foreground">
                            {project.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(project.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(project.status)} className="uppercase text-[10px] font-semibold">
                              {projectStatusTranslations[project.status] || project.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-base py-4 text-foreground">
                            {formatCurrency(getProjectEffectiveTotal(project))}
                          </TableCell>
                          <TableCell className="text-center py-4 pr-6">
                            <a href={`/quote/${project.share_token}`} target="_blank" rel="noreferrer">
                              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Ver Cotización
                              </Button>
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground py-4">
          © {new Date().getFullYear()} {isInventoryActive ? "Reporte de Inventario en Línea. Los datos mostrados corresponden a la existencia física en almacén al momento de la consulta." : "Portal de Proyectos en Línea. Información actualizada al momento de la consulta."}
        </p>
      </div>
    </div>
  );
}
