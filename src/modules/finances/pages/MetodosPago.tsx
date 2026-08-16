import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, CreditCard, Landmark, ShieldCheck } from "lucide-react";

export function MetodosPago() {
  const methods = [
    {
      name: "Efectivo (Physical Cash)",
      description: "Recibe pagos directamente en efectivo. Estos cobros entran a un flujo especial de Conciliación de Efectivo, donde se marcan como depositados una vez ingresados en cuentas bancarias físicas.",
      icon: Coins,
      status: "Activo",
      variant: "default" as const,
      features: ["Control de depósito", "Fácil registro manual", "Cero comisiones"],
    },
    {
      name: "Transferencia Electrónica (SPEI / Banco)",
      description: "Permite a los clientes subir folios y capturas de transferencias mediante enlaces públicos seguros, que luego los administradores revisan y aprueban.",
      icon: Landmark,
      status: "Activo",
      variant: "default" as const,
      features: ["Aprobación de folio", "Enlace de reporte de cliente", "Conciliación manual rápida"],
    },
    {
      name: "Retiro sin Tarjeta (ATM)",
      description: "Permite a los clientes proporcionar códigos de retiro en cajero automático (sin tarjeta). Los administradores retiran el efectivo físicamente en ventanilla o cajero y lo registran y concilian en Caja.",
      icon: Coins,
      status: "Activo",
      variant: "default" as const,
      features: ["Registro de código de retiro", "Ideal para cobros rápidos", "Conciliación manual en Caja"],
    },
    {
      name: "Tarjetas de Crédito / Débito",
      description: "Infraestructura lista para recibir cobros en terminales físicas u online. Configuración integrada directamente al folio interno de venta.",
      icon: CreditCard,
      status: "Listo para Integrar",
      variant: "secondary" as const,
      features: ["Registro manual de folios", "Soporte multifirma", "Preparado para SAT"],
    },
    {
      name: "Pasarelas de Pago Online (Stripe / MercadoPago)",
      description: "Arquitectura abierta para sincronizar enlaces de cobro automáticos con pasarelas de pago online. Permite cobros automáticos sin intervención manual del staff.",
      icon: ShieldCheck,
      status: "Pendiente Configuración",
      variant: "outline" as const,
      features: ["Webhook API", "Cobro inmediato", "Soporte de IVA / Comisión cero"],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Métodos de Pago y Pasarelas</h2>
        <p className="text-muted-foreground text-sm">Control de canales de cobro y preparación para integraciones con procesadores de tarjetas.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {methods.map((m, i) => {
          const Icon = m.icon;
          return (
            <Card key={i} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{m.name}</CardTitle>
                  </div>
                  <Badge variant={m.variant}>{m.status}</Badge>
                </div>
                <CardDescription className="pt-2 leading-relaxed">{m.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Características</h4>
                  <ul className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    {m.features.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
