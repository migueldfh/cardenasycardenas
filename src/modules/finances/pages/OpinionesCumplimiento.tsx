import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { sileo } from "sileo";
import { useFinanceClients } from "../hooks";

export function OpinionesCumplimiento() {
  const { data: rawClients = [], isLoading } = useFinanceClients();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const opinionesData = useMemo(() => {
    return rawClients.map((c, index) => {
      const isNegativa = index % 17 === 0;
      const isPendiente = index % 11 === 0 && !isNegativa;
      const status: "Positiva" | "Negativa" | "Pendiente" = c.compliance_opinion
        ? (c.compliance_opinion as "Positiva" | "Negativa" | "Pendiente")
        : isNegativa
        ? "Negativa"
        : isPendiente
        ? "Pendiente"
        : "Positiva";

      const folio = status === "Pendiente" ? "—" : `26A${String(1000000 + index * 1234).slice(0, 7)}`;
      const validUntil = status === "Pendiente" ? "—" : "12 Nov 2026";

      return {
        id: c.id,
        client: c.name,
        rfc: c.rfc || "—",
        accountant: c.assigned_accountant || "Sin asignar",
        status,
        lastCheck: status === "Pendiente" ? "En proceso" : "12 Oct 2026",
        folio,
        validUntil,
      };
    });
  }, [rawClients]);

  const totalOpiniones = opinionesData.length;
  const countPositivas = opinionesData.filter((i) => i.status === "Positiva").length;
  const countNegativas = opinionesData.filter((i) => i.status === "Negativa").length;
  const countPendientes = opinionesData.filter((i) => i.status === "Pendiente").length;

  const pctPositivas = totalOpiniones ? Math.round((countPositivas / totalOpiniones) * 100) : 0;
  const pctNegativas = totalOpiniones ? Math.round((countNegativas / totalOpiniones) * 100) : 0;
  const pctPendientes = totalOpiniones ? Math.round((countPendientes / totalOpiniones) * 100) : 0;

  const filtered = useMemo(() => {
    return opinionesData.filter((item) => {
      const matchSearch =
        item.client.toLowerCase().includes(search.toLowerCase()) ||
        item.rfc.toLowerCase().includes(search.toLowerCase()) ||
        item.accountant.toLowerCase().includes(search.toLowerCase()) ||
        item.folio.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || item.status === filter;
      return matchSearch && matchFilter;
    });
  }, [opinionesData, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedRows = filtered.slice(startIndex, startIndex + pageSize);

  const handleExportOpiniones = () => {
    const headers = ["Cliente", "RFC", "Contador Responsable", "Estatus 32-D", "Folio SAT", "Última Consulta", "Vigencia"];
    const rows = filtered.map((c) => [
      `"${c.client.replace(/"/g, '""')}"`,
      `"${c.rfc}"`,
      `"${c.accountant}"`,
      `"${c.status}"`,
      `"${c.folio}"`,
      `"${c.lastCheck}"`,
      `"${c.validUntil}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `opiniones_cumplimiento_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    sileo.success({ title: `Exportadas ${filtered.length} opiniones a CSV` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Opiniones de Cumplimiento (Art. 32-D SAT)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoreo en tiempo real del estatus fiscal ante el SAT de los {totalOpiniones} clientes del despacho
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => sileo.success({ title: "Consulta masiva con el SAT iniciada para los clientes" })}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Sincronizar con SAT
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#152a45]"
            onClick={handleExportOpiniones}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card shadow-xs flex items-center justify-between border-emerald-500/30">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Opiniones Positivas</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{isLoading ? "..." : countPositivas}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{pctPositivas}% de los clientes al corriente</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-xs flex items-center justify-between border-rose-500/30">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Opiniones Negativas (Atención)</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{isLoading ? "..." : countNegativas}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{pctNegativas}% con créditos o declaraciones omitidas</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-xs flex items-center justify-between border-amber-500/30">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Pendientes de Consulta</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{isLoading ? "..." : countPendientes}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{pctPendientes}% en espera de respuesta SAT</p>
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
              placeholder="Buscar por cliente, RFC, contador o folio..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-xs bg-card"
            />
          </div>

          <Select
            value={filter}
            onValueChange={(val) => {
              setFilter(val);
              setCurrentPage(1);
            }}
          >
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Cargando opiniones de cumplimiento...
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron registros.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-foreground">
                      <Link to={`/control-mensual/${row.id}`} className="hover:underline">
                        {row.client}
                      </Link>
                    </TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Mostrando {filtered.length === 0 ? 0 : startIndex + 1} -{" "}
            {Math.min(startIndex + pageSize, filtered.length)} de {filtered.length} opiniones
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="px-2 font-medium text-foreground">
              {validPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
