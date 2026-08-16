import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { sileo } from "sileo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Warehouse, Grid, ShieldAlert, Edit, Trash2 } from "lucide-react";
import { useBulkCreateLocations, useWarehouses, useUpdateWarehouse, useDeleteWarehouse, useWarehouseMap, useTransferWarehouseStock } from "../hooks";
import { useAuth } from "@/hooks/useAuth";
import type { ILocation } from "../types";

export function WarehouseSetup() {
  const bulkCreateMutation = useBulkCreateLocations();
  const updateWarehouseMutation = useUpdateWarehouse();
  const deleteWarehouseMutation = useDeleteWarehouse();
  const transferWarehouseStockMutation = useTransferWarehouseStock();
  const { data: dbWarehouses } = useWarehouses();

  // Security role check
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  // Form State for creation
  const [warehouseCode, setWarehouseCode] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [sectionsCount, setSectionsCount] = useState("4");
  const [racksCount, setRacksCount] = useState("10");
  const [levelsCount, setLevelsCount] = useState("5");

  // Edit / Delete states
  const [editingWarehouse, setEditingWarehouse] = useState<{ id: string; label: string } | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [deletingWarehouse, setDeletingWarehouse] = useState<{ id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [targetWarehouseId, setTargetWarehouseId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Fetch stock to check for activeStock in deletion candidate warehouse
  const { data: warehouseStock, isLoading: isLoadingStock } = useWarehouseMap(deletingWarehouse?.id || "");
  const hasActiveStock = useMemo(() => {
    if (!deletingWarehouse || !warehouseStock) return false;
    return warehouseStock.some((item) => item.quantity > 0);
  }, [deletingWarehouse, warehouseStock]);

  // Retrieve custom names entered in the Warehouse Setup page
  const storedLabels = useMemo(() => {
    return JSON.parse(localStorage.getItem("warehouse_labels") || "{}");
  }, [editingWarehouse, deletingWarehouse]);

  const warehousesList = useMemo(() => {
    return (dbWarehouses || []).map((w) => ({
      id: w.id,
      label: storedLabels[w.id] || w.label,
    }));
  }, [dbWarehouses, storedLabels]);

  const destinationWarehouses = useMemo(() => {
    if (!deletingWarehouse) return [];
    return warehousesList.filter((w) => w.id !== deletingWarehouse.id);
  }, [warehousesList, deletingWarehouse]);

  // Generate location list in memory for preview
  const previewLocations = useMemo(() => {
    const code = warehouseCode.trim().toUpperCase();
    if (!code) return [];

    const sections = parseInt(sectionsCount, 10);
    const racks = parseInt(racksCount, 10);
    const levels = parseInt(levelsCount, 10);

    if (isNaN(sections) || sections <= 0 || isNaN(racks) || racks <= 0 || isNaN(levels) || levels <= 0) {
      return [];
    }

    const list: Omit<ILocation, "id">[] = [];

    for (let s = 1; s <= sections; s++) {
      for (let r = 0; r < racks; r++) {
        // Convert rack index to alphabetical letters: A, B, C, ... Z, AA, AB etc.
        const rackLetter = String.fromCharCode(65 + r);
        for (let l = 1; l <= levels; l++) {
          list.push({
            warehouse: code,
            aisle: "General",
            rack: `RACK ${rackLetter}`,
            section: `SECCIÓN ${s}`,
            level: `N${l}`,
            position: "Col 1",
          });
        }
      }
    }

    return list;
  }, [warehouseCode, sectionsCount, racksCount, levelsCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      sileo.error({ title: "Sólo los administradores pueden generar o modificar almacenes." });
      return;
    }

    if (!warehouseCode.trim()) {
      sileo.error({ title: "Por favor ingresa el código del almacén." });
      return;
    }

    if (previewLocations.length === 0) {
      sileo.error({ title: "Configuración de dimensiones inválida." });
      return;
    }

    const promise = bulkCreateMutation.mutateAsync(previewLocations);

    sileo.promise(promise, {
      loading: { title: "Generando cuadrícula de almacén..." },
      success: { title: `Almacén ${warehouseCode.toUpperCase()} configurado con éxito. Se crearon ${previewLocations.length} ubicaciones.` },
      error: { title: "Error al registrar ubicaciones del almacén" }
    });

    try {
      await promise;

      // Save custom label in local storage so dynamic mapping can find it later (optional but nice)
      if (warehouseName.trim()) {
        const storedLabels = JSON.parse(localStorage.getItem("warehouse_labels") || "{}");
        storedLabels[warehouseCode.trim().toUpperCase()] = warehouseName.trim();
        localStorage.setItem("warehouse_labels", JSON.stringify(storedLabels));
      }

      // Reset form
      setWarehouseCode("");
      setWarehouseName("");
    } catch (err: any) {
      // Handled by sileo.promise
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Back button & Title */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configuración de Almacén</h2>
          <p className="text-muted-foreground mt-1">
            Diseña y administra la cuadrícula física de ubicaciones del almacén.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Configuration Form Card */}
        <Card className="md:col-span-1 shadow-md border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Warehouse className="h-5 w-5" />
              Dimensiones
            </CardTitle>
            <CardDescription>Define el espacio físico del almacén.</CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código de Almacén *</Label>
                  <Input
                    id="code"
                    placeholder="ej. B9, PT2"
                    value={warehouseCode}
                    onChange={(e) => setWarehouseCode(e.target.value)}
                    className="uppercase font-semibold"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre / Etiqueta</Label>
                  <Input
                    id="name"
                    placeholder="ej. Bodega de Producto Terminado"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sections">Número de Secciones *</Label>
                  <Input
                    id="sections"
                    type="number"
                    min="1"
                    max="20"
                    value={sectionsCount}
                    onChange={(e) => setSectionsCount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="racks">Racks por Sección *</Label>
                  <Input
                    id="racks"
                    type="number"
                    min="1"
                    max="26" // Limit to alphabetical letters A-Z for simplicity
                    value={racksCount}
                    onChange={(e) => setRacksCount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="levels">Niveles por Rack *</Label>
                  <Input
                    id="levels"
                    type="number"
                    min="1"
                    max="10"
                    value={levelsCount}
                    onChange={(e) => setLevelsCount(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4 flex items-center justify-center gap-2"
                  disabled={bulkCreateMutation.isPending || previewLocations.length === 0}
                >
                  {bulkCreateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    "Generar Almacén"
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground bg-muted/40 rounded border border-border">
                Sólo lectura. Comunícate con un administrador para agregar almacenes.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Layout Preview Card */}
        <Card className="md:col-span-2 shadow-md border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Grid className="h-5 w-5" />
              Vista Previa de la Estructura
            </CardTitle>
            <CardDescription>
              Visualización de los racks y niveles que serán registrados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {previewLocations.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center bg-muted/40 p-4 rounded-lg border border-border">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block font-semibold">Total Ubicaciones</span>
                    <span className="text-2xl font-bold text-foreground tabular-nums">{previewLocations.length}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block font-semibold">Secciones</span>
                    <span className="text-2xl font-bold text-foreground tabular-nums">{sectionsCount}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block font-semibold">Racks por Sección</span>
                    <span className="text-2xl font-bold text-foreground tabular-nums">{racksCount} (A - {String.fromCharCode(64 + parseInt(racksCount, 10))})</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-sm font-semibold block">Esquema Físico (Sección 1 Ejemplo)</span>
                  <div className="border border-border rounded-lg p-4 bg-muted/20 overflow-x-auto">
                    <div className="flex gap-4 pb-2 min-w-max">
                      {Array.from({ length: Math.min(parseInt(racksCount, 10) || 0, 8) }).map((_, rIdx) => {
                        const letter = String.fromCharCode(65 + rIdx);
                        return (
                          <div key={rIdx} className="flex flex-col items-center bg-card border border-border rounded-md p-3 w-24">
                            <span className="text-xs font-bold text-primary mb-2">RACK {letter}</span>
                            <div className="flex flex-col-reverse gap-1 w-full">
                              {Array.from({ length: parseInt(levelsCount, 10) || 0 }).map((_, lIdx) => (
                                <div
                                  key={lIdx}
                                  className="text-[10px] text-center bg-muted hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-muted-foreground hover:text-emerald-700 py-1 rounded border border-border/40 transition-colors"
                                >
                                  Nivel {lIdx + 1}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {(parseInt(racksCount, 10) || 0) > 8 && (
                        <div className="flex items-center text-muted-foreground text-xs px-2 font-medium">
                          +{(parseInt(racksCount, 10) || 0) - 8} racks más...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-semibold block">Ejemplos de ubicaciones a crear:</span>
                  <div className="text-xs bg-muted/30 border border-border/80 rounded-md p-3 font-mono text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
                    <span>{previewLocations[0]?.warehouse} - {previewLocations[0]?.section} - {previewLocations[0]?.rack} - {previewLocations[0]?.level}</span>
                    {previewLocations.length > 1 && (
                      <span>{previewLocations[1]?.warehouse} - {previewLocations[1]?.section} - {previewLocations[1]?.rack} - {previewLocations[1]?.level}</span>
                    )}
                    {previewLocations.length > 5 && (
                      <span>...</span>
                    )}
                    {previewLocations.length > 1 && (
                      <span>{previewLocations[previewLocations.length - 1]?.warehouse} - {previewLocations[previewLocations.length - 1]?.section} - {previewLocations[previewLocations.length - 1]?.rack} - {previewLocations[previewLocations.length - 1]?.level}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-lg bg-muted/10">
                <ShieldAlert className="h-10 w-10 text-muted-foreground/60 mb-2 animate-pulse" />
                <p className="text-sm">Ingresa el código del almacén para ver la estructura.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* EXISTING WAREHOUSES TABLE */}
      <Card className="shadow-md border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Warehouse className="h-5 w-5" />
            Almacenes Configurados
          </CardTitle>
          <CardDescription>
            Administra los almacenes registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {warehousesList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-medium">
                    <th className="text-left py-2 px-3">Código</th>
                    <th className="text-left py-2 px-3">Nombre descriptivo</th>
                    {isAdmin && <th className="text-right py-2 px-3">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {warehousesList.map((w) => (
                    <tr key={w.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-3 font-semibold text-foreground uppercase">{w.id}</td>
                      <td className="py-3 px-3 text-muted-foreground">{w.label}</td>
                      {isAdmin && (
                        <td className="py-3 px-3 text-right flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-primary flex items-center gap-1 hover:bg-primary/5"
                            onClick={() => {
                              setEditingWarehouse(w);
                              setEditCode(w.id);
                              setEditLabel(w.label);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            <span>Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-destructive hover:bg-destructive/5 flex items-center gap-1"
                            onClick={() => {
                              setDeletingWarehouse(w);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Eliminar</span>
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay almacenes configurados en la base de datos.
            </p>
          )}
        </CardContent>
      </Card>

      {/* EDIT WAREHOUSE DIALOG */}
      <Dialog open={editingWarehouse !== null} onOpenChange={(open) => !open && setEditingWarehouse(null)}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Editar Almacén</DialogTitle>
          </DialogHeader>
          {editingWarehouse && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!editCode.trim()) {
                sileo.error({ title: "Por favor ingresa el código del almacén." });
                return;
              }
              try {
                await updateWarehouseMutation.mutateAsync({
                  oldCode: editingWarehouse.id,
                  newCode: editCode.trim().toUpperCase(),
                  newLabel: editLabel.trim(),
                });
                sileo.success({ title: "Almacén actualizado correctamente." });
                setEditingWarehouse(null);
              } catch (err: any) {
                sileo.error({ title: `Error al actualizar almacén: ${err.message}` });
              }
            }} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="editCode">Código de Almacén *</Label>
                <Input
                  id="editCode"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="uppercase font-semibold"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Advertencia: Si cambias el código, se actualizarán todas las ubicaciones físicas vinculadas a este almacén.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editLabel">Nombre descriptivo / Etiqueta</Label>
                <Input
                  id="editLabel"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingWarehouse(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateWarehouseMutation.isPending}>
                  {updateWarehouseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cambios"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deletingWarehouse !== null} onOpenChange={(open) => {
        if (!open) {
          setDeletingWarehouse(null);
          setTargetWarehouseId("");
        }
      }}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminar Almacén</DialogTitle>
          </DialogHeader>
          {deletingWarehouse && (
            <div className="space-y-4 py-2">
              {isLoadingStock ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-sm text-muted-foreground border border-dashed border-border rounded bg-muted/10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Verificando inventario...</span>
                </div>
              ) : hasActiveStock ? (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3 text-sm text-amber-600 dark:text-amber-400">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4" />
                      Stock Activo Detectado
                    </p>
                    <p className="mt-1">
                      Este almacén contiene productos con stock activo. Elige una de las siguientes opciones para proceder:
                    </p>
                  </div>

                  <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
                    <p className="text-sm font-semibold">Opción 1: Transferir stock a otro almacén y eliminar</p>
                    <div className="space-y-2">
                      <Label htmlFor="targetWarehouse">Almacén Destino</Label>
                      {destinationWarehouses.length > 0 ? (
                        <select
                          id="targetWarehouse"
                          value={targetWarehouseId}
                          onChange={(e) => setTargetWarehouseId(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Selecciona un almacén...</option>
                          {destinationWarehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.id} - {w.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-muted-foreground">No hay otros almacenes configurados para la transferencia.</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      className="w-full font-semibold"
                      disabled={!targetWarehouseId || isTransferring || isDeleting}
                      onClick={async () => {
                        setIsTransferring(true);
                        try {
                          await transferWarehouseStockMutation.mutateAsync({
                            fromWarehouse: deletingWarehouse.id,
                            toWarehouse: targetWarehouseId,
                          });
                          sileo.success({ title: "Stock transferido con éxito." });
                          // Now proceed to delete
                          await deleteWarehouseMutation.mutateAsync({
                            warehouseCode: deletingWarehouse.id,
                            forceDelete: true,
                          });
                          sileo.success({ title: `Almacén ${deletingWarehouse.id} eliminado con éxito.` });
                          setDeletingWarehouse(null);
                          setTargetWarehouseId("");
                        } catch (err: any) {
                          sileo.error({ title: `Error durante el proceso: ${err.message}` });
                        } finally {
                          setIsTransferring(false);
                        }
                      }}
                    >
                      {isTransferring ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Transfiriendo y eliminando...
                        </>
                      ) : (
                        "Transferir y Eliminar"
                      )}
                    </Button>
                  </div>

                  <div className="border border-destructive/20 rounded-lg p-4 space-y-4 bg-destructive/5">
                    <p className="text-sm font-semibold text-destructive">Opción 2: Eliminar de todas formas (Forzar)</p>
                    <p className="text-xs text-muted-foreground">
                      Esta opción eliminará permanentemente todas las ubicaciones y <strong>descartará/eliminará</strong> todo el stock activo registrado en este almacén.
                    </p>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full font-semibold"
                      disabled={isTransferring || isDeleting}
                      onClick={async () => {
                        setIsDeleting(true);
                        try {
                          await deleteWarehouseMutation.mutateAsync({
                            warehouseCode: deletingWarehouse.id,
                            forceDelete: true,
                          });
                          sileo.success({ title: `Almacén ${deletingWarehouse.id} eliminado (forzado) con éxito.` });
                          setDeletingWarehouse(null);
                          setTargetWarehouseId("");
                        } catch (err: any) {
                          sileo.error({ title: `Error al eliminar almacén: ${err.message}` });
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Eliminando...
                        </>
                      ) : (
                        "Eliminar Todo (Forzar)"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-sm text-destructive">
                    <p className="font-semibold">¡Advertencia!</p>
                    <p className="mt-1">
                      Esta acción eliminará de forma permanente todas las ubicaciones físicas asociadas al almacén <strong>{deletingWarehouse.id}</strong> ({deletingWarehouse.label}).
                    </p>
                    <p className="mt-2 text-xs">
                      Esta acción no se puede deshacer.
                    </p>
                  </div>

                  <p className="text-sm">
                    ¿Estás seguro de que deseas eliminar este almacén? El sistema verificará que no exista stock activo antes de proceder.
                  </p>
                </>
              )}

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setDeletingWarehouse(null);
                  setTargetWarehouseId("");
                }}>
                  Cancelar
                </Button>
                {!hasActiveStock && !isLoadingStock && (
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        await deleteWarehouseMutation.mutateAsync({
                          warehouseCode: deletingWarehouse.id,
                          forceDelete: false,
                        });
                        sileo.success({ title: `Almacén ${deletingWarehouse.id} eliminado con éxito.` });
                        setDeletingWarehouse(null);
                        setTargetWarehouseId("");
                      } catch (err: any) {
                        sileo.error({ title: err.message });
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      "Confirmar Eliminación"
                    )}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
