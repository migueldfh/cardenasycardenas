import * as React from "react";
import { useExpenseCategories, useCreateExpenseCategory, useDeleteExpenseCategory } from "../hooks";
import { TablePagination } from "@/components/ui/TablePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sileo } from "sileo";
import { Plus, Trash2, Loader2, Search } from "lucide-react";

export function Categorias() {
  const { data: categories = [], isLoading } = useExpenseCategories();
  const createCategoryMutation = useCreateExpenseCategory();
  const deleteCategoryMutation = useDeleteExpenseCategory();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  const filteredCategories = React.useMemo(() => {
    return categories.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [categories, searchQuery]);

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const paginatedCategories = React.useMemo(() => {
    return filteredCategories.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredCategories, currentPage, itemsPerPage]);

  const [form, setForm] = React.useState({
    name: "",
    color_code: "#3b82f6",
    icon: "🏷️",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    try {
      await createCategoryMutation.mutateAsync(form);
      sileo.success({ title: "Categoría creada con éxito" });
      setIsOpen(false);
      setForm({ name: "", color_code: "#3b82f6", icon: "🏷️" });
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta categoría? Los egresos asociados pasarán a no tener categoría.")) {
      return;
    }
    try {
      await deleteCategoryMutation.mutateAsync(id);
      sileo.success({ title: "Categoría eliminada con éxito" });
    } catch (err: any) {
      sileo.error({ title: `Error al eliminar: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categorías de Egresos</h2>
          <p className="text-muted-foreground text-sm">Organiza tus egresos operativos por rubros y asigna códigos de color para visualizaciones.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Categoría
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Listado de Categorías</CardTitle>
            <CardDescription>Visualiza las categorías registradas para tus egresos y presupuestos.</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categoría..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">Cargando categorías...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No se han registrado categorías.</div>
          ) : (
            <>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Identificador Visual</TableHead>
                  <TableHead>Código Hexadecimal</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCategories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold text-foreground flex items-center gap-2">
                      <span className="text-lg w-5 h-5 flex items-center justify-center mr-1" role="img">
                        {c.icon || "🏷️"}
                      </span>
                      {c.name}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-4 w-4 rounded-full border shadow-sm inline-block"
                          style={{ backgroundColor: c.color_code }}
                        />
                        Color Distintivo
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.color_code}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                        onClick={() => handleDelete(c.id)}
                        disabled={deleteCategoryMutation.isPending}
                        title="Eliminar Categoría"
                      >
                        {deleteCategoryMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
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
               totalItems={filteredCategories.length}
               itemsPerPage={itemsPerPage}
               onItemsPerPageChange={setItemsPerPage}
             />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Create */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoría de Egreso</DialogTitle>
            <DialogDescription>Crea un rubro para categorizar y graficar tus gastos operacionales.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="c_name">Nombre de Categoría *</Label>
              <Input
                id="c_name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Nómina, Renta, Logística"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="c_color">Color Distintivo (HEX) *</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="c_color"
                  type="color"
                  value={form.color_code}
                  onChange={(e) => setForm({ ...form, color_code: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={form.color_code}
                  onChange={(e) => setForm({ ...form, color_code: e.target.value })}
                  className="font-mono"
                  placeholder="#3b82f6"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Emoji / Icono *</Label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded-lg border">
                {["🏷️", "🛠️", "💼", "📈", "🤝", "💰", "🛒", "📄", "🚗", "🏠", "🍔", "💻", "💡", "⚙️", "🔌", "📦"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm({ ...form, icon: emoji })}
                    className={`h-8 w-8 text-lg flex items-center justify-center rounded-md transition-all ${
                      form.icon === emoji
                        ? "bg-primary text-primary-foreground scale-105 shadow-sm"
                        : "hover:bg-muted text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center mt-1.5">
                <Input
                  type="text"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="O ingresa un emoji personalizado"
                  maxLength={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createCategoryMutation.isPending}>
                Crear Categoría
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
