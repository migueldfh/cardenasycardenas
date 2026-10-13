import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Upload,
  MoreVertical,
} from "lucide-react";

export function Contabilidades() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const contabilidadesList = [
    {
      id: "1",
      client: "Solupatch S.A. de C.V.",
      rfc: "SOL220101ABC",
      accountant: "Rodrigo Martínez",
      month: "Septiembre 2026",
      capture: 100,
      isrTax: "$48,500",
      ivaTax: "$22,100",
      status: "Completada",
      deliveredAt: "08 Sep 2026",
    },
    {
      id: "2",
      client: "Comercial del Norte S.A. de C.V.",
      rfc: "CON180315XYZ",
      accountant: "Alejandra Torres",
      month: "Septiembre 2026",
      capture: 80,
      isrTax: "$18,200",
      ivaTax: "$9,400",
      status: "En proceso",
      deliveredAt: "Pendiente",
    },
    {
      id: "3",
      client: "Grupo Industrial MX S. de R.L.",
      rfc: "GIM150620KL9",
      accountant: "Rubí Jiménez",
      month: "Septiembre 2026",
      capture: 0,
      isrTax: "—",
      ivaTax: "—",
      status: "Pendiente",
      deliveredAt: "Sin papelería",
    },
    {
      id: "4",
      client: "Servicios Profesionales S.C.",
      rfc: "SPR190101QW1",
      accountant: "Luis Ramírez",
      month: "Septiembre 2026",
      capture: 60,
      isrTax: "$31,400",
      ivaTax: "$14,000",
      status: "En riesgo",
      deliveredAt: "En revisión",
    },
    {
      id: "5",
      client: "Empresa ABC S.A. de C.V.",
      rfc: "ABC210101RT8",
      accountant: "Mariana López",
      month: "Septiembre 2026",
      capture: 100,
      isrTax: "$62,000",
      ivaTax: "$29,500",
      status: "Completada",
      deliveredAt: "08 Sep 2026",
    },
    {
      id: "6",
      client: "Consultoría Integral S.C.",
      rfc: "CIN200120AS9",
      accountant: "Luis Ramírez",
      month: "Septiembre 2026",
      capture: 90,
      isrTax: "$12,800",
      ivaTax: "$6,200",
      status: "En proceso",
      deliveredAt: "En revisión",
    },
  ];

  const filtered = contabilidadesList.filter((item) => {
    const matchSearch =
      item.client.toLowerCase().includes(search.toLowerCase()) ||
      item.rfc.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contabilidades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Supervisión y control de capturas, balanzas y cálculos fiscales mensuales
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> Exportar Balanzas
          </Button>
          <Button size="sm" className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#152a45]">
            <Upload className="h-3.5 w-3.5 mr-1" /> Importar Pólizas
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold">186</p>
              <p className="text-[11px] text-muted-foreground">Contabilidades activas</p>
            </div>
          </div>
        </Card>
        <Card className="bg-card shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold">142</p>
              <p className="text-[11px] text-muted-foreground">Cálculos terminados</p>
            </div>
          </div>
        </Card>
        <Card className="bg-card shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold">31</p>
              <p className="text-[11px] text-muted-foreground">En proceso de captura</p>
            </div>
          </div>
        </Card>
        <Card className="bg-card shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold">13</p>
              <p className="text-[11px] text-muted-foreground">En riesgo / Atrasadas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card className="border-border/80 shadow-xs">
        <div className="p-3 bg-muted/20 border-b border-border/60 flex flex-wrap items-center gap-2.5 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente o RFC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-card"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-card">
              <span className="text-muted-foreground mr-1">Estatus:</span>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Completada">Completada</SelectItem>
              <SelectItem value="En proceso">En proceso</SelectItem>
              <SelectItem value="En riesgo">En riesgo</SelectItem>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 text-[11px] text-muted-foreground hover:bg-muted/30">
                <TableHead className="py-2.5">Cliente</TableHead>
                <TableHead className="py-2.5">RFC</TableHead>
                <TableHead className="py-2.5">Contador</TableHead>
                <TableHead className="py-2.5">Mes Fiscal</TableHead>
                <TableHead className="py-2.5 text-center">Avance Captura</TableHead>
                <TableHead className="py-2.5 text-right">ISR Provisional</TableHead>
                <TableHead className="py-2.5 text-right">IVA Causado</TableHead>
                <TableHead className="py-2.5 text-center">Estatus</TableHead>
                <TableHead className="py-2.5 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filtered.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold text-foreground">{row.client}</TableCell>
                  <TableCell className="font-mono text-[11px]">{row.rfc}</TableCell>
                  <TableCell>{row.accountant}</TableCell>
                  <TableCell>{row.month}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-bold text-[11px] w-8">{row.capture}%</span>
                      <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${
                            row.capture === 100
                              ? "bg-emerald-500"
                              : row.capture > 50
                              ? "bg-blue-500"
                              : "bg-muted-foreground"
                          }`}
                          style={{ width: `${row.capture}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">{row.isrTax}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{row.ivaTax}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        row.status === "Completada"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : row.status === "En proceso"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : row.status === "En riesgo"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
