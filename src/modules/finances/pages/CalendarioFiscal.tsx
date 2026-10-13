import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function CalendarioFiscal() {

  const calendarEvents = [
    {
      date: "05 Sep 2026",
      title: "Cierre de recepción de papelería contable",
      type: "Interno",
      status: "Completado",
      description: "Límite para que clientes entreguen estados de cuenta y facturas de compras de agosto.",
      clientsAffected: "186 clientes",
    },
    {
      date: "10 Sep 2026",
      title: "Revisión y validación de cálculos de impuestos",
      type: "Interno",
      status: "En proceso",
      description: "Supervisión de papeles de trabajo ISR e IVA por contadores senior.",
      clientsAffected: "142 clientes terminados",
    },
    {
      date: "17 Sep 2026",
      title: "Declaración y Pago Provisional de ISR e IVA (SAT)",
      type: "Obligación SAT",
      status: "Por vencer",
      description: "Presentación obligatoria ante el portal del SAT para Personas Morales y Personas Físicas.",
      clientsAffected: "186 clientes",
    },
    {
      date: "17 Sep 2026",
      title: "Entero de retenciones de ISR por salarios y asimilados",
      type: "Obligación SAT",
      status: "Por vencer",
      description: "Pago de retenciones efectuadas a trabajadores en el mes inmediato anterior.",
      clientsAffected: "95 clientes con nómina",
    },
    {
      date: "30 Sep 2026",
      title: "Presentación de la DIOT (Operaciones con Terceros)",
      type: "Obligación SAT",
      status: "Programado",
      description: "Envío del archivo de información de proveedores y desglose de IVA acreditable.",
      clientsAffected: "186 clientes",
    },
    {
      date: "30 Sep 2026",
      title: "Envío de Estados Financieros y balanzas al cliente",
      type: "Entregable Despacho",
      status: "Programado",
      description: "Emisión de balance general, estado de resultados y ratios fiscales.",
      clientsAffected: "186 clientes",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Calendario de Obligaciones Fiscales
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fechas límite de cumplimiento ante el SAT, IMSS, INFONAVIT y entregables del despacho
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Mes Anterior
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Mes Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card shadow-xs border-blue-500/30">
          <p className="text-xs text-muted-foreground font-medium">Próximo Vencimiento Mayor</p>
          <p className="text-xl font-bold text-foreground mt-1">17 Septiembre 2026</p>
          <p className="text-xs text-blue-600 mt-1 font-medium">Pagos Provisionales ISR / IVA</p>
        </Card>

        <Card className="p-4 bg-card shadow-xs border-emerald-500/30">
          <p className="text-xs text-muted-foreground font-medium">Hitos Completados del Mes</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">2 de 6 hitos</p>
          <p className="text-xs text-muted-foreground mt-1">Papelería y preliminares listos</p>
        </Card>

        <Card className="p-4 bg-card shadow-xs border-amber-500/30">
          <p className="text-xs text-muted-foreground font-medium">Días Hábiles Restantes</p>
          <p className="text-xl font-bold text-amber-600 mt-1">5 días hábiles</p>
          <p className="text-xs text-muted-foreground mt-1">Para límite legal del 17-Sep</p>
        </Card>
      </div>

      {/* Timeline List */}
      <Card className="border-border/80 shadow-xs p-5">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" /> Cronograma Septiembre 2026
        </h3>

        <div className="space-y-4">
          {calendarEvents.map((event, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#1e3a5f] text-white flex flex-col items-center justify-center font-bold text-xs shrink-0 leading-tight">
                  <span>{event.date.split(" ")[0]}</span>
                  <span className="text-[9px] uppercase font-normal">{event.date.split(" ")[1]}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">{event.title}</h4>
                    <Badge variant="outline" className="text-[10px] bg-muted/40">
                      {event.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                    {event.description}
                  </p>
                  <p className="text-[11px] font-medium text-primary mt-1">
                    Alcance: {event.clientsAffected}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className={`text-xs px-2.5 py-0.5 ${
                    event.status === "Completado"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : event.status === "Por vencer"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : event.status === "En proceso"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {event.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
