import * as React from "react";
import { useParams } from "react-router-dom";
import { usePublicProject, useReportPublicPayment } from "@/modules/finances/hooks";
import { uploadPaymentProof } from "@/modules/finances/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ReportPayment() {
  const { token } = useParams<{ token: string }>();
  const { logoUrl } = useTheme();
  const { data: project, isLoading, error } = usePublicProject(token || "");
  const reportPaymentMutation = useReportPublicPayment();

  // Form state
  const [form, setForm] = React.useState({
    amount: "",
    method: "transfer",
    folio: "",
    proof_file: null as File | null,
  });

  const [isUploading, setIsUploading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.amount || !form.method) {
      toast.error("Por favor llena todos los campos obligatorios.");
      return;
    }

    setIsUploading(true);
    try {
      let proof_url = null;
      if (form.proof_file) {
        proof_url = await uploadPaymentProof(form.proof_file);
      }

      const success = await reportPaymentMutation.mutateAsync({
        project_token: token,
        amount: parseFloat(form.amount),
        method: form.method,
        folio: form.folio,
        proof_url,
      });

      if (success) {
        setIsSuccess(true);
        toast.success("Pago reportado con éxito");
      } else {
        toast.error("Ocurrió un error al reportar el pago.");
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-muted-foreground text-sm font-medium">Cargando datos...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-md mx-auto text-center px-4">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Enlace Inválido</h2>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          Este proyecto no existe, ha sido desactivado o el enlace de seguridad expiró.
        </p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950/20 py-12 px-4 md:px-6 flex items-center justify-center">
        <Card className="max-w-md w-full shadow-2xl border-slate-200/50 bg-background/95 backdrop-blur text-center p-8">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">¡Reporte Enviado!</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Tu comprobante de pago fue recibido correctamente. El equipo de administración validará la transacción y liberará la conciliación a la brevedad.
          </p>
          <div className="mt-6 border-t pt-4 text-xs text-muted-foreground">
            Proyecto: <span className="font-semibold text-foreground">{project.project_name}</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950/20 py-12 px-4 md:px-6 flex items-center justify-center">
      <Card className="max-w-md w-full shadow-2xl border-slate-200/50 bg-background/95 backdrop-blur">
        <CardHeader className="text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
          <img src={logoUrl || "/logo.png"} alt="Logo" className="h-14 w-auto mx-auto mb-3" />
          <CardTitle className="text-xl font-bold">Reportar Comprobante de Pago</CardTitle>
          <CardDescription className="flex flex-col gap-0.5">
            <span>Proyecto: <span className="font-semibold text-foreground">{project.project_name}</span> ({project.client_name})</span>
            {project.order_number && <span className="text-xs text-muted-foreground font-mono">Pedido: {project.order_number}</span>}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rep_amount">Monto Depositado ($) *</Label>
              <Input
                id="rep_amount"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="10000"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep_method">Método de Pago Utilizado *</Label>
              <Select value={form.method} onValueChange={(val) => setForm({ ...form, method: val })}>
                <SelectTrigger id="rep_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transferencia Bancaria (SPEI)</SelectItem>
                  <SelectItem value="cash">Depósito en Efectivo (OXXO/Ventanilla)</SelectItem>
                  <SelectItem value="card">Pago con Tarjeta</SelectItem>
                  <SelectItem value="atm_withdrawal">Retiro sin Tarjeta (Código ATM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep_folio">
                {form.method === "atm_withdrawal" ? "Código de Retiro ATM *" : "Folio / Clave de Rastreo SPEI / Autorización"}
              </Label>
              <Input
                id="rep_folio"
                value={form.folio}
                onChange={(e) => setForm({ ...form, folio: e.target.value })}
                placeholder={form.method === "atm_withdrawal" ? "Ingrese el código de retiro para el cajero" : "Ej: 8291084"}
                required={form.method === "atm_withdrawal"}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep_file">Subir Comprobante (Foto/PDF)</Label>
              <Input
                id="rep_file"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setForm({ ...form, proof_file: e.target.files?.[0] || null })}
              />
            </div>
          </CardContent>

          <CardFooter className="border-t bg-muted/20 p-6">
            <Button
              type="submit"
              disabled={isUploading}
              className="w-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Subiendo Comprobante...
                </>
              ) : (
                "Enviar Reporte de Pago"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
