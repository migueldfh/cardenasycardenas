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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sileo } from "sileo";
import { Plus, Check, Search, UserPlus, Trash2, FileText, ExternalLink, Paperclip, Loader2, Pencil } from "lucide-react";
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
          payment_method: "transfer", // default
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

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.concept.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      (e.supplier?.legal_name || "").toLowerCase().includes(expenseSearch.toLowerCase());

    const matchesCategory = selectedCategory === "all" || e.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [expenseSearch, selectedCategory]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = React.useMemo(() => {
    return filteredExpenses.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredExpenses, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gastos y Compras</h2>
          <p className="text-muted-foreground text-sm">Control e historial de egresos operativos, materias primas y facturas de proveedores.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsSupplierOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Nuevo Proveedor
          </Button>
          <Button size="sm" onClick={() => {
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
          }}>
            <Plus className="h-4 w-4 mr-2" /> Registrar Gasto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 w-full">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por concepto o proveedor..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Egresos</CardTitle>
          <CardDescription>Visualiza y administra tus egresos registrados.</CardDescription>
        </CardHeader>
        <CardContent>
          {expensesLoading ? (
            <div className="text-center py-10">Cargando gastos...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No se encontraron egresos.</div>
          ) : (
            <>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExpenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <span>{e.concept}</span>
                        {e.is_factura && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            Factura
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: e.category?.color_code }}
                        />
                        <span className="text-base" role="img">{e.category?.icon || "🏷️"}</span>
                        <span>{e.category?.name || "Otros"}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{e.supplier?.legal_name || "-"}</span>
                        {e.supplier?.id && (
                          <span className="text-[10px] text-yellow-600 dark:text-yellow-500 block font-semibold">
                            Deuda total: {formatCurrency(getSupplierRemainingDebt(e.supplier.id))}
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
                          <span className="font-semibold text-xs text-foreground block truncate max-w-[150px]">
                            {e.project.name}
                          </span>
                          {e.project.client?.name && (
                            <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">
                               {e.project.client.name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Sin vincular</span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-red-600">
                      <div>
                        <span>{formatCurrency(e.amount)}</span>
                        {e.is_factura && e.iva_amount ? (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-normal">
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
                      <Badge variant={e.status === "paid" ? "default" : "destructive"}>
                        {e.status === "paid" ? "Pagado" : e.status === "pending_payable" ? "Pendiente" : "Vencido"}
                      </Badge>
                    </TableCell>
                    <TableCell>{e.due_date || "-"}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveExpenseForRemissions(e)}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Remisiones ({e.remissions?.length || 0})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditExpense(e)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                      {e.status !== "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsPaid(e.id)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Marcar Pagado
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteExpense(e.id, e.concept)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
               currentPage={currentPage}
               totalPages={totalPages}
               onPageChange={setCurrentPage}
               totalItems={filteredExpenses.length}
               itemsPerPage={itemsPerPage}
               onItemsPerPageChange={setItemsPerPage}
             />
            </>
          )}
        </CardContent>
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
              <Button type="submit" disabled={createSupplierMutation.isPending}>
                Guardar Proveedor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create/Edit Expense */}
      <Dialog open={isExpenseOpen} onOpenChange={(open) => {
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
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpenseId ? "Editar Gasto o Egreso" : "Registrar Gasto o Egreso"}</DialogTitle>
            <DialogDescription>
              {editingExpenseId ? "Modifica los detalles del gasto registrado." : "Genera una compra, pago de servicios o insumo operativo."}
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
                      calculatedIva = String((amt - (amt / 1.16)).toFixed(2));
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
                      calculatedIva = String((amt - (amt / 1.16)).toFixed(2));
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
                 <Label htmlFor="exp_due" className="mb-1">Fecha de Vencimiento *</Label>
                 <DatePicker
                   date={expenseForm.due_date ? parseLocalDate(expenseForm.due_date) : undefined}
                   setDate={(d) => setExpenseForm({ ...expenseForm, due_date: d ? formatLocalDate(d) : "" })}
                   className="w-full"
                 />
               </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}>
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
            <AlertDialogAction onClick={confirmDeleteExpense} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
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
