import { useState, useMemo } from "react";
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
  Mail,
  Send,
  FileWarning,
  Key,
  Calendar,
  ChevronLeft,
  ChevronRight,
  UserX,
} from "lucide-react";
import { sileo } from "sileo";
import { useFinanceClients } from "../hooks";

export function PendientesFiscales() {
  const { data: rawClients = [], isLoading } = useFinanceClients();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const pendingItems = useMemo(() => {
    const list: {
      id: string;
      client: string;
      rfc: string;
      accountant: string;
      type: string;
      description: string;
      deadline: string;
      severity: "Alta" | "Media";
    }[] = [];

    rawClients.forEach((c) => {
      // 1. Clients with missing CIEC
      if (!c.ciec) {
        list.push({
          id: `${c.id}-ciec`,
          client: c.name,
          rfc: c.rfc || "—",
          accountant: c.assigned_accountant || "Sin asignar",
          type: "Falta Contraseña CIEC",
          description: "No se cuenta con contraseña SAT / CIEC para acceder al portal fiscal.",
          deadline: "Inmediato",
          severity: "Alta",
        });
      }

      // 2. Clients without assigned accountant
      if (!c.assigned_accountant || c.assigned_accountant === "Sin asignar") {
        list.push({
          id: `${c.id}-accountant`,
          client: c.name,
          rfc: c.rfc || "—",
          accountant: "Por asignar",
          type: "Sin Contador Asignado",
          description: "Cliente sin contador titular designado en el despacho.",
          deadline: "15 Oct 2026",
          severity: "Alta",
        });
      }

      // 3. Clients with specific notes/comments
      if (c.notes) {
        list.push({
          id: `${c.id}-notes`,
          client: c.name,
          rfc: c.rfc || "—",
          accountant: c.assigned_accountant || "Sin asignar",
          type: "Observación Especial",
          description: c.notes,
          deadline: "En seguimiento",
          severity: "Media",
        });
      }
    });

    return list;
  }, [rawClients]);

  const countCiec = pendingItems.filter((i) => i.type === "Falta Contraseña CIEC").length;
  const countAccountant = pendingItems.filter((i) => i.type === "Sin Contador Asignado").length;
  const countNotes = pendingItems.filter((i) => i.type === "Observación Especial").length;

  const filtered = useMemo(() => {
    return pendingItems.filter((item) => {
      const matchSearch =
        item.client.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.rfc.toLowerCase().includes(search.toLowerCase()) ||
        item.accountant.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || item.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [pendingItems, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedRows = filtered.slice(startIndex, startIndex + pageSize);

  const sendReminder = (client: string) => {
    sileo.success({ title: `Recordatorio enviado por correo a ${client}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pendientes y Obligaciones Críticas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Supervisión de credenciales faltantes, asignaciones pendientes y observaciones de clientes ({pendingItems.length} incidencias)
          </p>
        </div>

        <Button
          size="sm"
          className="bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-2"
          onClick={() => sileo.success({ title: "Notificaciones enviadas a los encargados de clientes con pendientes" })}
        >
          <Send className="h-4 w-4" /> Enviar Recordatorios Masivos
        </Button>
      </div>

      {/* Summary Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card shadow-xs flex items-center gap-3 border-rose-500/30">
          <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Falta Contraseña CIEC</p>
            <p className="text-xl font-bold text-foreground">{isLoading ? "..." : countCiec}</p>
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-xs flex items-center gap-3 border-amber-500/30">
          <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Sin Contador Asignado</p>
            <p className="text-xl font-bold text-foreground">{isLoading ? "..." : countAccountant}</p>
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-xs flex items-center gap-3 border-blue-500/30">
          <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileWarning className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Observaciones Clientes</p>
            <p className="text-xl font-bold text-foreground">{isLoading ? "..." : countNotes}</p>
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-xs flex items-center gap-3 border-emerald-500/30">
          <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Incidencias</p>
            <p className="text-xl font-bold text-foreground">{isLoading ? "..." : pendingItems.length}</p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/80 shadow-xs">
        <div className="p-3 bg-muted/20 border-b border-border/60 flex flex-wrap items-center gap-2.5 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, RFC, contador o descripción..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-xs bg-card"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[200px] h-8 text-xs bg-card">
              <span className="text-muted-foreground mr-1">Tipo:</span>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos ({pendingItems.length})</SelectItem>
              <SelectItem value="Falta Contraseña CIEC">Falta Contraseña CIEC ({countCiec})</SelectItem>
              <SelectItem value="Sin Contador Asignado">Sin Contador Asignado ({countAccountant})</SelectItem>
              <SelectItem value="Observación Especial">Observación Especial ({countNotes})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 text-[11px] text-muted-foreground hover:bg-muted/30">
                <TableHead className="py-2.5">Cliente</TableHead>
                <TableHead className="py-2.5">Tipo de Pendiente</TableHead>
                <TableHead className="py-2.5">Descripción de la Incidencia</TableHead>
                <TableHead className="py-2.5">Contador Responsable</TableHead>
                <TableHead className="py-2.5">Plazo</TableHead>
                <TableHead className="py-2.5 text-center">Severidad</TableHead>
                <TableHead className="py-2.5 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Cargando pendientes...
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay incidencias que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="font-semibold text-foreground text-xs">{item.client}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{item.rfc}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-muted/40 font-medium">
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs text-muted-foreground text-[11px]">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-foreground">{item.accountant}</TableCell>
                    <TableCell className="font-semibold text-foreground">{item.deadline}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          item.severity === "Alta"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {item.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => sendReminder(item.client)}
                      >
                        <Mail className="h-3 w-3" /> Recordar
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
            {Math.min(startIndex + pageSize, filtered.length)} de {filtered.length} pendientes
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
