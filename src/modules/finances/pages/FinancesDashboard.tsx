import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  Users,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Calendar,
  ChevronRight,
  MoreVertical,
  Check,
  X,
  Lock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  UserX,
  FileSpreadsheet,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useFinancialStats } from "../hooks";

// Mock data for the historical trend chart (Jan to Sep)
const trendData = [
  { month: "Ene", completadas: 40, enProceso: 20, atrasadas: 2 },
  { month: "Feb", completadas: 55, enProceso: 22, atrasadas: 3 },
  { month: "Mar", completadas: 70, enProceso: 25, atrasadas: 4 },
  { month: "Abr", completadas: 85, enProceso: 27, atrasadas: 3 },
  { month: "May", completadas: 100, enProceso: 28, atrasadas: 4 },
  { month: "Jun", completadas: 115, enProceso: 30, atrasadas: 5 },
  { month: "Jul", completadas: 125, enProceso: 29, atrasadas: 4 },
  { month: "Ago", completadas: 138, enProceso: 30, atrasadas: 5 },
  { month: "Sep", completadas: 142, enProceso: 31, atrasadas: 5 },
];

// Donut data for paperwork and monthly stages
const donutData = [
  { name: "Papelería recibida", value: 160, color: "#1e3a8a" },
  { name: "Pendiente de papelería", value: 26, color: "#93c5fd" },
];

