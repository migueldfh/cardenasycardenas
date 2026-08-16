import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sileo } from "sileo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Package, 
  MapPin, 
  ArrowUpDown, 
  AlertTriangle, 
  Plus, 
  QrCode, 
  Camera, 
  Loader2 
} from "lucide-react";
import { useInventory, useProducts, useCreateRawMaterial } from "../hooks";
import { Html5Qrcode } from "html5-qrcode";

export function InventoryDashboard() {
  const navigate = useNavigate();
  const { data: totalStock, isLoading: stockLoading } = useInventory();
  const { data: products, isLoading: productsLoading } = useProducts();
  const createMutation = useCreateRawMaterial();

  const isLoading = stockLoading || productsLoading;

  const totalSKUs = products?.length ?? 0;
  const occupiedSlots = totalStock?.reduce((sum, s) => sum + s.occupied_slots, 0) ?? 0;
  const lowStockCount = totalStock?.filter((s) => s.total_quantity < 10).length ?? 0;

  // Modals Open State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Raw Material Form State
  const [description, setDescription] = useState("");
  const [materialType, setMaterialType] = useState<"CRC_CRG" | "WTOP" | "MC1C" | "MC2C" | "SBS" | "LNR" | "MED">("CRC_CRG");
  const [rollWidth, setRollWidth] = useState("");
  const [grammage, setGrammage] = useState("");
  const [caliper, setCaliper] = useState("");
  const [weight, setWeight] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [supplier, setSupplier] = useState("");

  // Handle camera QR code scanner
  useEffect(() => {
    if (!isScanOpen) return;

    const html5QrCode = new Html5Qrcode("qr-reader");
    const qrCodeSuccessCallback = (decodedText: string) => {
      // Extract part number from URL or use decodedText directly
      let partNumber = decodedText;
      if (decodedText.includes("/inventory/product/")) {
        const parts = decodedText.split("/inventory/product/");
        partNumber = parts[parts.length - 1];
      }
      
      sileo.success({ title: `Código escaneado: ${partNumber}` });
      html5QrCode.stop().then(() => {
        setIsScanOpen(false);
        navigate(`/inventory/product/${partNumber}`);
      }).catch((err) => {
        console.error("Failed to stop scanner:", err);
        setIsScanOpen(false);
        navigate(`/inventory/product/${partNumber}`);
      });
    };

    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      qrCodeSuccessCallback,
      () => {
        // Silent error callback during normal scan frame search
      }
    ).catch(err => {
      setScannerError("No se pudo iniciar la cámara. Verifica los permisos de la cámara web.");
      console.error("Scanner startup error:", err);
    });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error("Error stopping scanner on unmount:", err));
      }
    };
  }, [isScanOpen, navigate]);

  const handleCreateRawMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      sileo.error({ title: "Por favor ingresa una descripción" });
      return;
    }

    const promise = createMutation.mutateAsync({
      description: description.trim(),
      material_type: materialType,
      roll_width: rollWidth ? parseFloat(rollWidth) : undefined,
      grammage: grammage ? parseFloat(grammage) : undefined,
      caliper: caliper ? parseFloat(caliper) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      batch_number: batchNumber.trim() || undefined,
      supplier: supplier.trim() || undefined,
    });

    sileo.promise(promise, {
      loading: { title: "Registrando materia prima..." },
      success: { title: "Materia prima registrada con éxito" },
      error: { title: "Error al registrar la materia prima" }
    });

    try {
      await promise;
      setIsCreateOpen(false);
      
      // Clear Form
      setDescription("");
      setMaterialType("CRC_CRG");
      setRollWidth("");
      setGrammage("");
      setCaliper("");
      setWeight("");
      setBatchNumber("");
      setSupplier("");
    } catch (err: any) {
      // Handled by sileo.promise
    }
  };

  const stats = [
    { title: "Total SKUs", value: totalSKUs, icon: Package, color: "text-blue-500", description: "Productos registrados" },
    { title: "Ubicaciones Activas", value: occupiedSlots, icon: MapPin, color: "text-emerald-500", description: "Slots ocupados" },
    { title: "Movimientos Hoy", value: "—", icon: ArrowUpDown, color: "text-amber-500", description: "Próximamente" },
    { title: "Stock Bajo", value: lowStockCount, icon: AlertTriangle, color: "text-destructive", description: "Menos de 10 unidades" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventario</h2>
          <p className="text-muted-foreground mt-1">
            Vista general del inventario por almacén y ubicación.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={() => setIsScanOpen(true)}
            variant="outline" 
            className="flex items-center gap-2 border-primary/30 hover:border-primary"
          >
            <QrCode className="h-4 w-4" />
            Escanear QR
          </Button>
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Registrar Materia Prima
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock por Producto</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : totalStock && totalStock.length > 0 ? (
              <div className="space-y-3">
                {totalStock.map((item) => (
                  <Link
                    key={item.part_number}
                    to={`/inventory/product/${item.part_number}`}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="font-medium">{item.part_number}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{item.occupied_slots} ubicaciones</span>
                      <span className="font-semibold tabular-nums">{item.total_quantity} uds</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay stock registrado.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Productos</CardTitle>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="space-y-3">
                {products.slice(0, 10).map((product) => (
                  <Link
                    key={product.id}
                    to={`/inventory/product/${product.part_number}`}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{product.part_number}</span>
                      {product.raw_material && (
                        <span className="text-[10px] text-primary font-semibold">
                          Materia Prima: {product.raw_material.material_type}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground truncate ml-4 max-w-[200px]">
                      {product.description ?? "Sin descripción"}
                    </span>
                  </Link>
                ))}
                {products.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{products.length - 10} productos más
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay productos registrados en el catálogo.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CREATE RAW MATERIAL MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Materia Prima</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRawMaterial} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Input
                id="description"
                placeholder="ej. Bobina de cartón sulfatado"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="materialType">Tipo de Material *</Label>
                <select
                  id="materialType"
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="CRC_CRG">Caple - CRC / CRG (CRC_CRG)</option>
                  <option value="WTOP">White top - WTOP (WTOP)</option>
                  <option value="MC1C">Multicapa 1 cara - MC1C (MC1C)</option>
                  <option value="MC2C">Multicapa 2 caras - MC2C (MC2C)</option>
                  <option value="SBS">Sbs o papel sulfatado - SBS (SBS)</option>
                  <option value="LNR">Liner - LNR (LNR)</option>
                  <option value="MED">Médium - MED (MED)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollWidth">Ancho de bobina (mm/in)</Label>
                <Input
                  id="rollWidth"
                  type="number"
                  step="any"
                  placeholder="ej. 1200"
                  value={rollWidth}
                  onChange={(e) => setRollWidth(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grammage">Gramaje (g/m²)</Label>
                <Input
                  id="grammage"
                  type="number"
                  step="any"
                  placeholder="ej. 320"
                  value={grammage}
                  onChange={(e) => setGrammage(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caliper">Calibre (pt)</Label>
                <Input
                  id="caliper"
                  type="number"
                  step="any"
                  placeholder="ej. 18"
                  value={caliper}
                  onChange={(e) => setCaliper(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Peso (Kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="any"
                  placeholder="ej. 850"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchNumber">Lote</Label>
                <Input
                  id="batchNumber"
                  placeholder="ej. L-99283"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Marca o Proveedor</Label>
                <Input
                  id="supplier"
                  placeholder="ej. Copamex"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Registrar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR CAMERA SCANNER DIALOG */}
      <Dialog open={isScanOpen} onOpenChange={(open) => {
        setIsScanOpen(open);
        if (!open) {
          setScannerError(null);
        }
      }}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Escanear Código QR
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            {scannerError ? (
              <div className="text-center p-6 text-destructive bg-destructive/10 rounded-lg border border-destructive/20 w-full">
                <p className="font-semibold">{scannerError}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsScanOpen(false)}>
                  Cerrar
                </Button>
              </div>
            ) : (
              <div className="relative w-full max-w-[300px] aspect-square rounded-lg border-2 border-primary/30 overflow-hidden bg-black flex items-center justify-center">
                <div id="qr-reader" className="w-full h-full" />
                {/* Guide Overlay */}
                <div className="absolute inset-8 border border-white/40 pointer-events-none rounded border-dashed flex items-center justify-center">
                  <div className="w-[80%] h-[80%] border-2 border-primary rounded animate-pulse" />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center px-4">
              Apunta la cámara del dispositivo hacia el código QR impreso en el producto para abrir su detalle.
            </p>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => setIsScanOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
