import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Download,
  Upload,
  MoreVertical,
  Check,
  X,
  Share2,
  FileText,
  ChevronRight,
  ChevronLeft,
  Plus,
  Edit,
} from "lucide-react";

interface ClientObligationRow {
  id: string;
  name: string;
  tradeName?: string;
  rfc: string;
  contador: string;
  regimen: string;
  persona: "Moral" | "Física";
  papeleria: boolean;
  captura: number;
  calculo: boolean;
  presentado: boolean;
  diot: boolean;
  ef: boolean;
  opinion: "Positiva" | "Negativa" | "Pendiente";
  estatus: "Completado" | "En proceso" | "Pendiente" | "En riesgo" | "Atrasado";
  ultAct: string;
  email: string;
  telefono: string;
}

const mockClientsObligations: ClientObligationRow[] = [
  {
    id: "1",
    name: "Solupatch S.A. de C.V.",
    rfc: "SOL220101ABC",
    contador: "Rodrigo",
    regimen: "PM General",
    persona: "Moral",
    papeleria: true,
    captura: 100,
    calculo: true,
    presentado: true,
    diot: true,
    ef: true,
    opinion: "Positiva",
    estatus: "Completado",
    ultAct: "08 Sep 2026",
    email: "contacto@solupatch.com",
    telefono: "81 1234 5678",
  },
  {
    id: "2",
    name: "Comercial del Norte S.A. de C.V.",
    rfc: "CON180315XYZ",
    contador: "Alejandra",
    regimen: "RESICO",
    persona: "Moral",
    papeleria: true,
    captura: 80,
    calculo: true,
    presentado: false,
    diot: false,
    ef: false,
    opinion: "Positiva",
    estatus: "En proceso",
    ultAct: "08 Sep 2026",
    email: "finanzas@comercialnorte.com",
    telefono: "81 8345 9900",
  },
  {
    id: "3",
    name: "Grupo Industrial MX S. de R.L.",
    rfc: "GIM150620KL9",
    contador: "Rubí",
    regimen: "PM General",
    persona: "Moral",
    papeleria: false,
    captura: 0,
    calculo: false,
    presentado: false,
    diot: false,
    ef: false,
    opinion: "Negativa",
    estatus: "Pendiente",
    ultAct: "07 Sep 2026",
    email: "admin@grupoindustrial.mx",
    telefono: "81 8122 3400",
  },
  {
    id: "4",
    name: "Servicios Profesionales S.C.",
    rfc: "SPR190101QW1",
    contador: "Luis",
    regimen: "PFAE",
    persona: "Moral",
    papeleria: true,
    captura: 60,
    calculo: true,
    presentado: false,
    diot: false,
    ef: false,
    opinion: "Positiva",
    estatus: "En riesgo",
    ultAct: "08 Sep 2026",
    email: "contacto@serviciosprof.com",
    telefono: "81 8900 1234",
  },
  {
    id: "5",
    name: "Empresa ABC S.A. de C.V.",
    rfc: "ABC210101RT8",
    contador: "Mariana",
    regimen: "PM General",
    persona: "Moral",
    papeleria: true,
    captura: 100,
    calculo: true,
    presentado: true,
    diot: true,
    ef: true,
    opinion: "Positiva",
    estatus: "Completado",
    ultAct: "08 Sep 2026",
    email: "contabilidad@empresaabc.com",
    telefono: "81 2233 4455",
  },
  {
    id: "6",
    name: "Construcciones Delta S.A.",
    rfc: "CDE171010MN4",
    contador: "Rodrigo",
    regimen: "PM Coordinados",
    persona: "Moral",
    papeleria: true,
    captura: 40,
    calculo: false,
    presentado: false,
    diot: false,
    ef: false,
    opinion: "Pendiente",
    estatus: "En riesgo",
    ultAct: "06 Sep 2026",
    email: "delta@construcciones.com",
    telefono: "81 4455 6677",
  },
  {
    id: "7",
    name: "Logística del Bajío S.A. de C.V.",
    rfc: "LBA210709PL2",
    contador: "Alejandra",
    regimen: "PM General",
    persona: "Moral",
    papeleria: false,
    captura: 0,
    calculo: false,
    presentado: false,
    diot: false,
    ef: false,
    opinion: "Negativa",
    estatus: "Atrasado",
    ultAct: "05 Sep 2026",
    email: "operaciones@logisticabajio.com",
    telefono: "477 123 4567",
  },
  {
    id: "8",
    name: "Consultoría Integral S.C.",
    rfc: "CIN200120AS9",
    contador: "Luis",
    regimen: "RESICO",
    persona: "Física",
    papeleria: true,
    captura: 90,
    calculo: true,
    presentado: true,
    diot: true,
    ef: true,
    opinion: "Positiva",
    estatus: "En proceso",
    ultAct: "08 Sep 2026",
    email: "contacto@consultoriaintegral.mx",
    telefono: "81 5566 7788",
  },
  {
    id: "9",
    name: "Inversiones Monterrey S.A.",
    rfc: "IMO160405ZX1",
    contador: "Rubí",
    regimen: "PM General",
    persona: "Moral",
    papeleria: true,
    captura: 70,
    calculo: true,
    presentado: false,
    diot: false,
    ef: false,
    opinion: "Pendiente",
    estatus: "En proceso",
    ultAct: "07 Sep 2026",
    email: "info@inversionesmty.com",
    telefono: "81 8333 4444",
  },
  {
    id: "10",
    name: "Alimentos y Bebidas S. de R.L.",
    rfc: "AYB220330DF7",
    contador: "Mariana",
    regimen: "PFAE",
    persona: "Física",
    papeleria: true,
    captura: 100,
    calculo: true,
    presentado: true,
    diot: true,
    ef: true,
    opinion: "Positiva",
    estatus: "Completado",
    ultAct: "08 Sep 2026",
    email: "contabilidad@ayb.com",
    telefono: "81 9988 7766",
  },
];

