import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Printer, QrCode, Edit3, AlertTriangle, Loader2 } from "lucide-react";
import { useProductStock, useProductDetail, useUpdateProductOrRawMaterial } from "../hooks";
import { QRCodeSVG } from "qrcode.react";
import { sileo } from "sileo";

const materialTypeLabels: Record<string, string> = {
  CRC_CRG: "Caple - CRC / CRG",
  WTOP: "White top - WTOP",
  MC1C: "Multicapa 1 cara - MC1C",
  MC2C: "Multicapa 2 caras - MC2C",
  SBS: "Sbs o papel sulfatado - SBS",
  LNR: "Liner - LNR",
  MED: "Médium - MED",
};

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  
  // Queries & Mutations
  const { data: product, isLoading: productLoading } = useProductDetail(productId ?? "");
  const { data: stockData, isLoading: stockLoading, isError } = useProductStock(productId ?? "");
  const updateProductMutation = useUpdateProductOrRawMaterial();

  // Edit product state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editMaterialType, setEditMaterialType] = useState<any>("");
  const [editRollWidth, setEditRollWidth] = useState("");
  const [editGrammage, setEditGrammage] = useState("");
  const [editCaliper, setEditCaliper] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editBatchNumber, setEditBatchNumber] = useState("");
  const [editSupplier, setEditSupplier] = useState("");

  const handleOpenEdit = () => {
    setEditDescription(product?.description || "");
    if (product?.raw_material) {
      setEditMaterialType(product.raw_material.material_type);
      setEditRollWidth(product.raw_material.roll_width?.toString() || "");
      setEditGrammage(product.raw_material.grammage?.toString() || "");
      setEditCaliper(product.raw_material.caliper?.toString() || "");
      setEditWeight(product.raw_material.weight?.toString() || "");
      setEditBatchNumber(product.raw_material.batch_number || "");
      setEditSupplier(product.raw_material.supplier || "");
    }
    setIsEditOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?.id) return;

    try {
      await updateProductMutation.mutateAsync({
        productId: product.id,
        description: editDescription.trim(),
        rawMaterial: product.raw_material ? {
          material_type: editMaterialType,
          roll_width: editRollWidth ? parseFloat(editRollWidth) : undefined,
          grammage: editGrammage ? parseFloat(editGrammage) : undefined,
          caliper: editCaliper ? parseFloat(editCaliper) : undefined,
          weight: editWeight ? parseFloat(editWeight) : undefined,
          batch_number: editBatchNumber.trim() || undefined,
          supplier: editSupplier.trim() || undefined,
        } : undefined,
      });
      sileo.success({ title: "Producto actualizado con éxito" });
      setIsEditOpen(false);
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al actualizar el producto" });
    }
  };

  const isLoading = productLoading || stockLoading;

  const totalQuantity = stockData?.reduce((sum, s) => sum + s.quantity, 0) ?? 0;
  const locationCount = stockData?.length ?? 0;
  const lastUpdated = stockData?.length
    ? new Date(
        Math.max(...stockData.map((s) => new Date(s.updated_at).getTime()))
      ).toLocaleString("es-MX")
    : "—";

  const qrUrl = `${window.location.origin}/inventory/product/${productId}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Dynamic CSS Print Overlay */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-label, #printable-label * {
            visibility: visible;
          }
          #printable-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 5in;
            height: 3in;
            padding: 15px;
            border: 2px solid #000;
            background: #fff;
            color: #000;
            box-sizing: border-box;
            font-family: system-ui, -apple-system, sans-serif;
          }
        }
      `}</style>

      {/* BACK NAVIGATION & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Detalle de Producto</h2>
            <p className="text-muted-foreground mt-1">
              Part Number: <Badge variant="secondary">{productId}</Badge>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="flex items-center gap-2" disabled={!isLoading && totalQuantity === 0}>
            <Printer className="h-4 w-4" />
            Imprimir Etiqueta
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleOpenEdit}
            disabled={isLoading}
          >
            <Edit3 className="h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* WARNING BANNER IF NO STOCK */}
      {!isLoading && totalQuantity === 0 && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 flex items-start gap-3 animate-in fade-in">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              {product?.raw_material ? "Materia Prima sin Stock" : "Producto Agotado"}
            </p>
            <p className="text-sm mt-0.5">
              {product?.raw_material
                ? "Esta materia prima ha agotado sus existencias y no cuenta con stock disponible en el almacén."
                : "Este producto ha salido por completo del almacén y no cuenta con unidades disponibles."}
            </p>
          </div>
        </div>
      )}

      {/* TOP STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold tabular-nums">{totalQuantity}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Suma de todas las ubicaciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ubicaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold tabular-nums">{locationCount}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Slots ocupados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-lg font-semibold">{lastUpdated}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Fecha y hora</p>
          </CardContent>
        </Card>
      </div>

      {/* PRODUCT & RAW MATERIAL SPECIFICATIONS */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Detail specs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Especificaciones Generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Descripción</span>
              {productLoading ? (
                <Skeleton className="h-5 w-2/3 mt-1" />
              ) : (
                <p className="text-base text-foreground mt-1">{product?.description ?? "Sin descripción registrada."}</p>
              )}
            </div>

            {product?.raw_material && (
              <div className="pt-4 border-t border-border space-y-4">
                <h3 className="text-sm font-semibold text-primary">Propiedades de Materia Prima</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block">Tipo de Material</span>
                    <span className="font-medium text-sm">
                      {materialTypeLabels[product.raw_material.material_type] || product.raw_material.material_type}
                    </span>
                  </div>
                  {product.raw_material.roll_width && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Ancho de bobina</span>
                      <span className="font-medium text-sm">{product.raw_material.roll_width} mm/in</span>
                    </div>
                  )}
                  {product.raw_material.grammage && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Gramaje</span>
                      <span className="font-medium text-sm">{product.raw_material.grammage} g/m²</span>
                    </div>
                  )}
                  {product.raw_material.caliper && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Calibre</span>
                      <span className="font-medium text-sm">{product.raw_material.caliper} pt</span>
                    </div>
                  )}
                  {product.raw_material.weight && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Peso</span>
                      <span className="font-medium text-sm">{product.raw_material.weight} Kg</span>
                    </div>
                  )}
                  {product.raw_material.batch_number && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Lote</span>
                      <Badge variant="outline" className="font-semibold">{product.raw_material.batch_number}</Badge>
                    </div>
                  )}
                  {product.raw_material.supplier && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Marca / Proveedor</span>
                      <span className="font-medium text-sm">{product.raw_material.supplier}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Código QR Identificador
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center flex-1 pb-6 space-y-4">
            <div className="p-3 bg-white rounded-lg border border-border">
              <QRCodeSVG
                value={qrUrl}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              Escanea este código físico para acceder rápidamente al historial y control de ubicaciones.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* STOCK LOCATIONS TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Ubicación</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">Error al cargar la distribución.</p>
          ) : stockData && stockData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-medium">
                    <th className="text-left py-2 px-3">Almacén</th>
                    <th className="text-left py-2 px-3">Rack</th>
                    <th className="text-left py-2 px-3">Sección</th>
                    <th className="text-left py-2 px-3">Nivel</th>
                    <th className="text-right py-2 px-3">Cantidad</th>
                    <th className="text-right py-2 px-3">Actualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{row.warehouse}</td>
                      <td className="py-2 px-3">{row.rack ?? "—"}</td>
                      <td className="py-2 px-3">{row.section ?? "—"}</td>
                      <td className="py-2 px-3">{row.level ?? "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold">{row.quantity}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {new Date(row.updated_at).toLocaleDateString("es-MX")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay stock registrado para este producto.
            </p>
          )}
        </CardContent>
      </Card>

      {/* PRINT-ONLY LABEL (HIDDEN ON SCREEN) */}
      <div id="printable-label" className="hidden">
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", paddingBottom: "5px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "bold" }}>DECRETO - LOGÍSTICA</span>
          <span style={{ fontSize: "12px", fontWeight: "bold" }}>SKU: {productId}</span>
        </div>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <div>
            <QRCodeSVG value={qrUrl} size={110} level="M" />
          </div>
          <div style={{ fontSize: "10px", flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "3px", textTransform: "uppercase" }}>
              {product?.description || "Sin descripción"}
            </span>
            {product?.raw_material && (
              <>
                <span><strong>Tipo:</strong> {materialTypeLabels[product.raw_material.material_type]}</span>
                {product.raw_material.roll_width && <span><strong>Ancho:</strong> {product.raw_material.roll_width} mm/in</span>}
                {product.raw_material.grammage && <span><strong>Gramaje:</strong> {product.raw_material.grammage} g/m²</span>}
                {product.raw_material.caliper && <span><strong>Calibre:</strong> {product.raw_material.caliper} pt</span>}
                {product.raw_material.weight && <span><strong>Peso:</strong> {product.raw_material.weight} Kg</span>}
                {product.raw_material.batch_number && <span><strong>Lote:</strong> {product.raw_material.batch_number}</span>}
                {product.raw_material.supplier && <span><strong>Prov:</strong> {product.raw_material.supplier}</span>}
              </>
            )}
          </div>
        </div>
        <div style={{ borderTop: "1px solid #000", paddingTop: "5px", marginTop: "8px", fontSize: "8px", textAlign: "center", color: "#666" }}>
          Escanea el código QR con tu celular para registrar entradas/salidas en almacén
        </div>
      </div>

      {/* EDIT PRODUCT OR RAW MATERIAL DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
          <form onSubmit={handleUpdateProduct}>
            <DialogHeader>
              <DialogTitle>Editar {product?.raw_material ? "Materia Prima" : "Producto Terminado"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label htmlFor="editDescription">Descripción *</Label>
                <Input
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                />
              </div>

              {product?.raw_material && (
                <div className="space-y-4 pt-2 border-t">
                  <h4 className="font-semibold text-sm text-primary">Propiedades de Materia Prima</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="editMaterialType">Tipo de Material *</Label>
                    <select
                      id="editMaterialType"
                      value={editMaterialType}
                      onChange={(e) => setEditMaterialType(e.target.value as any)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required
                    >
                      {Object.entries(materialTypeLabels).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editRollWidth">Ancho de bobina</Label>
                      <Input
                        id="editRollWidth"
                        type="number"
                        step="any"
                        placeholder="mm/in"
                        value={editRollWidth}
                        onChange={(e) => setEditRollWidth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editGrammage">Gramaje (g/m²)</Label>
                      <Input
                        id="editGrammage"
                        type="number"
                        step="any"
                        value={editGrammage}
                        onChange={(e) => setEditGrammage(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editCaliper">Calibre (pt)</Label>
                      <Input
                        id="editCaliper"
                        type="number"
                        step="any"
                        value={editCaliper}
                        onChange={(e) => setEditCaliper(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editWeight">Peso (Kg)</Label>
                      <Input
                        id="editWeight"
                        type="number"
                        step="any"
                        value={editWeight}
                        onChange={(e) => setEditWeight(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editBatchNumber">Número de Lote</Label>
                      <Input
                        id="editBatchNumber"
                        value={editBatchNumber}
                        onChange={(e) => setEditBatchNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editSupplier">Marca / Proveedor</Label>
                      <Input
                        id="editSupplier"
                        value={editSupplier}
                        onChange={(e) => setEditSupplier(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={updateProductMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateProductMutation.isPending}>
                {updateProductMutation.isPending ? (
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
