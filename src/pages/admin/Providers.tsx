import * as React from "react";
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from "@/modules/finances/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import type { ISupplier } from "@/modules/finances/types";

export function Providers() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  const [supplierSearch, setSupplierSearch] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<ISupplier | null>(null);
  const [form, setForm] = React.useState({
    legal_name: "",
    fiscal_name: "",
    tax_id_rfc: "",
    contact_info: "",
  });

  const handleEdit = (supplier: ISupplier) => {
    setEditingSupplier(supplier);
    setForm({
      legal_name: supplier.legal_name,
      fiscal_name: supplier.fiscal_name || "",
      tax_id_rfc: supplier.tax_id_rfc || "",
      contact_info: supplier.contact_info || "",
    });
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingSupplier(null);
      setForm({ legal_name: "", fiscal_name: "", tax_id_rfc: "", contact_info: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.legal_name) return;
    try {
      if (editingSupplier) {
        await updateSupplierMutation.mutateAsync({ id: editingSupplier.id, payload: form });
        toast.success("Proveedor actualizado con éxito");
      } else {
        await createSupplierMutation.mutateAsync(form);
        toast.success("Proveedor registrado con éxito");
      }
      setIsOpen(false);
      setEditingSupplier(null);
      setForm({ legal_name: "", fiscal_name: "", tax_id_rfc: "", contact_info: "" });
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este proveedor?")) {
      return;
    }
    try {
      await deleteSupplierMutation.mutateAsync(id);
      toast.success("Proveedor eliminado con éxito");
    } catch (err: any) {
      toast.error(`Error al eliminar: ${err.message}`);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.legal_name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      (s.fiscal_name || "").toLowerCase().includes(supplierSearch.toLowerCase()) ||
      (s.tax_id_rfc || "").toLowerCase().includes(supplierSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Directorio de Proveedores</h2>
          <p className="text-muted-foreground text-sm">Gestiona tus contactos comerciales y la información de facturación de proveedores.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Agregar Proveedor
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Proveedores Registrados</CardTitle>
            <CardDescription>Busca y visualiza los datos fiscales de tus proveedores.</CardDescription>
          </div>
          <Input
            placeholder="Buscar por nombre o RFC..."
            value={supplierSearch}
            onChange={(e) => setSupplierSearch(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">Cargando proveedores...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No se encontraron proveedores.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre / Razón Social</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Contacto / Información</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <span>{s.legal_name}</span>
                          {s.fiscal_name && (
                            <span className="text-[10px] text-muted-foreground block font-normal font-mono">
                              {s.fiscal_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {s.tax_id_rfc || <span className="italic text-muted-foreground/50">Sin RFC registrado</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.contact_info || <span className="italic text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(s)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(s.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Create / Edit */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Editar Proveedor" : "Agregar Nuevo Proveedor"}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? "Modifica la información legal y de contacto." : "Completa la información legal y de contacto."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="s_legal">Nombre Comercial / Razón Social *</Label>
              <Input
                id="s_legal"
                value={form.legal_name}
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                placeholder="Ej: Distribuidora Textil"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s_fiscal">Nombre Fiscal (Opcional)</Label>
              <Input
                id="s_fiscal"
                value={form.fiscal_name}
                onChange={(e) => setForm({ ...form, fiscal_name: e.target.value })}
                placeholder="Ej: TEXTIL S.A. DE C.V."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s_rfc">RFC</Label>
              <Input
                id="s_rfc"
                value={form.tax_id_rfc}
                onChange={(e) => setForm({ ...form, tax_id_rfc: e.target.value.toUpperCase() })}
                placeholder="XAXX010101000"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s_info">Contacto (Teléfono/Correo/Dirección)</Label>
              <Input
                id="s_info"
                value={form.contact_info}
                onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                placeholder="Ej: ventas@proveedor.com, Tel: 55123456"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}>
                {editingSupplier ? "Guardar Cambios" : "Guardar Proveedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
