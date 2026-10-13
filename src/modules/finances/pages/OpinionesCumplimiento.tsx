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
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  RefreshCw,
} from "lucide-react";
import { sileo } from "sileo";

export function OpinionesCumplimiento() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const opinionesData = [
    {
      id: "1",
      client: "Solupatch S.A. de C.V.",
      rfc: "SOL220101ABC",
      accountant: "Rodrigo Martínez",
      status: "Positiva",
      lastCheck: "12 Sep 2026",
      folio: "26A0982312",
      validUntil: "12 Oct 2026",
    },
    {
      id: "2",
      client: "Comercial del Norte S.A. de C.V.",
      rfc: "CON180315XYZ",
      accountant: "Alejandra Torres",
      status: "Positiva",
      lastCheck: "08 Sep 2026",
      folio: "26A0978901",
      validUntil: "08 Oct 2026",
    },
    {
      id: "3",
      client: "Grupo Industrial MX S. de R.L.",
      rfc: "GIM150620KL9",
      accountant: "Rubí Jiménez",
      status: "Negativa",
      lastCheck: "07 Sep 2026",
      folio: "26A0965412",
      validUntil: "07 Oct 2026",
    },
    {
      id: "4",
      client: "Servicios Profesionales S.C.",
      rfc: "SPR190101QW1",
      accountant: "Luis Ramírez",
      status: "Positiva",
      lastCheck: "08 Sep 2026",
      folio: "26A0971234",
      validUntil: "08 Oct 2026",
    },
    {
      id: "5",
      client: "Empresa ABC S.A. de C.V.",
      rfc: "ABC210101RT8",
      accountant: "Mariana López",
      status: "Positiva",
      lastCheck: "08 Sep 2026",
      folio: "26A0974567",
      validUntil: "08 Oct 2026",
    },
    {
      id: "6",
      client: "Construcciones Delta S.A.",
      rfc: "CDE171010MN4",
      accountant: "Rodrigo Martínez",
      status: "Pendiente",
      lastCheck: "06 Sep 2026",
      folio: "—",
      validUntil: "—",
    },
    {
      id: "7",
      client: "Logística del Bajío S.A. de C.V.",
      rfc: "LBA210709PL2",
      accountant: "Alejandra Torres",
      status: "Negativa",
      lastCheck: "05 Sep 2026",
      folio: "26A0958741",
      validUntil: "05 Oct 2026",
    },
    {
      id: "8",
      client: "Consultoría Integral S.C.",
      rfc: "CIN200120AS9",
      accountant: "Luis Ramírez",
      status: "Positiva",
      lastCheck: "08 Sep 2026",
      folio: "26A0973322",
      validUntil: "08 Oct 2026",
    },
    {
      id: "9",
      client: "Inversiones Monterrey S.A.",
      rfc: "IMO160405ZX1",
      accountant: "Rubí Jiménez",
      status: "Pendiente",
      lastCheck: "07 Sep 2026",
      folio: "—",
      validUntil: "—",
    },
  ];

  const filtered = opinionesData.filter((item) => {
    const matchSearch =
      item.client.toLowerCase().includes(search.toLowerCase()) ||
      item.rfc.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || item.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Opiniones de Cumplimiento (Art. 32-D SAT)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoreo en tiempo real del estatus fiscal ante el SAT de todos los clientes del despacho
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => sileo.success({ title: "Consulta masiva con el SAT iniciada" })}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Sincronizar con SAT
          </Button>
          <Button size="sm" className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#152a45]">
            <Download className="h-3.5 w-3.5 mr-1" /> Descargar Acuses (ZIP)
          </Button>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card shadow-xs flex items-center justify-between border-emerald-500/30">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Opiniones Positivas</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">158</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">85% de los clientes al corriente</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-xs flex items-center justify-between border-rose-500/30">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Opiniones Negativas (Atención)</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">12</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">6% con créditos o créditos fiscales</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-xs flex items-center justify-between border-amber-500/30">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Pendientes de Consulta</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">16</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">9% en espera de respuesta SAT</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card className="border-border/80 shadow-xs">
        <div className="p-3 bg-muted/20 border-b border-border/60 flex flex-wrap items-center gap-2.5 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, RFC o folio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-card"
            />
          </div>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-card">
              <span className="text-muted-foreground mr-1">Estatus:</span>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Positiva">Positiva</SelectItem>
              <SelectItem value="Negativa">Negativa</SelectItem>
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
                <TableHead className="py-2.5">Contador Responsable</TableHead>
                <TableHead className="py-2.5 text-center">Estatus 32-D</TableHead>
                <TableHead className="py-2.5">Folio SAT</TableHead>
                <TableHead className="py-2.5">Última Consulta</TableHead>
                <TableHead className="py-2.5">Vigencia</TableHead>
                <TableHead className="py-2.5 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filtered.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold text-foreground">{row.client}</TableCell>
                  <TableCell className="font-mono text-[11px]">{row.rfc}</TableCell>
                  <TableCell>{row.accountant}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        row.status === "Positiva"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : row.status === "Negativa"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {row.folio}
                  </TableCell>
                  <TableCell>{row.lastCheck}</TableCell>
                  <TableCell className="text-muted-foreground">{row.validUntil}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary gap-1"
                      onClick={() => sileo.success({ title: `Acuse de ${row.client} descargado` })}
                    >
                      <Download className="h-3 w-3" /> Ver Acuse
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
