import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sileo } from "sileo";
import { FileText, CheckCircle2, Plus, Trash2 } from "lucide-react";

export function Configuracion() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"emisor1" | "emisor2">("emisor1");
  const [form, setForm] = React.useState({
    fiscal_rfc: "",
    fiscal_name: "",
    fiscal_regime: "601",
    default_cfdi_use: "G03",
    fiscal2_enabled: false,
    fiscal2_rfc: "",
    fiscal2_name: "",
    fiscal2_regime: "601",
    fiscal2_cfdi_use: "G03",
  });

  React.useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("other_settings")
          .eq("id", "global")
          .single();

        if (error) throw error;
        
        if (data && data.other_settings) {
          const fs = data.other_settings.fiscal || {};
          const fs2 = data.other_settings.fiscal2 || {};
          setForm({
            fiscal_rfc: fs.rfc || "",
            fiscal_name: fs.name || "",
            fiscal_regime: fs.regime || "601",
            default_cfdi_use: fs.cfdi_use || "G03",
            
            fiscal2_enabled: !!fs2.enabled || !!fs2.rfc || !!fs2.name,
            fiscal2_rfc: fs2.rfc || "",
            fiscal2_name: fs2.name || "",
            fiscal2_regime: fs2.regime || "601",
            fiscal2_cfdi_use: fs2.cfdi_use || "G03",
          });
        }
      } catch (err: any) {
        console.error("Error loading settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      sileo.error({ title: "Solo los administradores pueden guardar configuraciones." });
      return;
    }

    try {
      // 1. Fetch current settings first to preserve other fields
      const { data: current, error: fetchErr } = await supabase
        .from("app_settings")
        .select("other_settings")
        .eq("id", "global")
        .single();

      if (fetchErr) throw fetchErr;

      const updatedOtherSettings = {
        ...(current?.other_settings || {}),
        fiscal: {
          rfc: form.fiscal_rfc,
          name: form.fiscal_name,
          regime: form.fiscal_regime,
          cfdi_use: form.default_cfdi_use,
        },
        fiscal2: {
          enabled: form.fiscal2_enabled,
          rfc: form.fiscal2_rfc,
          name: form.fiscal2_name,
          regime: form.fiscal2_regime,
          cfdi_use: form.fiscal2_cfdi_use,
        },
      };

      const { error } = await supabase
        .from("app_settings")
        .update({
          other_settings: updatedOtherSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "global");

      if (error) throw error;
      sileo.success({ title: "Configuración fiscal guardada con éxito" });
    } catch (err: any) {
      sileo.error({ title: `Error al guardar: ${err.message}` });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración de Facturación</h2>
        <p className="text-muted-foreground text-sm">Configura la información fiscal emisora de tu empresa para la generación de CFDI 4.0 del SAT.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-2">
          <form onSubmit={handleSave}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Datos del Emisor (RFC)
              </CardTitle>
              <CardDescription>
                Define los datos predeterminados para el timbrado fiscal de facturas y notas de crédito.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex border-b border-border mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("emisor1")}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === "emisor1"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Emisor Principal {form.fiscal_name ? `(${form.fiscal_name})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("emisor2")}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === "emisor2"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Segundo Emisor
                  {form.fiscal2_enabled && form.fiscal2_name && ` (${form.fiscal2_name})`}
                  {!form.fiscal2_enabled && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal text-muted-foreground">Inactivo</span>
                  )}
                </button>
              </div>

              {activeTab === "emisor1" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="rfc_name">Razón Social del Emisor</Label>
                      <Input
                        id="rfc_name"
                        value={form.fiscal_name}
                        onChange={(e) => setForm({ ...form, fiscal_name: e.target.value })}
                        placeholder="Ej: DECRETO SA DE CV"
                        disabled={!isAdmin}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rfc_val">RFC Emisor</Label>
                      <Input
                        id="rfc_val"
                        value={form.fiscal_rfc}
                        onChange={(e) => setForm({ ...form, fiscal_rfc: e.target.value.toUpperCase() })}
                        placeholder="DEC160528XYZ"
                        maxLength={13}
                        disabled={!isAdmin}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="rfc_regime">Régimen Fiscal (SAT)</Label>
                      <Select
                        value={form.fiscal_regime}
                        onValueChange={(val) => setForm({ ...form, fiscal_regime: val })}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger id="rfc_regime">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="601">601 - General de Ley Personas Morales</SelectItem>
                          <SelectItem value="603">603 - Personas Morales con Fines no Lucrativos</SelectItem>
                          <SelectItem value="626">626 - Régimen Simplificado de Confianza (RESICO)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="rfc_cfdi">Uso de CFDI por Defecto</Label>
                      <Select
                        value={form.default_cfdi_use}
                        onValueChange={(val) => setForm({ ...form, default_cfdi_use: val })}
                        disabled={!isAdmin}
                      >
                        <SelectTrigger id="rfc_cfdi">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="G01">G01 - Adquisición de mercancías</SelectItem>
                          <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                          <SelectItem value="P01">P01 - Por definir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!form.fiscal2_enabled ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg bg-muted/40 space-y-4">
                      <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <Plus className="h-6 w-6" />
                      </div>
                      <div className="max-w-sm space-y-1">
                        <p className="font-semibold text-sm">Habilitar Segundo Emisor</p>
                        <p className="text-xs text-muted-foreground">
                          Configura una segunda razón social para facturación si tu empresa timbra desde múltiples entidades fiscales.
                        </p>
                      </div>
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setForm({ ...form, fiscal2_enabled: true })}
                        >
                          Habilitar Segundo Emisor
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border border-border/60">
                        <span className="text-xs text-muted-foreground font-medium">Este emisor fiscal secundario está habilitado.</span>
                        {isAdmin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 flex items-center gap-1.5"
                            onClick={() =>
                              setForm({
                                ...form,
                                fiscal2_enabled: false,
                                fiscal2_name: "",
                                fiscal2_rfc: "",
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" /> Deshabilitar
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="rfc_name2">Razón Social del Segundo Emisor</Label>
                          <Input
                            id="rfc_name2"
                            value={form.fiscal2_name}
                            onChange={(e) => setForm({ ...form, fiscal2_name: e.target.value })}
                            placeholder="Ej: SEGUNDA ENTIDAD SA DE CV"
                            disabled={!isAdmin}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="rfc_val2">RFC Segundo Emisor</Label>
                          <Input
                            id="rfc_val2"
                            value={form.fiscal2_rfc}
                            onChange={(e) => setForm({ ...form, fiscal2_rfc: e.target.value.toUpperCase() })}
                            placeholder="DEC160528XYZ"
                            maxLength={13}
                            disabled={!isAdmin}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="rfc_regime2">Régimen Fiscal (SAT)</Label>
                          <Select
                            value={form.fiscal2_regime}
                            onValueChange={(val) => setForm({ ...form, fiscal2_regime: val })}
                            disabled={!isAdmin}
                          >
                            <SelectTrigger id="rfc_regime2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="601">601 - General de Ley Personas Morales</SelectItem>
                              <SelectItem value="603">603 - Personas Morales con Fines no Lucrativos</SelectItem>
                              <SelectItem value="626">626 - Régimen Simplificado de Confianza (RESICO)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="rfc_cfdi2">Uso de CFDI por Defecto</Label>
                          <Select
                            value={form.fiscal2_cfdi_use}
                            onValueChange={(val) => setForm({ ...form, fiscal2_cfdi_use: val })}
                            disabled={!isAdmin}
                          >
                            <SelectTrigger id="rfc_cfdi2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="G01">G01 - Adquisición de mercancías</SelectItem>
                              <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                              <SelectItem value="P01">P01 - Por definir</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            {isAdmin && (
              <CardFooter className="border-t pt-4 flex justify-end">
                <Button type="submit">Guardar Cambios</Button>
              </CardFooter>
            )}
          </form>
        </Card>


        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground uppercase">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Fiscal Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
            <p>
              Esta configuración establece los datos que se adjuntarán a los clientes y sus proyectos.
            </p>
            <p>
              Al timbrar una factura, la API cruzará el RFC y Régimen Fiscal del cliente con estos datos del emisor para emitir un CFDI 4.0 válido.
            </p>
            <div className="border-t pt-3 space-y-2">
              <span className="font-semibold text-foreground">Validaciones SAT:</span>
              <ul className="list-disc pl-4 space-y-1">
                <li>RFC de emisor y receptor válidos.</li>
                <li>Nombre de emisor y receptor exactos en constancia fiscal.</li>
                <li>Código postal fiscal coincidente.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
