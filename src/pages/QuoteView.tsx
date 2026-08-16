
import { useParams } from "react-router-dom";
import { usePublicProject, useApprovePublicProject } from "@/modules/finances/hooks";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Mail, FileText, Check, AlertCircle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function QuoteView() {
  const { token } = useParams<{ token: string }>();
  const { logoUrl } = useTheme();
  const { data: project, isLoading, error, refetch } = usePublicProject(token || "");
  const approveMutation = useApprovePublicProject();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  const handleApprove = async () => {
    if (!token) return;
    try {
      await approveMutation.mutateAsync(token);
      toast.success("¡Cotización aprobada correctamente!");
      refetch();
    } catch (err: any) {
      toast.error(`Error al aprobar: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-muted-foreground text-sm font-medium">Cargando cotización...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-md mx-auto text-center px-4">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Enlace Inválido</h2>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          Esta cotización no existe, ha sido desactivada o el enlace de seguridad expiró.
        </p>
      </div>
    );
  }

  const isApproved = project.status === "approved" || project.status === "completed";
  const isCancelled = project.status === "cancelled";

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950/20 py-12 px-4 md:px-6 flex items-center justify-center">
      <Card className="max-w-2xl w-full shadow-2xl border-slate-200/50 bg-background/95 backdrop-blur">
        <CardHeader className="pb-6 border-b text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
          
          <img src={logoUrl || "/logo.png"} alt="Logo" className="h-16 w-auto mx-auto mb-4" />

          {isCancelled ? (
            <Badge variant="destructive" className="mx-auto mb-2 bg-destructive/10 text-destructive border-destructive/20 uppercase font-bold tracking-wider">
              Cotización Cancelada
            </Badge>
          ) : isApproved ? (
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <Badge variant="outline" className="mx-auto mb-2 text-yellow-600 border-yellow-300 bg-yellow-50/50">
              Cotización Pendiente
            </Badge>
          )}

          <CardTitle className="text-2xl font-bold tracking-tight mt-2">
            {project.project_name}
          </CardTitle>
          <CardDescription className="text-xs mt-1 font-mono flex flex-col items-center gap-1">
            <span>ID Cotización: {project.project_id.slice(0, 8).toUpperCase()}</span>
            {project.order_number && (
              <span className="font-semibold text-foreground bg-secondary px-2 py-0.5 rounded text-[10px] uppercase">
                Pedido: {project.order_number}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {/* Client summary */}
          <div className="bg-muted/40 p-4 rounded-xl space-y-2.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Información del Cliente</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Empresa / Cliente</p>
                <p className="font-semibold text-foreground pt-0.5">{project.client_name}</p>
              </div>
              {project.client_email && (
                <div>
                  <p className="text-muted-foreground text-xs">Correo Electrónico</p>
                  <p className="font-medium text-foreground pt-0.5 truncate flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {project.client_email}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Project description/notes */}
          {project.description && (
            <div className="bg-slate-100/50 dark:bg-zinc-900/50 p-4 rounded-xl space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas / Especificaciones</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Pricing summary */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conceptos y Precios</h3>
            
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 bg-muted/40 p-3 text-xs font-medium text-muted-foreground border-b">
                <span>Descripción</span>
                <span className="text-right">Monto Total</span>
              </div>
              <div className="grid grid-cols-2 p-4 text-sm items-center border-b last:border-0">
                <div className="space-y-0.5">
                  <p className="font-semibold">{project.project_name}</p>
                  <p className="text-xs text-muted-foreground">Proyecto de Ropa Deportiva Personalizada</p>
                </div>
                <div className="text-right">
                  {project.base_price_total > project.custom_price_total && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatCurrency(project.base_price_total)}
                    </p>
                  )}
                  {project.requires_invoice ? (
                    <div className="text-xs space-y-1 font-mono text-left inline-block w-full max-w-[220px]">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(Number(project.custom_price_total))}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>IVA ({( (project.iva_rate !== undefined ? Number(project.iva_rate) : 0.16) * 100).toFixed(0)}%):</span>
                        <span className="text-green-600">+{formatCurrency(Number(project.custom_price_total) * (project.iva_rate !== undefined ? Number(project.iva_rate) : 0.16))}</span>
                      </div>
                      {project.isr_retention_rate > 0 && (
                        <div className="flex justify-between text-red-500 text-[11px]">
                          <span>Ret. ISR ({(Number(project.isr_retention_rate) * 100).toFixed(2)}%):</span>
                          <span>-{formatCurrency(Number(project.custom_price_total) * Number(project.isr_retention_rate))}</span>
                        </div>
                      )}
                      {project.iva_retention_rate > 0 && (
                        <div className="flex justify-between text-red-500 text-[11px]">
                          <span>Ret. IVA ({(Number(project.iva_retention_rate) * 100).toFixed(3)}%):</span>
                          <span>-{formatCurrency(Number(project.custom_price_total) * Number(project.iva_retention_rate))}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm text-foreground border-t pt-1.5 mt-1.5">
                        <span>Total:</span>
                        <span>
                          {formatCurrency(
                            Number(project.custom_price_total) +
                            Number(project.custom_price_total) * (project.iva_rate !== undefined ? Number(project.iva_rate) : 0.16) -
                            Number(project.custom_price_total) * ((project.isr_retention_rate !== undefined ? Number(project.isr_retention_rate) : 0) + (project.iva_retention_rate !== undefined ? Number(project.iva_retention_rate) : 0))
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="font-bold text-lg text-foreground">
                      {formatCurrency(project.custom_price_total)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CFDI info */}
          {project.requires_invoice && (
            <div className="border-t pt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" /> Factura CFDI Solicitada
              </span>
              <Badge variant="outline" className="border-blue-200 text-blue-500 font-mono">
                Uso CFDI: {project.cfdi_use}
              </Badge>
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t bg-muted/20 p-6 flex flex-col items-center gap-4">
          {isCancelled ? (
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex items-center gap-1.5 text-destructive font-bold text-lg">
                <AlertCircle className="h-5 w-5" /> Cotización Cancelada
              </div>
              <p className="text-xs text-muted-foreground max-w-sm">
                Esta cotización ha sido cancelada y no está disponible para su aprobación. Por favor contacta al administrador.
              </p>
            </div>
          ) : isApproved ? (
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex items-center gap-1.5 text-green-600 font-bold text-lg">
                <ShieldCheck className="h-5 w-5" /> Cotización Aprobada
              </div>
              <p className="text-xs text-muted-foreground max-w-sm">
                Esta cotización ya fue validada y su orden de producción ha sido liberada. Recibirás actualizaciones de entrega por correo.
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-3">
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Al hacer clic en aprobar, validas la cotización descrita arriba y liberas la orden de trabajo para producción.
              </p>
              <Button
                size="lg"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="w-full sm:w-auto px-12 bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                {approveMutation.isPending ? "Aprobando..." : "Aprobar Cotización"}
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
