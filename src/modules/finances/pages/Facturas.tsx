import * as React from "react";
import {
  useInvoices,
  useFinanceClients,
  useProjects,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
} from "../hooks";
import { TablePagination } from "@/components/ui/TablePagination";
import { formatLocalDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sileo } from "sileo";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  Trash2,
  CheckCircle,
  Eye,
  AlertTriangle,
  Receipt,
  FileCheck,
  Clock,
  Edit3,
  Download,
  Filter,
  X,
} from "lucide-react";
import { exportInvoicesToExcel } from "../utils/excelInvoices";

export function Facturas() {
  // Queries & Mutations
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: clients = [], isLoading: clientsLoading } = useFinanceClients();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  const createInvoiceMutation = useCreateInvoice();
  const updateInvoiceMutation = useUpdateInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClientFilter, setSelectedClientFilter] = React.useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState("all");

  // Create Invoice Modal State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedClientId, setSelectedClientId] = React.useState("");
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [ivaRate, setIvaRate] = React.useState("0.16");
  const [notes, setNotes] = React.useState("");
  const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);

  // Detail Modal State
  const [selectedInvoice, setSelectedInvoice] = React.useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  // Edit Invoice Modal State
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingInvoice, setEditingInvoice] = React.useState<any>(null);
  const [editInvoiceNumber, setEditInvoiceNumber] = React.useState("");
  const [editIvaRate, setEditIvaRate] = React.useState("0.16");
  const [editNotes, setEditNotes] = React.useState("");
  const [editProjectIds, setEditProjectIds] = React.useState<string[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClientFilter, selectedStatusFilter]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  // KPI calculations
  const kpiStats = React.useMemo(() => {
    const activeInvoices = invoices.filter((inv) => inv.status !== "cancelled");
    const totalInvoiced = activeInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPending = invoices
      .filter((inv) => inv.status === "pending")
      .reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPaid = invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    const paidPct = totalInvoiced > 0 ? Math.min(100, (totalPaid / totalInvoiced) * 100) : 0;
    const pendingPct = totalInvoiced > 0 ? Math.min(100, (totalPending / totalInvoiced) * 100) : 0;

    return {
      totalInvoiced,
      totalPending,
      totalPaid,
      count: invoices.length,
      paidPct,
      pendingPct,
    };
  }, [invoices]);

  // Filter invoices
  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.client?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClient = selectedClientFilter === "all" || inv.client_id === selectedClientFilter;
      const matchesStatus = selectedStatusFilter === "all" || inv.status === selectedStatusFilter;

      return matchesSearch && matchesClient && matchesStatus;
    });
  }, [invoices, searchQuery, selectedClientFilter, selectedStatusFilter]);

  // Paginated Invoices
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = React.useMemo(() => {
    return filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  // Fetch unbilled projects for the selected client
  const unbilledProjects = React.useMemo(() => {
    if (!selectedClientId) return [];
    return projects.filter(
      (p) =>
        p.client_id === selectedClientId &&
        !p.invoice_id &&
        p.status !== "draft" &&
        p.status !== "cancelled"
    );
  }, [selectedClientId, projects]);

  // Calculations for new invoice
  const newInvoiceTotals = React.useMemo(() => {
    const selectedProjectsData = projects.filter((p) => selectedProjectIds.includes(p.id));
    const subtotal = selectedProjectsData.reduce((sum, p) => sum + Number(p.custom_price_total), 0);
    const parsedIvaRate = parseFloat(ivaRate);
    const iva = subtotal * parsedIvaRate;
    const total = subtotal + iva;

    return { subtotal, iva, total };
  }, [selectedProjectIds, projects, ivaRate]);

  // Fetch projects available for editing the invoice
  const editableProjects = React.useMemo(() => {
    if (!editingInvoice) return [];
    return projects.filter(
      (p) =>
        p.client_id === editingInvoice.client_id &&
        (p.invoice_id === editingInvoice.id || (!p.invoice_id && p.status !== "draft" && p.status !== "cancelled"))
    );
  }, [editingInvoice, projects]);

  // Calculations for editing invoice
  const editInvoiceTotals = React.useMemo(() => {
    if (!editingInvoice) return { subtotal: 0, iva: 0, total: 0 };
    const selectedProjectsData = projects.filter((p) => editProjectIds.includes(p.id));
    const subtotal = selectedProjectsData.reduce((sum, p) => sum + Number(p.custom_price_total), 0);
    const parsedIvaRate = parseFloat(editIvaRate);
    const iva = subtotal * parsedIvaRate;
    const total = subtotal + iva;

    return { subtotal, iva, total };
  }, [editProjectIds, projects, editIvaRate, editingInvoice]);

  // Auto-generate folio when opening modal
  React.useEffect(() => {
    if (isCreateOpen) {
      const nextNumber = invoices.length + 1;
      setInvoiceNumber(`FAC-${nextNumber.toString().padStart(3, "0")}`);
    }
  }, [isCreateOpen, invoices]);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectIds([]);
  };

  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      sileo.error({ title: "Debes seleccionar un cliente" });
      return;
    }
    if (!invoiceNumber.trim()) {
      sileo.error({ title: "El folio de la factura es obligatorio" });
      return;
    }
    if (selectedProjectIds.length === 0) {
      sileo.error({ title: "Debes seleccionar al menos un proyecto para facturar" });
      return;
    }

    try {
      await createInvoiceMutation.mutateAsync({
        client_id: selectedClientId,
        invoice_number: invoiceNumber.trim(),
        iva_rate: parseFloat(ivaRate),
        subtotal: newInvoiceTotals.subtotal,
        iva: newInvoiceTotals.iva,
        total: newInvoiceTotals.total,
        notes: notes.trim() || null,
        status: "pending",
        project_ids: selectedProjectIds,
      });

      sileo.success({ title: `Factura ${invoiceNumber} creada con éxito` });

      setIsCreateOpen(false);
      setSelectedClientId("");
      setInvoiceNumber("");
      setIvaRate("0.16");
      setNotes("");
      setSelectedProjectIds([]);
    } catch (err: any) {
      sileo.error({ title: "Error al crear factura", description: err.message });
    }
  };

  const handleChangeStatus = async (id: string, newStatus: "pending" | "paid" | "cancelled") => {
    try {
      await updateInvoiceMutation.mutateAsync({
        id,
        payload: { status: newStatus },
      });
      sileo.success({ title: "Estado de factura actualizado" });
    } catch (err: any) {
      sileo.error({ title: "Error al actualizar factura", description: err.message });
    }
  };

  const handleDeleteInvoice = async (id: string, folio: string) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar la factura ${folio}? Los proyectos vinculados quedarán liberados para volver a facturarse.`
      )
    ) {
      return;
    }

    try {
      await deleteInvoiceMutation.mutateAsync(id);
      sileo.success({ title: `Factura ${folio} eliminada` });
    } catch (err: any) {
      sileo.error({ title: "Error al eliminar factura", description: err.message });
    }
  };

  const handleShowDetail = (invoice: any) => {
    const invoiceProjects = projects.filter((p) => p.invoice_id === invoice.id);
    setSelectedInvoice({ ...invoice, projects: invoiceProjects });
    setIsDetailOpen(true);
  };

  const handleOpenEditDialog = (invoice: any) => {
    const invoiceProjects = projects.filter((p) => p.invoice_id === invoice.id);
    const linkedProjectIds = invoiceProjects.map((p) => p.id);

    setEditingInvoice(invoice);
    setEditInvoiceNumber(invoice.invoice_number);
    setEditIvaRate(invoice.iva_rate.toString());
    setEditNotes(invoice.notes || "");
    setEditProjectIds(linkedProjectIds);
    setIsEditOpen(true);
  };

  const handleToggleEditProject = (projectId: string) => {
    setEditProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleUpdateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    if (!editInvoiceNumber.trim()) {
      sileo.error({ title: "El folio de la factura es obligatorio" });
      return;
    }
    if (editProjectIds.length === 0) {
      sileo.error({ title: "Debes seleccionar al menos un proyecto para facturar" });
      return;
    }

    try {
      await updateInvoiceMutation.mutateAsync({
        id: editingInvoice.id,
        payload: {
          invoice_number: editInvoiceNumber.trim(),
          iva_rate: parseFloat(editIvaRate),
          subtotal: editInvoiceTotals.subtotal,
          iva: editInvoiceTotals.iva,
          total: editInvoiceTotals.total,
          notes: editNotes.trim() || null,
          project_ids: editProjectIds,
        },
      });

      sileo.success({ title: `Factura ${editInvoiceNumber} actualizada con éxito` });
      setIsEditOpen(false);
      setEditingInvoice(null);
    } catch (err: any) {
      sileo.error({ title: "Error al actualizar factura", description: err.message });
    }
  };

  if (invoicesLoading || clientsLoading || projectsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-xs text-muted-foreground font-medium">Cargando Facturas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Finanzas</span>
            <span>›</span>
            <span className="text-foreground font-medium">Facturación</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Facturas de Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Genera, consulta y administra facturas unificadas para múltiples proyectos por cliente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportInvoicesToExcel(filteredInvoices, projects)}
            disabled={filteredInvoices.length === 0}
            className="h-9 text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Exportar a Excel
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva Factura
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-blue-50/60 text-blue-700 border-blue-200">
              Vigente
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Total Facturado</p>
            <h3 className="text-xl font-bold text-foreground leading-tight mt-0.5">
              {formatCurrency(kpiStats.totalInvoiced)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={100} indicatorClassName="bg-blue-600" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Excluye facturas canceladas</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-amber-50/60 text-amber-700 border-amber-200">
              {kpiStats.pendingPct.toFixed(1)}%
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Pendiente de Cobro</p>
            <h3 className="text-xl font-bold text-amber-600 leading-tight mt-0.5">
              {formatCurrency(kpiStats.totalPending)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={kpiStats.pendingPct} indicatorClassName="bg-amber-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Facturas en estado Pendiente</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileCheck className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-emerald-50/60 text-emerald-700 border-emerald-200">
              {kpiStats.paidPct.toFixed(1)}%
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Total Cobrado</p>
            <h3 className="text-xl font-bold text-emerald-600 leading-tight mt-0.5">
              {formatCurrency(kpiStats.totalPaid)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={kpiStats.paidPct} indicatorClassName="bg-emerald-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Facturas en estado Pagada</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-indigo-50/60 text-indigo-700 border-indigo-200">
              CFDI
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Facturas Totales</p>
            <h3 className="text-xl font-bold text-foreground leading-tight mt-0.5">{kpiStats.count}</h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={kpiStats.paidPct} indicatorClassName="bg-indigo-600" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Historial completo en sistema</p>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-3 rounded-lg border border-border/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" /> Filtros:
          </div>

          <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
            <SelectTrigger className="w-[190px] h-8 text-xs bg-muted/20">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-muted/20">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="paid">Pagadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || selectedClientFilter !== "all" || selectedStatusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedClientFilter("all");
                setSelectedStatusFilter("all");
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Limpiar
            </Button>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground">
          Mostrando <span className="font-semibold text-foreground">{filteredInvoices.length}</span> de{" "}
          <span className="font-semibold text-foreground">{invoices.length}</span> facturas
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card shadow-xs border-border/80 overflow-hidden">
        <div className="p-3.5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Listado de Facturas</h3>
            <p className="text-[11px] text-muted-foreground">
              Consulta y actualiza los estatus fiscales y de cobro de tus clientes.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por folio o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/20"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="text-[11px] text-muted-foreground bg-muted/20">
              <TableHead className="py-2.5 w-[120px]">Folio</TableHead>
              <TableHead className="py-2.5">Cliente</TableHead>
              <TableHead className="py-2.5 text-center">Proyectos</TableHead>
              <TableHead className="py-2.5 text-right">Subtotal</TableHead>
              <TableHead className="py-2.5 text-right">IVA</TableHead>
              <TableHead className="py-2.5 text-right font-medium text-foreground">Total</TableHead>
              <TableHead className="py-2.5 text-center">Estado</TableHead>
              <TableHead className="py-2.5">Fecha</TableHead>
              <TableHead className="py-2.5 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {paginatedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                  No se encontraron facturas con los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((invoice) => {
                const linkedProjects = projects.filter((p) => p.invoice_id === invoice.id);
                return (
                  <TableRow key={invoice.id} className="hover:bg-muted/40">
                    <TableCell className="font-semibold text-[#1e3a5f]">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {invoice.invoice_number}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {invoice.client?.name || "Cliente Desconocido"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                        {linkedProjects.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(invoice.subtotal)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(invoice.iva)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      {invoice.status === "pending" && (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-normal py-0"
                        >
                          Pendiente
                        </Badge>
                      )}
                      {invoice.status === "paid" && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal py-0"
                        >
                          Pagada
                        </Badge>
                      )}
                      {invoice.status === "cancelled" && (
                        <Badge
                          variant="outline"
                          className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-normal py-0"
                        >
                          Cancelada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px] font-mono">
                      {formatLocalDate(new Date(invoice.created_at))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShowDetail(invoice)}
                          title="Ver detalle"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditDialog(invoice)}
                          title="Editar factura"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>

                        <Select
                          value={invoice.status}
                          onValueChange={(val: any) => handleChangeStatus(invoice.id, val)}
                        >
                          <SelectTrigger className="h-7 w-[105px] text-[11px] px-2 py-0.5 bg-muted/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="paid">Pagada</SelectItem>
                            <SelectItem value="cancelled">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_number)}
                          title="Eliminar factura"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
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

        <div className="p-3 border-t border-border/50">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredInvoices.length}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </Card>

      {/* Nueva Factura Modal Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Crear Factura para Cliente
            </DialogTitle>
            <DialogDescription>
              Unifica y factura múltiples proyectos aprobados para un mismo cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvoice} className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-select" className="font-semibold">
                    Cliente <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedClientId} onValueChange={handleClientChange}>
                    <SelectTrigger id="client-select">
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="folio-input" className="font-semibold">
                    Folio de Factura <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="folio-input"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="FAC-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iva-select" className="font-semibold">
                    Tasa IVA
                  </Label>
                  <Select value={ivaRate} onValueChange={setIvaRate}>
                    <SelectTrigger id="iva-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.16">16% (IVA General)</SelectItem>
                      <SelectItem value="0.08">8% (Zona Fronteriza)</SelectItem>
                      <SelectItem value="0.00">0% (Tasa Cero / Exento)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes-textarea" className="font-semibold">
                    Notas / Conceptos adicionales
                  </Label>
                  <textarea
                    id="notes-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Anticipo por servicios textiles, entrega de uniformes deportivos..."
                    className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex flex-col border rounded-lg overflow-hidden bg-muted/20">
                <div className="bg-muted px-4 py-2 border-b">
                  <span className="text-sm font-semibold text-foreground">
                    Proyectos Disponibles para Facturar
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[300px]">
                  {!selectedClientId ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground/60 mb-2" />
                      <span className="text-xs">
                        Selecciona un cliente para cargar sus proyectos pendientes de facturar.
                      </span>
                    </div>
                  ) : unbilledProjects.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 text-emerald-500/60 mb-2" />
                      <span className="text-xs">
                        Este cliente no tiene proyectos aprobados pendientes de facturación.
                      </span>
                    </div>
                  ) : (
                    unbilledProjects.map((p) => {
                      const isChecked = selectedProjectIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-all hover:bg-background ${
                            isChecked ? "border-primary bg-primary/5" : "border-border bg-background/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleProject(p.id)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                            <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                              <span className="text-muted-foreground">
                                Importe: {formatCurrency(p.custom_price_total)}
                              </span>
                              <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 scale-95 origin-right">
                                {p.status}
                              </Badge>
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {selectedProjectIds.length > 0 && (
              <div className="bg-muted/40 rounded-lg p-4 border space-y-2 text-sm max-w-md ml-auto">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({selectedProjectIds.length} proyecto(s)):</span>
                  <span className="font-medium text-foreground">{formatCurrency(newInvoiceTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground border-b pb-2">
                  <span>IVA ({(parseFloat(ivaRate) * 100).toFixed(0)}%):</span>
                  <span className="font-medium text-foreground">{formatCurrency(newInvoiceTotals.iva)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-foreground pt-1">
                  <span>Total Facturado:</span>
                  <span className="text-primary">{formatCurrency(newInvoiceTotals.total)}</span>
                </div>
              </div>
            )}
          </form>

          <DialogFooter className="border-t pt-4">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={createInvoiceMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={createInvoiceMutation.isPending || selectedProjectIds.length === 0}
              className="flex items-center gap-1.5 bg-[#1e3a5f] hover:bg-[#152a45] text-white"
            >
              {createInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" /> Registrar Factura
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Factura {selectedInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              Detalles fiscales y proyectos vinculados a esta facturación.
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-muted/20 p-4 border rounded-lg text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Cliente</span>
                  <span className="font-semibold text-foreground">{selectedInvoice.client?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Estatus de Factura</span>
                  <span className="mt-1 block">
                    {selectedInvoice.status === "pending" && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Pendiente
                      </Badge>
                    )}
                    {selectedInvoice.status === "paid" && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Pagada
                      </Badge>
                    )}
                    {selectedInvoice.status === "cancelled" && (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                        Cancelada
                      </Badge>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Fecha de Registro</span>
                  <span className="font-medium text-foreground">
                    {formatLocalDate(new Date(selectedInvoice.created_at))}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Subtotal</span>
                  <span className="font-medium text-foreground">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    IVA ({(Number(selectedInvoice.iva_rate) * 100).toFixed(0)}%)
                  </span>
                  <span className="font-medium text-foreground">{formatCurrency(selectedInvoice.iva)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Importe Total</span>
                  <span className="font-bold text-primary">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">Notas / Comentarios</span>
                  <div className="p-3 border rounded-lg bg-background text-sm whitespace-pre-wrap text-muted-foreground">
                    {selectedInvoice.notes}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-semibold">Proyectos Incluidos en Factura</span>
                <div className="border rounded-lg overflow-hidden bg-background">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead>Nombre del Proyecto</TableHead>
                        <TableHead className="text-center">Estado Proyecto</TableHead>
                        <TableHead className="text-right">Precio Pactado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.projects?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-xs">
                            No hay proyectos asociados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedInvoice.projects?.map((proj: any) => (
                          <TableRow key={proj.id} className="text-sm">
                            <TableCell className="font-medium">{proj.name}</TableCell>
                            <TableCell className="text-center uppercase text-xs text-muted-foreground">
                              <Badge variant="outline" className="scale-90 font-medium">
                                {proj.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(proj.custom_price_total)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button onClick={() => setIsDetailOpen(false)} className="px-5 bg-[#1e3a5f] hover:bg-[#152a45] text-white">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar Factura Modal Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Editar Factura {editingInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              Modifica los detalles de la factura y los proyectos asociados.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateInvoiceSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold block">Cliente</Label>
                  <div className="p-2 border rounded-md bg-muted text-sm text-foreground font-semibold">
                    {editingInvoice?.client?.name || "Cargando..."}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-folio-input" className="font-semibold">
                    Folio de Factura <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-folio-input"
                    value={editInvoiceNumber}
                    onChange={(e) => setEditInvoiceNumber(e.target.value)}
                    placeholder="FAC-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-iva-select" className="font-semibold">
                    Tasa IVA
                  </Label>
                  <Select value={editIvaRate} onValueChange={setEditIvaRate}>
                    <SelectTrigger id="edit-iva-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.16">16% (IVA General)</SelectItem>
                      <SelectItem value="0.08">8% (Zona Fronteriza)</SelectItem>
                      <SelectItem value="0.00">0% (Tasa Cero / Exento)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-notes-textarea" className="font-semibold">
                    Notas / Conceptos adicionales
                  </Label>
                  <textarea
                    id="edit-notes-textarea"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Ej. Anticipo por servicios textiles..."
                    className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex flex-col border rounded-lg overflow-hidden bg-muted/20">
                <div className="bg-muted px-4 py-2 border-b">
                  <span className="text-sm font-semibold text-foreground">
                    Proyectos en Factura & Disponibles
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[300px]">
                  {editableProjects.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground/60 mb-2" />
                      <span className="text-xs">No hay proyectos disponibles para este cliente.</span>
                    </div>
                  ) : (
                    editableProjects.map((p) => {
                      const isChecked = editProjectIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-all hover:bg-background ${
                            isChecked ? "border-primary bg-primary/5" : "border-border bg-background/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleEditProject(p.id)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                            <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                              <span className="text-muted-foreground">
                                Importe: {formatCurrency(p.custom_price_total)}
                              </span>
                              {p.invoice_id === editingInvoice?.id ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] uppercase px-1 py-0 scale-95 origin-right"
                                >
                                  Vinculado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 scale-95 origin-right">
                                  {p.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {editProjectIds.length > 0 && (
              <div className="bg-muted/40 rounded-lg p-4 border space-y-2 text-sm max-w-md ml-auto">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({editProjectIds.length} proyecto(s)):</span>
                  <span className="font-medium text-foreground">{formatCurrency(editInvoiceTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground border-b pb-2">
                  <span>IVA ({(parseFloat(editIvaRate) * 100).toFixed(0)}%):</span>
                  <span className="font-medium text-foreground">{formatCurrency(editInvoiceTotals.iva)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-foreground pt-1">
                  <span>Total Facturado:</span>
                  <span className="text-primary">{formatCurrency(editInvoiceTotals.total)}</span>
                </div>
              </div>
            )}
          </form>

          <DialogFooter className="border-t pt-4">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} disabled={updateInvoiceMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateInvoiceSubmit}
              disabled={updateInvoiceMutation.isPending || editProjectIds.length === 0}
              className="flex items-center gap-1.5 bg-[#1e3a5f] hover:bg-[#152a45] text-white"
            >
              {updateInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" /> Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
