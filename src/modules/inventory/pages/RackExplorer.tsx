import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWarehouseMap } from "../hooks";

const WAREHOUSE_LABELS: Record<string, string> = {
  B8: "Bodega 8",
  B7: "Bodega 7",
  WP: "Warehouse Principal",
  Schumacher: "Schumacher / Lasko / Damar",
};

export function RackExplorer() {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const label = WAREHOUSE_LABELS[warehouseId ?? ""] ?? warehouseId ?? "Desconocido";
  const { data: stockData, isLoading, isError } = useWarehouseMap(warehouseId ?? "");

  // Group stock data by rack
  const rackMap = new Map<string, { totalQuantity: number; slots: number }>();
  if (stockData) {
    for (const row of stockData) {
      const rackKey = row.rack ?? "Sin Rack";
      const existing = rackMap.get(rackKey) ?? { totalQuantity: 0, slots: 0 };
      existing.totalQuantity += row.quantity;
      existing.slots += 1;
      rackMap.set(rackKey, existing);
    }
  }

  const racks = Array.from(rackMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rack Explorer</h2>
          <p className="text-muted-foreground mt-1">
            Mapa físico de racks para <Badge variant="secondary" className="ml-1 text-sm">{label}</Badge>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mapa de Racks — {label}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">Error al cargar los datos del almacén.</p>
          ) : racks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {racks.map(([rackName, info]) => (
                <div
                  key={rackName}
                  className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/50 p-6 transition-colors hover:bg-accent hover:border-primary/40 cursor-pointer"
                >
                  <span className="text-sm font-semibold">{rackName}</span>
                  <span className="text-lg font-bold tabular-nums mt-1">{info.totalQuantity}</span>
                  <span className="text-xs text-muted-foreground">{info.slots} slots</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No hay inventario registrado en {label}. Agrega productos y ubicaciones para ver el mapa.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw stock table */}
      {stockData && stockData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle por Ubicación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Part Number</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Rack</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Sección</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Nivel</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{row.part_number}</td>
                      <td className="py-2 px-3">{row.rack ?? "—"}</td>
                      <td className="py-2 px-3">{row.section ?? "—"}</td>
                      <td className="py-2 px-3">{row.level ?? "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold">{row.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