export function FinancesDashboard() {
  const { data: stats } = useFinancialStats();
  const [selectedMonth, setSelectedMonth] = useState("Septiembre 2026");

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalCollected = stats?.ingresosTotales || 241800;
  const totalReceivable = stats?.cuentasPorPagarMonto || 84500;

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inicio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumen general del despacho
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes, documentos, facturas..."
              className="pl-9 h-9 text-xs bg-card"
            />
          </div>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] h-9 text-xs bg-card">
              <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Septiembre 2026">Septiembre 2026</SelectItem>
              <SelectItem value="Agosto 2026">Agosto 2026</SelectItem>
              <SelectItem value="Julio 2026">Julio 2026</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" className="h-9 text-xs bg-[#1e3a5f] hover:bg-[#152a45]" asChild>
            <Link to="/finances/control-mensual">
              Control Mensual
            </Link>
          </Button>
        </div>
      </div>

      {/* Row 1: 6 Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Clientes activos */}
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Clientes activos</p>
              <p className="text-xl font-bold text-foreground leading-tight">186</p>
            </div>
          </div>
          <div className="mt-2.5 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <span>↑ 4.5%</span> <span className="text-muted-foreground font-normal">vs. mes anterior</span>
          </div>
        </Card>

        {/* Card 2: Contabilidades del mes */}
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Contabilidades del mes</p>
              <p className="text-xl font-bold text-foreground leading-tight">186</p>
            </div>
          </div>
          <div className="mt-2.5 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <span>↑ 8.2%</span> <span className="text-muted-foreground font-normal">vs. mes anterior</span>
          </div>
        </Card>

        {/* Card 3: Completadas */}
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Completadas</p>
              <p className="text-xl font-bold text-foreground leading-tight">142</p>
            </div>
          </div>
          <div className="mt-2.5">
            <Progress value={76} indicatorClassName="bg-emerald-500" className="h-1.5" />
            <p className="text-[11px] text-emerald-600 font-medium mt-1">76% <span className="text-muted-foreground font-normal">del total</span></p>
          </div>
        </Card>

        {/* Card 4: En proceso */}
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">En proceso</p>
              <p className="text-xl font-bold text-foreground leading-tight">31</p>
            </div>
          </div>
          <div className="mt-2.5">
            <Progress value={17} indicatorClassName="bg-blue-500" className="h-1.5" />
            <p className="text-[11px] text-blue-600 font-medium mt-1">17% <span className="text-muted-foreground font-normal">del total</span></p>
          </div>
        </Card>

        {/* Card 5: En riesgo */}
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">En riesgo</p>
              <p className="text-xl font-bold text-foreground leading-tight">8</p>
            </div>
          </div>
          <div className="mt-2.5">
            <Progress value={4} indicatorClassName="bg-amber-500" className="h-1.5" />
            <p className="text-[11px] text-amber-600 font-medium mt-1">4% <span className="text-muted-foreground font-normal">del total</span></p>
          </div>
        </Card>

        {/* Card 6: Atrasadas */}
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Atrasadas</p>
              <p className="text-xl font-bold text-foreground leading-tight">5</p>
            </div>
          </div>
          <div className="mt-2.5">
            <Progress value={3} indicatorClassName="bg-rose-500" className="h-1.5" />
            <p className="text-[11px] text-rose-600 font-medium mt-1">3% <span className="text-muted-foreground font-normal">del total</span></p>
          </div>
        </Card>
      </div>

      {/* Row 2: Charts and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Estatus de contabilidades Line/Area chart */}
        <Card className="lg:col-span-5 bg-card shadow-xs border-border/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-foreground">Estatus de contabilidades</h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-600" /> Completadas
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-400" /> En proceso
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Atrasadas
              </span>
            </div>
          </div>
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompletadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip />
                <Area type="monotone" dataKey="completadas" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorCompletadas)" />
                <Area type="monotone" dataKey="enProceso" stroke="#38bdf8" strokeWidth={2} fillOpacity={0} />
                <Area type="monotone" dataKey="atrasadas" stroke="#f43f5e" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Middle: Papelería y procesos del mes */}
        <Card className="lg:col-span-4 bg-card shadow-xs border-border/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Papelería y procesos del mes</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Donut with center text */}
            <div className="sm:col-span-5 h-[170px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-lg font-bold text-foreground leading-tight">186</span>
                <span className="text-[10px] text-muted-foreground">clientes</span>
              </div>
            </div>

            {/* List breakdown */}
            <div className="sm:col-span-7 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1e3a8a]" /> Papelería recibida
                </span>
                <span className="font-semibold text-foreground">160 <span className="text-[10px] font-normal text-muted-foreground">86%</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#93c5fd]" /> Pendiente de papelería
                </span>
                <span className="font-semibold text-foreground">26 <span className="text-[10px] font-normal text-muted-foreground">14%</span></span>
              </div>
              <div className="h-px bg-border/50 my-1" />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Capturas terminadas
                </span>
                <span className="font-semibold text-foreground">142 <span className="text-[10px] font-normal text-muted-foreground">76%</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Cálculos terminados
                </span>
                <span className="font-semibold text-foreground">138 <span className="text-[10px] font-normal text-muted-foreground">74%</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Declaraciones pres.
                </span>
                <span className="font-semibold text-foreground">130 <span className="text-[10px] font-normal text-muted-foreground">70%</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> DIOT presentadas
                </span>
                <span className="font-semibold text-foreground">125 <span className="text-[10px] font-normal text-muted-foreground">67%</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Estados financieros
                </span>
                <span className="font-semibold text-foreground">120 <span className="text-[10px] font-normal text-muted-foreground">65%</span></span>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Stack: Opiniones de cumplimiento + Cobranza */}
        <div className="lg:col-span-3 space-y-3">
          {/* Card: Opiniones de cumplimiento */}
          <Card className="bg-card shadow-xs border-border/80 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-semibold text-foreground">Opiniones de cumplimiento</h3>
              </div>
              <Link to="/finances/control-mensual" className="text-[11px] text-blue-600 hover:underline">
                Ver todas →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div>
                <p className="text-lg font-bold text-foreground">158</p>
                <p className="text-[10px] text-emerald-600 font-medium">Positivas</p>
                <Progress value={85} indicatorClassName="bg-emerald-500" className="h-1 mt-1" />
                <span className="text-[9px] text-muted-foreground">85%</span>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">12</p>
                <p className="text-[10px] text-rose-600 font-medium">Negativas</p>
                <Progress value={6} indicatorClassName="bg-rose-500" className="h-1 mt-1" />
                <span className="text-[9px] text-muted-foreground">6%</span>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">16</p>
                <p className="text-[10px] text-amber-600 font-medium">Pendientes</p>
                <Progress value={9} indicatorClassName="bg-amber-500" className="h-1 mt-1" />
                <span className="text-[9px] text-muted-foreground">9%</span>
              </div>
            </div>
          </Card>

          {/* Card: Cobranza */}
          <Card className="bg-card shadow-xs border-border/80 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-semibold text-foreground">Cobranza</h3>
              </div>
              <Link to="/finances/cuentas-por-cobrar" className="text-[11px] text-blue-600 hover:underline">
                Ver más →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <p className="text-base font-bold text-foreground leading-tight">
                  {formatCurrency(totalCollected)}
                </p>
                <p className="text-[10px] text-muted-foreground">Cobrado este mes</p>
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5 mt-0.5">
                  <ArrowUpRight className="h-3 w-3" /> 12.4%
                </span>
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-tight">
                  {formatCurrency(totalReceivable)}
                </p>
                <p className="text-[10px] text-muted-foreground">Por cobrar</p>
                <span className="text-[10px] text-rose-600 font-medium flex items-center gap-0.5 mt-0.5">
                  <ArrowDownRight className="h-3 w-3" /> 8.1%
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Row 3: Clientes con actividad reciente + Requiere tu atención */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Clientes con actividad reciente */}
        <Card className="lg:col-span-8 bg-card shadow-xs border-border/80 overflow-hidden">
          <div className="p-4 pb-2 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-foreground">Clientes con actividad reciente</h3>
            </div>
            <Link to="/finances/control-mensual" className="text-xs text-blue-600 hover:underline">
              Ver todos →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] text-muted-foreground bg-muted/30">
                  <TableHead className="py-2.5">Cliente</TableHead>
                  <TableHead className="py-2.5">Contador asignado</TableHead>
                  <TableHead className="py-2.5 text-center">Papelería</TableHead>
                  <TableHead className="py-2.5 text-center">Captura</TableHead>
                  <TableHead className="py-2.5 text-center">Impuestos</TableHead>
                  <TableHead className="py-2.5 text-center">Presentado</TableHead>
                  <TableHead className="py-2.5 text-center">DIOT</TableHead>
                  <TableHead className="py-2.5 text-center">EF</TableHead>
                  <TableHead className="py-2.5 text-center">Estatus</TableHead>
                  <TableHead className="py-2.5 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {/* Row 1 */}
                <TableRow className="hover:bg-muted/40">
                  <TableCell className="font-semibold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full border border-blue-600" />
                    Solupatch
                  </TableCell>
                  <TableCell className="text-muted-foreground">Rodrigo</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[11px] font-medium text-emerald-600">100%</span>
                  </TableCell>
                  <TableCell className="text-center text-emerald-600">✓</TableCell>
                  <TableCell className="text-center text-emerald-600">✓</TableCell>
                  <TableCell className="text-center text-emerald-600">✓</TableCell>
                  <TableCell className="text-center text-emerald-600">✓</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal py-0">
                      Completado
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Row 2 */}
                <TableRow className="hover:bg-muted/40">
                  <TableCell className="font-semibold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full border border-blue-600" />
                    Comercial del Norte
                  </TableCell>
                  <TableCell className="text-muted-foreground">Alejandra</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[11px] font-medium text-blue-600">80%</span>
                  </TableCell>
                  <TableCell className="text-center text-emerald-600">✓</TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-normal py-0">
                      En proceso
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Row 3 */}
                <TableRow className="hover:bg-muted/40">
                  <TableCell className="font-semibold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full border border-blue-600" />
                    Grupo Industrial MX
                  </TableCell>
                  <TableCell className="text-muted-foreground">Rubí</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-rose-100 text-rose-700">
                      <X className="h-2.5 w-2.5" />
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[11px] font-medium text-muted-foreground">0%</span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-normal py-0">
                      Pendiente
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Row 4 */}
                <TableRow className="hover:bg-muted/40">
                  <TableCell className="font-semibold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full border border-blue-600" />
                    Servicios Profesionales
                  </TableCell>
                  <TableCell className="text-muted-foreground">Luis</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[11px] font-medium text-amber-600">60%</span>
                  </TableCell>
                  <TableCell className="text-center text-emerald-600">✓</TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-normal py-0">
                      En riesgo
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Row 5 */}
                <TableRow className="hover:bg-muted/40">
                  <TableCell className="font-semibold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full border border-blue-600" />
                    Empresa ABC
                  </TableCell>
                  <TableCell className="text-muted-foreground">Mariana</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[11px] font-medium text-emerald-600">100%</span>
                  </TableCell>
                  <TableCell className="text-center text-emerald-600">✓</TableCell>
                  <TableCell className="text-center text-emerald-600">✓</TableCell>
                  <TableCell className="text-center text-emerald-600">✓</TableCell>
                  <TableCell className="text-center text-emerald-600">✓</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal py-0">
                      Completado
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Right: Requiere tu atención */}
        <Card className="lg:col-span-4 bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Requiere tu atención</h3>
              </div>
              <Link to="/finances/control-mensual" className="text-xs text-blue-600 hover:underline">
                Ver todas →
              </Link>
            </div>

            <div className="space-y-2">
              <Link
                to="/finances/control-mensual"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <UserX className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    <strong className="text-rose-600">8</strong> clientes no han enviado papelería
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                to="/finances/control-mensual"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    <strong className="text-rose-600">5</strong> contabilidades atrasadas
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                to="/finances/control-mensual"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <XCircle className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    <strong className="text-rose-600">12</strong> opiniones negativas
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                to="/finances/cuentas-por-cobrar"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    <strong className="text-purple-600">3</strong> facturas por cobrar (más de 30 días)
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                to="/finances/control-mensual"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    <strong className="text-blue-600">4</strong> vencimientos de e.firma (próx. 15 días)
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 4: Actividad reciente Ticker */}
      <Card className="bg-card shadow-xs border-border/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Actividad reciente</h3>
          </div>
          <Link to="/finances/reportes" className="text-xs text-blue-600 hover:underline">
            Ver toda la actividad →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="flex items-start gap-2.5 p-2 rounded border border-border/40 bg-muted/20">
            <div className="h-7 w-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">10:24</span>
              <p className="text-xs font-medium text-foreground leading-tight">Papelería recibida</p>
              <span className="text-[11px] text-muted-foreground">Solupatch</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2 rounded border border-border/40 bg-muted/20">
            <div className="h-7 w-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">09:15</span>
              <p className="text-xs font-medium text-foreground leading-tight">Contabilidad actualizada</p>
              <span className="text-[11px] text-muted-foreground">Comercial del Norte</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2 rounded border border-border/40 bg-muted/20">
            <div className="h-7 w-7 rounded bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Ayer 17:42</span>
              <p className="text-xs font-medium text-foreground leading-tight">Opinión consultada</p>
              <span className="text-[11px] text-muted-foreground">Grupo Industrial MX</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2 rounded border border-border/40 bg-muted/20">
            <div className="h-7 w-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Ayer 12:31</span>
              <p className="text-xs font-medium text-foreground leading-tight">Factura emitida</p>
              <span className="text-[11px] text-muted-foreground">Servicios Profesionales</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2 rounded border border-border/40 bg-muted/20">
            <div className="h-7 w-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Ayer 10:18</span>
              <p className="text-xs font-medium text-foreground leading-tight">Nuevo cliente reg.</p>
              <span className="text-[11px] text-muted-foreground">Constructora Delta</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
