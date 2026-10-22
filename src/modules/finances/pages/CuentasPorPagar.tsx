import * as React from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  useExpenses,
  useUpdateExpense,
  useCreateExpenseRemission,
  useUpdateExpenseRemission,
  useDeleteExpenseRemission,
  useProjects,
} from "../hooks";
import { TablePagination } from "@/components/ui/TablePagination";
import { uploadRemissionFile } from "../api";
import { parseLocalDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sileo } from "sileo";
import {
  Calendar,
  Check,
  AlertTriangle,
  FileText,
  ExternalLink,
  Paperclip,
  Loader2,
  Trash2,
  Search,
  X,
  Coins,
  TrendingDown,
  Filter,
  Download,
} from "lucide-react";

export function CuentasPorPagar() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: projects = [] } = useProjects();
  const updateExpenseMutation = useUpdateExpense();

  // Remissions State
  const [activeExpenseForRemissions, setActiveExpenseForRemissions] = React.useState<any | null>(null);
  const [remissionForm, setRemissionForm] = React.useState({
    folio: "",
    is_paid: false,
    amount: "",
    paid_amount: "",
    project_id: "",
  });
  const [remissionFile, setRemissionFile] = React.useState<File | null>(null);
  const [isUploadingRemission, setIsUploadingRemission] = React.useState(false);

  const createRemissionMutation = useCreateExpenseRemission();
  const updateRemissionMutation = useUpdateExpenseRemission();
  const deleteRemissionMutation = useDeleteExpenseRemission();

  const currentExpense = activeExpenseForRemissions
    ? expenses.find((e) => e.id === activeExpenseForRemissions.id) || activeExpenseForRemissions
    : null;

  const getExpenseDebt = (e: any) => {
    if (e.remissions && e.remissions.length > 0) {
      const remissionsPaidSum = e.remissions.reduce((sum: number, r: any) => sum + Number(r.paid_amount || 0), 0);
      return Math.max(0, Number(e.amount) - remissionsPaidSum);
    }
    return e.status === "paid" ? 0 : Number(e.amount);
  };

  const getSupplierRemainingDebt = (supplierId?: string | null) => {
    if (!supplierId) return 0;
    return expenses
      .filter((e) => e.supplier_id === supplierId)
      .reduce((sum, e) => sum + getExpenseDebt(e), 0);
  };

  const handleAddRemission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpense || !remissionForm.folio) return;

    setIsUploadingRemission(true);
    try {
      let file_url = null;
      if (remissionFile) {
        file_url = await uploadRemissionFile(remissionFile);
      }

      const amountVal = parseFloat(remissionForm.amount) || 0;
      const paidAmountVal = parseFloat(remissionForm.paid_amount) || 0;
      const isPaidNow = remissionForm.is_paid || (amountVal > 0 && paidAmountVal >= amountVal);

      await createRemissionMutation.mutateAsync({
        expense_id: currentExpense.id,
        project_id: remissionForm.project_id && remissionForm.project_id !== "none" ? remissionForm.project_id : null,
        folio: remissionForm.folio,
        file_url,
        is_paid: isPaidNow,
        amount: amountVal,
        paid_amount: paidAmountVal,
      });

      sileo.success({ title: "Remisión agregada correctamente" });
      setRemissionForm({ folio: "", is_paid: false, amount: "", paid_amount: "", project_id: "" });
      setRemissionFile(null);
      const fileInput = document.getElementById("rem_file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      sileo.error({ title: `Error al subir remisión: ${err.message}` });
    } finally {
      setIsUploadingRemission(false);
    }
  };

  const handleUpdateRemissionPayment = async (remissionId: string, newPaidAmount: number, totalAmount: number) => {
    try {
      const isPaidNow = totalAmount > 0 && newPaidAmount >= totalAmount;
      await updateRemissionMutation.mutateAsync({
        id: remissionId,
        payload: { paid_amount: newPaidAmount, is_paid: isPaidNow },
      });
      sileo.success({ title: "Pago de remisión registrado" });
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    }
  };

  const handleToggleRemissionPaid = async (remissionId: string, currentStatus: boolean, totalAmount: number) => {
    try {
      const newPaidAmount = !currentStatus ? totalAmount : 0;
      await updateRemissionMutation.mutateAsync({
        id: remissionId,
        payload: { is_paid: !currentStatus, paid_amount: newPaidAmount },
      });
      sileo.success({ title: "Estado de la remisión actualizado" });
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    }
  };

  const handleDeleteRemission = async (remissionId: string) => {
    try {
      await deleteRemissionMutation.mutateAsync(remissionId);
      sileo.success({ title: "Remisión eliminada" });
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await updateExpenseMutation.mutateAsync({
        id,
        payload: {
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "transfer",
        },
      });
      sileo.success({ title: "Pago liquidado correctamente" });
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    }
  };

  const getDaysRemaining = (dueDateStr?: string | null) => {
    if (!dueDateStr) return { days: 0, label: "Sin fecha", isOverdue: false };
    const due = parseLocalDate(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: diffDays, label: `Atrasada por ${Math.abs(diffDays)} días`, isOverdue: true };
    } else if (diffDays === 0) {
      return { days: diffDays, label: "Vence hoy", isOverdue: true };
    } else {
      return { days: diffDays, label: `Quedan ${diffDays} días`, isOverdue: false };
    }
  };

  const pendingBills = React.useMemo(() => {
    return expenses
      .filter((e) => e.status !== "paid")
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return parseLocalDate(a.due_date).getTime() - parseLocalDate(b.due_date).getTime();
      });
  }, [expenses]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const filteredBills = React.useMemo(() => {
    return pendingBills.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (b.concept && b.concept.toLowerCase().includes(q)) ||
        (b.supplier?.legal_name && b.supplier.legal_name.toLowerCase().includes(q)) ||
        (b.supplier?.fiscal_name && b.supplier.fiscal_name.toLowerCase().includes(q)) ||
        (b.category?.name && b.category.name.toLowerCase().includes(q)) ||
        (b.amount && String(b.amount).includes(q));

      const remaining = getDaysRemaining(b.due_date);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "overdue" && remaining.isOverdue) ||
        (statusFilter === "upcoming" && !remaining.isOverdue);

      return matchesSearch && matchesStatus;
    });
  }, [pendingBills, searchQuery, statusFilter]);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const paginatedBills = React.useMemo(() => {
    return filteredBills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredBills, currentPage, itemsPerPage]);

  const totalAmountPending = pendingBills.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalNetDebt = pendingBills.reduce((sum, item) => sum + getExpenseDebt(item), 0);
  const overdueBills = pendingBills.filter((b) => getDaysRemaining(b.due_date).isOverdue);
  const overdueRatio = pendingBills.length > 0 ? (overdueBills.length / pendingBills.length) * 100 : 0;

  const handleExportCSV = () => {
    if (filteredBills.length === 0) return;
    const headers = ["Proveedor", "Concepto", "Categoría", "Vencimiento", "Estatus", "Monto Total", "Saldo Pendiente"];
    const rows = filteredBills.map((b) => [
      `"${(b.supplier?.legal_name || "Proveedor General").replace(/"/g, '""')}"`,
      `"${(b.concept || "-").replace(/"/g, '""')}"`,
      `"${(b.category?.name || "Operaciones").replace(/"/g, '""')}"`,
      b.due_date || "-",
      `"${getDaysRemaining(b.due_date).label}"`,
      Number(b.amount || 0).toFixed(2),
      Number(getExpenseDebt(b)).toFixed(2),
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cuentas_por_pagar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Finanzas</span>
            <span>›</span>
            <span className="text-foreground font-medium">Cuentas por Pagar</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cuentas por Pagar (Proveedores)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control de obligaciones y facturas de proveedores pendientes de liquidar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={handleExportCSV}
            disabled={filteredBills.length === 0}
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-amber-50/60 text-amber-700 border-amber-200">
              Total facturado
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Monto Total Pendiente</p>
            <h3 className="text-xl font-bold text-amber-600 leading-tight mt-0.5">
              {formatCurrency(totalAmountPending)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={100} indicatorClassName="bg-amber-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Importe bruto de facturas a crédito</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-rose-50/60 text-rose-700 border-rose-200">
              Por liquidar
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Saldo Restante Real</p>
            <h3 className="text-xl font-bold text-rose-600 leading-tight mt-0.5">
              {formatCurrency(totalNetDebt)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress
              value={totalAmountPending > 0 ? Math.min(100, (totalNetDebt / totalAmountPending) * 100) : 0}
              indicatorClassName="bg-rose-500"
              className="h-1.5"
            />
            <p className="text-[10px] text-muted-foreground">Descontando abonos en remisiones</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-blue-50/60 text-blue-700 border-blue-200">
              Activas
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Cuentas Pendientes</p>
            <h3 className="text-xl font-bold text-foreground leading-tight mt-0.5">
              {pendingBills.length} facturas
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={Math.max(0, 100 - overdueRatio)} indicatorClassName="bg-blue-600" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Cuentas de proveedores abiertas</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-rose-50/60 text-rose-700 border-rose-200">
              {overdueRatio.toFixed(0)}% vencidas
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Cuentas Vencidas</p>
            <h3 className="text-xl font-bold text-rose-600 leading-tight mt-0.5">
              {overdueBills.length} facturas
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={overdueRatio} indicatorClassName="bg-rose-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Requieren atención inmediata</p>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-3 rounded-lg border border-border/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" /> Filtros:
          </div>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[170px] h-8 text-xs bg-muted/20">
              <SelectValue placeholder="Vencimiento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las cuentas</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
              <SelectItem value="upcoming">En tiempo</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground">
          Mostrando <span className="font-semibold text-foreground">{filteredBills.length}</span> de{" "}
          <span className="font-semibold text-foreground">{pendingBills.length}</span> cuentas por pagar
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card shadow-xs border-border/80 overflow-hidden">
        <div className="p-3.5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Listado de Cuentas Pendientes</h3>
            <p className="text-[11px] text-muted-foreground">
              Visualiza las fechas límite de pago y liquida facturas o remisiones pendientes.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar proveedor, concepto, categoría..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-xs bg-muted/20"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Cargando cuentas por pagar...</span>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            {pendingBills.length === 0
              ? "No hay cuentas pendientes por pagar."
              : "No se encontraron cuentas con los filtros seleccionados."}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] text-muted-foreground bg-muted/20">
                  <TableHead className="py-2.5">Proveedor</TableHead>
                  <TableHead className="py-2.5">Concepto</TableHead>
                  <TableHead className="py-2.5">Categoría</TableHead>
                  <TableHead className="py-2.5">Vencimiento</TableHead>
                  <TableHead className="py-2.5">Estatus Vencimiento</TableHead>
                  <TableHead className="py-2.5">Remisiones</TableHead>
                  <TableHead className="py-2.5">Monto</TableHead>
                  <TableHead className="py-2.5 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {paginatedBills.map((b) => {
                  const remaining = getDaysRemaining(b.due_date);
                  return (
                    <TableRow
                      key={b.id}
                      className={remaining.isOverdue ? "bg-rose-50/40 hover:bg-rose-50/70" : "hover:bg-muted/40"}
                    >
                      <TableCell className="font-semibold text-foreground">
                        <div>
                          <span>{b.supplier?.legal_name || "Proveedor General"}</span>
                          {b.supplier?.id && (
                            <span className="text-[10px] text-amber-600 block font-medium">
                              Deuda total: {formatCurrency(getSupplierRemainingDebt(b.supplier.id))}
                            </span>
                          )}
                          {b.supplier?.fiscal_name && (
                            <span className="text-[10px] text-muted-foreground block font-normal font-mono">
                              {b.supplier.fiscal_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{b.concept}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 text-[11px]">
                          <span
                            className="inline-block h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: b.category?.color_code || "#64748b" }}
                          />
                          <span>{b.category?.name || "Operaciones"}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1 text-muted-foreground" />
                        {b.due_date || "-"}
                      </TableCell>
                      <TableCell>
                        {remaining.isOverdue ? (
                          <Badge
                            variant="outline"
                            className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-normal py-0 inline-flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {remaining.label}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal py-0"
                          >
                            {remaining.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2"
                          onClick={() => setActiveExpenseForRemissions(b)}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Ver ({b.remissions?.length || 0})
                        </Button>
                      </TableCell>
                      <TableCell className="font-bold text-rose-600 whitespace-nowrap">
                        <div>
                          <span>{formatCurrency(b.amount)}</span>
                          {b.remissions && b.remissions.length > 0 && (
                            <span className="text-[10px] text-muted-foreground block font-normal">
                              Pendiente: {formatCurrency(getExpenseDebt(b))}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(b.id)}
                          className="h-7 text-[11px] px-2.5 bg-[#1e3a5f] hover:bg-[#152a45] text-white"
                        >
                          <Check className="h-3 w-3 mr-1" /> Registrar Pago
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="p-3 border-t border-border/50">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredBills.length}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* Dialog: Manage Remissions */}
      <Dialog open={!!currentExpense} onOpenChange={(open) => !open && setActiveExpenseForRemissions(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Gestionar Remisiones</DialogTitle>
            <DialogDescription>
              Administra las remisiones y comprobantes de entrega para el gasto:{" "}
              <strong className="text-foreground">{currentExpense?.concept}</strong> (
              {formatCurrency(currentExpense?.amount || 0)})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* List of Remissions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Remisiones Registradas</h4>
              {!currentExpense?.remissions || currentExpense.remissions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No hay remisiones asociadas a este gasto.</p>
              ) : (
                <div className="border rounded-md divide-y max-h-[250px] overflow-y-auto">
                  {[...currentExpense.remissions]
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((rem: any) => (
                      <div key={rem.id} className="flex items-center justify-between p-3 text-sm">
                        <div className="flex flex-col gap-1.5 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="font-semibold">Folio: {rem.folio}</p>
                            {rem.project && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                                Proyecto: {rem.project.name}
                              </span>
                            )}
                            {rem.file_url && (
                              <a
                                href={rem.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 text-xs font-semibold"
                              >
                                <Paperclip className="h-3 w-3" /> Ver Archivo <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground grid grid-cols-3 gap-2 max-w-sm mb-1">
                            <span>Monto: {formatCurrency(rem.amount || 0)}</span>
                            <span>Pagado: {formatCurrency(rem.paid_amount || 0)}</span>
                            <span className="font-semibold text-foreground">
                              Restante: {formatCurrency(Math.max(0, (rem.amount || 0) - (rem.paid_amount || 0)))}
                            </span>
                          </div>

                          {/* Visual slider of completion (Progress bar) */}
                          <div className="space-y-1 my-2 max-w-sm pr-4">
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, ((rem.paid_amount || 0) / (rem.amount || 1)) * 100)
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                              <span>Pagado: {Math.round(((rem.paid_amount || 0) / (rem.amount || 1)) * 100)}%</span>
                              <span>
                                Restante:{" "}
                                {Math.round(
                                  (Math.max(0, (rem.amount || 0) - (rem.paid_amount || 0)) / (rem.amount || 1)) * 100
                                )}
                                %
                              </span>
                            </div>
                          </div>

                          {/* inline abono register */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">Abonar:</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="h-7 w-20 text-xs px-2"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const val = parseFloat((e.target as HTMLInputElement).value);
                                  if (val > 0) {
                                    handleUpdateRemissionPayment(rem.id, (rem.paid_amount || 0) + val, rem.amount || 0);
                                    (e.target as HTMLInputElement).value = "";
                                  }
                                }
                              }}
                            />
                            <span className="text-[9px] text-muted-foreground italic">(Presiona Enter)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={rem.is_paid ? "default" : "outline"}
                            className={rem.is_paid ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                            onClick={() => handleToggleRemissionPaid(rem.id, rem.is_paid, rem.amount || 0)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            {rem.is_paid ? "Pagado" : "Pendiente"}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteRemission(rem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Add New Remission Form */}
            <form onSubmit={handleAddRemission} className="border-t pt-4 space-y-4">
              <h4 className="font-semibold text-sm">Agregar Nueva Remisión</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="rem_folio">Folio / Referencia *</Label>
                  <Input
                    id="rem_folio"
                    value={remissionForm.folio}
                    onChange={(e) => setRemissionForm({ ...remissionForm, folio: e.target.value })}
                    placeholder="Ej: REM-1002"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rem_file">Archivo de Remisión (Opcional)</Label>
                  <Input
                    id="rem_file"
                    type="file"
                    onChange={(e) => setRemissionFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="rem_proj">Proyecto Asociado (Opcional)</Label>
                <SearchableSelect
                  triggerId="rem_proj"
                  value={remissionForm.project_id || "none"}
                  onValueChange={(val) => setRemissionForm({ ...remissionForm, project_id: val === "none" ? "" : val })}
                  options={[
                    { value: "none", label: "Ninguno" },
                    ...projects.map((p) => ({
                      value: p.id,
                      label: `${p.name}${p.client?.name ? ` (${p.client.name})` : ""}`,
                    })),
                  ]}
                  placeholder="Seleccionar un proyecto..."
                  searchPlaceholder="Buscar proyecto..."
                  emptyMessage="No se encontraron proyectos."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="rem_amount">Monto de la Remisión ($)</Label>
                  <Input
                    id="rem_amount"
                    type="number"
                    value={remissionForm.amount}
                    onChange={(e) => setRemissionForm({ ...remissionForm, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rem_paid_amount">Pago Inicial / Abonado ($)</Label>
                  <Input
                    id="rem_paid_amount"
                    type="number"
                    value={remissionForm.paid_amount}
                    onChange={(e) => setRemissionForm({ ...remissionForm, paid_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="rem_is_paid"
                  type="checkbox"
                  checked={remissionForm.is_paid}
                  onChange={(e) => setRemissionForm({ ...remissionForm, is_paid: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="rem_is_paid" className="cursor-pointer text-sm">
                  ¿Esta remisión ya está pagada?
                </Label>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isUploadingRemission}
                  className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
                >
                  {isUploadingRemission && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isUploadingRemission ? "Subiendo archivo..." : "Agregar Remisión"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
