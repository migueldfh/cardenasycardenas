import * as React from "react";
import { Link } from "react-router-dom";
import { useProjects, usePayments, usePaymentSchedules, useCreatePayment } from "../hooks";
import { TablePagination } from "@/components/ui/TablePagination";
import { parseLocalDate, formatLocalDate } from "@/lib/utils";
import { uploadPaymentProof } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

const projectStatusTranslations: Record<string, string> = {
  draft: "borrador",
  pending_approval: "pendiente de aprobación",
  approved: "aprobado",
  completed: "completado",
  cancelled: "cancelado",
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
        ? subtotal + (subtotal * (project.iva_rate ?? 0.16)) - (subtotal * ((project.isr_retention_rate ?? 0) + (project.iva_retention_rate ?? 0)))
        : subtotal;
      const remainingDebt = totalAmount - totalPaid;
      const surplus = totalPaid - totalAmount;

      // Find next due date from schedules
      const projectSchedules = schedules.filter((s) => s.project_id === project.id);
      const pendingSchedules = projectSchedules.filter((s) => s.status !== "paid");
      
      const sortedPending = [...pendingSchedules].sort((a, b) => parseLocalDate(a.due_date).getTime() - parseLocalDate(b.due_date).getTime());
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

  const projectsWithDebtCount = React.useMemo(() => {
    return projectDebts.filter((p) => p.remainingDebt > 0).length;
  }, [projectDebts]);

  const totalOverdue = React.useMemo(() => {
    const todayStr = formatLocalDate(new Date());
    return schedules
      .filter((s) => s.status !== "paid" && s.due_date < todayStr && s.project?.status !== "cancelled")
      .reduce((sum, s) => sum + Number(s.expected_amount), 0);
  }, [schedules]);

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

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, showOnlyDebtors]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = React.useMemo(() => {
    return filteredProjects.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredProjects, currentPage, itemsPerPage]);

  const otherProjectsWithDebt = React.useMemo(() => {
    if (!selectedProject) return [];
    return projectDebts.filter((p) => 
      p.client_id === selectedProject.client_id && 
      p.id !== selectedProject.id &&
      p.remainingDebt > 0
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
    const distributedSum = Object.values(redistributeAllocations).reduce((sum, val) => sum + parseFloat(val || "0"), 0);

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

      // 1. Create a negative payment on the source project (reducing its surplus)
      promises.push(createPaymentMutation.mutateAsync({
        project_id: selectedProject.id,
        amount: -distributedSum,
        method: "redistribution",
        folio: `Redistribución a otros proyectos`,
        is_reconciled: true,
      }));

      // 2. Create positive payments on target projects
      for (const pId of Object.keys(redistributeAllocations)) {
        const amt = parseFloat(redistributeAllocations[pId] || "0");
        if (amt > 0) {
          promises.push(createPaymentMutation.mutateAsync({
            project_id: pId,
            amount: amt,
            method: "redistribution",
            folio: `Redistribución desde ${selectedProject.name}`,
            is_reconciled: true,
          }));
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
        promises.push(createPaymentMutation.mutateAsync({
          project_id: selectedProject.id,
          amount: mainAmount,
          method: paymentForm.method,
          folio: paymentForm.folio || null,
          proof_url,
        }));
      }

      for (const pId of Object.keys(allocatedAmounts)) {
        const amt = parseFloat(allocatedAmounts[pId] || "0");
        if (amt > 0) {
          promises.push(createPaymentMutation.mutateAsync({
            project_id: pId,
            amount: amt,
            method: paymentForm.method,
            folio: paymentForm.folio || null,
            proof_url,
          }));
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cuentas por Cobrar (Clientes)</h2>
          <p className="text-muted-foreground text-sm">Monitorea los saldos pendientes de tus clientes por cada proyecto activo y registra abonos rápidamente.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-yellow-700 dark:text-yellow-400 font-semibold flex items-center gap-1.5">
              <Coins className="h-4 w-4" /> Deuda Total Pendiente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Saldo restante en cotizaciones aprobadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-muted-foreground" /> Proyectos con Adeudo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectsWithDebtCount} proyectos
            </div>
            <p className="text-xs text-muted-foreground mt-1">Proyectos activos que aún no se liquidan</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-700 dark:text-red-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Saldo Vencido (Atrasado)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {formatCurrency(totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Plazos de pago vencidos sin registrar cobro</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 flex-1 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, proyecto o folio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-10 px-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="onlyDebtors"
              checked={showOnlyDebtors}
              onChange={(e) => setShowOnlyDebtors(e.target.checked)}
              className="rounded border-input text-primary focus:ring-ring h-4 w-4"
            />
            <Label htmlFor="onlyDebtors" className="text-sm font-medium cursor-pointer">
              Mostrar solo proyectos con deuda pendiente
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Proyectos y Adeudos</CardTitle>
          <CardDescription>Visualiza el saldo contratado contra lo cobrado de cada cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Cargando saldos...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No se encontraron registros.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Precio Pactado</TableHead>
                    <TableHead>Total Cobrado</TableHead>
                    <TableHead>Deuda Restante</TableHead>
                    <TableHead>Próximo Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProjects.map((p) => (
                    <TableRow key={p.id} className={p.isOverdue ? "bg-red-500/5 hover:bg-red-500/10" : ""}>
                      <TableCell className="font-semibold text-foreground">{p.client?.name}</TableCell>
                      <TableCell>
                        <Link to={`/quote/${p.share_token}`} target="_blank" className="font-medium text-primary hover:underline">
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell>{formatCurrency(p.custom_price_total)}</TableCell>
                      <TableCell className="text-green-600 font-semibold">{formatCurrency(p.totalPaid)}</TableCell>
                      <TableCell className="font-bold">
                        {p.remainingDebt > 0 ? (
                          <span className="text-yellow-600 dark:text-yellow-500">{formatCurrency(p.remainingDebt)}</span>
                        ) : p.surplus > 0 ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50/50">
                            + {formatCurrency(p.surplus)} a favor
                          </Badge>
                        ) : (
                          <span className="text-green-600">{formatCurrency(0)}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.nextDueDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {p.nextDueDate}
                            {p.isOverdue && (
                              <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0 leading-none">Vencido</Badge>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === "completed"
                              ? "default"
                              : p.status === "approved"
                              ? "secondary"
                              : p.status === "pending_approval"
                              ? "outline"
                              : p.status === "cancelled"
                              ? "destructive"
                              : "outline"
                          }
                          className="capitalize"
                        >
                          {projectStatusTranslations[p.status] || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.remainingDebt > 0 ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPaymentDialog(p)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Registrar Cobro
                          </Button>
                        ) : p.surplus > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRedistributeDialog(p)}
                            className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Distribuir Saldo
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50/50">
                            Liquidado
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredProjects.length}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Register Payment */}
      {selectedProject && (
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Cobro para {selectedProject.name}</DialogTitle>
              <DialogDescription>
                Abona un monto a la deuda pendiente de **{selectedProject.client?.name}** (Deuda: {formatCurrency(selectedProject.remainingDebt)}).
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
                    <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Pagado a la Fecha
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {formatCurrency(selectedProject.totalPaid)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Deuda Pendiente
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 mt-0.5">
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

                const distributedSum = Object.keys(allocatedAmounts).reduce((sum, key) => sum + parseFloat(allocatedAmounts[key] || "0"), 0);
                const remainingExcess = excess - distributedSum;

                return (
                  <div className="space-y-3 border-t pt-3 animate-in fade-in">
                    <div className="flex justify-between items-center gap-2">
                      <Label className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 block">
                        El pago excede la deuda por {formatCurrency(excess)}. Puedes distribuirlo:
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-yellow-500 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
                        onClick={() => handleAutoDistribute(excess)}
                      >
                        Auto-distribuir
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2.5 bg-muted/20">
                      {otherProjectsWithDebt.map((p) => (
                        <div key={p.id} className="flex justify-between items-center gap-3 text-xs border-b pb-2 last:border-0 last:pb-0">
                          <div className="flex-1 truncate">
                            <span className="font-medium text-foreground block truncate">{p.name}</span>
                            <span className="text-muted-foreground text-[10px]">Pendiente: {formatCurrency(p.remainingDebt)}</span>
                          </div>
                          <div className="w-28">
                            <Input
                              type="number"
                              placeholder="Monto ($)"
                              className="h-8 text-xs"
                              value={allocatedAmounts[p.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAllocatedAmounts(prev => ({ ...prev, [p.id]: val }));
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Restante por distribuir:</span>
                      <span className={Math.abs(remainingExcess) < 0.01 ? "text-green-600" : remainingExcess > 0 ? "text-yellow-600" : "text-red-500"}>
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
                <Button type="submit" disabled={isUploading || createPaymentMutation.isPending}>
                  {(isUploading || createPaymentMutation.isPending) ? (
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
                Transfiere el saldo a favor disponible (**{formatCurrency(selectedProject.surplus)}**) a otros proyectos con deuda de **{selectedProject.client?.name}**.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRedistribution} className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <Label className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                    Saldo disponible: {formatCurrency(selectedProject.surplus)}
                  </Label>
                  {otherProjectsWithDebt.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-yellow-500 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
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
                        <div key={p.id} className="flex justify-between items-center gap-3 text-xs border-b pb-2 last:border-0 last:pb-0">
                          <div className="flex-1 truncate">
                            <span className="font-medium text-foreground block truncate">{p.name}</span>
                            <span className="text-muted-foreground text-[10px]">Pendiente: {formatCurrency(p.remainingDebt)}</span>
                          </div>
                          <div className="w-28">
                            <Input
                              type="number"
                              placeholder="Monto ($)"
                              className="h-8 text-xs"
                              value={redistributeAllocations[p.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRedistributeAllocations(prev => ({ ...prev, [p.id]: val }));
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {(() => {
                      const distributedSum = Object.keys(redistributeAllocations).reduce((sum, key) => sum + parseFloat(redistributeAllocations[key] || "0"), 0);
                      const remainingExcess = selectedProject.surplus - distributedSum;

                      return (
                        <div className="flex justify-between text-xs font-semibold pt-1">
                          <span>Restante por distribuir:</span>
                          <span className={Math.abs(remainingExcess) < 0.01 ? "text-green-600" : remainingExcess > 0 ? "text-yellow-600" : "text-red-500"}>
                            {formatCurrency(remainingExcess)}
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsRedistributeOpen(false);
                  setSelectedProject(null);
                }}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUploading || otherProjectsWithDebt.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium"
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
