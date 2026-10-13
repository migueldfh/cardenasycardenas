import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, ArrowLeft, Filter } from "lucide-react";
import { TablePagination } from "@/components/ui/TablePagination";
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

  // Filters and Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRack, setSelectedRack] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Group stock data by rack
  const rackMap = useMemo(() => {
    const map = new Map<string, { totalQuantity: number; slots: number }>();
    if (stockData) {
      for (const row of stockData) {
        const rackKey = row.rack ?? "Sin Rack";
        const existing = map.get(rackKey) ?? { totalQuantity: 0, slots: 0 };
        existing.totalQuantity += row.quantity;
        existing.slots += 1;
        map.set(rackKey, existing);
      }
    }
    return map;
  }, [stockData]);

  const racks = useMemo(() => {
    return Array.from(rackMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rackMap]);

  // Filtered rows for the table
  const filteredStock = useMemo(() => {
    if (!stockData) return [];
    return stockData.filter((row) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || row.part_number.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (selectedRack !== "all") {
        const rowRack = row.rack ?? "Sin Rack";
        if (rowRack !== selectedRack) return false;
      }

      return true;
    });
  }, [stockData, searchTerm, selectedRack]);

  const totalPages = Math.ceil(filteredStock.length / itemsPerPage) || 1;
  const paginatedStock = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStock.slice(start, start + itemsPerPage);
  }, [filteredStock, currentPage, itemsPerPage]);

  const handleRackClick = (rackName: string) => {
    if (selectedRack === rackName) {
      setSelectedRack("all");
    } else {
      setSelectedRack(rackName);
      setCurrentPage(1);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedRack("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Rack Explorer</h2>
            <p className="text-muted-foreground mt-1">
              Mapa físico de racks para <Badge variant="secondary" className="ml-1 text-sm">{label}</Badge>
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle>Mapa de Racks — {label}</CardTitle>
              <CardDescription>Haz clic en cualquier rack para filtrar la tabla de detalle inferior.</CardDescription>
            </div>
            {selectedRack !== "all" && (
              <Badge variant="outline" className="self-start sm:self-auto bg-primary/10 text-primary border-primary/20">
                Filtrando por: {selectedRack}
              </Badge>
            )}
          </div>
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
              {racks.map(([rackName, info]) => {
                const isSelected = selectedRack === rackName;
                return (
                  <div
                    key={rackName}
                    onClick={() => handleRackClick(rackName)}
                    className={`flex flex-col items-center justify-center rounded-lg border p-6 transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-muted/50 hover:bg-accent hover:border-primary/40"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${isSelected ? "text-primary" : ""}`}>{rackName}</span>
                    <span className="text-lg font-bold tabular-nums mt-1">{info.totalQuantity}</span>
                    <span className="text-xs text-muted-foreground">{info.slots} slots</span>
                  </div>
                );
              })}
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

      {/* Raw stock table with Search and Filter */}
      {stockData && stockData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Detalle por Ubicación</CardTitle>
                <CardDescription>
                  Listado de existencias distribuidas en los racks ({filteredStock.length} de {stockData.length} registros).
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número de parte..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-9 pl-9 pr-8 text-xs"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSearchTerm("");
                        setCurrentPage(1);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={selectedRack}
                    onChange={(e) => {
                      setSelectedRack(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">Todos los racks</option>
                    {racks.map(([rackName]) => (
                      <option key={rackName} value={rackName}>
                        {rackName}
                      </option>
                    ))}
                  </select>
                </div>

                {(searchTerm || selectedRack !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredStock.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-lg bg-muted/10">
                <p className="text-sm text-muted-foreground">No se encontraron ubicaciones con los filtros seleccionados.</p>
                <Button variant="link" size="sm" onClick={handleClearFilters} className="text-xs mt-1">
                  Restablecer filtros
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-muted-foreground">
                        <th className="text-left py-2.5 px-3.5 font-medium">Part Number</th>
                        <th className="text-left py-2.5 px-3.5 font-medium">Rack</th>
                        <th className="text-left py-2.5 px-3.5 font-medium">Sección</th>
                        <th className="text-left py-2.5 px-3.5 font-medium">Nivel</th>
                        <th className="text-right py-2.5 px-3.5 font-medium">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedStock.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium font-mono text-xs text-foreground">{row.part_number}</td>
                          <td className="py-2.5 px-3.5 font-medium">{row.rack ?? "—"}</td>
                          <td className="py-2.5 px-3.5 text-muted-foreground">{row.section ?? "—"}</td>
                          <td className="py-2.5 px-3.5 text-muted-foreground">{row.level ?? "—"}</td>
                          <td className="py-2.5 px-3.5 text-right tabular-nums font-semibold text-foreground">{row.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredStock.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(val) => {
                    setItemsPerPage(val);
                    setCurrentPage(1);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
