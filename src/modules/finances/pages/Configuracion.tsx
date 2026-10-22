import { useState, useEffect } from "react";
import {
  Save,
  Building2,
  FileText,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/api/logs";

export function Configuracion() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [fiscalData, setFiscalData] = useState({
    rfc: "XAXX010101000",
    razonSocial: "Empresa S.A. de C.V.",
    regimenFiscal: "601",
    cp: "00000",
    usoCfdiDefault: "G03",
    ivaDefault: "16",
    retencionIsr: "0",
    retencionIva: "0",
    serieFacturas: "F",
    folioInicial: "1000",
  });

  const [fiscalData2, setFiscalData2] = useState({
    rfc: "",
    razonSocial: "",
    regimenFiscal: "626",
    cp: "",
    usoCfdiDefault: "G03",
    ivaDefault: "16",
    retencionIsr: "0",
    retencionIva: "0",
    serieFacturas: "B",
    folioInicial: "1",
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("other_settings")
          .eq("id", "global")
          .single();

        if (error) throw error;
        if (data?.other_settings?.fiscal) {
          setFiscalData((prev) => ({
            ...prev,
            ...data.other_settings.fiscal,
          }));
        }
        if (data?.other_settings?.fiscal2) {
          setFiscalData2((prev) => ({
            ...prev,
            ...data.other_settings.fiscal2,
          }));
        }
      } catch (error) {
        console.error("Error loading fiscal settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Solo los administradores pueden modificar la configuración.");
      return;
    }

    setIsSaving(true);
    try {
      const { data: currentData, error: fetchError } = await supabase
        .from("app_settings")
        .select("other_settings")
        .eq("id", "global")
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      const updatedOtherSettings = {
        ...(currentData?.other_settings || {}),
        fiscal: fiscalData,
        fiscal2: fiscalData2,
      };

      const { error: updateError } = await supabase
        .from("app_settings")
        .update({
          other_settings: updatedOtherSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "global");

      if (updateError) throw updateError;
      logActivity("FISCAL_CONFIG_SAVED", {
        rfc: fiscalData.rfc,
        razonSocial: fiscalData.razonSocial,
        title: "Configuración fiscal del despacho guardada",
        description: `Se actualizaron los parámetros fiscales y de facturación (${fiscalData.razonSocial} - ${fiscalData.rfc}).`,
        category: "sistema",
      });
      toast.success(
        "Configuración fiscal y parámetros guardados correctamente."
      );
    } catch (error) {
      console.error("Error saving fiscal settings:", error);
      toast.error("Error al guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span>Finanzas</span>
          <span>›</span>
          <span className="text-foreground font-medium">
            Configuración Financiera
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Configuración Financiera
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ajusta los parámetros fiscales, impuestos por defecto y preferencias de facturación.
        </p>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-lg flex items-center gap-3 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <p>
            Estás en modo de solo lectura. Solo los usuarios con rol de{" "}
            <strong>Administrador</strong> pueden realizar cambios en esta sección.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave}>
            <Tabs defaultValue="emisor1" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="emisor1" className="text-xs">
                  RFC Principal (Emisor 1)
                </TabsTrigger>
                <TabsTrigger value="emisor2" className="text-xs">
                  RFC Secundario (Emisor 2)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="emisor1">
                <Card className="bg-card shadow-xs border-border/80">
                  <CardHeader className="pb-4 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded-lg">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">
                          Datos Fiscales del Emisor Principal
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Información utilizada para el timbrado de facturas (CFDI 4.0) y reportes contables.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">RFC del Emisor</Label>
                        <Input
                          value={fiscalData.rfc}
                          onChange={(e) =>
                            setFiscalData({
                              ...fiscalData,
                              rfc: e.target.value.toUpperCase(),
                            })
                          }
                          className="uppercase font-mono h-9 text-xs"
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Código Postal (Lugar de Expedición)</Label>
                        <Input
                          value={fiscalData.cp}
                          onChange={(e) =>
                            setFiscalData({ ...fiscalData, cp: e.target.value })
                          }
                          maxLength={5}
                          className="h-9 text-xs"
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs">Razón Social / Nombre Fiscal</Label>
                        <Input
                          value={fiscalData.razonSocial}
                          onChange={(e) =>
                            setFiscalData({
                              ...fiscalData,
                              razonSocial: e.target.value,
                            })
                          }
                          className="h-9 text-xs"
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Régimen Fiscal</Label>
                        <Select
                          value={fiscalData.regimenFiscal}
                          onValueChange={(v) =>
                            setFiscalData({ ...fiscalData, regimenFiscal: v })
                          }
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="601">
                              601 - General de Ley Personas Morales
                            </SelectItem>
                            <SelectItem value="603">
                              603 - Personas Morales con Fines no Lucrativos
                            </SelectItem>
                            <SelectItem value="612">
                              612 - Personas Físicas con Actividades Empresariales
                            </SelectItem>
                            <SelectItem value="626">
                              626 - Régimen Simplificado de Confianza (RESICO)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Uso de CFDI por Defecto</Label>
                        <Select
                          value={fiscalData.usoCfdiDefault}
                          onValueChange={(v) =>
                            setFiscalData({ ...fiscalData, usoCfdiDefault: v })
                          }
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="G01">
                              G01 - Adquisición de mercancías
                            </SelectItem>
                            <SelectItem value="G03">
                              G03 - Gastos en general
                            </SelectItem>
                            <SelectItem value="P01">
                              P01 - Por definir
                            </SelectItem>
                            <SelectItem value="S01">
                              S01 - Sin efectos fiscales
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="border-t border-border/60 pt-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#1e3a5f]" />
                        Impuestos y Series de Facturación
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Tasa de IVA General (%)</Label>
                          <Select
                            value={fiscalData.ivaDefault}
                            onValueChange={(v) =>
                              setFiscalData({ ...fiscalData, ivaDefault: v })
                            }
                            disabled={!isAdmin}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="16">16% (Tasa General)</SelectItem>
                              <SelectItem value="8">8% (Frontera)</SelectItem>
                              <SelectItem value="0">0% (Exento / Tasa 0)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Serie Interna</Label>
                          <Input
                            value={fiscalData.serieFacturas}
                            onChange={(e) =>
                              setFiscalData({
                                ...fiscalData,
                                serieFacturas: e.target.value.toUpperCase(),
                              })
                            }
                            placeholder="Ej: F, A, FAC"
                            className="h-9 text-xs"
                            disabled={!isAdmin}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Folio Inicial</Label>
                          <Input
                            type="number"
                            value={fiscalData.folioInicial}
                            onChange={(e) =>
                              setFiscalData({
                                ...fiscalData,
                                folioInicial: e.target.value,
                              })
                            }
                            className="h-9 text-xs"
                            disabled={!isAdmin}
                          />
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="pt-4 flex justify-end border-t border-border/60">
                        <Button
                          type="submit"
                          size="sm"
                          className="h-9 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-1.5"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          {isSaving ? "Guardando..." : "Guardar Configuración"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emisor2">
                <Card className="bg-card shadow-xs border-border/80">
                  <CardHeader className="pb-4 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">
                          Datos Fiscales del Emisor Secundario
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Configura una segunda razón social o RFC para manejo de múltiples razones sociales.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">RFC del Emisor 2</Label>
                        <Input
                          value={fiscalData2.rfc}
                          onChange={(e) =>
                            setFiscalData2({
                              ...fiscalData2,
                              rfc: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="Ej: XAXX010101000"
                          className="uppercase font-mono h-9 text-xs"
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Código Postal (Lugar de Expedición)</Label>
                        <Input
                          value={fiscalData2.cp}
                          onChange={(e) =>
                            setFiscalData2({ ...fiscalData2, cp: e.target.value })
                          }
                          placeholder="00000"
                          maxLength={5}
                          className="h-9 text-xs"
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs">Razón Social / Nombre Fiscal 2</Label>
                        <Input
                          value={fiscalData2.razonSocial}
                          onChange={(e) =>
                            setFiscalData2({
                              ...fiscalData2,
                              razonSocial: e.target.value,
                            })
                          }
                          placeholder="Nombre de la segunda entidad o persona física"
                          className="h-9 text-xs"
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Régimen Fiscal</Label>
                        <Select
                          value={fiscalData2.regimenFiscal}
                          onValueChange={(v) =>
                            setFiscalData2({ ...fiscalData2, regimenFiscal: v })
                          }
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="601">
                              601 - General de Ley Personas Morales
                            </SelectItem>
                            <SelectItem value="603">
                              603 - Personas Morales con Fines no Lucrativos
                            </SelectItem>
                            <SelectItem value="612">
                              612 - Personas Físicas con Actividades Empresariales
                            </SelectItem>
                            <SelectItem value="626">
                              626 - Régimen Simplificado de Confianza (RESICO)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Uso de CFDI por Defecto</Label>
                        <Select
                          value={fiscalData2.usoCfdiDefault}
                          onValueChange={(v) =>
                            setFiscalData2({ ...fiscalData2, usoCfdiDefault: v })
                          }
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="G01">
                              G01 - Adquisición de mercancías
                            </SelectItem>
                            <SelectItem value="G03">
                              G03 - Gastos en general
                            </SelectItem>
                            <SelectItem value="P01">
                              P01 - Por definir
                            </SelectItem>
                            <SelectItem value="S01">
                              S01 - Sin efectos fiscales
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="border-t border-border/60 pt-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        Impuestos y Series de Facturación (Emisor 2)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Tasa de IVA General (%)</Label>
                          <Select
                            value={fiscalData2.ivaDefault}
                            onValueChange={(v) =>
                              setFiscalData2({ ...fiscalData2, ivaDefault: v })
                            }
                            disabled={!isAdmin}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="16">16% (Tasa General)</SelectItem>
                              <SelectItem value="8">8% (Frontera)</SelectItem>
                              <SelectItem value="0">0% (Exento / Tasa 0)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Serie Interna</Label>
                          <Input
                            value={fiscalData2.serieFacturas}
                            onChange={(e) =>
                              setFiscalData2({
                                ...fiscalData2,
                                serieFacturas: e.target.value.toUpperCase(),
                              })
                            }
                            placeholder="Ej: B, F2"
                            className="h-9 text-xs"
                            disabled={!isAdmin}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Folio Inicial</Label>
                          <Input
                            type="number"
                            value={fiscalData2.folioInicial}
                            onChange={(e) =>
                              setFiscalData2({
                                ...fiscalData2,
                                folioInicial: e.target.value,
                              })
                            }
                            className="h-9 text-xs"
                            disabled={!isAdmin}
                          />
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="pt-4 flex justify-end border-t border-border/60">
                        <Button
                          type="submit"
                          size="sm"
                          className="h-9 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-1.5"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          {isSaving ? "Guardando..." : "Guardar Configuración"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </div>

        {/* Estado de Integración SAT */}
        <div className="space-y-4">
          <Card className="bg-emerald-50/40 border-emerald-200 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-emerald-800 flex items-center gap-2 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Módulo Fiscal Activo
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-emerald-700 space-y-2 leading-relaxed">
              <p>
                El registro interno de ingresos, egresos y control de folios está completamente operativo.
              </p>
              <p className="text-[11px] text-emerald-600/80 pt-2 border-t border-emerald-200/60">
                Nota: Para el timbrado directo ante el SAT (generación de XML y sello digital CSD), se requiere configurar las credenciales del PAC (Facturapi / Finkok) en las variables de entorno del servidor.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
