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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


import { sileo } from "sileo";
import { Calendar, Check, AlertTriangle, FileText, ExternalLink, Paperclip, Loader2, Trash2 } from "lucide-react";

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

  const pendingBills = React.useMemo(() => {
    return expenses
      .filter((e) => e.status !== "paid")
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return parseLocalDate(a.due_date).getTime() - parseLocalDate(b.due_date).getTime();
      });
  }, [expenses]);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  const totalPages = Math.ceil(pendingBills.length / itemsPerPage);
  const paginatedBills = React.useMemo(() => {
    return pendingBills.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [pendingBills, currentPage, itemsPerPage]);

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

  const totalAmountPending = pendingBills.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Cuentas por Pagar (Proveedores)</h2>
        <p className="text-muted-foreground text-sm">Control de obligaciones y facturas de proveedores pendientes de liquidar.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-yellow-700 dark:text-yellow-500 font-semibold">Monto Total Pendiente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">
              {formatCurrency(totalAmountPending)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cuentas Pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBills.length} facturas</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-700 dark:text-red-500 font-semibold">Cuentas Vencidas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-500">
              {pendingBills.filter((b) => getDaysRemaining(b.due_date).isOverdue).length} facturas
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Cuentas Pendientes</CardTitle>
          <CardDescription>Visualiza las fechas límite de pago y liquida facturas pendientes.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">Cargando cuentas...</div>
          ) : pendingBills.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No hay cuentas pendientes por pagar.</div>
          ) : (
            <>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estatus Vencimiento</TableHead>
                  <TableHead>Remisiones</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBills.map((b) => {
                  const remaining = getDaysRemaining(b.due_date);
                  return (
                    <TableRow key={b.id} className={remaining.isOverdue ? "bg-red-500/5" : ""}>
                      <TableCell className="font-semibold text-foreground">
                        <div>
                          <span>{b.supplier?.legal_name || "Proveedor General"}</span>
                          {b.supplier?.id && (
                            <span className="text-[10px] text-yellow-600 dark:text-yellow-500 block font-semibold">
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
                      <TableCell>{b.concept}</TableCell>
                      <TableCell>
                        <span
                          className="inline-block h-2 w-2 rounded-full mr-2"
                          style={{ backgroundColor: b.category?.color_code }}
                        />
                        {b.category?.name || "Operaciones"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <Calendar className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                        {b.due_date || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {remaining.isOverdue ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          ) : null}
                          <span className={remaining.isOverdue ? "text-red-600 font-medium text-xs" : "text-xs text-muted-foreground"}>
                            {remaining.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveExpenseForRemissions(b)}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Ver ({b.remissions?.length || 0})
                        </Button>
                      </TableCell>
                      <TableCell className="font-bold text-red-600">
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
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Registrar Pago
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
             </Table>
             <TablePagination
               currentPage={currentPage}
               totalPages={totalPages}
               onPageChange={setCurrentPage}
               totalItems={pendingBills.length}
               itemsPerPage={itemsPerPage}
               onItemsPerPageChange={setItemsPerPage}
             />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Manage Remissions */}
      <Dialog open={!!currentExpense} onOpenChange={(open) => !open && setActiveExpenseForRemissions(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Gestionar Remisiones</DialogTitle>
            <DialogDescription>
              Administra las remisiones y comprobantes de entrega para el gasto:{" "}
              <strong className="text-foreground">{currentExpense?.concept}</strong> ({formatCurrency(currentExpense?.amount || 0)})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* List of Remissions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Remisiones Registradas</h4>
              {(!currentExpense?.remissions || currentExpense.remissions.length === 0) ? (
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
                              className="bg-green-600 h-full rounded-full transition-all duration-300"
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
                            <span>Restante: {Math.round((Math.max(0, (rem.amount || 0) - (rem.paid_amount || 0)) / (rem.amount || 1)) * 100)}%</span>
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
                              if (e.key === 'Enter') {
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
                          className={rem.is_paid ? "bg-green-600 hover:bg-green-700 text-white" : ""}
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
                      label: `${p.name}${p.client?.name ? ` (${p.client.name})` : ""}`
                    }))
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
                <Label htmlFor="rem_is_paid" className="cursor-pointer text-sm">¿Esta remisión ya está pagada?</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isUploadingRemission}>
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
