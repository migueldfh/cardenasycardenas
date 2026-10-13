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
  Clock,
  Search,
  Mail,
  Send,
  FileWarning,
  Key,
  Calendar,
} from "lucide-react";
import { sileo } from "sileo";

export function PendientesFiscales() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const pendingItems = [
    {
      id: "1",
      client: "Grupo Industrial MX S. de R.L.",
      rfc: "GIM150620KL9",
      accountant: "Rubí Jiménez",
      type: "Falta Papelería",
      description: "Estados de cuenta bancarios de Banorte y facturas de compras de agosto",
      deadline: "10 Sep 2026",
      severity: "Alta",
    },
    {
      id: "2",
      client: "Logística del Bajío S.A. de C.V.",
      rfc: "LBA210709PL2",
      accountant: "Alejandra Torres",
      type: "Contabilidad Atrasada",
      description: "Captura de pólizas de egresos pendiente al 0%",
      deadline: "12 Sep 2026",
      severity: "Alta",
    },
    {
      id: "3",
      client: "Construcciones Delta S.A.",
      rfc: "CDE171010MN4",
      accountant: "Rodrigo Martínez",
      type: "Falta Papelería",
      description: "Pólizas de nómina y reporte de retenciones de IMSS",
      deadline: "11 Sep 2026",
      severity: "Media",
    },
    {
      id: "4",
      client: "Inversiones Monterrey S.A.",
      rfc: "IMO160405ZX1",
      accountant: "Rubí Jiménez",
      type: "Vencimiento e.firma",
      description: "Certificado de Sello Digital y e.firma vencen en 14 días",
      deadline: "24 Sep 2026",
      severity: "Media",
    },
    {
      id: "5",
      client: "Servicios Profesionales S.C.",
      rfc: "SPR190101QW1",
      accountant: "Luis Ramírez",
      type: "Cobranza Pendiente",
      description: "Factura de honorarios de julio pendiente por más de 30 días ($14,500)",
      deadline: "Vencida",
      severity: "Alta",
    },
  ];

  const filtered = pendingItems.filter((item) => {
    const matchSearch =
      item.client.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || item.type === typeFilter;
    return matchSearch && matchType;
  });

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
            Seguimiento de documentación faltante, vencimientos de e.firma y entregables retrasados
          </p>
        </div>

        <Button
          size="sm"
          className="bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-2"
          onClick={() => sileo.success({ title: "Notificaciones masivas enviadas a clientes con pendientes" })}
        >
          <Send className="h-4 w-4" /> Enviar Recordatorios Masivos
        </Button>
      </div>

      {/* Summary Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-card shadow-xs flex items-center gap-3 border-rose-500/30">
          <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <FileWarning className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Falta Papelería</p>
            <p className="text-xl font-bold text-foreground">8 clientes</p>
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-xs flex items-center gap-3 border-amber-500/30">
          <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Contabilidades Atrasadas</p>
            <p className="text-xl font-bold text-foreground">5 procesos</p>
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-xs flex items-center gap-3 border-purple-500/30">
          <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Vencimiento e.firma</p>
            <p className="text-xl font-bold text-foreground">4 clientes</p>
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-xs flex items-center gap-3 border-blue-500/30">
          <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Por Vencer en 48h</p>
            <p className="text-xl font-bold text-foreground">7 trámites</p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/80 shadow-xs">
        <div className="p-3 bg-muted/20 border-b border-border/60 flex flex-wrap items-center gap-2.5 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-card"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[170px] h-8 text-xs bg-card">
              <span className="text-muted-foreground mr-1">Tipo:</span>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="Falta Papelería">Falta Papelería</SelectItem>
              <SelectItem value="Contabilidad Atrasada">Contabilidad Atrasada</SelectItem>
              <SelectItem value="Vencimiento e.firma">Vencimiento e.firma</SelectItem>
              <SelectItem value="Cobranza Pendiente">Cobranza Pendiente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 text-[11px] text-muted-foreground hover:bg-muted/30">
                <TableHead className="py-2.5">Cliente</TableHead>
                <TableHead className="py-2.5">Tipo de Pendiente</TableHead>
                <TableHead className="py-2.5">Descripción de la Obligación</TableHead>
                <TableHead className="py-2.5">Contador Responsable</TableHead>
                <TableHead className="py-2.5">Fecha Límite</TableHead>
                <TableHead className="py-2.5 text-center">Severidad</TableHead>
                <TableHead className="py-2.5 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filtered.map((item) => (
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
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