export function ControlMensual() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContador, setSelectedContador] = useState("all");
  const [selectedEstatus, setSelectedEstatus] = useState("all");
  const [selectedRegimen, setSelectedRegimen] = useState("all");
  const [selectedClient, setSelectedClient] = useState<ClientObligationRow | null>(null);

  const displayRows = mockClientsObligations.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(term) ||
      c.rfc.toLowerCase().includes(term) ||
      c.contador.toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (selectedContador !== "all" && c.contador !== selectedContador) return false;
    if (selectedEstatus !== "all" && c.estatus !== selectedEstatus) return false;
    if (selectedRegimen !== "all" && c.regimen !== selectedRegimen) return false;
    return true;
  });

  const getEstatusBadge = (estatus: ClientObligationRow["estatus"]) => {
    switch (estatus) {
      case "Completado":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal py-0">Completado</Badge>;
      case "En proceso":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-normal py-0">En proceso</Badge>;
      case "Pendiente":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-normal py-0">Pendiente</Badge>;
      case "En riesgo":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-normal py-0">En riesgo</Badge>;
      case "Atrasado":
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-normal py-0">Atrasado</Badge>;
    }
  };

  const getOpinionBadge = (opinion: ClientObligationRow["opinion"]) => {
    switch (opinion) {
      case "Positiva":
        return <span className="text-[11px] text-emerald-600 font-medium">Positiva</span>;
      case "Negativa":
        return <span className="text-[11px] text-rose-600 font-medium">Negativa</span>;
      case "Pendiente":
        return <span className="text-[11px] text-amber-600 font-medium">Pendiente</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Operaciones</span>
            <span>›</span>
            <span className="text-foreground font-medium">Control mensual</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Control mensual</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Seguimiento de contabilidades y obligaciones de tus clientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="h-9 text-xs bg-[#1e3a5f] hover:bg-[#152a45]">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo registro
          </Button>
        </div>
      </div>

      {/* KPI Cards Row (Image 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">186</p>
              <p className="text-[11px] text-muted-foreground font-medium">Clientes del mes</p>
            </div>
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-2">↑ 4.5% vs. mes anterior</p>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">142</p>
              <p className="text-[11px] text-muted-foreground font-medium">Completadas</p>
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
              <div className="bg-emerald-500 h-full w-[76%]" />
            </div>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">76% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">31</p>
              <p className="text-[11px] text-muted-foreground font-medium">En proceso</p>
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
              <div className="bg-blue-500 h-full w-[17%]" />
            </div>
            <p className="text-[10px] text-blue-600 font-medium mt-0.5">17% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">8</p>
              <p className="text-[11px] text-muted-foreground font-medium">En riesgo</p>
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
              <div className="bg-amber-500 h-full w-[4%]" />
            </div>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">4% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">5</p>
              <p className="text-[11px] text-muted-foreground font-medium">Atrasadas</p>
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
              <div className="bg-rose-500 h-full w-[3%]" />
            </div>
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">3% del total</p>
          </div>
        </Card>
      </div>

      {/* Filter Bar (Image 2) */}
      <div className="bg-card p-3 rounded-lg border border-border/80 flex flex-wrap items-center gap-2.5 text-xs">
        <Select defaultValue="Septiembre 2026">
          <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Mes:</span>
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Septiembre 2026">Septiembre 2026</SelectItem>
            <SelectItem value="Agosto 2026">Agosto 2026</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedContador} onValueChange={setSelectedContador}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Contador:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Rodrigo">Rodrigo</SelectItem>
            <SelectItem value="Alejandra">Alejandra</SelectItem>
            <SelectItem value="Rubí">Rubí</SelectItem>
            <SelectItem value="Luis">Luis</SelectItem>
            <SelectItem value="Mariana">Mariana</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedRegimen} onValueChange={setSelectedRegimen}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Régimen:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PM General">PM General</SelectItem>
            <SelectItem value="RESICO">RESICO</SelectItem>
            <SelectItem value="PFAE">PFAE</SelectItem>
            <SelectItem value="PM Coordinados">PM Coordinados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedEstatus} onValueChange={setSelectedEstatus}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Estatus:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Completado">Completado</SelectItem>
            <SelectItem value="En proceso">En proceso</SelectItem>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="En riesgo">En riesgo</SelectItem>
            <SelectItem value="Atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table Card (Image 2) */}
      <Card className="bg-card shadow-xs border-border/80 overflow-hidden">
        <div className="p-3.5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Clientes ({displayRows.length})</h3>
            <p className="text-[11px] text-muted-foreground">Seguimiento mensual de contabilidad y obligaciones</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar en la tabla..."
                className="pl-8 h-8 text-xs bg-muted/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Download className="mr-1 h-3 w-3" /> Exportar
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Upload className="mr-1 h-3 w-3" /> Importar
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] text-muted-foreground bg-muted/20">
                <TableHead className="w-8 py-2.5">
                  <Checkbox className="h-3.5 w-3.5" />
                </TableHead>
                <TableHead className="py-2.5">Cliente</TableHead>
                <TableHead className="py-2.5">RFC</TableHead>
                <TableHead className="py-2.5">Contador</TableHead>
                <TableHead className="py-2.5">Régimen</TableHead>
                <TableHead className="py-2.5 text-center">Papelería</TableHead>
                <TableHead className="py-2.5 text-center">Captura</TableHead>
                <TableHead className="py-2.5 text-center">Cálculo</TableHead>
                <TableHead className="py-2.5 text-center">Presentado</TableHead>
                <TableHead className="py-2.5 text-center">DIOT</TableHead>
                <TableHead className="py-2.5 text-center">E.F.</TableHead>
                <TableHead className="py-2.5 text-center">Opinión</TableHead>
                <TableHead className="py-2.5 text-center">Estatus</TableHead>
                <TableHead className="py-2.5">Últ. act.</TableHead>
                <TableHead className="py-2.5 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {displayRows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/40 cursor-pointer"
                  onClick={() => setSelectedClient(row)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox className="h-3.5 w-3.5" />
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    <div>{row.name}</div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-[11px]">
                    {row.rfc}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.contador}</TableCell>
                  <TableCell className="text-muted-foreground">{row.regimen}</TableCell>
                  <TableCell className="text-center">
                    {row.papeleria ? (
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-rose-100 text-rose-700">
                        <X className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center min-w-[70px]">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-medium text-foreground">{row.captura}%</span>
                      <div className="w-12 bg-muted rounded-full h-1 overflow-hidden mt-0.5">
                        <div
                          className={`h-full ${
                            row.captura === 100
                              ? "bg-emerald-500"
                              : row.captura > 50
                              ? "bg-blue-500"
                              : "bg-muted-foreground"
                          }`}
                          style={{ width: `${row.captura}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {row.calculo ? (
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.presentado ? (
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.diot ? (
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.ef ? (
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {getOpinionBadge(row.opinion)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getEstatusBadge(row.estatus)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">
                    {row.ultAct}
                  </TableCell>
                  <TableCell className="text-right py-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>Mostrando 1-10 de 186 clientes</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button size="icon" className="h-7 w-7 text-xs bg-[#1e3a5f]">1</Button>
            <Button variant="outline" size="icon" className="h-7 w-7 text-xs">2</Button>
            <Button variant="outline" size="icon" className="h-7 w-7 text-xs">3</Button>
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Client Detail Dialog / Ficha de Control Mensual (Image 3) */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          {selectedClient && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">{selectedClient.name}</h2>
                    {getEstatusBadge(selectedClient.estatus)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedClient.rfc} | {selectedClient.persona} | {selectedClient.regimen} | Contador: {selectedClient.contador}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Share2 className="mr-1.5 h-3.5 w-3.5" /> Compartir
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    Más acciones
                  </Button>
                </div>
              </div>

              {/* Quick Info Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-muted/20 rounded-lg border text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">RFC</span>
                  <span className="font-semibold text-foreground font-mono">{selectedClient.rfc}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Régimen fiscal</span>
                  <span className="font-semibold text-foreground">{selectedClient.regimen}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Contador asignado</span>
                  <span className="font-semibold text-foreground">{selectedClient.contador}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Correo</span>
                  <span className="font-medium text-foreground truncate block">{selectedClient.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Teléfono</span>
                  <span className="font-medium text-foreground">{selectedClient.telefono}</span>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="resumen">
                <TabsList className="bg-muted/40 h-8">
                  <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
                  <TabsTrigger value="contabilidad" className="text-xs">Contabilidad</TabsTrigger>
                  <TabsTrigger value="obligaciones" className="text-xs">Obligaciones</TabsTrigger>
                  <TabsTrigger value="documentos" className="text-xs">Documentos</TabsTrigger>
                  <TabsTrigger value="facturacion" className="text-xs">Facturación</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="pt-4 space-y-6">
                  {/* Avance de Contabilidad */}
                  <Card className="p-4 border-border/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold text-foreground">Avance de contabilidad - Septiembre 2026</h4>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        Mes completado (100%)
                      </Badge>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-[11px] text-muted-foreground bg-muted/20">
                            <TableHead className="py-2">Etapa</TableHead>
                            <TableHead className="py-2">Estatus</TableHead>
                            <TableHead className="py-2">Fecha objetivo</TableHead>
                            <TableHead className="py-2">Fecha completada</TableHead>
                            <TableHead className="py-2">Responsable</TableHead>
                            <TableHead className="py-2">Comentarios</TableHead>
                            <TableHead className="py-2 text-right">Docs</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          <TableRow>
                            <TableCell className="font-medium">› 1. Papelería</TableCell>
                            <TableCell><span className="text-emerald-600 font-medium">✓ Completado</span></TableCell>
                            <TableCell className="text-muted-foreground">01 Sep 2026</TableCell>
                            <TableCell className="text-muted-foreground">29 Ago 2026</TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                            <TableCell className="text-muted-foreground">Recibida completa</TableCell>
                            <TableCell className="text-right text-muted-foreground">3 docs</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">› 2. Captura contable</TableCell>
                            <TableCell><span className="text-emerald-600 font-medium">✓ Completado</span></TableCell>
                            <TableCell className="text-muted-foreground">05 Sep 2026</TableCell>
                            <TableCell className="text-muted-foreground">03 Sep 2026</TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                            <TableCell className="text-muted-foreground">Sin observaciones</TableCell>
                            <TableCell className="text-right text-muted-foreground">2 docs</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">› 3. Cálculo de impuestos</TableCell>
                            <TableCell><span className="text-emerald-600 font-medium">✓ Completado</span></TableCell>
                            <TableCell className="text-muted-foreground">08 Sep 2026</TableCell>
                            <TableCell className="text-muted-foreground">07 Sep 2026</TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                            <TableCell className="text-muted-foreground">ISR e IVA calculados</TableCell>
                            <TableCell className="text-right text-muted-foreground">2 docs</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">› 4. Revisión</TableCell>
                            <TableCell><span className="text-emerald-600 font-medium">✓ Completado</span></TableCell>
                            <TableCell className="text-muted-foreground">08 Sep 2026</TableCell>
                            <TableCell className="text-muted-foreground">07 Sep 2026</TableCell>
                            <TableCell>Alejandra</TableCell>
                            <TableCell className="text-muted-foreground">Revisado y validado</TableCell>
                            <TableCell className="text-right text-muted-foreground">1 doc</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">› 5. Presentación</TableCell>
                            <TableCell><span className="text-emerald-600 font-medium">✓ Completado</span></TableCell>
                            <TableCell className="text-muted-foreground">10 Sep 2026</TableCell>
                            <TableCell className="text-muted-foreground">08 Sep 2026</TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                            <TableCell className="text-muted-foreground">Acuses en sistema</TableCell>
                            <TableCell className="text-right text-muted-foreground">4 docs</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">› 6. DIOT</TableCell>
                            <TableCell><span className="text-emerald-600 font-medium">✓ Completado</span></TableCell>
                            <TableCell className="text-muted-foreground">12 Sep 2026</TableCell>
                            <TableCell className="text-muted-foreground">11 Sep 2026</TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                            <TableCell className="text-muted-foreground">Presentada</TableCell>
                            <TableCell className="text-right text-muted-foreground">1 doc</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">› 7. Estados financieros</TableCell>
                            <TableCell><span className="text-emerald-600 font-medium">✓ Completado</span></TableCell>
                            <TableCell className="text-muted-foreground">12 Sep 2026</TableCell>
                            <TableCell className="text-muted-foreground">11 Sep 2026</TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                            <TableCell className="text-muted-foreground">Enviados al cliente</TableCell>
                            <TableCell className="text-right text-muted-foreground">2 docs</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">› 8. Opinión de cumplimiento</TableCell>
                            <TableCell><span className="text-emerald-600 font-medium">✓ Completado</span></TableCell>
                            <TableCell className="text-muted-foreground">15 Sep 2026</TableCell>
                            <TableCell className="text-muted-foreground">12 Sep 2026</TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                            <TableCell className="text-muted-foreground">Positiva</TableCell>
                            <TableCell className="text-right text-muted-foreground">1 doc</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </Card>

                  {/* Grid 2 Cols: Comentarios & Información */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4 border-border/80 shadow-xs space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold text-foreground">Comentarios del contador</h4>
                      </div>
                      <div className="p-3 bg-muted/20 rounded border text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{selectedClient.contador}</span>
                          <span className="text-[10px] text-muted-foreground">08 Sep 2026 14:32</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          Se terminó la contabilidad de septiembre sin observaciones. Se presentaron declaraciones y DIOT correctamente. Opinión de cumplimiento positiva. Se enviaron estados financieros al cliente.
                        </p>
                      </div>
                    </Card>

                    <Card className="p-4 border-border/80 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <h4 className="text-sm font-bold text-foreground">Servicios contratados</h4>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Edit className="h-3 w-3 mr-1" /> Editar
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" /> Contabilidad
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" /> Declaraciones
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" /> DIOT
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" /> Estados financieros
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" /> Facturación
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" /> Asesoría fiscal
                        </div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
