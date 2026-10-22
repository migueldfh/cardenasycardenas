import { useState } from "react";
import { Plus, Trash2, Tag, Search } from "lucide-react";
import {
  useExpenseCategories,
  useCreateExpenseCategory,
  useDeleteExpenseCategory,
} from "../hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TablePagination } from "@/components/ui/TablePagination";
import { toast } from "sonner";

export function Categorias() {
  const { data: categories, isLoading } = useExpenseCategories();
  const createMutation = useCreateExpenseCategory();
  const deleteMutation = useDeleteExpenseCategory();

  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [form, setForm] = useState({
    name: "",
    color_code: "#3b82f6",
    icon: "🏷️",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        name: form.name,
        color_code: form.color_code,
        icon: form.icon,
      });
      toast.success("Categoría creada correctamente");
      setIsOpen(false);
      setForm({
        name: "",
        color_code: "#3b82f6",
        icon: "🏷️",
      });
    } catch (error) {
      toast.error("Error al crear categoría");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta categoría?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Categoría eliminada");
    } catch {
      toast.error(
        "Error al eliminar categoría. Verifica que no tenga gastos asociados."
      );
    }
  };

  const filteredCategories = categories?.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = filteredCategories?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedCategories = filteredCategories?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Finanzas</span>
            <span>›</span>
            <span className="text-foreground font-medium">Categorías de Gastos</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Categorías de Gastos
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Administra los tipos de gastos e identificadores visuales de la plataforma.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="h-9 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Nueva Categoría</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre de la Categoría</Label>
                <Input
                  placeholder="Ej: Software, Marketing, Transporte..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Color Identificador</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={form.color_code}
                      onChange={(e) =>
                        setForm({ ...form, color_code: e.target.value })
                      }
                      className="w-12 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={form.color_code}
                      onChange={(e) =>
                        setForm({ ...form, color_code: e.target.value })
                      }
                      className="flex-1 uppercase font-mono text-xs h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Icono / Emoji</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Ej: 🏷️, 🍔, 💻"
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      maxLength={4}
                      required
                      className="text-center text-lg h-9"
                    />
                    <div className="flex flex-wrap gap-1 p-1.5 bg-muted/40 rounded-md border border-border/60">
                      {[
                        "🏷️",
                        "🛠️",
                        "💼",
                        "📈",
                        "🤝",
                        "💰",
                        "🛒",
                        "📄",
                        "🚗",
                        "🏠",
                        "🍔",
                        "💻",
                        "💡",
                        "⚙️",
                        "🔌",
                        "📦",
                      ].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setForm({ ...form, icon: emoji })}
                          className={`w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-sm transition-colors ${
                            form.icon === emoji
                              ? "bg-primary/20 ring-1 ring-primary"
                              : ""
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1e3a5f] hover:bg-[#152a45] text-white"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Guardando..." : "Guardar Categoría"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Card */}
      <Card className="bg-card shadow-xs border-border/80 overflow-hidden">
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar categorías..."
              className="pl-8 h-9 text-xs"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {totalItems} categorías registradas
          </span>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Cargando categorías...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] text-muted-foreground bg-muted/20">
                  <TableHead className="w-[80px] py-2.5">Icono</TableHead>
                  <TableHead className="py-2.5">Nombre</TableHead>
                  <TableHead className="py-2.5">Etiqueta Visual</TableHead>
                  <TableHead className="w-[80px] text-right py-2.5">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {paginatedCategories?.map((cat) => (
                  <TableRow key={cat.id} className="hover:bg-muted/30">
                    <TableCell className="text-lg py-2.5">
                      {cat.icon || "🏷️"}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground py-2.5">
                      {cat.name}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
                          style={{
                            backgroundColor: `${cat.color_code}15`,
                            color: cat.color_code,
                            borderColor: `${cat.color_code}30`,
                          }}
                        >
                          <Tag className="w-3 h-3" />
                          {cat.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cat.id)}
                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedCategories?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-xs text-muted-foreground"
                    >
                      No se encontraron categorías.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {totalItems > 0 && (
            <div className="p-4 border-t border-border/60">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
