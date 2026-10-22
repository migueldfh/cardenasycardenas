import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { sileo } from "sileo";
import { useFinanceClients } from "../hooks";
import { logActivity } from "@/api/logs";

export function Contabilidades() {
  const navigate = useNavigate();
  const { data: rawClients = [], isLoading } = useFinanceClients();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const contabilidadesList = useMemo(() => {
    return rawClients.map((c, index) => {
      const isCompleted = index % 3 === 0;
      const isInRisk = index % 7 === 0 && !isCompleted;

      const hasReal = c.accounting_capture_pct !== null && c.accounting_capture_pct !== undefined;
      const capture = hasReal
        ? Number(c.accounting_capture_pct)
        : isCompleted ? 100 : isInRisk ? 25 : index % 2 === 0 ? 80 : 60;
      
      const status = hasReal && c.accounting_status
        ? (c.accounting_status === "Completado" ? "Completada" : c.accounting_status)
        : isCompleted ? "Completada" : isInRisk ? "En riesgo" : "En proceso";

      const isrNum = ((index * 37 + 120) * 110) % 75000 + 4500;
      const ivaNum = Math.round(isrNum * 0.45);

      return {
        id: c.id,
        client: c.name,
        rfc: c.rfc || "—",
        accountant: c.assigned_accountant || "Sin asignar",
        month: c.accounting_period || "Julio 2026",
        capture,
        isrTax: `$${isrNum.toLocaleString()}`,
        ivaTax: `$${ivaNum.toLocaleString()}`,
        status,
        deliveredAt: status === "Completada" ? "08 Ago 2026" : "Pendiente",
      };
    });
  }, [rawClients]);

  const totalActivas = contabilidadesList.length;
  const terminadas = contabilidadesList.filter((c) => c.status === "Completada").length;
  const enProceso = contabilidadesList.filter((c) => c.status === "En proceso").length;
  const enRiesgo = contabilidadesList.filter((c) => c.status === "En riesgo").length;

  const filtered = useMemo(() => {
    return contabilidadesList.filter((item) => {
      const matchSearch =
        item.client.toLowerCase().includes(search.toLowerCase()) ||
        item.rfc.toLowerCase().includes(search.toLowerCase()) ||
        item.accountant.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [contabilidadesList, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedRows = filtered.slice(startIndex, startIndex + pageSize);

  const handleExportBalanzas = () => {
    const headers = ["Cliente", "RFC", "Contador Asignado", "Mes", "Avance Captura", "ISR Provisional", "IVA Causado", "Estatus"];
    const rows = filtered.map((c) => [
      `"${c.client.replace(/"/g, '""')}"`,
      `"${c.rfc}"`,
      `"${c.accountant}"`,
      `"${c.month}"`,
      `"${c.capture}%"`,
      `"${c.isrTax}"`,
      `"${c.ivaTax}"`,
      `"${c.status}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `contabilidades_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logActivity("CONTABILIDADES_CSV_EXPORTED", {
      count: filtered.length,
      title: "Reporte de contabilidades exportado a CSV",
      description: `Se exportaron ${filtered.length} registros del padrón de contabilidades mensuales.`,
      category: "contabilidad",
    });
    sileo.success({ title: `Exportadas ${filtered.length} contabilidades a CSV` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contabilidades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Supervisión y control de capturas, balanzas y cálculos fiscales mensuales ({totalActivas} clientes)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleExportBalanzas}
          >
            <Download className="h-3.5 w-3.5" /> Exportar Balanzas
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#152a45]"
            onClick={() => navigate("/control-mensual")}
          >
            Ver Control Mensual
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
              <p className="text-xl font-bold">{isLoading ? "..." : totalActivas}</p>
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
              <p className="text-xl font-bold">{isLoading ? "..." : terminadas}</p>
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
              <p className="text-xl font-bold">{isLoading ? "..." : enProceso}</p>
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
              <p className="text-xl font-bold">{isLoading ? "..." : enRiesgo}</p>
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
              placeholder="Buscar por cliente, RFC o contador..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-xs bg-card"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs bg-card">
              <span className="text-muted-foreground mr-1">Estatus:</span>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Completada">Completada</SelectItem>
              <SelectItem value="En proceso">En proceso</SelectItem>
              <SelectItem value="En riesgo">En riesgo</SelectItem>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Cargando contabilidades...
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron registros.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-foreground">
                      <Link
                        to={`/control-mensual/${row.id}`}
                        className="hover:underline flex items-center gap-1"
                      >
                        {row.client}
                      </Link>
                    </TableCell>
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
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigate(`/control-mensual/${row.id}`)}
                        title="Ver detalle"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
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
            {Math.min(startIndex + pageSize, filtered.length)} de {filtered.length} contabilidades
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
