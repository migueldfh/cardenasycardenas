import * as React from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  useExpenses,
  useSuppliers,
  useExpenseCategories,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useCreateSupplier,
  useProjects,
  useCreateExpenseRemission,
  useUpdateExpenseRemission,
  useDeleteExpenseRemission,
} from "../hooks";
import { TablePagination } from "@/components/ui/TablePagination";
import { uploadRemissionFile } from "../api";
import { parseLocalDate, formatLocalDate } from "@/lib/utils";
import { DatePicker } from "@/components/shared/DatePicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sileo } from "sileo";
import {
  Plus,
  Check,
  Search,
  UserPlus,
  Trash2,
  FileText,
  ExternalLink,
  Paperclip,
  Loader2,
  Pencil,
  X,
  TrendingDown,
  CheckCircle2,
  Clock,
  Receipt,
  Filter,
  Download,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Gastos() {
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: suppliers = [] } = useSuppliers();
  const { data: categories = [] } = useExpenseCategories();
  const { data: projects = [] } = useProjects();

  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const createSupplierMutation = useCreateSupplier();

  // State
  const [expenseSearch, setExpenseSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [isExpenseOpen, setIsExpenseOpen] = React.useState(false);
  const [isSupplierOpen, setIsSupplierOpen] = React.useState(false);
  const [expenseToDelete, setExpenseToDelete] = React.useState<{ id: string; concept: string } | null>(null);
  const [editingExpenseId, setEditingExpenseId] = React.useState<string | null>(null);

  // New Expense Form
  const [expenseForm, setExpenseForm] = React.useState({
    supplier_id: "",
    category_id: "",
    project_id: "",
    concept: "",
    amount: "",
    status: "paid" as any,
    due_date: "",
    payment_method: "transfer",
    is_factura: false,
    iva_amount: "",
  });

  // New Supplier Form
  const [supplierForm, setSupplierForm] = React.useState({
    legal_name: "",
    fiscal_name: "",
    tax_id_rfc: "",
    contact_info: "",
  });

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
        project_id: (remissionForm.project_id && remissionForm.project_id !== "none") ? remissionForm.project_id : null,
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

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.legal_name) return;
    try {
      const newSupplier = await createSupplierMutation.mutateAsync(supplierForm);
      sileo.success({ title: "Proveedor registrado" });
      setIsSupplierOpen(false);
      setSupplierForm({ legal_name: "", fiscal_name: "", tax_id_rfc: "", contact_info: "" });
      if (isExpenseOpen) {
        setExpenseForm((prev) => ({ ...prev, supplier_id: newSupplier.id }));
      }
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    }
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      supplier_id: expense.supplier_id || "",
      category_id: expense.category_id || "",
      project_id: expense.project_id || "",
      concept: expense.concept || "",
      amount: expense.amount ? String(expense.amount) : "",
      status: expense.status || "paid",
      due_date: expense.due_date || "",
      payment_method: expense.payment_method || "transfer",
      is_factura: !!expense.is_factura,
      iva_amount: expense.iva_amount !== undefined && expense.iva_amount !== null ? String(expense.iva_amount) : "",
    });
    setIsExpenseOpen(true);
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const { category_id, concept, amount, status } = expenseForm;
    if (!category_id || !concept || !amount) {
      sileo.error({ title: "Llena los campos requeridos" });
      return;
    }

    try {
      const payload: any = {
        category_id,
        supplier_id: expenseForm.supplier_id || null,
        project_id: (expenseForm.project_id && expenseForm.project_id !== "none") ? expenseForm.project_id : null,
        concept,
        amount: parseFloat(amount),
        status,
        due_date: status !== "paid" ? expenseForm.due_date : null,
        paid_at: status === "paid" ? (editingExpenseId ? (expenses.find(e => e.id === editingExpenseId)?.paid_at || new Date().toISOString()) : new Date().toISOString()) : null,
        payment_method: status === "paid" ? expenseForm.payment_method : null,
        is_factura: expenseForm.is_factura,
        iva_amount: expenseForm.is_factura ? (parseFloat(expenseForm.iva_amount) || 0) : 0,
      };

      if (editingExpenseId) {
        await updateExpenseMutation.mutateAsync({
          id: editingExpenseId,
          payload,
        });
        sileo.success({ title: "Gasto actualizado" });
      } else {
        await createExpenseMutation.mutateAsync(payload);
        sileo.success({ title: "Gasto registrado" });
      }
      setIsExpenseOpen(false);
      setEditingExpenseId(null);
      setExpenseForm({
        supplier_id: "",
        category_id: "",
        project_id: "",
        concept: "",
        amount: "",
        status: "paid",
        due_date: "",
        payment_method: "transfer",
        is_factura: false,
        iva_amount: "",
      });
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    }
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
      sileo.success({ title: "Gasto marcado como pagado" });
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    }
  };

  const handleDeleteExpense = (id: string, concept: string) => {
    setExpenseToDelete({ id, concept });
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    const { id } = expenseToDelete;
    setExpenseToDelete(null);

    const promise = deleteExpenseMutation.mutateAsync(id);
    sileo.promise(promise, {
      loading: { title: "Eliminando gasto..." },
      success: { title: "Gasto eliminado correctamente" },
      error: {
        title: "Error al eliminar el gasto",
        description: "No se pudo eliminar el egreso. Por favor intente más tarde."
      }
    });

    try {
      await promise;
    } catch (err) {
      // Handled by sileo.promise
    }
  };

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => {
      const q = expenseSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        e.concept.toLowerCase().includes(q) ||
        (e.supplier?.legal_name || "").toLowerCase().includes(q) ||
        (e.project?.name || "").toLowerCase().includes(q) ||
        (e.amount && String(e.amount).includes(q));

      const matchesCategory = selectedCategory === "all" || e.category_id === selectedCategory;
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "pending" ? e.status !== "paid" : e.status === selectedStatus);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [expenses, expenseSearch, selectedCategory, selectedStatus]);

  // KPI Metrics
  const kpis = React.useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const paidExpenses = filteredExpenses.filter((e) => e.status === "paid");
    const paidAmount = paidExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const pendingDebt = filteredExpenses.reduce((sum, e) => sum + getExpenseDebt(e), 0);
    const pendingCount = filteredExpenses.filter((e) => e.status !== "paid").length;
    const facturaExpenses = filteredExpenses.filter((e) => e.is_factura);
    const totalIva = facturaExpenses.reduce((sum, e) => sum + Number(e.iva_amount || 0), 0);

    const paidPct = totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0;
    const facturaPct = filteredExpenses.length > 0 ? (facturaExpenses.length / filteredExpenses.length) * 100 : 0;

    return {
      totalAmount,
      paidAmount,
      paidCount: paidExpenses.length,
      pendingDebt,
      pendingCount,
      totalIva,
      facturaCount: facturaExpenses.length,
      paidPct,
      facturaPct,
    };
  }, [filteredExpenses]);

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) return;
    const headers = ["Fecha", "Concepto", "Categoría", "Proveedor", "Proyecto", "Monto", "IVA", "Estado", "Vencimiento"];
    const rows = filteredExpenses.map((e) => [
      new Date(e.created_at).toLocaleDateString("es-MX"),
      `"${(e.concept || "").replace(/"/g, '""')}"`,
      `"${(e.category?.name || "Otros").replace(/"/g, '""')}"`,
      `"${(e.supplier?.legal_name || "-").replace(/"/g, '""')}"`,
      `"${(e.project?.name || "Sin vincular").replace(/"/g, '""')}"`,
      Number(e.amount || 0).toFixed(2),
      Number(e.iva_amount || 0).toFixed(2),
      e.status === "paid" ? "Pagado" : e.status === "pending_payable" ? "Pendiente" : "Vencido",
      e.due_date || "-",
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `egresos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [expenseSearch, selectedCategory, selectedStatus]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = React.useMemo(() => {
    return filteredExpenses.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredExpenses, currentPage, itemsPerPage]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Finanzas</span>
            <span>›</span>
            <span className="text-foreground font-medium">Gastos y Compras</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gastos y Compras</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control e historial de egresos operativos, materias primas y facturas de proveedores.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={handleExportCSV}
            disabled={filteredExpenses.length === 0}
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={() => setIsSupplierOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" /> Nuevo Proveedor
          </Button>
          <Button
            size="sm"
            className="h-9 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-1.5"
            onClick={() => {
              setEditingExpenseId(null);
              setExpenseForm({
                supplier_id: "",
                category_id: "",
                project_id: "",
                concept: "",
                amount: "",
                status: "paid",
                due_date: "",
                payment_method: "transfer",
                is_factura: false,
                iva_amount: "",
              });
              setIsExpenseOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Registrar Gasto
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-rose-50/60 text-rose-700 border-rose-200">
              {filteredExpenses.length} registros
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Total Egresos (Filtrado)</p>
            <h3 className="text-xl font-bold text-foreground leading-tight mt-0.5">
              {formatCurrency(kpis.totalAmount)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={100} indicatorClassName="bg-rose-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Suma total de egresos en vista</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-emerald-50/60 text-emerald-700 border-emerald-200">
              {kpis.paidPct.toFixed(1)}%
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Gastos Liquidados</p>
            <h3 className="text-xl font-bold text-emerald-600 leading-tight mt-0.5">
              {formatCurrency(kpis.paidAmount)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={kpis.paidPct} indicatorClassName="bg-emerald-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{kpis.paidCount} egresos marcados como pagados</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-amber-50/60 text-amber-700 border-amber-200">
              {kpis.pendingCount} pendientes
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Deuda por Pagar</p>
            <h3 className="text-xl font-bold text-amber-600 leading-tight mt-0.5">
              {formatCurrency(kpis.pendingDebt)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={Math.max(0, 100 - kpis.paidPct)} indicatorClassName="bg-amber-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Créditos con proveedores por liquidar</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-blue-50/60 text-blue-700 border-blue-200">
              {kpis.facturaCount} facturas
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">IVA Acreditable</p>
            <h3 className="text-xl font-bold text-blue-600 leading-tight mt-0.5">
              {formatCurrency(kpis.totalIva)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={kpis.facturaPct} indicatorClassName="bg-blue-600" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">IVA registrado en compras facturadas</p>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-3 rounded-lg border border-border/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" /> Filtros:
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[190px] h-8 text-xs bg-muted/20">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span role="img">{c.icon || "🏷️"}</span>
                    <span>{c.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-muted/20">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="paid">Pagados</SelectItem>
              <SelectItem value="pending">Pendientes / Crédito</SelectItem>
            </SelectContent>
          </Select>

          {(expenseSearch || selectedCategory !== "all" || selectedStatus !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setExpenseSearch("");
                setSelectedCategory("all");
                setSelectedStatus("all");
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground">
          Mostrando <span className="font-semibold text-foreground">{filteredExpenses.length}</span> de{" "}
          <span className="font-semibold text-foreground">{expenses.length}</span> egresos
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card shadow-xs border-border/80 overflow-hidden">
        <div className="p-3.5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Historial de Egresos</h3>
            <p className="text-[11px] text-muted-foreground">
              Visualiza y administra tus egresos registrados, proveedores y remisiones.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar concepto, proveedor, proyecto..."
              value={expenseSearch}
              onChange={(e) => setExpenseSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/20"
            />
          </div>
        </div>

        {expensesLoading ? (
          <div className="text-center py-12 flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Cargando gastos...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            No se encontraron egresos con los criterios seleccionados.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] text-muted-foreground bg-muted/20">
                  <TableHead className="py-2.5">Fecha</TableHead>
                  <TableHead className="py-2.5">Concepto</TableHead>
                  <TableHead className="py-2.5">Categoría</TableHead>
                  <TableHead className="py-2.5">Proveedor</TableHead>
                  <TableHead className="py-2.5">Proyecto</TableHead>
                  <TableHead className="py-2.5">Monto</TableHead>
                  <TableHead className="py-2.5">Estado</TableHead>
                  <TableHead className="py-2.5">Vencimiento</TableHead>
                  <TableHead className="py-2.5 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {paginatedExpenses.map((e) => (
                  <TableRow key={e.id} className="hover:bg-muted/40">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{e.concept}</span>
                        {e.is_factura && (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-normal py-0"
                          >
                            Factura
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 text-[11px]">
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: e.category?.color_code || "#64748b" }}
                        />
                        <span role="img">{e.category?.icon || "🏷️"}</span>
                        <span className="font-medium">{e.category?.name || "Otros"}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground">{e.supplier?.legal_name || "-"}</span>
                        {e.supplier?.id && getSupplierRemainingDebt(e.supplier.id) > 0 && (
                          <span className="text-[10px] text-amber-600 block font-medium">
                            Deuda prov.: {formatCurrency(getSupplierRemainingDebt(e.supplier.id))}
                          </span>
                        )}
                        {e.supplier?.fiscal_name && (
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            {e.supplier.fiscal_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {e.project ? (
                        <div>
                          <span className="font-medium text-foreground block truncate max-w-[150px]">
                            {e.project.name}
                          </span>
                          {e.project.client?.name && (
                            <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">
                              {e.project.client.name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Sin vincular</span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-rose-600 whitespace-nowrap">
                      <div>
                        <span>-{formatCurrency(e.amount)}</span>
                        {e.is_factura && e.iva_amount ? (
                          <span className="text-[10px] text-blue-600 block font-normal">
                            IVA: {formatCurrency(e.iva_amount)}
                          </span>
                        ) : null}
                        {e.remissions && e.remissions.length > 0 && (
                          <span className="text-[10px] text-muted-foreground block font-normal">
                            Pendiente: {formatCurrency(getExpenseDebt(e))}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {e.status === "paid" ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal py-0"
                        >
                          Pagado
                        </Badge>
                      ) : e.status === "pending_payable" ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-normal py-0"
                        >
                          Pendiente
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-normal py-0"
                        >
                          Vencido
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {e.due_date || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2"
                          onClick={() => setActiveExpenseForRemissions(e)}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Remisiones ({e.remissions?.length || 0})
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEditExpense(e)}
                          title="Editar gasto"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {e.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleMarkAsPaid(e.id)}
                          >
                            <Check className="h-3 w-3 mr-1" /> Liquidar
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => handleDeleteExpense(e.id, e.concept)}
                          title="Eliminar gasto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-3 border-t border-border/50">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredExpenses.length}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* Dialog: New Supplier */}
      <Dialog open={isSupplierOpen} onOpenChange={setIsSupplierOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Proveedor</DialogTitle>
            <DialogDescription>Registra un nuevo proveedor en tu directorio de egresos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="s_name">Nombre Comercial / Razón Social *</Label>
              <Input
                id="s_name"
                value={supplierForm.legal_name}
                onChange={(e) => setSupplierForm({ ...supplierForm, legal_name: e.target.value })}
                placeholder="Ej: Distribuidora Textil"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s_fiscal">Nombre Fiscal (Opcional)</Label>
              <Input
                id="s_fiscal"
                value={supplierForm.fiscal_name}
                onChange={(e) => setSupplierForm({ ...supplierForm, fiscal_name: e.target.value })}
                placeholder="Ej: TEXTIL S.A. DE C.V."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s_rfc">RFC (Opcional)</Label>
              <Input
                id="s_rfc"
                value={supplierForm.tax_id_rfc || ""}
                onChange={(e) => setSupplierForm({ ...supplierForm, tax_id_rfc: e.target.value.toUpperCase() })}
                placeholder="XAXX010101000"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s_info">Contacto / Teléfono / Correo</Label>
              <Input
                id="s_info"
                value={supplierForm.contact_info || ""}
                onChange={(e) => setSupplierForm({ ...supplierForm, contact_info: e.target.value })}
                placeholder="Ej: ventas@proveedor.com"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={createSupplierMutation.isPending}
                className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
              >
                Guardar Proveedor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create/Edit Expense */}
      <Dialog
        open={isExpenseOpen}
        onOpenChange={(open) => {
          setIsExpenseOpen(open);
          if (!open) {
            setEditingExpenseId(null);
            setExpenseForm({
              supplier_id: "",
              category_id: "",
              project_id: "",
              concept: "",
              amount: "",
              status: "paid",
              due_date: "",
              payment_method: "transfer",
              is_factura: false,
              iva_amount: "",
            });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpenseId ? "Editar Gasto o Egreso" : "Registrar Gasto o Egreso"}</DialogTitle>
            <DialogDescription>
              {editingExpenseId
                ? "Modifica los detalles del gasto registrado."
                : "Genera una compra, pago de servicios o insumo operativo."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="exp_cat">Categoría *</Label>
                <Select
                  value={expenseForm.category_id}
                  onValueChange={(val) => setExpenseForm({ ...expenseForm, category_id: val })}
                >
                  <SelectTrigger id="exp_cat">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span role="img">{c.icon || "🏷️"}</span>
                          <span>{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="exp_sup">Proveedor (Opcional)</Label>
                <SearchableSelect
                  triggerId="exp_sup"
                  value={expenseForm.supplier_id}
                  onValueChange={(val) => setExpenseForm({ ...expenseForm, supplier_id: val })}
                  options={suppliers.map((s) => ({ value: s.id, label: s.legal_name }))}
                  placeholder="Selecciona"
                  searchPlaceholder="Buscar proveedor..."
                  emptyMessage="No se encontraron proveedores."
                  customAction={{
                    value: "new_supplier",
                    label: "Crear nuevo proveedor",
                    icon: <Plus className="h-3.5 w-3.5 mr-2" />,
                    onClick: () => setIsSupplierOpen(true),
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="exp_concept">Concepto / Descripción *</Label>
              <Input
                id="exp_concept"
                value={expenseForm.concept}
                onChange={(e) => setExpenseForm({ ...expenseForm, concept: e.target.value })}
                placeholder="Ej: Compra de Tela Poliéster"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="exp_proj">Proyecto Asociado (Opcional)</Label>
              <SearchableSelect
                triggerId="exp_proj"
                value={expenseForm.project_id || "none"}
                onValueChange={(val) => setExpenseForm({ ...expenseForm, project_id: val === "none" ? "" : val })}
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
                <Label htmlFor="exp_amt">Monto ($) *</Label>
                <Input
                  id="exp_amt"
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    let calculatedIva = expenseForm.iva_amount;
                    if (expenseForm.is_factura) {
                      const amt = parseFloat(val) || 0;
                      calculatedIva = String((amt - amt / 1.16).toFixed(2));
                    }
                    setExpenseForm({ ...expenseForm, amount: val, iva_amount: calculatedIva });
                  }}
                  placeholder="2450"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="exp_status">Estado de Pago</Label>
                <Select
                  value={expenseForm.status}
                  onValueChange={(val: any) => setExpenseForm({ ...expenseForm, status: val })}
                >
                  <SelectTrigger id="exp_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pagado inmediatamente</SelectItem>
                    <SelectItem value="pending_payable">Cuentas por Pagar (Crédito)</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="exp_comprobante">Tipo de Comprobante</Label>
                <Select
                  value={expenseForm.is_factura ? "factura" : "remision"}
                  onValueChange={(val) => {
                    const isFactura = val === "factura";
                    let calculatedIva = expenseForm.iva_amount;
                    if (isFactura && expenseForm.amount) {
                      const amt = parseFloat(expenseForm.amount) || 0;
                      calculatedIva = String((amt - amt / 1.16).toFixed(2));
                    } else if (!isFactura) {
                      calculatedIva = "";
                    }
                    setExpenseForm({
                      ...expenseForm,
                      is_factura: isFactura,
                      iva_amount: calculatedIva,
                    });
                  }}
                >
                  <SelectTrigger id="exp_comprobante">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remision">Remisión / Nota</SelectItem>
                    <SelectItem value="factura">Factura (con IVA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {expenseForm.is_factura && (
                <div className="space-y-1">
                  <Label htmlFor="exp_iva">Monto de IVA ($)</Label>
                  <Input
                    id="exp_iva"
                    type="number"
                    step="0.01"
                    value={expenseForm.iva_amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, iva_amount: e.target.value })}
                    placeholder="Ej: 337.93"
                  />
                </div>
              )}
            </div>

            {expenseForm.status === "paid" ? (
              <div className="space-y-1">
                <Label htmlFor="exp_method">Método de Pago</Label>
                <Select
                  value={expenseForm.payment_method}
                  onValueChange={(val) => setExpenseForm({ ...expenseForm, payment_method: val })}
                >
                  <SelectTrigger id="exp_method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia Bancaria</SelectItem>
                    <SelectItem value="card">Tarjeta Crédito/Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1 flex flex-col">
                <Label htmlFor="exp_due" className="mb-1">
                  Fecha de Vencimiento *
                </Label>
                <DatePicker
                  date={expenseForm.due_date ? parseLocalDate(expenseForm.due_date) : undefined}
                  setDate={(d) => setExpenseForm({ ...expenseForm, due_date: d ? formatLocalDate(d) : "" })}
                  className="w-full"
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
              >
                {editingExpenseId ? "Guardar Cambios" : "Registrar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Delete Expense */}
      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar egreso?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el gasto "{expenseToDelete?.concept}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteExpense}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
