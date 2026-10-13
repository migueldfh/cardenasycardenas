import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useActiveWorkOrders } from "@/hooks/useWorkOrders";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, Plus, ChevronRight, Search, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

export function Orders() {
  const { profile } = useAuth();
  const { data: orders = [], isLoading, error } = useActiveWorkOrders();
  const isAdmin = profile?.role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !term ||
        order.folio.toLowerCase().includes(term) ||
        order.client.toLowerCase().includes(term) ||
        order.project_name.toLowerCase().includes(term) ||
        order.product.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [orders, searchQuery, statusFilter, priorityFilter]);

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || priorityFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Error loading orders: {(error as Error).message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Órdenes de Producción</h2>
          <p className="text-muted-foreground mt-1">Gestiona y monitorea las etapas de producción de todas las órdenes activas.</p>
        </div>
        {isAdmin && (
          <Link to="/orders/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Orden
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por folio, cliente, proyecto o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-card">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="production">En Producción</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px] bg-card">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda Prioridad</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetFilters}
              title="Limpiar filtros"
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Cliente / Proyecto</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha Entrega</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  {hasActiveFilters
                    ? "No se encontraron órdenes que coincidan con los filtros aplicados."
                    : "No hay órdenes activas registradas."}
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="font-semibold">{order.folio}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{order.client}</span>
                      <span className="text-xs text-muted-foreground">{order.project_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell className="font-medium">{order.quantity.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] uppercase font-semibold ${
                        order.priority === 'high' 
                          ? 'border-red-500/30 text-red-600 bg-red-500/10' 
                          : order.priority === 'medium'
                          ? 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10'
                          : 'border-slate-500/30 text-slate-600 bg-slate-500/10'
                      }`}
                    >
                      {order.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(order.delivery_date), "PP")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/orders/${order.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>Mostrando {filteredOrders.length} de {orders.length} órdenes</span>
      </div>
    </div>
  );
}
