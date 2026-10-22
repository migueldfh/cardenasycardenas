import * as React from "react";
import { Link } from "react-router-dom";
import { useProjects, usePayments, usePaymentSchedules, useCreatePayment } from "../hooks";
import { TablePagination } from "@/components/ui/TablePagination";
import { parseLocalDate, formatLocalDate } from "@/lib/utils";
import { uploadPaymentProof } from "../api";
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
  DollarSign,
  Search,
  Coins,
  Loader2,
  Calendar,
  AlertTriangle,
  Check,
  ArrowRightLeft,
  X,
  CheckCircle2,
  Filter,
  Download,
} from "lucide-react";

const projectStatusTranslations: Record<string, string> = {
  draft: "Borrador",
  pending_approval: "Pendiente",
  approved: "Aprobado",
  completed: "Completado",
  cancelled: "Cancelado",
};

export function CuentasPorCobrar() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: schedules = [], isLoading: schedulesLoading } = usePaymentSchedules();
  const createPaymentMutation = useCreatePayment();

  // State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showOnlyDebtors, setShowOnlyDebtors] = React.useState(true);
  const [selectedProject, setSelectedProject] = React.useState<any>(null);
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  // New Payment Form
  const [paymentForm, setPaymentForm] = React.useState({
    amount: "",
    method: "transfer" as any,
    folio: "",
    proof_file: null as File | null,
  });

  const [allocatedAmounts, setAllocatedAmounts] = React.useState<Record<string, string>>({});

  // Surplus redistribution state
  const [isRedistributeOpen, setIsRedistributeOpen] = React.useState(false);
  const [redistributeAllocations, setRedistributeAllocations] = React.useState<Record<string, string>>({});

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

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

        // Find next due date from schedules
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

  // KPIs
  const totalOutstanding = React.useMemo(() => {
    return projectDebts.reduce((sum, p) => sum + p.remainingDebt, 0);
  }, [projectDebts]);

  const totalContracted = React.useMemo(() => {
    return projectDebts.reduce((sum, p) => sum + p.totalAmount, 0);
  }, [projectDebts]);

  const totalCollectedAll = React.useMemo(() => {
    return projectDebts.reduce((sum, p) => sum + p.totalPaid, 0);
  }, [projectDebts]);

  const projectsWithDebtCount = React.useMemo(() => {
    return projectDebts.filter((p) => p.remainingDebt > 0).length;
  }, [projectDebts]);

  const totalOverdue = React.useMemo(() => {
    const todayStr = formatLocalDate(new Date());
    return schedules
      .filter((s) => s.status !== "paid" && s.due_date < todayStr && s.project?.status !== "cancelled")
      .reduce((sum, s) => sum + Number(s.expected_amount), 0);
  }, [schedules]);

  const collectionRate = totalContracted > 0 ? Math.min(100, (totalCollectedAll / totalContracted) * 100) : 0;
  const debtorRatio = projectDebts.length > 0 ? (projectsWithDebtCount / projectDebts.length) * 100 : 0;

  // Filters
  const filteredProjects = React.useMemo(() => {
    return projectDebts.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.order_number && p.order_number.toLowerCase().includes(q)) ||
        (p.client?.name && p.client.name.toLowerCase().includes(q));

      const matchesDebt = !showOnlyDebtors || p.remainingDebt > 0 || p.surplus > 0;

      return matchesSearch && matchesDebt;
    });
  }, [projectDebts, searchQuery, showOnlyDebtors]);

  const handleExportCSV = () => {
    if (filteredProjects.length === 0) return;
    const headers = ["Cliente", "Proyecto", "Total Pactado", "Total Cobrado", "Deuda Restante", "Próximo Vencimiento", "Estado"];
    const rows = filteredProjects.map((p) => [
      `"${(p.client?.name || "-").replace(/"/g, '""')}"`,
      `"${(p.name || "-").replace(/"/g, '""')}"`,
      Number(p.totalAmount || 0).toFixed(2),
      Number(p.totalPaid || 0).toFixed(2),
      Number(p.remainingDebt || 0).toFixed(2),
      p.nextDueDate || "-",
      projectStatusTranslations[p.status] || p.status,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cuentas_por_cobrar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, showOnlyDebtors]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = React.useMemo(() => {
    return filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  const otherProjectsWithDebt = React.useMemo(() => {
    if (!selectedProject) return [];
    return projectDebts.filter(
      (p) => p.client_id === selectedProject.client_id && p.id !== selectedProject.id && p.remainingDebt > 0
    );
  }, [selectedProject, projectDebts]);

  const handleOpenPaymentDialog = (project: any) => {
    setSelectedProject(project);
    setPaymentForm({
      amount: project.remainingDebt.toString(),
      method: "transfer",
      folio: "",
      proof_file: null,
    });
    setAllocatedAmounts({});
    setIsPaymentOpen(true);
  };

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

  const handleOpenRedistributeDialog = (project: any) => {
    setSelectedProject(project);
    setRedistributeAllocations({});
    setIsRedistributeOpen(true);
  };

  const handleAutoDistributeSurplus = (surplus: number) => {
    const sorted = [...otherProjectsWithDebt].sort((a, b) => {
      if (a.nextDueDate && b.nextDueDate) {
        return parseLocalDate(a.nextDueDate).getTime() - parseLocalDate(b.nextDueDate).getTime();
      }
      if (a.nextDueDate) return -1;
      if (b.nextDueDate) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    let remaining = surplus;
    const newAllocations: Record<string, string> = {};

    for (const proj of sorted) {
      if (remaining <= 0) break;
      const debt = proj.remainingDebt;
      if (debt <= 0) continue;

      const allocated = Math.min(remaining, debt);
      newAllocations[proj.id] = allocated.toFixed(2);
      remaining -= allocated;
    }

    setRedistributeAllocations(newAllocations);
  };

  const handleCreateRedistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const surplus = selectedProject.surplus;
    const distributedSum = Object.values(redistributeAllocations).reduce(
      (sum, val) => sum + parseFloat(val || "0"),
      0
    );

    if (distributedSum <= 0) {
      sileo.error({ title: "Por favor distribuye al menos algo de saldo a favor" });
      return;
    }

    if (distributedSum > surplus + 0.01) {
      sileo.error({ title: "La distribución excede el saldo a favor disponible" });
      return;
    }

    setIsUploading(true);
    try {
      const promises = [];

      promises.push(
        createPaymentMutation.mutateAsync({
          project_id: selectedProject.id,
          amount: -distributedSum,
          method: "redistribution",
          folio: `Redistribución a otros proyectos`,
          is_reconciled: true,
        })
      );

      for (const pId of Object.keys(redistributeAllocations)) {
        const amt = parseFloat(redistributeAllocations[pId] || "0");
        if (amt > 0) {
          promises.push(
            createPaymentMutation.mutateAsync({
              project_id: pId,
              amount: amt,
              method: "redistribution",
              folio: `Redistribución desde ${selectedProject.name}`,
              is_reconciled: true,
            })
          );
        }
      }

      await Promise.all(promises);

      sileo.success({ title: "Saldo redistribuido correctamente" });
      setIsRedistributeOpen(false);
      setSelectedProject(null);
      setRedistributeAllocations({});
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !paymentForm.amount) {
      sileo.error({ title: "Por favor llena los campos requeridos" });
      return;
    }

    const mainDebt = selectedProject.remainingDebt;
    const enteredAmount = parseFloat(paymentForm.amount);
    const excess = enteredAmount - mainDebt;

    let distributedSum = 0;
    if (excess > 0) {
      distributedSum = Object.values(allocatedAmounts).reduce((sum, val) => sum + parseFloat(val || "0"), 0);
      if (distributedSum > excess + 0.01) {
        sileo.error({ title: "La distribución excede el dinero restante" });
        return;
      }
    }

    setIsUploading(true);
    try {
      let proof_url = null;
      if (paymentForm.proof_file) {
        proof_url = await uploadPaymentProof(paymentForm.proof_file);
      }

      const promises = [];
      const mainAmount = enteredAmount - distributedSum;

      if (mainAmount > 0) {
        promises.push(
          createPaymentMutation.mutateAsync({
            project_id: selectedProject.id,
            amount: mainAmount,
            method: paymentForm.method,
            folio: paymentForm.folio || null,
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
              method: paymentForm.method,
              folio: paymentForm.folio || null,
              proof_url,
            })
          );
        }
      }

      await Promise.all(promises);

      sileo.success({ title: "Cobro registrado correctamente" });
      setIsPaymentOpen(false);
      setSelectedProject(null);
      setAllocatedAmounts({});
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = projectsLoading || paymentsLoading || schedulesLoading;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Finanzas</span>
            <span>›</span>
            <span className="text-foreground font-medium">Cuentas por Cobrar</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cuentas por Cobrar (Clientes)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitorea los saldos pendientes de tus clientes por cada proyecto activo y registra abonos rápidamente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={handleExportCSV}
            disabled={filteredProjects.length === 0}
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
              Por cobrar
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Deuda Total Pendiente</p>
            <h3 className="text-xl font-bold text-amber-600 leading-tight mt-0.5">
              {formatCurrency(totalOutstanding)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={Math.max(0, 100 - collectionRate)} indicatorClassName="bg-amber-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Saldo restante en cotizaciones activas</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-emerald-50/60 text-emerald-700 border-emerald-200">
              {collectionRate.toFixed(1)}% cobrado
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Total Cobrado Acumulado</p>
            <h3 className="text-xl font-bold text-emerald-600 leading-tight mt-0.5">
              {formatCurrency(totalCollectedAll)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={collectionRate} indicatorClassName="bg-emerald-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">De {formatCurrency(totalContracted)} pactados</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-blue-50/60 text-blue-700 border-blue-200">
              {projectDebts.length} activos
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Proyectos con Adeudo</p>
            <h3 className="text-xl font-bold text-foreground leading-tight mt-0.5">
              {projectsWithDebtCount} proyectos
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={debtorRatio} indicatorClassName="bg-blue-600" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Proyectos activos pendientes de liquidar</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-rose-50/60 text-rose-700 border-rose-200">
              Atención
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Saldo Vencido (Atrasado)</p>
            <h3 className="text-xl font-bold text-rose-600 leading-tight mt-0.5">
              {formatCurrency(totalOverdue)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress
              value={totalOutstanding > 0 ? Math.min(100, (totalOverdue / totalOutstanding) * 100) : 0}
              indicatorClassName="bg-rose-500"
              className="h-1.5"
            />
            <p className="text-[10px] text-muted-foreground">Plazos de pago vencidos sin cobro</p>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-3 rounded-lg border border-border/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filtros:
          </div>
          <label htmlFor="onlyDebtors" className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              id="onlyDebtors"
              checked={showOnlyDebtors}
              onChange={(e) => setShowOnlyDebtors(e.target.checked)}
              className="rounded border-input text-primary focus:ring-ring h-3.5 w-3.5"
            />
            <span className="text-xs font-medium text-foreground">
              Mostrar solo proyectos con deuda pendiente o saldo a favor
            </span>
          </label>
          {(searchQuery || !showOnlyDebtors) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setShowOnlyDebtors(true);
              }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Restablecer
            </Button>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground">
          Mostrando <span className="font-semibold text-foreground">{filteredProjects.length}</span> proyectos
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card shadow-xs border-border/80 overflow-hidden">
        <div className="p-3.5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Listado de Proyectos y Adeudos</h3>
            <p className="text-[11px] text-muted-foreground">
              Visualiza el saldo contratado contra lo cobrado de cada cliente.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, proyecto o folio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/20"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Cargando saldos...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            No se encontraron proyectos con adeudos para los filtros seleccionados.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] text-muted-foreground bg-muted/20">
                  <TableHead className="py-2.5">Cliente</TableHead>
                  <TableHead className="py-2.5">Proyecto</TableHead>
                  <TableHead className="py-2.5">Precio Pactado</TableHead>
                  <TableHead className="py-2.5">Total Cobrado</TableHead>
                  <TableHead className="py-2.5">Deuda Restante</TableHead>
                  <TableHead className="py-2.5">Próximo Vencimiento</TableHead>
                  <TableHead className="py-2.5">Estado</TableHead>
                  <TableHead className="py-2.5 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {paginatedProjects.map((p) => (
                  <TableRow
                    key={p.id}
                    className={p.isOverdue ? "bg-rose-50/40 hover:bg-rose-50/70" : "hover:bg-muted/40"}
                  >
                    <TableCell className="font-semibold text-foreground">{p.client?.name || "-"}</TableCell>
                    <TableCell>
                      <Link
                        to={`/quote/${p.share_token}`}
                        target="_blank"
                        className="font-medium text-[#1e3a5f] hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrency(p.totalAmount)}</TableCell>
                    <TableCell className="text-emerald-600 font-semibold">{formatCurrency(p.totalPaid)}</TableCell>
                    <TableCell className="font-bold">
                      {p.remainingDebt > 0 ? (
                        <span className="text-amber-600">{formatCurrency(p.remainingDebt)}</span>
                      ) : p.surplus > 0 ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 border-emerald-200 bg-emerald-50 text-[10px] font-normal py-0"
                        >
                          + {formatCurrency(p.surplus)} a favor
                        </Badge>
                      ) : (
                        <span className="text-emerald-600">{formatCurrency(0)}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {p.nextDueDate ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{p.nextDueDate}</span>
                          {p.isOverdue && (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-normal py-0"
                            >
                              Vencido
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          p.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal py-0"
                            : p.status === "approved"
                            ? "bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-normal py-0"
                            : "bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-normal py-0"
                        }
                      >
                        {projectStatusTranslations[p.status] || p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.remainingDebt > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenPaymentDialog(p)}
                          className="h-7 text-[11px] px-2.5 bg-[#1e3a5f] hover:bg-[#152a45] text-white"
                        >
                          <Check className="h-3 w-3 mr-1" /> Registrar Cobro
                        </Button>
                      ) : p.surplus > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenRedistributeDialog(p)}
                          className="h-7 text-[11px] px-2.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          <ArrowRightLeft className="h-3 w-3 mr-1" /> Distribuir Saldo
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 border-emerald-200 bg-emerald-50 text-[10px] font-normal py-0"
                        >
                          Liquidado
                        </Badge>
                      )}
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
                totalItems={filteredProjects.length}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* Dialog: Register Payment */}
      {selectedProject && (
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Cobro para {selectedProject.name}</DialogTitle>
              <DialogDescription>
                Abona un monto a la deuda pendiente de <strong>{selectedProject.client?.name}</strong> (Deuda:{" "}
                {formatCurrency(selectedProject.remainingDebt)}).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pb-1 border-b border-border/40">
                  <span className="text-foreground font-semibold truncate max-w-[200px]">{selectedProject.name}</span>
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
                      {formatCurrency(selectedProject.totalAmount ?? selectedProject.custom_price_total)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-600">
                      Pagado a la Fecha
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5">
                      {formatCurrency(selectedProject.totalPaid)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-amber-600">
                      Deuda Pendiente
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-amber-700 mt-0.5">
                      {formatCurrency(selectedProject.remainingDebt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="pay_amt">Monto a Cobrar ($) *</Label>
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
                  {paymentForm.method === "atm_withdrawal" ? "Código de Retiro ATM *" : "Folio / Número de Operación"}
                </Label>
                <Input
                  id="pay_folio"
                  value={paymentForm.folio}
                  onChange={(e) => setPaymentForm({ ...paymentForm, folio: e.target.value })}
                  placeholder={paymentForm.method === "atm_withdrawal" ? "Ej: Código de 12 dígitos" : "Ej: FOL-129841"}
                  required={paymentForm.method === "atm_withdrawal"}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pay_proof">Archivo del Comprobante (Opcional)</Label>
                <Input
                  id="pay_proof"
                  type="file"
                  onChange={(e) => setPaymentForm({ ...paymentForm, proof_file: e.target.files?.[0] || null })}
                />
              </div>

              {/* Excess Payment Distribution Section */}
              {(() => {
                const mainDebt = selectedProject?.remainingDebt || 0;
                const enteredAmount = parseFloat(paymentForm.amount || "0");
                const excess = enteredAmount - mainDebt;

                if (excess <= 0 || otherProjectsWithDebt.length === 0) return null;

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
                            <span className="font-medium text-foreground block truncate">{p.name}</span>
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
                <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || createPaymentMutation.isPending}
                  className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
                >
                  {isUploading || createPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Confirmar Cobro"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Distribute Surplus */}
      {selectedProject && (
        <Dialog open={isRedistributeOpen} onOpenChange={setIsRedistributeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Distribuir Saldo a Favor de {selectedProject.name}</DialogTitle>
              <DialogDescription>
                Transfiere el saldo a favor disponible (<strong>{formatCurrency(selectedProject.surplus)}</strong>) a
                otros proyectos con deuda de <strong>{selectedProject.client?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRedistribution} className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <Label className="text-xs font-semibold text-amber-600">
                    Saldo disponible: {formatCurrency(selectedProject.surplus)}
                  </Label>
                  {otherProjectsWithDebt.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-amber-500 text-amber-600 hover:bg-amber-50"
                      onClick={() => handleAutoDistributeSurplus(selectedProject.surplus)}
                    >
                      Auto-distribuir
                    </Button>
                  )}
                </div>

                {otherProjectsWithDebt.length === 0 ? (
                  <div className="text-center py-6 border rounded bg-muted/20 text-xs text-muted-foreground">
                    Este cliente no tiene otros proyectos con deuda pendiente.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2.5 bg-muted/20">
                      {otherProjectsWithDebt.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center gap-3 text-xs border-b pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex-1 truncate">
                            <span className="font-medium text-foreground block truncate">{p.name}</span>
                            <span className="text-muted-foreground text-[10px]">
                              Pendiente: {formatCurrency(p.remainingDebt)}
                            </span>
                          </div>
                          <div className="w-28">
                            <Input
                              type="number"
                              placeholder="Monto ($)"
                              className="h-8 text-xs"
                              value={redistributeAllocations[p.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRedistributeAllocations((prev) => ({ ...prev, [p.id]: val }));
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {(() => {
                      const distributedSum = Object.keys(redistributeAllocations).reduce(
                        (sum, key) => sum + parseFloat(redistributeAllocations[key] || "0"),
                        0
                      );
                      const remainingExcess = selectedProject.surplus - distributedSum;

                      return (
                        <div className="flex justify-between text-xs font-semibold pt-1">
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
                      );
                    })()}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRedistributeOpen(false);
                    setSelectedProject(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || otherProjectsWithDebt.length === 0}
                  className="bg-[#1e3a5f] hover:bg-[#152a45] text-white font-medium"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    "Confirmar Distribución"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
