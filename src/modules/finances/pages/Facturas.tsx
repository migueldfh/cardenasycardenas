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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

    return {
      totalInvoiced,
      totalPending,
      totalPaid,
      count: invoices.length,
    };
  }, [invoices]);

  // Filter invoices
  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch = inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.client?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesClient = selectedClientFilter === "all" || inv.client_id === selectedClientFilter;
      const matchesStatus = selectedStatusFilter === "all" || inv.status === selectedStatusFilter;

      return matchesSearch && matchesClient && matchesStatus;
    });
  }, [invoices, searchQuery, selectedClientFilter, selectedStatusFilter]);

  // Paginated Invoices
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = React.useMemo(() => {
    return filteredInvoices.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
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
  // This includes projects currently linked to this invoice, plus unbilled ones
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

  // Handle Client Selection change
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectIds([]); // clear selection
  };

  // Handle Toggle Project selection
  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  // Create Invoice Submission
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
      
      // Reset & Close
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

  // Change Invoice Status
  const handleChangeStatus = async (id: string, newStatus: 'pending' | 'paid' | 'cancelled') => {
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

  // Delete Invoice
  const handleDeleteInvoice = async (id: string, folio: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la factura ${folio}? Los proyectos vinculados quedarán liberados para volver a facturarse.`)) {
      return;
    }

    try {
      await deleteInvoiceMutation.mutateAsync(id);
      sileo.success({ title: `Factura ${folio} eliminada` });
    } catch (err: any) {
      sileo.error({ title: "Error al eliminar factura", description: err.message });
    }
  };

  // Show Invoice Detail Dialog
  const handleShowDetail = (invoice: any) => {
    // Find all projects associated with this invoice (either embedded or fetched)
    const invoiceProjects = projects.filter((p) => p.invoice_id === invoice.id);
    setSelectedInvoice({ ...invoice, projects: invoiceProjects });
    setIsDetailOpen(true);
  };

  // Open Edit Invoice Dialog
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

  // Toggle Project selection in Edit Modal
  const handleToggleEditProject = (projectId: string) => {
    setEditProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  // Update Invoice Submission
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground font-medium">Cargando Facturas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas de Clientes</h1>
          <p className="text-muted-foreground text-sm">
            Genera, consulta y administra facturas unificadas para múltiples proyectos por cliente.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nueva Factura
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Facturado
            </CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiStats.totalInvoiced)}</div>
            <p className="text-[10px] text-muted-foreground">Excluye facturas canceladas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Pendiente de Cobro
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(kpiStats.totalPending)}
            </div>
            <p className="text-[10px] text-muted-foreground">Facturas en estado Pendiente</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Cobrado
            </CardTitle>
            <FileCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(kpiStats.totalPaid)}
            </div>
            <p className="text-[10px] text-muted-foreground">Facturas en estado Pagada</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Facturas Totales
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiStats.count}</div>
            <p className="text-[10px] text-muted-foreground">Historial completo en sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and List */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle>Listado de Facturas</CardTitle>
          <CardDescription>Consulta y actualiza los estatus fiscales y de cobro de tus clientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio o cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex flex-wrap w-full md:w-auto gap-2 items-center">
              {/* Client Filter */}
              <div className="w-[180px]">
                <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
                  <SelectTrigger>
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
              </div>

              {/* Status Filter */}
              <div className="w-[150px]">
                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="paid">Pagadas</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(searchQuery || selectedClientFilter !== "all" || selectedStatusFilter !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedClientFilter("all");
                    setSelectedStatusFilter("all");
                  }}
                  className="text-xs h-9"
                >
                  Limpiar Filtros
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => exportInvoicesToExcel(filteredInvoices, projects)}
                className="flex items-center gap-1.5 h-9 text-xs"
                disabled={filteredInvoices.length === 0}
              >
                <Download className="h-4 w-4" /> Exportar a Excel
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Folio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Proyectos</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right font-medium text-foreground">Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                      No se encontraron facturas con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice) => {
                    const linkedProjects = projects.filter((p) => p.invoice_id === invoice.id);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-semibold text-primary">
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            {invoice.invoice_number}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{invoice.client?.name || "Cliente Desconocido"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="px-2 py-0.5">
                            {linkedProjects.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.subtotal)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.iva)}</TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell className="text-center">
                          {invoice.status === "pending" && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Pendiente
                            </Badge>
                          )}
                          {invoice.status === "paid" && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              Pagada
                            </Badge>
                          )}
                          {invoice.status === "cancelled" && (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              Cancelada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatLocalDate(new Date(invoice.created_at))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleShowDetail(invoice)}
                              title="Ver detalle"
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditDialog(invoice)}
                              title="Editar factura"
                              className="h-8 w-8"
                            >
                              <Edit3 className="h-4 w-4 text-muted-foreground" />
                            </Button>

                            {/* Dropdown for Status Change */}
                            <Select
                              value={invoice.status}
                              onValueChange={(val: any) => handleChangeStatus(invoice.id, val)}
                            >
                              <SelectTrigger className="h-8 w-[110px] text-xs px-2 py-1">
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
                              className="h-8 w-8 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredInvoices.length}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </CardContent>
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
              {/* Left Column: Form Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-select" className="font-semibold">Cliente <span className="text-red-500">*</span></Label>
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
                  <Label htmlFor="folio-input" className="font-semibold">Folio de Factura <span className="text-red-500">*</span></Label>
                  <Input
                    id="folio-input"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="FAC-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iva-select" className="font-semibold">Tasa IVA</Label>
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
                  <Label htmlFor="notes-textarea" className="font-semibold">Notas / Conceptos adicionales</Label>
                  <textarea
                    id="notes-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Anticipo por servicios textiles, entrega de uniformes deportivos..."
                    className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Right Column: Projects Selection */}
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
                      <span className="text-xs">Selecciona un cliente para cargar sus proyectos pendientes de facturar.</span>
                    </div>
                  ) : unbilledProjects.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 text-emerald-500/60 mb-2" />
                      <span className="text-xs">Este cliente no tiene proyectos aprobados pendientes de facturación.</span>
                    </div>
                  ) : (
                    unbilledProjects.map((p) => {
                      const isChecked = selectedProjectIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-all hover:bg-background ${
                            isChecked
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-border bg-background/50"
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

            {/* Price Calculations */}
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
              className="flex items-center gap-1.5"
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
              {/* Metadata Card */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-muted/20 p-4 border rounded-lg text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Cliente</span>
                  <span className="font-semibold text-foreground">{selectedInvoice.client?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Estatus de Factura</span>
                  <span className="mt-1 block">
                    {selectedInvoice.status === "pending" && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        Pendiente
                      </Badge>
                    )}
                    {selectedInvoice.status === "paid" && (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Pagada
                      </Badge>
                    )}
                    {selectedInvoice.status === "cancelled" && (
                      <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
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
                  <span className="text-xs text-muted-foreground block">IVA ({(Number(selectedInvoice.iva_rate) * 100).toFixed(0)}%)</span>
                  <span className="font-medium text-foreground">{formatCurrency(selectedInvoice.iva)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Importe Total</span>
                  <span className="font-bold text-primary">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">Notas / Comentarios</span>
                  <div className="p-3 border rounded-lg bg-background text-sm whitespace-pre-wrap text-muted-foreground">
                    {selectedInvoice.notes}
                  </div>
                </div>
              )}

              {/* Linked Projects */}
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
            <Button onClick={() => setIsDetailOpen(false)} className="px-5">
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
              {/* Left Column: Form Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold block">Cliente</Label>
                  <div className="p-2 border rounded-md bg-muted text-sm text-foreground font-semibold">
                    {editingInvoice?.client?.name || "Cargando..."}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-folio-input" className="font-semibold">Folio de Factura <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-folio-input"
                    value={editInvoiceNumber}
                    onChange={(e) => setEditInvoiceNumber(e.target.value)}
                    placeholder="FAC-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-iva-select" className="font-semibold">Tasa IVA</Label>
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
                  <Label htmlFor="edit-notes-textarea" className="font-semibold">Notas / Conceptos adicionales</Label>
                  <textarea
                    id="edit-notes-textarea"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Ej. Anticipo por servicios textiles..."
                    className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Right Column: Projects Selection */}
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
                            isChecked
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-border bg-background/50"
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
                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[9px] uppercase px-1 py-0 scale-95 origin-right">
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

            {/* Price Calculations */}
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
              className="flex items-center gap-1.5"
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
