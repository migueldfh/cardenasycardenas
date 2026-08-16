import { Link } from "react-router-dom";
import { useActiveWorkOrders } from "@/hooks/useWorkOrders";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, Plus, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

export function Orders() {
  const { profile } = useAuth();
  const { data: orders, isLoading, error } = useActiveWorkOrders();
  const isAdmin = profile?.role === "admin";

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Órdenes de Producción</h2>
          <p className="text-muted-foreground mt-1">Manage and track production stages across all active orders.</p>
        </div>
        {isAdmin && (
          <Link to="/orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Cliente / Proyecto</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha Entrega</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay órdenes activas.
                </TableCell>
              </TableRow>
            ) : (
              orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.folio}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{order.client}</span>
                      <span className="text-xs text-muted-foreground">{order.project_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell>{order.quantity.toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>{format(new Date(order.delivery_date), "PP")}</TableCell>
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
    </div>
  );
}
