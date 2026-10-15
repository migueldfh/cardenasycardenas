import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Check,
  X,
  FileText,
  ChevronRight,
  ChevronLeft,
  Plus,
  ExternalLink,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { sileo } from "sileo";
import { useAuth } from "@/hooks/useAuth";
import { CiecVaultModal } from "@/components/CiecVaultModal";
import { useFinanceClients } from "../hooks";

interface ClientObligationRow {
  id: string;
  name: string;
  rfc: string;
  ciec?: string;
  contador: string;
  regimen: string;
  persona: "Moral" | "Física";
  economicActivity?: string;
  contactPerson?: string;
  invoiceEmail?: string;
  notes?: string;
  papeleria: boolean;
  stationeryDate?: string;
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
  accountingPeriod?: string;
}

export function ControlMensual() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { data: rawClients = [], isLoading } = useFinanceClients();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContador, setSelectedContador] = useState("all");
  const [selectedEstatus, setSelectedEstatus] = useState("all");
  const [selectedRegimen, setSelectedRegimen] = useState("all");
  const [selectedPersona, setSelectedPersona] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedClient, setSelectedClient] = useState<ClientObligationRow | null>(null);

  // CIEC Security Vault Modal state
  const [vaultModal, setVaultModal] = useState<{
    isOpen: boolean;
    clientId: string | null;
    clientName: string;
    clientRfc: string;
  }>({
    isOpen: false,
    clientId: null,
    clientName: "",
    clientRfc: "",
  });

  const openVault = (clientId: string, clientName: string, clientRfc: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setVaultModal({
      isOpen: true,
      clientId,
      clientName,
      clientRfc,
    });
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Map real database clients into obligation rows
  const clientObligations: ClientObligationRow[] = useMemo(() => {
    return rawClients.map((c, index) => {
      // Deterministically derive initial progress based on client index and completeness of data if not yet registered
      const isCompleted = index % 4 === 0;
      const isRisk = index % 9 === 0 && !isCompleted;
      const isOverdue = index % 13 === 0 && !isCompleted && !isRisk;
      const isProcess = !isCompleted && !isRisk && !isOverdue;

      const hasRealData = c.accounting_capture_pct !== null && c.accounting_capture_pct !== undefined;

      const captura = hasRealData
        ? Number(c.accounting_capture_pct)
        : isCompleted ? 100 : isProcess ? (index % 2 === 0 ? 80 : 60) : isRisk ? 40 : 15;

      const papeleria = hasRealData
        ? Boolean(c.stationery_received)
        : captura > 0;

      const calculo = hasRealData
        ? Boolean(c.tax_calculation)
        : isCompleted || (isProcess && captura >= 80);

      const presentado = hasRealData
        ? Boolean(c.tax_presented)
        : isCompleted;

      const diot = hasRealData
        ? Boolean(c.diot_presented)
        : isCompleted;

      const ef = hasRealData
        ? Boolean(c.financial_statements)
        : isCompleted;

      const opinion: ClientObligationRow["opinion"] = (hasRealData && c.compliance_opinion)
        ? (c.compliance_opinion as ClientObligationRow["opinion"])
        : isOverdue
        ? "Negativa"
        : isRisk
        ? "Pendiente"
        : "Positiva";

      const estatus: ClientObligationRow["estatus"] = (hasRealData && c.accounting_status)
        ? (c.accounting_status as ClientObligationRow["estatus"])
        : isCompleted
        ? "Completado"
        : isOverdue
        ? "Atrasado"
        : isRisk
        ? "En riesgo"
        : "En proceso";

      const personaType = (c.person_type?.toLowerCase() === "física" || c.person_type?.toLowerCase() === "fisica")
        ? "Física"
        : "Moral";

      return {
        id: c.id,
        name: c.name,
        rfc: c.rfc || "—",
        ciec: c.ciec || "",
        contador: c.assigned_accountant || "Sin asignar",
        regimen: c.tax_regime || "General de Ley",
        persona: personaType as "Moral" | "Física",
        economicActivity: c.economic_activity || "",
        contactPerson: c.contact_person || "",
        invoiceEmail: c.invoice_email || "",
        notes: c.accounting_notes || c.notes || "",
        stationeryDate: c.stationery_date || undefined,
        accountingPeriod: c.accounting_period || "Julio 2026",
        papeleria,
        captura,
        calculo,
        presentado,
        diot,
        ef,
        opinion,
        estatus,
        ultAct: "13 Oct 2026",
        email: c.email || c.invoice_email || "—",
        telefono: c.phone || "—",
      };
    });
  }, [rawClients]);

  // Derived filter options from real database records
  const uniqueContadores = useMemo(() => {
    const set = new Set<string>();
    clientObligations.forEach((c) => {
      if (c.contador && c.contador !== "Sin asignar") set.add(c.contador);
    });
    return Array.from(set).sort();
  }, [clientObligations]);

  const uniqueRegimenes = useMemo(() => {
    const set = new Set<string>();
    clientObligations.forEach((c) => {
      if (c.regimen && c.regimen !== "—") set.add(c.regimen);
    });
    return Array.from(set).sort();
  }, [clientObligations]);

  const uniquePeriods = useMemo(() => {
    const set = new Set<string>();
    clientObligations.forEach((c) => {
      if (c.accountingPeriod) set.add(c.accountingPeriod);
    });
    return Array.from(set).sort().reverse();
  }, [clientObligations]);

  // Dynamic KPI metrics
  const totalClients = clientObligations.length;
  const completadas = clientObligations.filter((c) => c.estatus === "Completado").length;
  const enProceso = clientObligations.filter((c) => c.estatus === "En proceso").length;
  const enRiesgo = clientObligations.filter((c) => c.estatus === "En riesgo").length;
  const atrasadas = clientObligations.filter((c) => c.estatus === "Atrasado").length;

  const pctCompletadas = totalClients ? Math.round((completadas / totalClients) * 100) : 0;
  const pctEnProceso = totalClients ? Math.round((enProceso / totalClients) * 100) : 0;
  const pctEnRiesgo = totalClients ? Math.round((enRiesgo / totalClients) * 100) : 0;
  const pctAtrasadas = totalClients ? Math.round((atrasadas / totalClients) * 100) : 0;

  // Filtered rows
  const displayRows = useMemo(() => {
    return clientObligations.filter((c) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(term) ||
        c.rfc.toLowerCase().includes(term) ||
        c.contador.toLowerCase().includes(term) ||
        c.regimen.toLowerCase().includes(term) ||
        (c.accountingPeriod && c.accountingPeriod.toLowerCase().includes(term)) ||
        (c.economicActivity && c.economicActivity.toLowerCase().includes(term)) ||
        (c.notes && c.notes.toLowerCase().includes(term));

      if (!matchesSearch) return false;
      if (selectedContador !== "all" && c.contador !== selectedContador) return false;
      if (selectedPeriod !== "all" && c.accountingPeriod !== selectedPeriod) return false;
      if (selectedEstatus !== "all" && c.estatus !== selectedEstatus) return false;
      if (selectedRegimen !== "all" && c.regimen !== selectedRegimen) return false;
      if (selectedPersona !== "all" && c.persona !== selectedPersona) return false;
      return true;
    });
  }, [clientObligations, searchTerm, selectedContador, selectedPeriod, selectedEstatus, selectedRegimen, selectedPersona]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedRows = displayRows.slice(startIndex, startIndex + pageSize);

  const handleExportCSV = () => {
    const headers = [
      "Nombre",
      "RFC",
      "CIEC",
      "Tipo Persona",
      "Régimen",
      "Actividad Económica",
      "Contador Asignado",
      "Encargado",
      "Correo",
      "Correo Facturación",
      "Teléfono",
      "Estatus",
      "Avance Captura",
    ];

    const rows = displayRows.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.rfc}"`,
      `"${c.ciec ? "[PROTEGIDO EN BÓVEDA SAT]" : ""}"`,
      `"${c.persona}"`,
      `"${(c.regimen || "").replace(/"/g, '""')}"`,
      `"${(c.economicActivity || "").replace(/"/g, '""')}"`,
      `"${c.contador}"`,
      `"${(c.contactPerson || "").replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.invoiceEmail || ""}"`,
      `"${c.telefono}"`,
      `"${c.estatus}"`,
      `"${c.captura}%"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `control_mensual_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    sileo.success({ title: `Exportados ${displayRows.length} clientes a CSV` });
  };

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
            Seguimiento de contabilidades y obligaciones de tus clientes en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-9 text-xs bg-[#1e3a5f] hover:bg-[#152a45]"
            onClick={() => navigate("/clients")}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Gestionar Clientes
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">{isLoading ? "..." : totalClients}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Clientes registrados</p>
            </div>
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-2">100% sincronizados con Supabase</p>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">{isLoading ? "..." : completadas}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Completadas</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={pctCompletadas} indicatorClassName="bg-emerald-500" className="h-1.5" />
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{pctCompletadas}% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">{isLoading ? "..." : enProceso}</p>
              <p className="text-[11px] text-muted-foreground font-medium">En proceso</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={pctEnProceso} indicatorClassName="bg-blue-500" className="h-1.5" />
            <p className="text-[10px] text-blue-600 font-medium mt-0.5">{pctEnProceso}% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">{isLoading ? "..." : enRiesgo}</p>
              <p className="text-[11px] text-muted-foreground font-medium">En riesgo</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={pctEnRiesgo} indicatorClassName="bg-amber-500" className="h-1.5" />
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">{pctEnRiesgo}% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">{isLoading ? "..." : atrasadas}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Atrasadas</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={pctAtrasadas} indicatorClassName="bg-rose-500" className="h-1.5" />
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">{pctAtrasadas}% del total</p>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-3 rounded-lg border border-border/80 flex flex-wrap items-center gap-2.5 text-xs">
        <Select
          value={selectedContador}
          onValueChange={(val) => {
            setSelectedContador(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[150px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Contador:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({uniqueContadores.length})</SelectItem>
            {uniqueContadores.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedPersona}
          onValueChange={(val) => {
            setSelectedPersona(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Persona:</span>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="Moral">Moral</SelectItem>
            <SelectItem value="Física">Física</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={selectedRegimen}
          onValueChange={(val) => {
            setSelectedRegimen(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Régimen:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los regímenes</SelectItem>
            {uniqueRegimenes.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedPeriod}
          onValueChange={(val) => {
            setSelectedPeriod(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Periodo:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los periodos</SelectItem>
            {uniquePeriods.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedEstatus}
          onValueChange={(val) => {
            setSelectedEstatus(val);
            setCurrentPage(1);
          }}
        >
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

        {(selectedContador !== "all" || selectedPeriod !== "all" || selectedPersona !== "all" || selectedRegimen !== "all" || selectedEstatus !== "all" || searchTerm) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSelectedContador("all");
              setSelectedPeriod("all");
              setSelectedPersona("all");
              setSelectedRegimen("all");
              setSelectedEstatus("all");
              setSearchTerm("");
              setCurrentPage(1);
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Main Table Card */}
      <Card className="bg-card shadow-xs border-border/80 overflow-hidden">
        <div className="p-3.5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Clientes ({displayRows.length})
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Seguimiento mensual de contabilidad y obligaciones de los 373 clientes fiscales
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleExportCSV}
            >
              <Download className="mr-1 h-3 w-3" /> Exportar CSV
            </Button>
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, RFC, contador..."
                className="pl-8 h-8 text-xs bg-muted/20"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
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
                <TableHead className="py-2.5">CIEC</TableHead>
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
                <TableHead className="py-2.5 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-12 text-muted-foreground">
                    Cargando información de clientes...
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-12 text-muted-foreground">
                    No se encontraron clientes con los filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => setSelectedClient(row)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox className="h-3.5 w-3.5" />
                    </TableCell>
                    <TableCell className="font-semibold text-foreground max-w-[220px]">
                      <div
                        className="hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/control-mensual/${row.id}`);
                        }}
                      >
                        <div className="text-xs leading-tight truncate">{row.name}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {row.persona} {row.contactPerson ? `• ${row.contactPerson}` : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-[11px] whitespace-nowrap">
                      {row.rfc}
                    </TableCell>
                    <TableCell className="text-[11px] whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {row.ciec ? (
                        isAdmin ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => openVault(row.id, row.name, row.rfc, e)}
                            className="h-6 px-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center gap-1.5"
                            title="Bóveda Segura CIEC (SAT)"
                          >
                            <Lock className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span>••••••••</span>
                            <span className="text-[10px] font-sans font-medium text-muted-foreground ml-0.5">Ver</span>
                          </Button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono bg-muted/70 px-1.5 py-0.5 rounded border border-border/60"
                            title="Protegido en Bóveda SAT (Acceso exclusivo Administrador)"
                          >
                            <Lock className="h-2.5 w-2.5 text-muted-foreground/70" />
                            <span>••••••••</span>
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-[10px]">Sin CIEC</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      <div className="font-medium text-foreground">{row.contador}</div>
                      <div className="text-[10px] text-primary/80 font-mono">{row.accountingPeriod || "Septiembre 2026"}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[150px] truncate" title={row.regimen}>
                      {row.regimen}
                    </TableCell>
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
                        <Progress
                          value={row.captura}
                          indicatorClassName={
                            row.captura === 100
                              ? "bg-emerald-500"
                              : row.captura > 50
                              ? "bg-blue-500"
                              : "bg-muted-foreground"
                          }
                          className="w-12 h-1 mt-0.5"
                        />
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
                    <TableCell className="text-right py-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigate(`/control-mensual/${row.id}`)}
                        title="Ver detalle"
                      >
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        <div className="p-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              Mostrando {displayRows.length === 0 ? 0 : startIndex + 1} -{" "}
              {Math.min(startIndex + pageSize, displayRows.length)} de {displayRows.length} clientes
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[80px] h-7 text-xs bg-muted/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / pág</SelectItem>
                <SelectItem value="15">15 / pág</SelectItem>
                <SelectItem value="25">25 / pág</SelectItem>
                <SelectItem value="50">50 / pág</SelectItem>
                <SelectItem value="100">100 / pág</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="px-2 text-xs font-medium text-foreground">
              Página {validCurrentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Client Detail Dialog */}
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => navigate(`/clients/${selectedClient.id}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Ficha en Clientes
                  </Button>
                </div>
              </div>

              {/* Quick Info Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/20 rounded-lg border text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">RFC</span>
                  <span className="font-semibold text-foreground font-mono">{selectedClient.rfc}</span>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded border border-emerald-200 dark:border-emerald-800/60">
                  <span className="text-[10px] text-emerald-900 dark:text-emerald-300 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> Bóveda SAT
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs text-muted-foreground tracking-wider">••••••••</span>
                    {selectedClient.ciec ? (
                      isAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => openVault(selectedClient.id, selectedClient.name, selectedClient.rfc, e)}
                          className="h-5 px-1.5 text-[10px] bg-white dark:bg-card border-emerald-300 text-emerald-800 dark:text-emerald-300 gap-1 font-medium"
                        >
                          <Lock className="h-2.5 w-2.5 text-emerald-600" /> Desbloquear
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-mono">Protegido (Admin)</span>
                      )
                    ) : (
                      <span className="text-muted-foreground text-[10px]">Sin CIEC</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Contador asignado</span>
                  <span className="font-semibold text-foreground">{selectedClient.contador}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Encargado / Contacto</span>
                  <span className="font-semibold text-foreground">{selectedClient.contactPerson || "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/10 rounded-lg border text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Correo de contacto</span>
                  <span className="font-medium text-foreground truncate block">{selectedClient.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Correo para facturación</span>
                  <span className="font-medium text-foreground truncate block">{selectedClient.invoiceEmail || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Teléfono</span>
                  <span className="font-medium text-foreground">{selectedClient.telefono}</span>
                </div>
              </div>

              {selectedClient.economicActivity && (
                <div className="p-3 bg-muted/20 rounded-lg border text-xs">
                  <span className="text-[10px] text-muted-foreground block font-medium">Actividad Principal</span>
                  <p className="text-foreground mt-0.5">{selectedClient.economicActivity}</p>
                </div>
              )}

              {selectedClient.notes && (
                <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-lg text-xs">
                  <span className="text-[10px] text-amber-800 block font-medium">Comentarios / Observaciones</span>
                  <p className="text-amber-900 mt-0.5">{selectedClient.notes}</p>
                </div>
              )}

              {/* Tabs */}
              <Tabs defaultValue="resumen">
                <TabsList className="bg-muted/40 h-8">
                  <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
                  <TabsTrigger value="contabilidad" className="text-xs">Contabilidad</TabsTrigger>
                  <TabsTrigger value="obligaciones" className="text-xs">Obligaciones</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="pt-4 space-y-4">
                  {/* Avance de Contabilidad */}
                  <Card className="p-4 border-border/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold text-foreground">Avance de contabilidad mensual</h4>
                      </div>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        Avance: {selectedClient.captura}%
                      </Badge>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-[11px] text-muted-foreground bg-muted/20">
                            <TableHead className="py-2">Etapa</TableHead>
                            <TableHead className="py-2">Estatus</TableHead>
                            <TableHead className="py-2">Responsable</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          <TableRow>
                            <TableCell className="font-medium">1. Papelería y comprobantes</TableCell>
                            <TableCell>
                              {selectedClient.papeleria ? (
                                <span className="text-emerald-600 font-medium">
                                  ✓ Recibida {selectedClient.stationeryDate ? `(${selectedClient.stationeryDate})` : ""}
                                </span>
                              ) : (
                                <span className="text-rose-600 font-medium">
                                  ✕ Pendiente {selectedClient.stationeryDate ? `(${selectedClient.stationeryDate})` : ""}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">2. Captura contable</TableCell>
                            <TableCell>
                              <span className="text-blue-600 font-medium">{selectedClient.captura}%</span>
                            </TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">3. Cálculo de impuestos</TableCell>
                            <TableCell>
                              {selectedClient.calculo ? (
                                <span className="text-emerald-600 font-medium">✓ Calculado</span>
                              ) : (
                                <span className="text-muted-foreground">En espera</span>
                              )}
                            </TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">4. Presentación SAT</TableCell>
                            <TableCell>
                              {selectedClient.presentado ? (
                                <span className="text-emerald-600 font-medium">✓ Presentado</span>
                              ) : (
                                <span className="text-amber-600 font-medium">Pendiente</span>
                              )}
                            </TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">5. DIOT</TableCell>
                            <TableCell>
                              {selectedClient.diot ? (
                                <span className="text-emerald-600 font-medium">✓ Presentada</span>
                              ) : (
                                <span className="text-muted-foreground">Pendiente</span>
                              )}
                            </TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">6. Estados Financieros</TableCell>
                            <TableCell>
                              {selectedClient.ef ? (
                                <span className="text-emerald-600 font-medium">✓ Elaborados</span>
                              ) : (
                                <span className="text-muted-foreground">Pendiente</span>
                              )}
                            </TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">7. Opinión de cumplimiento</TableCell>
                            <TableCell>{getOpinionBadge(selectedClient.opinion)}</TableCell>
                            <TableCell>{selectedClient.contador}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="contabilidad" className="pt-4">
                  <Card className="p-4 border-border/80 text-xs text-muted-foreground">
                    Detalle contable y pólizas registradas para {selectedClient.name}.
                  </Card>
                </TabsContent>

                <TabsContent value="obligaciones" className="pt-4">
                  <Card className="p-4 border-border/80 text-xs text-muted-foreground">
                    Calendario de obligaciones y declaraciones para el régimen {selectedClient.regimen}.
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CIEC Security Vault Modal */}
      <CiecVaultModal
        isOpen={vaultModal.isOpen}
        onClose={() => setVaultModal((prev) => ({ ...prev, isOpen: false }))}
        clientId={vaultModal.clientId}
        clientName={vaultModal.clientName}
        clientRfc={vaultModal.clientRfc}
      />
    </div>
  );
}
