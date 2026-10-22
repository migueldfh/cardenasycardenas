import {
  CreditCard,
  Landmark,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MetodosPago() {
  const paymentChannels = [
    {
      title: "Efectivo (Physical Cash)",
      description:
        "Recepción y entrega de dinero físico en sucursal o cajas chicas.",
      icon: Coins,
      status: "Activo",
      isAvailable: true,
      features: [
        "Liquidación inmediata",
        "Sin comisiones bancarias",
        "Requiere arqueo de caja manual",
      ],
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      title: "Transferencia Electrónica (SPEI / Banco)",
      description:
        "Movimientos interbancarios directos a cuentas empresariales.",
      icon: Landmark,
      status: "Activo",
      isAvailable: true,
      features: [
        "Rastreabilidad total (CLABE / Referencia)",
        "Conciliación mediante estados de cuenta",
        "Ideal para B2B y proveedores",
      ],
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      title: "Retiro sin Tarjeta (ATM)",
      description:
        "Generación de códigos para cobro o pago en cajeros automáticos.",
      icon: Landmark,
      status: "Activo",
      isAvailable: true,
      features: [
        "Útil para viáticos y gastos rápidos",
        "Límite de monto por operación",
        "Requiere confirmación de folio",
      ],
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      title: "Tarjetas de Crédito / Débito",
      description:
        "Cobros mediante terminal punto de venta (TPV) física o virtual.",
      icon: CreditCard,
      status: "Activo",
      isAvailable: true,
      features: [
        "Aceptación de Visa, Mastercard y Amex",
        "Aplica comisión por transacción (~2.5% - 3.6%)",
        "Liquidación en 24-48 hrs hábiles",
      ],
      color: "text-purple-600 bg-purple-50 border-purple-200",
    },
    {
      title: "Pasarelas de Pago Online (Stripe / MercadoPago)",
      description:
        "Integración automática para cobros recurrentes o links de pago.",
      icon: ShieldCheck,
      status: "Próximamente",
      isAvailable: false,
      features: [
        "Conciliación automática vía Webhooks",
        "Prevención de fraude integrada",
        "Facturación automática al confirmar pago",
      ],
      color: "text-slate-600 bg-slate-100 border-slate-200",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span>Finanzas</span>
          <span>›</span>
          <span className="text-foreground font-medium">Métodos de Pago</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Métodos de Pago
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Canales habilitados en el sistema para el registro de ingresos, egresos y conciliación.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentChannels.map((channel, i) => {
          const IconComponent = channel.icon;
          return (
            <Card
              key={i}
              className={`bg-card shadow-xs border-border/80 relative overflow-hidden transition-all ${
                !channel.isAvailable ? "opacity-75 bg-muted/20" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className={`p-2.5 rounded-lg border ${channel.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      channel.isAvailable
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {channel.isAvailable ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {channel.status}
                  </span>
                </div>
                <CardTitle className="mt-3 text-base font-bold text-foreground">
                  {channel.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {channel.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 border-t border-border/60 pt-3 text-xs">
                  <p className="font-semibold text-foreground/90 text-[11px] uppercase tracking-wider">
                    Características operativas:
                  </p>
                  <ul className="space-y-1.5 text-muted-foreground">
                    {channel.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f] mt-1.5 shrink-0" />
                        <span>{feat}</span>
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
