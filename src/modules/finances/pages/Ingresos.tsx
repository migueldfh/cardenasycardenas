import * as React from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { parseLocalDate, formatLocalDate } from "@/lib/utils";
import {
  useProjects,
  usePayments,
  useCreatePayment,
  usePaymentSchedules,
  useUpdatePayment,
  useDeletePayment,
} from "../hooks";
import { TablePagination } from "@/components/ui/TablePagination";
import { uploadPaymentProof } from "../api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sileo } from "sileo";
import {
  DollarSign,
  Loader2,
  Pencil,
  Trash2,
  Search,
  X,
  CheckCircle2,
  Clock,
  Receipt,
  Download,
  ExternalLink,
  Plus,
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

const paymentMethodTranslations: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  gateway: "Pasarela",
  redistribution: "Redistribución",
  atm_withdrawal: "Retiro sin tarjeta",
};

export function Ingresos() {
  const { data: projects = [] } = useProjects();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: schedules = [] } = usePaymentSchedules();
  const createPaymentMutation = useCreatePayment();
  const updatePaymentMutation = useUpdatePayment();
  const deletePaymentMutation = useDeletePayment();

  // State
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [paymentForm, setPaymentForm] = React.useState({
    project_id: "",
    amount: "",
    method: "transfer" as any,
    folio: "",
    proof_file: null as File | null,
  });
  const [editingPaymentId, setEditingPaymentId] = React.useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = React.useState<{
    id: string;
    amount: number;
    clientName: string;
  } | null>(null);

  const [isUploading, setIsUploading] = React.useState(false);
  const [allocatedAmounts, setAllocatedAmounts] = React.useState<Record<string, string>>({});

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [methodFilter, setMethodFilter] = React.useState("all");
  const [reconciledFilter, setReconciledFilter] = React.useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  const filteredPayments = React.useMemo(() => {
    return payments.filter((pay) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (pay.folio && pay.folio.toLowerCase().includes(q)) ||
        (pay.project?.name && pay.project.name.toLowerCase().includes(q)) ||
        (pay.project?.client?.name && pay.project.client.name.toLowerCase().includes(q)) ||
        (pay.amount && String(pay.amount).includes(q));

      const matchesMethod = methodFilter === "all" || pay.method === methodFilter;

      const matchesReconciled =
        reconciledFilter === "all" ||
        (reconciledFilter === "reconciled" && pay.is_reconciled) ||
        (reconciledFilter === "pending" && !pay.is_reconciled);

      return matchesSearch && matchesMethod && matchesReconciled;
    });
  }, [payments, searchQuery, methodFilter, reconciledFilter]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = React.useMemo(() => {
    return filteredPayments.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredPayments, currentPage, itemsPerPage]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(val);
  };

  // KPI metrics
  const kpiStats = React.useMemo(() => {
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const reconciledPayments = payments.filter((p) => p.is_reconciled);
    const pendingPayments = payments.filter((p) => !p.is_reconciled);
    const reconciledAmount = reconciledPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalCount = payments.length;
    const reconciledPct = totalCount > 0 ? Math.round((reconciledPayments.length / totalCount) * 100) : 0;
    const pendingPct = totalCount > 0 ? Math.round((pendingPayments.length / totalCount) * 100) : 0;

    return {
      totalAmount,
      reconciledAmount,
      pendingAmount,
      totalCount,
      reconciledCount: reconciledPayments.length,
      pendingCount: pendingPayments.length,
      reconciledPct,
      pendingPct,
    };
  }, [payments]);

  // Process project debts in memory
  const projectDebts = React.useMemo(() => {
    return projects
      .filter((p) => p.status !== "cancelled")
      .map((project) => {
        const projectPayments = payments.filter((p) => p.project_id === project.id);
        const totalPaid = projectPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const subtotal = Number(project.custom_price_total || 0);
        const totalAmount = project.requires_invoice
          ? subtotal +
            subtotal * (project.iva_rate ?? 0.16) -
            subtotal * ((project.isr_retention_rate ?? 0) + (project.iva_retention_rate ?? 0))
          : subtotal;
        const remainingDebt = totalAmount - totalPaid;
        const surplus = totalPaid - totalAmount;

        const projectSchedules = schedules.filter((s) => s.project_id === project.id);
        const pendingSchedules = projectSchedules.filter((s) => s.status !== "paid");

        const sortedPending = [...pendingSchedules].sort(
          (a, b) => parseLocalDate(a.due_date).getTime() - parseLocalDate(b.due_date).getTime()
        );
        const nextDueDate = sortedPending[0]?.due_date || null;

        const todayStr = formatLocalDate(new Date());
        const isOverdue = sortedPending.some((s) => s.due_date < todayStr && s.status !== "paid");

        return {
          ...project,
          totalAmount,
          totalPaid,
          remainingDebt: remainingDebt > 0 ? remainingDebt : 0,
          surplus: surplus > 0 ? surplus : 0,
          nextDueDate,
          isOverdue,
        };
      });
  }, [projects, payments, schedules]);

  const selectedProject = React.useMemo(() => {
    if (!paymentForm.project_id) return null;
    return projectDebts.find((p) => p.id === paymentForm.project_id) || null;
  }, [paymentForm.project_id, projectDebts]);

  const otherProjectsWithDebt = React.useMemo(() => {
    if (!selectedProject) return [];
    return projectDebts.filter(
      (p) =>
        p.client_id === selectedProject.client_id &&
        p.id !== selectedProject.id &&
        p.remainingDebt > 0
    );
  }, [selectedProject, projectDebts]);

  const handleAutoDistribute = (excess: number) => {
    const sorted = [...otherProjectsWithDebt].sort((a, b) => {
      if (a.nextDueDate && b.nextDueDate) {
        return parseLocalDate(a.nextDueDate).getTime() - parseLocalDate(b.nextDueDate).getTime();
      }
      if (a.nextDueDate) return -1;
      if (b.nextDueDate) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    let remaining = excess;
    const newAllocations: Record<string, string> = {};

    for (const proj of sorted) {
      if (remaining <= 0) break;
      const debt = proj.remainingDebt;
      if (debt <= 0) continue;

      const allocated = Math.min(remaining, debt);
      newAllocations[proj.id] = allocated.toFixed(2);
      remaining -= allocated;
    }

    setAllocatedAmounts(newAllocations);
  };

  const handleEditPayment = (payment: any) => {
    setEditingPaymentId(payment.id);
    setPaymentForm({
      project_id: payment.project_id || "",
      amount: payment.amount ? String(payment.amount) : "",
      method: payment.method || "transfer",
      folio: payment.folio || "",
      proof_file: null,
    });
    setIsPaymentOpen(true);
  };

  const handleDeletePayment = (id: string, amount: number, clientName: string) => {
    setPaymentToDelete({ id, amount, clientName });
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    const { id } = paymentToDelete;
    setPaymentToDelete(null);

    const promise = deletePaymentMutation.mutateAsync(id);
    sileo.promise(promise, {
      loading: { title: "Eliminando cobro..." },
      success: { title: "Cobro eliminado correctamente" },
      error: {
        title: "Error al eliminar el cobro",
        description: "No se pudo eliminar el cobro. Por favor intente más tarde.",
      },
    });

    try {
      await promise;
    } catch {
      // Handled by sileo.promise
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const { project_id, amount, method, folio, proof_file } = paymentForm;
    if (!project_id || !amount) {
      sileo.error({ title: "Llena los campos requeridos" });
      return;
    }

    setIsUploading(true);
    try {
      let proof_url = null;
      if (proof_file) {
        proof_url = await uploadPaymentProof(proof_file);
      }

      if (editingPaymentId) {
        const payload: any = {
          project_id,
          amount: parseFloat(amount),
          method,
          folio: folio || null,
        };
        if (proof_url) {
          payload.proof_url = proof_url;
        }

        await updatePaymentMutation.mutateAsync({
          id: editingPaymentId,
          payload,
        });

        sileo.success({ title: "Pago actualizado correctamente" });
      } else {
        const mainDebt = selectedProject?.remainingDebt || 0;
        const enteredAmount = parseFloat(amount);
        const excess = enteredAmount - mainDebt;

        let distributedSum = 0;
        if (excess > 0) {
          distributedSum = Object.values(allocatedAmounts).reduce(
            (sum, val) => sum + parseFloat(val || "0"),
            0
          );
          if (distributedSum > excess + 0.01) {
            sileo.error({ title: "La distribución excede el dinero restante" });
            setIsUploading(false);
            return;
          }
        }

        const promises = [];
        const mainAmount = enteredAmount - distributedSum;

        if (mainAmount > 0) {
          promises.push(
            createPaymentMutation.mutateAsync({
              project_id,
              amount: mainAmount,
              method,
              folio: folio || null,
              proof_url,
            })
          );
        }

        for (const pId of Object.keys(allocatedAmounts)) {
          const amt = parseFloat(allocatedAmounts[pId] || "0");
          if (amt > 0) {
            promises.push(
              createPaymentMutation.mutateAsync({
                project_id: pId,
                amount: amt,
                method,
                folio: folio || null,
                proof_url,
              })
            );
          }
        }

        await Promise.all(promises);
        sileo.success({ title: "Pago registrado correctamente" });
      }

      setIsPaymentOpen(false);
      setEditingPaymentId(null);
      setPaymentForm({
        project_id: "",
        amount: "",
        method: "transfer",
        folio: "",
        proof_file: null,
      });
      setAllocatedAmounts({});
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Fecha",
      "Cliente",
      "Proyecto",
      "Monto",
      "Método",
      "Folio",
      "Origen",
      "Conciliado",
    ];
    const rows = filteredPayments.map((pay) => [
      `"${new Date(pay.created_at).toLocaleDateString("es-MX")}"`,
      `"${(pay.project?.client?.name || "").replace(/"/g, '""')}"`,
      `"${(pay.project?.name || "").replace(/"/g, '""')}"`,
      `"${pay.amount}"`,
      `"${paymentMethodTranslations[pay.method] || pay.method}"`,
      `"${pay.folio || ""}"`,
      `"${pay.reported_by === "client" ? "Cliente" : "Admin"}"`,
      `"${pay.is_reconciled ? "Sí" : "Pendiente"}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `ingresos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    sileo.success({ title: `Exportados ${filteredPayments.length} cobros a CSV` });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Finanzas</span>
            <span>›</span>
            <span className="text-foreground font-medium">Ingresos (Cobranza)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Ingresos y Cobranza
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro total de abonos, conciliación y liquidaciones recibidas de los clientes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={handleExportCSV}
            disabled={filteredPayments.length === 0}
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingPaymentId(null);
              setPaymentForm({
                project_id: "",
                amount: "",
                method: "transfer",
                folio: "",
                proof_file: null,
              });
              setAllocatedAmounts({});
              setIsPaymentOpen(true);
            }}
            className="h-9 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Registrar Cobro
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">Total Cobrado</p>
              <p className="text-xl font-bold text-foreground leading-tight truncate">
                {formatCurrency(kpiStats.totalAmount)}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-2">
            100% de ingresos acumulados
          </p>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">Conciliados</p>
              <p className="text-xl font-bold text-foreground leading-tight truncate">
                {formatCurrency(kpiStats.reconciledAmount)}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Progress
              value={kpiStats.reconciledPct}
              indicatorClassName="bg-blue-500"
              className="h-1.5"
            />
            <p className="text-[10px] text-blue-600 font-medium mt-0.5">
              {kpiStats.reconciledCount} cobros ({kpiStats.reconciledPct}%)
            </p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">Por Conciliar</p>
              <p className="text-xl font-bold text-foreground leading-tight truncate">
                {formatCurrency(kpiStats.pendingAmount)}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Progress
              value={kpiStats.pendingPct}
              indicatorClassName="bg-amber-500"
              className="h-1.5"
            />
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">
              {kpiStats.pendingCount} pendientes ({kpiStats.pendingPct}%)
            </p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">Transacciones</p>
              <p className="text-xl font-bold text-foreground leading-tight">
                {kpiStats.totalCount}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-normal mt-2">
            Abonos registrados en sistema
          </p>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-3 rounded-lg border border-border/80 flex flex-wrap items-center gap-2.5 text-xs">
        <Select
          value={methodFilter}
          onValueChange={(val) => {
            setMethodFilter(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Método:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los métodos</SelectItem>
            <SelectItem value="transfer">Transferencia</SelectItem>
            <SelectItem value="cash">Efectivo</SelectItem>
            <SelectItem value="card">Tarjeta</SelectItem>
            <SelectItem value="gateway">Pasarela</SelectItem>
            <SelectItem value="redistribution">Redistribución</SelectItem>
            <SelectItem value="atm_withdrawal">Retiro sin tarjeta</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={reconciledFilter}
          onValueChange={(val) => {
            setReconciledFilter(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Estatus:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="reconciled">Conciliado</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
          </SelectContent>
        </Select>

        {(searchQuery || methodFilter !== "all" || reconciledFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setMethodFilter("all");
              setReconciledFilter("all");
              setCurrentPage(1);
            }}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Main Table Card */}
      <Card className="bg-card shadow-xs border-border/80 overflow-hidden">
        <div className="p-3.5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Historial de Cobros ({filteredPayments.length})
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Registro detallado de abonos recibidos por cliente y proyecto
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, proyecto, folio..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 h-8 text-xs bg-muted/20"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] text-muted-foreground bg-muted/20">
                <TableHead className="py-2.5">Fecha</TableHead>
                <TableHead className="py-2.5">Cliente</TableHead>
                <TableHead className="py-2.5">Proyecto</TableHead>
                <TableHead className="py-2.5">Monto</TableHead>
                <TableHead className="py-2.5">Método</TableHead>
                <TableHead className="py-2.5">Folio / Transacción</TableHead>
                <TableHead className="py-2.5 text-center">Origen</TableHead>
                <TableHead className="py-2.5 text-center">Conciliación</TableHead>
                <TableHead className="py-2.5 text-center">Comprobante</TableHead>
                <TableHead className="py-2.5 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {paymentsLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Cargando cobros...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    {payments.length === 0
                      ? "No se han registrado cobros."
                      : "No se encontraron cobros con los filtros aplicados."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayments.map((pay) => (
                  <TableRow key={pay.id} className="hover:bg-muted/40">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(pay.created_at).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {pay.project?.client?.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {pay.project?.name || "—"}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600 whitespace-nowrap">
                      {formatCurrency(pay.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-normal py-0 capitalize"
                      >
                        {paymentMethodTranslations[pay.method] || pay.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {pay.folio || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-normal py-0 ${
                          pay.reported_by === "client"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {pay.reported_by === "client" ? "Cliente" : "Admin"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-normal py-0 ${
                          pay.is_reconciled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {pay.is_reconciled ? "Conciliado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {pay.proof_url ? (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-primary hover:underline px-2"
                        >
                          <a href={pay.proof_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" /> Ver
                          </a>
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleEditPayment(pay)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() =>
                            handleDeletePayment(
                              pay.id,
                              pay.amount,
                              pay.project?.client?.name || ""
                            )
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredPayments.length > 0 && (
          <div className="p-3 border-t border-border/50">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredPayments.length}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}
      </Card>

      {/* Dialog: Register/Edit Payment */}
      <Dialog
        open={isPaymentOpen}
        onOpenChange={(open) => {
          setIsPaymentOpen(open);
          if (!open) {
            setEditingPaymentId(null);
            setPaymentForm({
              project_id: "",
              amount: "",
              method: "transfer",
              folio: "",
              proof_file: null,
            });
            setAllocatedAmounts({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPaymentId ? "Editar Cobro de Cliente" : "Registrar Cobro de Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingPaymentId
                ? "Modifica los detalles del cobro registrado."
                : "Abona un monto a un proyecto de cliente y adjunta el comprobante."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePayment} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="pay_proj">Proyecto Asociado *</Label>
              <SearchableSelect
                triggerId="pay_proj"
                value={paymentForm.project_id}
                onValueChange={(val) => setPaymentForm({ ...paymentForm, project_id: val })}
                options={projects.map((p) => ({
                  value: p.id,
                  label: `${p.name}${p.client?.name ? ` (${p.client.name})` : ""}`,
                }))}
                placeholder="Selecciona un proyecto"
                searchPlaceholder="Buscar proyecto..."
                emptyMessage="No se encontraron proyectos."
              />
            </div>

            {selectedProject && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pb-1 border-b border-border/40">
                  <span className="text-foreground font-semibold truncate max-w-[200px]">
                    {selectedProject.name}
                  </span>
                  {selectedProject.client?.name && (
                    <span className="truncate max-w-[150px]">{selectedProject.client.name}</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-background/80 border border-border/50">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Monto Total
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                      {formatCurrency(
                        selectedProject.totalAmount ?? selectedProject.custom_price_total
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-700">
                      Pagado a la Fecha
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5">
                      {formatCurrency(selectedProject.totalPaid)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-amber-700">
                      Deuda Pendiente
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-amber-700 mt-0.5">
                      {formatCurrency(selectedProject.remainingDebt)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="pay_amt">Monto ($) *</Label>
                <Input
                  id="pay_amt"
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="15000"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pay_method">Método de Pago</Label>
                <Select
                  value={paymentForm.method}
                  onValueChange={(val: any) => setPaymentForm({ ...paymentForm, method: val })}
                >
                  <SelectTrigger id="pay_method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo (Físico)</SelectItem>
                    <SelectItem value="transfer">Transferencia Bancaria</SelectItem>
                    <SelectItem value="card">Tarjeta Crédito/Débito</SelectItem>
                    <SelectItem value="gateway">Pasarela Online (Stripe)</SelectItem>
                    <SelectItem value="atm_withdrawal">Retiro sin Tarjeta (ATM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pay_folio">
                {paymentForm.method === "atm_withdrawal"
                  ? "Código de Retiro ATM *"
                  : "Folio / Número de Operación"}
              </Label>
              <Input
                id="pay_folio"
                value={paymentForm.folio}
                onChange={(e) => setPaymentForm({ ...paymentForm, folio: e.target.value })}
                placeholder={
                  paymentForm.method === "atm_withdrawal"
                    ? "Ej: Código de 12 dígitos"
                    : "Ej: FOL-129841"
                }
                required={paymentForm.method === "atm_withdrawal"}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pay_proof">Archivo del Comprobante (Opcional)</Label>
              <Input
                id="pay_proof"
                type="file"
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    proof_file: e.target.files?.[0] || null,
                  })
                }
              />
            </div>

            {/* Excess Payment Distribution Section */}
            {(() => {
              const mainDebt = selectedProject?.remainingDebt || 0;
              const enteredAmount = parseFloat(paymentForm.amount || "0");
              const excess = enteredAmount - mainDebt;

              if (editingPaymentId || excess <= 0 || otherProjectsWithDebt.length === 0)
                return null;

              const distributedSum = Object.keys(allocatedAmounts).reduce(
                (sum, key) => sum + parseFloat(allocatedAmounts[key] || "0"),
                0
              );
              const remainingExcess = excess - distributedSum;

              return (
                <div className="space-y-3 border-t pt-3 animate-in fade-in">
                  <div className="flex justify-between items-center gap-2">
                    <Label className="text-xs font-semibold text-amber-600 block">
                      El pago excede la deuda por {formatCurrency(excess)}. Puedes distribuirlo:
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-amber-500 text-amber-600 hover:bg-amber-50"
                      onClick={() => handleAutoDistribute(excess)}
                    >
                      Auto-distribuir
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2.5 bg-muted/20">
                    {otherProjectsWithDebt.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center gap-3 text-xs border-b pb-2 last:border-0 last:pb-0"
                      >
                        <div className="flex-1 truncate">
                          <span className="font-medium text-foreground block truncate">
                            {p.name}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            Pendiente: {formatCurrency(p.remainingDebt)}
                          </span>
                        </div>
                        <div className="w-28">
                          <Input
                            type="number"
                            placeholder="Monto ($)"
                            className="h-8 text-xs"
                            value={allocatedAmounts[p.id] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAllocatedAmounts((prev) => ({ ...prev, [p.id]: val }));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Restante por distribuir:</span>
                    <span
                      className={
                        Math.abs(remainingExcess) < 0.01
                          ? "text-emerald-600"
                          : remainingExcess > 0
                          ? "text-amber-600"
                          : "text-rose-500"
                      }
                    >
                      {formatCurrency(remainingExcess)}
                    </span>
                  </div>
                </div>
              );
            })()}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPaymentOpen(false);
                  setEditingPaymentId(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
                disabled={
                  isUploading ||
                  createPaymentMutation.isPending ||
                  updatePaymentMutation.isPending
                }
              >
                {isUploading ||
                createPaymentMutation.isPending ||
                updatePaymentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingPaymentId ? "Guardando..." : "Registrando..."}
                  </>
                ) : editingPaymentId ? (
                  "Guardar Cambios"
                ) : (
                  "Confirmar Cobro"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Delete Payment */}
      <AlertDialog
        open={!!paymentToDelete}
        onOpenChange={(open) => !open && setPaymentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cobro?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el cobro de{" "}
              {formatCurrency(paymentToDelete?.amount || 0)} para el cliente "
              {paymentToDelete?.clientName}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePayment}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
