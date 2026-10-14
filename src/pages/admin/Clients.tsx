import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  UserCheck,
  Building2,
  Search,
  Plus,
  Download,
  X,
  Edit,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Eye,
  EyeOff,
  Key,
  Copy,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react";
import { sileo } from "sileo";
import {
  useFinanceClients,
  useCreateFinanceClient,
  useUpdateFinanceClient,
  useDeleteFinanceClient,
} from "@/modules/finances/hooks";
import type { IFinanceClient } from "@/modules/finances/types";

export interface FiscalClient {
  id: string;
  name: string;
  legalName: string;
  rfc: string;
  personType: "Moral" | "Física";
  regime: string;
  assignedAccountant: string;
  status: "Activo" | "Inactivo" | "Prospecto";
  economicActivity: string;
  contactName: string;
  email: string;
  invoiceEmail: string;
  phone: string;
  ciec: string;
  notes: string;
  clientSince: string;
  lastActivity: string;
}

export function Clients() {
  const { data: rawClients = [], isLoading, error } = useFinanceClients();
  const createClientMutation = useCreateFinanceClient();
  const updateClientMutation = useUpdateFinanceClient();
  const deleteClientMutation = useDeleteFinanceClient();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [regimeFilter, setRegimeFilter] = useState("all");
  const [accountantFilter, setAccountantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [revealedCiecIds, setRevealedCiecIds] = useState<Record<string, boolean>>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Form states
  const [clientForm, setClientForm] = useState({
    name: "",
    legalName: "",
    rfc: "",
    personType: "Moral" as "Moral" | "Física",
    regime: "",
    assignedAccountant: "",
    status: "Activo" as "Activo" | "Inactivo" | "Prospecto",
    economicActivity: "",
    contactName: "",
    email: "",
    invoiceEmail: "",
    phone: "",
    ciec: "",
    notes: "",
  });

  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Map database IFinanceClient records into UI FiscalClient model
  const clients: FiscalClient[] = useMemo(() => {
    return (rawClients || []).map((c: IFinanceClient) => {
      const isFisica =
        c.person_type?.toLowerCase()?.includes("físic") ||
        c.person_type?.toLowerCase()?.includes("fisic");

      return {
        id: c.id,
        name: c.name || "Sin nombre",
        legalName: c.fiscal_name || c.name || "Sin razón social",
        rfc: c.tax_id_rfc || "Sin RFC",
        personType: isFisica ? "Física" : "Moral",
        regime: c.fiscal_regime || "Sin régimen",
        assignedAccountant: c.assigned_accountant || "Sin asignar",
        status: (c.status as any) || "Activo",
        economicActivity: c.economic_activity || "No especificada",
        contactName: c.contact_person || "Trato directo",
        email: c.email || "",
        invoiceEmail: c.invoice_email || "",
        phone: c.phone || "",
        ciec: c.ciec || "",
        notes: c.notes || "",
        clientSince: c.created_at
          ? new Date(c.created_at).toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "Al corriente",
        lastActivity: c.updated_at
          ? new Date(c.updated_at).toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "Al corriente",
      };
    });
  }, [rawClients]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Dynamic filter options based on actual clients
  const uniqueAccountants = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => {
      if (c.assignedAccountant && c.assignedAccountant !== "Sin asignar") {
        set.add(c.assignedAccountant);
      }
    });
    return Array.from(set).sort();
  }, [clients]);

  const uniqueRegimes = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => {
      if (c.regime && c.regime !== "Sin régimen") {
        set.add(c.regime.trim());
      }
    });
    return Array.from(set).sort();
  }, [clients]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.legalName.toLowerCase().includes(q) ||
        c.rfc.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.invoiceEmail.toLowerCase().includes(q) ||
        c.ciec.toLowerCase().includes(q) ||
        c.economicActivity.toLowerCase().includes(q) ||
        c.assignedAccountant.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q);

      const matchType = typeFilter === "all" || c.personType === typeFilter;
      const matchRegime = regimeFilter === "all" || c.regime.includes(regimeFilter);
      const matchAccountant =
        accountantFilter === "all" ||
        c.assignedAccountant.toLowerCase().includes(accountantFilter.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;

      return matchSearch && matchType && matchRegime && matchAccountant && matchStatus;
    });
  }, [clients, searchQuery, typeFilter, regimeFilter, accountantFilter, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  // Metrics
  const metrics = useMemo(() => {
    const total = clients.length;
    const activos = clients.filter((c) => c.status === "Activo").length;
    const morales = clients.filter((c) => c.personType === "Moral").length;
    const fisicas = clients.filter((c) => c.personType === "Física").length;
    return {
      total,
      activos,
      morales,
      fisicas,
      activePct: total > 0 ? Math.round((activos / total) * 100) : 0,
      moralPct: total > 0 ? Math.round((morales / total) * 100) : 0,
      fisicaPct: total > 0 ? Math.round((fisicas / total) * 100) : 0,
    };
  }, [clients]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredClients.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const toggleRevealCiec = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRevealedCiecIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenCreateModal = () => {
    setClientForm({
      name: "",
      legalName: "",
      rfc: "",
      personType: "Moral",
      regime: "Régimen General de Ley Personas Morales",
      assignedAccountant: uniqueAccountants[0] || "Alejandra Díaz",
      status: "Activo",
      economicActivity: "",
      contactName: "",
      email: "",
      invoiceEmail: "",
      phone: "",
      ciec: "",
      notes: "",
    });
    setIsNewClientOpen(true);
  };

  const handleOpenEditModal = (clientToEdit: FiscalClient, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingClientId(clientToEdit.id);
    setClientForm({
      name: clientToEdit.name,
      legalName: clientToEdit.legalName,
      rfc: clientToEdit.rfc,
      personType: clientToEdit.personType,
      regime: clientToEdit.regime,
      assignedAccountant: clientToEdit.assignedAccountant,
      status: clientToEdit.status as any,
      economicActivity: clientToEdit.economicActivity,
      contactName: clientToEdit.contactName,
      email: clientToEdit.email,
      invoiceEmail: clientToEdit.invoiceEmail,
      phone: clientToEdit.phone,
      ciec: clientToEdit.ciec,
      notes: clientToEdit.notes,
    });
    setIsEditClientOpen(true);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim() || !clientForm.rfc.trim()) {
      sileo.error({ title: "Nombre y RFC son requeridos" });
      return;
    }

    try {
      const created = await createClientMutation.mutateAsync({
        name: clientForm.name.trim(),
        fiscal_name: clientForm.legalName.trim() || clientForm.name.trim(),
        trade_name: clientForm.name.trim(),
        tax_id_rfc: clientForm.rfc.trim().toUpperCase(),
        person_type: clientForm.personType,
        fiscal_regime: clientForm.regime.trim() || null,
        economic_activity: clientForm.economicActivity.trim() || null,
        contact_person: clientForm.contactName.trim() || null,
        email: clientForm.email.trim() || null,
        invoice_email: clientForm.invoiceEmail.trim() || null,
        phone: clientForm.phone.trim() || null,
        ciec: clientForm.ciec.trim() || null,
        assigned_accountant: clientForm.assignedAccountant.trim() || null,
        notes: clientForm.notes.trim() || null,
        status: clientForm.status,
      });

      setSelectedClientId(created.id);
      setIsNewClientOpen(false);
      sileo.success({ title: "Cliente registrado con éxito en la base de datos" });
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al crear el cliente" });
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClientId || !clientForm.name.trim()) return;

    try {
      await updateClientMutation.mutateAsync({
        id: editingClientId,
        payload: {
          name: clientForm.name.trim(),
          fiscal_name: clientForm.legalName.trim() || clientForm.name.trim(),
          trade_name: clientForm.name.trim(),
          tax_id_rfc: clientForm.rfc.trim().toUpperCase(),
          person_type: clientForm.personType,
          fiscal_regime: clientForm.regime.trim() || null,
          economic_activity: clientForm.economicActivity.trim() || null,
          contact_person: clientForm.contactName.trim() || null,
          email: clientForm.email.trim() || null,
          invoice_email: clientForm.invoiceEmail.trim() || null,
          phone: clientForm.phone.trim() || null,
          ciec: clientForm.ciec.trim() || null,
          assigned_accountant: clientForm.assignedAccountant.trim() || null,
          notes: clientForm.notes.trim() || null,
          status: clientForm.status,
        },
      });

      setIsEditClientOpen(false);
      sileo.success({ title: "Cliente actualizado con éxito" });
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al actualizar el cliente" });
    }
  };

  const handleDeleteClient = async (id: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a "${name}" de la base de datos?`)) {
      return;
    }

    try {
      await deleteClientMutation.mutateAsync(id);
      if (selectedClientId === id) setSelectedClientId(null);
      sileo.success({ title: "Cliente eliminado con éxito" });
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al eliminar el cliente" });
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "NOMBRE",
      "RAZON SOCIAL",
      "RFC",
      "CIEC",
      "TIPO PERSONA",
      "REGIMEN FISCAL",
      "ACTIVIDAD PRINCIPAL",
      "ENCARGADO",
      "CONTADOR ASIGNADO",
      "CORREO CONTACTO",
      "CORREO ENVIO FACTURA",
      "TELEFONO",
      "ESTATUS",
      "COMENTARIOS",
    ];

    const rows = filteredClients.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.legalName.replace(/"/g, '""')}"`,
      `"${c.rfc}"`,
      `"${c.ciec}"`,
      `"${c.personType}"`,
      `"${c.regime.replace(/"/g, '""')}"`,
      `"${c.economicActivity.replace(/"/g, '""')}"`,
      `"${c.contactName.replace(/"/g, '""')}"`,
      `"${c.assignedAccountant}"`,
      `"${c.email}"`,
      `"${c.invoiceEmail}"`,
      `"${c.phone}"`,
      `"${c.status}"`,
      `"${c.notes.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clientes_cardenas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    sileo.success({ title: "Archivo CSV exportado exitosamente" });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Cargando catálogo de clientes fiscales...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive space-y-2">
        <p className="font-bold">Error al conectar con la base de datos de clientes:</p>
        <p className="text-sm font-mono">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" /> Clientes Fiscales
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Padrón de contribuyentes, accesos CIEC SAT y asignación contable
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 shadow-xs"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button
            size="sm"
            className="bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-2 shadow-xs"
            onClick={handleOpenCreateModal}
          >
            <Plus className="h-4 w-4" /> Nuevo cliente
          </Button>
        </div>
      </div>

      {/* Row 1: 4 Top Real Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">{metrics.total}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Clientes registrados</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-primary font-medium">100% en base de datos</p>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">{metrics.activos}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Clientes activos</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={metrics.activePct} indicatorClassName="bg-emerald-500" className="h-1.5" />
            <p className="text-[11px] text-emerald-600 font-medium mt-1">{metrics.activePct}% del padrón</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">{metrics.morales}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Personas Morales</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={metrics.moralPct} indicatorClassName="bg-purple-500" className="h-1.5" />
            <p className="text-[11px] text-purple-600 font-medium mt-1">{metrics.moralPct}% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">{metrics.fisicas}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Personas Físicas</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={metrics.fisicaPct} indicatorClassName="bg-blue-500" className="h-1.5" />
            <p className="text-[11px] text-blue-600 font-medium mt-1">{metrics.fisicaPct}% del total</p>
          </div>
        </Card>
      </div>

      {/* Row 2: Comprehensive Filter bar */}
      <div className="bg-card p-3 rounded-lg border border-border/80 flex flex-wrap items-center gap-2.5 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RFC, contacto, correo, CIEC, actividad..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 h-8 text-xs bg-muted/20"
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={(val) => {
            setTypeFilter(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[125px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Tipo:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Moral">Moral</SelectItem>
            <SelectItem value="Física">Física</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={accountantFilter}
          onValueChange={(val) => {
            setAccountantFilter(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Contador:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los contadores</SelectItem>
            {uniqueAccountants.map((acc) => (
              <SelectItem key={acc} value={acc}>
                {acc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[125px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Estatus:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Activo">Activo</SelectItem>
            <SelectItem value="Inactivo">Inactivo</SelectItem>
            <SelectItem value="Prospecto">Prospecto</SelectItem>
          </SelectContent>
        </Select>

        {uniqueRegimes.length > 0 && (
          <Select
            value={regimeFilter}
            onValueChange={(val) => {
              setRegimeFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs bg-muted/20">
              <span className="text-muted-foreground mr-1">Régimen:</span>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los regímenes</SelectItem>
              {uniqueRegimes.slice(0, 15).map((reg) => (
                <SelectItem key={reg} value={reg} title={reg}>
                  {reg.length > 25 ? reg.slice(0, 25) + "..." : reg}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(searchQuery || typeFilter !== "all" || accountantFilter !== "all" || statusFilter !== "all" || regimeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearchQuery("");
              setTypeFilter("all");
              setAccountantFilter("all");
              setStatusFilter("all");
              setRegimeFilter("all");
              setCurrentPage(1);
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Main Container: Split View (Table Left + Slide Drawer Right if selected) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Clients Table Card (col-span-8 or 12) */}
        <div className={`${selectedClient ? "lg:col-span-8" : "lg:col-span-12"} transition-all space-y-4`}>
          <Card className="border-border/80 shadow-xs">
            <div className="p-3 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Contribuyentes ({filteredClients.length})
                </h3>
                {selectedIds.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedIds.length} seleccionados
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 text-xs rounded border border-border/80 bg-background px-2"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 text-[11px] text-muted-foreground hover:bg-muted/30">
                    <TableHead className="w-8 py-2.5">
                      <Checkbox
                        checked={selectedIds.length === filteredClients.length && filteredClients.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="py-2.5">Contribuyente</TableHead>
                    <TableHead className="py-2.5">RFC</TableHead>
                    <TableHead className="py-2.5 text-center">Tipo</TableHead>
                    <TableHead className="py-2.5">CIEC (SAT)</TableHead>
                    <TableHead className="py-2.5">Contador asignado</TableHead>
                    <TableHead className="py-2.5">Contacto / Encargado</TableHead>
                    <TableHead className="py-2.5 text-center">Estatus</TableHead>
                    <TableHead className="py-2.5 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {paginatedClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No se encontraron clientes que coincidan con los filtros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedClients.map((c) => {
                      const isSelected = selectedClient?.id === c.id;
                      const isCiecRevealed = !!revealedCiecIds[c.id];

                      return (
                        <TableRow
                          key={c.id}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/5 border-l-2 border-l-primary font-medium" : "hover:bg-muted/40"
                          }`}
                          onClick={() => setSelectedClientId(c.id)}
                        >
                          <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.includes(c.id)}
                              onCheckedChange={(checked) => handleSelectOne(c.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="py-2.5 max-w-[220px]">
                            <div>
                              <p className="font-semibold text-foreground text-xs leading-tight truncate" title={c.name}>
                                {c.name}
                              </p>
                              {c.legalName !== c.name && (
                                <p className="text-[10px] text-muted-foreground truncate" title={c.legalName}>
                                  {c.legalName}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5" title={c.regime}>
                                {c.regime}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] font-semibold text-foreground">
                            {c.rfc}
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 ${
                                c.personType === "Física"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              {c.personType}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                            {c.ciec ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] bg-muted/50 px-1.5 py-0.5 rounded border border-border/50 text-foreground">
                                  {isCiecRevealed ? c.ciec : "••••••"}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => toggleRevealCiec(c.id, e)}
                                  title={isCiecRevealed ? "Ocultar CIEC" : "Mostrar CIEC"}
                                >
                                  {isCiecRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(c.ciec);
                                    sileo.success({ title: "CIEC copiada al portapapeles" });
                                  }}
                                  title="Copiar contraseña CIEC"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60 text-[11px] italic">Sin CIEC</span>
                            )}
                          </TableCell>
                          <TableCell className="text-foreground py-2.5">
                            <span className="font-medium text-xs text-primary">{c.assignedAccountant}</span>
                          </TableCell>
                          <TableCell className="py-2.5 max-w-[150px]">
                            <p className="truncate text-xs font-medium text-foreground" title={c.contactName}>
                              {c.contactName}
                            </p>
                            {c.email && (
                              <p className="text-[10px] text-muted-foreground truncate" title={c.email}>
                                {c.email}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                c.status === "Activo"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : c.status === "Inactivo"
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-2.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={(e) => handleOpenEditModal(c, e)}
                                title="Editar cliente"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                asChild
                                title="Ver expediente"
                              >
                                <Link to={`/clients/${c.id}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={(e) => handleDeleteClient(c.id, c.name, e)}
                                title="Eliminar cliente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination footer */}
            <div className="p-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
              <span>
                Mostrando {(currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, filteredClients.length)} de {filteredClients.length} contribuyentes
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-medium text-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Slide-over / Detail Card */}
        {selectedClient && (
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-border/80 shadow-xs overflow-hidden">
              {/* Drawer Header */}
              <div className="p-4 bg-muted/20 border-b border-border/60 flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {selectedClient.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground leading-tight">
                        {selectedClient.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                      >
                        ● {selectedClient.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      {selectedClient.rfc}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedClientId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Drawer Tabs */}
              <div className="p-4 space-y-4">
                <Tabs defaultValue="info">
                  <TabsList className="w-full bg-muted/40 h-8">
                    <TabsTrigger value="info" className="flex-1 text-xs">
                      Datos Fiscales
                    </TabsTrigger>
                    <TabsTrigger value="contacto" className="flex-1 text-xs">
                      Contacto & Envío
                    </TabsTrigger>
                    <TabsTrigger value="notas" className="flex-1 text-xs">
                      Notas & SAT
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="pt-3 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-xs uppercase tracking-tight">
                        Datos del Contribuyente
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-primary gap-1"
                        onClick={() => handleOpenEditModal(selectedClient)}
                      >
                        <Edit className="h-3 w-3" /> Editar
                      </Button>
                    </div>

                    <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border/60">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Razón Social</span>
                        <span className="font-semibold text-foreground text-right max-w-[180px] truncate" title={selectedClient.legalName}>
                          {selectedClient.legalName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RFC</span>
                        <span className="font-mono font-semibold text-foreground">
                          {selectedClient.rfc}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo de persona</span>
                        <span className="font-medium text-foreground">
                          {selectedClient.personType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Régimen fiscal</span>
                        <span className="font-medium text-foreground text-right max-w-[180px] truncate" title={selectedClient.regime}>
                          {selectedClient.regime}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actividad económica</span>
                        <span className="font-medium text-foreground text-right max-w-[180px] truncate" title={selectedClient.economicActivity}>
                          {selectedClient.economicActivity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contador asignado</span>
                        <span className="font-semibold text-primary">
                          {selectedClient.assignedAccountant}
                        </span>
                      </div>
                    </div>

                    {/* SAT Access Credential Card */}
                    <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-900 font-semibold text-xs flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-amber-700" /> Clave CIEC (SAT)
                        </span>
                        {selectedClient.ciec && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleRevealCiec(selectedClient.id)}
                              className="text-amber-800 hover:text-amber-950 text-[10px] flex items-center gap-0.5"
                            >
                              {revealedCiecIds[selectedClient.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              {revealedCiecIds[selectedClient.id] ? "Ocultar" : "Mostrar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedClient.ciec);
                                sileo.success({ title: "CIEC copiada al portapapeles" });
                              }}
                              className="text-amber-900 hover:underline text-[10px] ml-1.5 flex items-center gap-0.5"
                            >
                              <Copy className="h-3 w-3" /> Copiar
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="font-mono text-xs font-semibold text-foreground select-all bg-white/70 p-1.5 rounded border border-amber-200/50">
                        {selectedClient.ciec ? (
                          revealedCiecIds[selectedClient.id] ? (
                            selectedClient.ciec
                          ) : (
                            "••••••••"
                          )
                        ) : (
                          <span className="text-muted-foreground italic font-sans">Sin contraseña CIEC registrada</span>
                        )}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="contacto" className="pt-3 space-y-3 text-xs">
                    <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border/60">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Encargado / Gestor</span>
                        <span className="font-semibold text-foreground">{selectedClient.contactName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Teléfono</span>
                        <span className="font-medium text-foreground">{selectedClient.phone || "No registrado"}</span>
                      </div>
                      <div className="flex flex-col gap-1 pt-1.5 border-t border-border/50">
                        <span className="text-muted-foreground">Correo de Contacto:</span>
                        <span className="font-medium text-foreground break-all bg-background p-1.5 rounded border">
                          {selectedClient.email || "No registrado"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 pt-1.5 border-t border-border/50">
                        <span className="text-muted-foreground">Correo Envío de Facturas:</span>
                        <span className="font-medium text-foreground break-all bg-background p-1.5 rounded border">
                          {selectedClient.invoiceEmail || "Mismo que contacto"}
                        </span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="notas" className="pt-3 space-y-3 text-xs">
                    <div className="p-3 bg-muted/20 rounded-lg border border-border/60 space-y-2">
                      <span className="font-bold text-foreground text-xs uppercase tracking-tight block">
                        Comentarios / Observaciones
                      </span>
                      {selectedClient.notes ? (
                        <p className="text-foreground leading-relaxed italic bg-background p-2.5 rounded border border-border/60">
                          "{selectedClient.notes}"
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic text-xs">
                          Sin comentarios o notas registradas para este contribuyente.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Card Footer Link */}
              <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-primary font-semibold flex items-center justify-center gap-1.5"
                  asChild
                >
                  <Link to={`/clients/${selectedClient.id}`}>
                    Ver expediente completo <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* New Client Modal */}
      <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateClient}>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Contribuyente</DialogTitle>
              <DialogDescription>
                Ingresa los datos fiscales y credenciales SAT del contribuyente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Nombre / Denominación *</label>
                  <Input
                    required
                    placeholder="Ej. TRANSPORTES TAMEZ"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Razón Social</label>
                  <Input
                    placeholder="Ej. AUTOTRANSPORTES TAMEZ SA DE CV"
                    value={clientForm.legalName}
                    onChange={(e) => setClientForm({ ...clientForm, legalName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">RFC *</label>
                  <Input
                    required
                    placeholder="AGC891104U38"
                    value={clientForm.rfc}
                    onChange={(e) => setClientForm({ ...clientForm, rfc: e.target.value })}
                    className="h-8 text-xs uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Tipo de Persona</label>
                  <select
                    value={clientForm.personType}
                    onChange={(e) => setClientForm({ ...clientForm, personType: e.target.value as any })}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-xs"
                  >
                    <option value="Moral">Moral</option>
                    <option value="Física">Física</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Contraseña CIEC (SAT)</label>
                  <Input
                    placeholder="Clave CIEC"
                    value={clientForm.ciec}
                    onChange={(e) => setClientForm({ ...clientForm, ciec: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Régimen Fiscal</label>
                  <Input
                    placeholder="Ej. Régimen General de Ley Personas Morales"
                    value={clientForm.regime}
                    onChange={(e) => setClientForm({ ...clientForm, regime: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Contador(a) Asignado</label>
                  <select
                    value={clientForm.assignedAccountant}
                    onChange={(e) => setClientForm({ ...clientForm, assignedAccountant: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-xs"
                  >
                    <option value="">-- Sin asignar --</option>
                    {uniqueAccountants.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Actividad Principal</label>
                <Input
                  placeholder="Ej. Otro autotransporte foráneo de carga general"
                  value={clientForm.economicActivity}
                  onChange={(e) => setClientForm({ ...clientForm, economicActivity: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Encargado / Contacto</label>
                  <Input
                    placeholder="Lic. Raquel Montalvo"
                    value={clientForm.contactName}
                    onChange={(e) => setClientForm({ ...clientForm, contactName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Teléfono</label>
                  <Input
                    placeholder="81 2010 3796"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Correo de Contacto</label>
                  <Input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Correo Envío de Factura</label>
                  <Input
                    placeholder="facturas@empresa.com"
                    value={clientForm.invoiceEmail}
                    onChange={(e) => setClientForm({ ...clientForm, invoiceEmail: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Comentarios / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Notas internas..."
                  value={clientForm.notes}
                  onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsNewClientOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                type="submit"
                disabled={createClientMutation.isPending}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
              >
                {createClientMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Client Modal */}
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleUpdateClient}>
            <DialogHeader>
              <DialogTitle>Editar Contribuyente</DialogTitle>
              <DialogDescription>
                Modifica los datos fiscales, CIEC o asignación contable.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Nombre / Denominación *</label>
                  <Input
                    required
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Razón Social</label>
                  <Input
                    value={clientForm.legalName}
                    onChange={(e) => setClientForm({ ...clientForm, legalName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">RFC *</label>
                  <Input
                    required
                    value={clientForm.rfc}
                    onChange={(e) => setClientForm({ ...clientForm, rfc: e.target.value })}
                    className="h-8 text-xs uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Tipo de Persona</label>
                  <select
                    value={clientForm.personType}
                    onChange={(e) => setClientForm({ ...clientForm, personType: e.target.value as any })}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-xs"
                  >
                    <option value="Moral">Moral</option>
                    <option value="Física">Física</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Contraseña CIEC (SAT)</label>
                  <Input
                    value={clientForm.ciec}
                    onChange={(e) => setClientForm({ ...clientForm, ciec: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Régimen Fiscal</label>
                  <Input
                    value={clientForm.regime}
                    onChange={(e) => setClientForm({ ...clientForm, regime: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Contador(a) Asignado</label>
                  <select
                    value={clientForm.assignedAccountant}
                    onChange={(e) => setClientForm({ ...clientForm, assignedAccountant: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-xs"
                  >
                    <option value="">-- Sin asignar --</option>
                    {uniqueAccountants.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Actividad Principal</label>
                <Input
                  value={clientForm.economicActivity}
                  onChange={(e) => setClientForm({ ...clientForm, economicActivity: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Encargado / Contacto</label>
                  <Input
                    value={clientForm.contactName}
                    onChange={(e) => setClientForm({ ...clientForm, contactName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Teléfono</label>
                  <Input
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Correo de Contacto</label>
                  <Input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Correo Envío de Factura</label>
                  <Input
                    value={clientForm.invoiceEmail}
                    onChange={(e) => setClientForm({ ...clientForm, invoiceEmail: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Comentarios / Observaciones</label>
                <textarea
                  rows={2}
                  value={clientForm.notes}
                  onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsEditClientOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                type="submit"
                disabled={updateClientMutation.isPending}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
              >
                {updateClientMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
