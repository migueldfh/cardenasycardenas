import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTheme, hslToHex } from "@/contexts/ThemeContext";
import { CLIENT_THEMES, DEFAULT_CLIENT_THEME, type ThemeColorPalette } from "@/config/themes";
import {
  Sun,
  Moon,
  RotateCcw,
  Palette,
  Check,
  Shield,
  Upload,
  Trash2,
  Image as ImageIcon,
  Lock,
  ShieldCheck,
  Key,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { sileo } from "sileo";
import { useActivityLogs } from "@/modules/finances/hooks";
import { formatActivityLog, logActivity } from "@/api/logs";

export function Settings() {
  const { profile } = useAuth();
  const { 
    mode, 
    setMode, 
    palette, 
    setPalette, 
    customColors, 
    updateCustomColor, 
    resetToDefaults,
    logoUrl,
    updateLogoUrl,
    loginImageUrl,
    updateLoginImageUrl,
    saveCorporateBranding
  } = useTheme();

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLoginImage, setIsUploadingLoginImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isAdmin = profile?.role === "admin";

  // SAT Vault PIN management state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // SAT Vault Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const { data: globalRawLogs = [] } = useActivityLogs(60);
  const [globalLogFilter, setGlobalLogFilter] = useState<string>("all");
  const [globalLogSearch, setGlobalLogSearch] = useState<string>("");

  const formattedGlobalLogs = globalRawLogs
    .map((log) => formatActivityLog(log))
    .filter((item) => {
      const matchCat = globalLogFilter === "all" || item.category === globalLogFilter;
      const q = globalLogSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.clientName || "").toLowerCase().includes(q) ||
        item.actorName.toLowerCase().includes(q) ||
        item.action.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("user_activity_logs")
        .select("*")
        .in("action", [
          "ACCESO_AUTORIZADO_CIEC_SAT",
          "ACCESO_FALLIDO_CIEC_SAT",
          "CAMBIO_PIN_BOVEDA_SAT",
        ])
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err: any) {
      console.error("Error fetching SAT audit logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPin) {
      sileo.error({ title: "Ingresa el PIN actual" });
      return;
    }
    if (newPin.length < 4) {
      sileo.error({ title: "El nuevo PIN debe tener al menos 4 caracteres" });
      return;
    }
    if (newPin !== confirmPin) {
      sileo.error({ title: "Los nuevos PINs no coinciden" });
      return;
    }

    setIsUpdatingPin(true);
    try {
      const { data, error } = await supabase.rpc("set_sat_vault_pin", {
        p_current_pin: currentPin,
        p_new_pin: newPin,
        p_updated_by: profile?.email || "admin@cardenas.com",
      });

      if (error) throw error;
      if (data && !data.success) {
        sileo.error({ title: "Error al actualizar PIN", description: data.error });
        return;
      }

      sileo.success({
        title: "PIN Maestro actualizado",
        description: "El nuevo PIN para la Bóveda SAT ha sido configurado con éxito.",
      });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      fetchAuditLogs();
    } catch (err: any) {
      console.error("Error updating vault PIN:", err);
      sileo.error({
        title: "Error al actualizar PIN",
        description: err.message || "Ocurrió un error inesperado.",
      });
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/webp" && !file.name.toLowerCase().endsWith(".webp")) {
      sileo.error({ 
        title: "Formato no permitido", 
        description: "Por favor selecciona únicamente archivos de imagen con formato .webp para optimizar el rendimiento." 
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `logos/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("artworks")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("artworks").getPublicUrl(fileName);
      updateLogoUrl(data.publicUrl);
      sileo.success({ 
        title: "Logo cargado", 
        description: "El logo se ha cargado en el borrador de apariencia. Guarda los cambios para aplicarlo corporativamente." 
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      sileo.error({ 
        title: "Error al cargar logo", 
        description: error.message || "Ocurrió un error inesperado al subir la imagen." 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    updateLogoUrl(null);
    sileo.success({ 
      title: "Logo removido", 
      description: "Se ha restablecido el logo al valor por defecto en tu vista previa." 
    });
  };

  const handleLoginImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/webp" && !file.name.toLowerCase().endsWith(".webp")) {
      sileo.error({ 
        title: "Formato no permitido", 
        description: "Por favor selecciona únicamente archivos de imagen con formato .webp para optimizar el rendimiento." 
      });
      return;
    }

    setIsUploadingLoginImage(true);
    try {
      const fileName = `login_images/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("artworks")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("artworks").getPublicUrl(fileName);
      updateLoginImageUrl(data.publicUrl);
      sileo.success({ 
        title: "Imagen de inicio de sesión cargada", 
        description: "La imagen se ha cargado en la vista previa. Guarda los cambios para aplicarla corporativamente." 
      });
    } catch (error: any) {
      console.error("Error uploading login image:", error);
      sileo.error({ 
        title: "Error al cargar imagen", 
        description: error.message || "Ocurrió un error inesperado al subir la imagen." 
      });
    } finally {
      setIsUploadingLoginImage(false);
    }
  };

  const handleRemoveLoginImage = () => {
    updateLoginImageUrl(null);
    sileo.success({ 
      title: "Imagen removida", 
      description: "Se ha restablecido la imagen de inicio de sesión al valor por defecto en tu vista previa." 
    });
  };

  const handleSaveCorporate = async () => {
    setIsSaving(true);
    try {
      await saveCorporateBranding(palette, mode, customColors, logoUrl, loginImageUrl);
      void logActivity("CORPORATE_BRANDING_SAVED", {
        module: "configuracion",
        palette,
        mode,
        title: "Identidad corporativa actualizada",
        description: `Se guardó la identidad corporativa (${palette}, modo ${mode})`,
      });
      sileo.success({ 
        title: "Identidad guardada", 
        description: "La configuración de apariencia, logo e imagen de inicio de sesión se han guardado como valores corporativos." 
      });
    } catch (error: any) {
      console.error("Error saving corporate branding:", error);
      sileo.error({ 
        title: "Error al guardar", 
        description: error.message || "No se pudo guardar la configuración en la base de datos." 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePaletteSelect = (key: string) => {
    setPalette(key);
  };

  const getActiveHex = (key: keyof ThemeColorPalette): string => {
    if (palette === "custom" && customColors[key]) {
      return customColors[key];
    }
    const basePalette = CLIENT_THEMES[palette] || CLIENT_THEMES[DEFAULT_CLIENT_THEME];
    const hslVal = basePalette[mode][key];
    return hslToHex(hslVal);
  };

  // Color options for customization
  const colorItems: { label: string; key: keyof ThemeColorPalette; description: string }[] = [
    { label: "Color Primario", key: "primary", description: "Color para botones principales, enlaces y resaltados." },
    { label: "Fondo General", key: "background", description: "Fondo de toda la página." },
    { label: "Paneles y Tarjetas", key: "card", description: "Fondo para el sidebar, header y contenedores." },
    { label: "Bordes", key: "border", description: "Color para líneas y bordes divisorios." },
    { label: "Color del Texto", key: "foreground", description: "Color principal para tipografía legible." },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración de Apariencia</h2>
        <p className="text-muted-foreground mt-1">Personaliza el tema, los colores de tu marca y el modo de visualización de la plataforma.</p>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm">
          <Shield className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            <strong>Modo de Preferencia Personal:</strong> Puedes alternar el modo claro/oscuro y explorar paletas para tu vista. La carga de logos corporativos y el guardado institucional requieren un rol de <strong>Administrador</strong>.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* MODO CLARO / OSCURO */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sun className="h-5 w-5 text-primary" />
              Modo de Pantalla
            </CardTitle>
            <CardDescription>Escoge entre el tema claro u oscuro para la interfaz.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {/* Light Mode Selector Card */}
            <button
              onClick={() => setMode("light")}
              className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 text-left transition-all ${
                mode === "light"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <Sun className="h-8 w-8 mb-2" />
              <span className="font-semibold text-sm">Modo Claro</span>
            </button>

            {/* Dark Mode Selector Card */}
            <button
              onClick={() => setMode("dark")}
              className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 text-left transition-all ${
                mode === "dark"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <Moon className="h-8 w-8 mb-2" />
              <span className="font-semibold text-sm">Modo Oscuro</span>
            </button>
          </CardContent>
        </Card>

        {/* PALETAS PREDEFINIDAS */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Paletas del Cliente
            </CardTitle>
            <CardDescription>Selecciona una combinación de colores predefinida de la marca.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {Object.entries(CLIENT_THEMES).map(([key, item]) => {
              const isActive = palette === key;
              const primaryColor = hslToHex(item[mode].primary);
              const bgColor = hslToHex(item[mode].background);
              const cardColor = hslToHex(item[mode].card);

              return (
                <button
                  key={key}
                  onClick={() => handlePaletteSelect(key)}
                  className={`relative p-4 rounded-lg border-2 text-left flex flex-col justify-between h-28 transition-all ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="font-bold text-sm leading-tight text-foreground">{item.name}</span>
                    {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>

                  {/* Colors preview dots */}
                  <div className="flex items-center gap-1.5 mt-auto">
                    <span className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: primaryColor }} title="Primario" />
                    <span className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: bgColor }} title="Fondo" />
                    <span className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: cardColor }} title="Panel" />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* LOGO CORPORATIVO */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Logo de la Empresa
            </CardTitle>
            <CardDescription>
              Carga tu logotipo en formato .webp. Se mostrará en los paneles de administración y las vistas públicas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-full h-32 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/20 p-4">
              <img
                src={logoUrl || "/logo.png"}
                alt="Logotipo de la empresa"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/logo.png";
                }}
              />
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              )}
            </div>

            <div className="flex w-full gap-2">
              <div className="flex-1">
                <input
                  type="file"
                  id="logo-file-input"
                  accept="image/webp"
                  onChange={handleLogoUpload}
                  disabled={!isAdmin || isUploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={!isAdmin || isUploading}
                  onClick={() => document.getElementById("logo-file-input")?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {isAdmin ? "Cargar .webp" : "Solo Administrador"}
                </Button>
              </div>
              {logoUrl && isAdmin && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleRemoveLogo}
                  disabled={isUploading}
                  title="Eliminar logo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* IMAGEN DE INICIO DE SESIÓN */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Imagen de Iniciar Sesión
            </CardTitle>
            <CardDescription>
              Carga una imagen en formato .webp para el lateral de la pantalla de inicio de sesión.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-full h-32 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/20 p-2 overflow-hidden">
              <img
                src={loginImageUrl || "/login.webp"}
                alt="Imagen de inicio de sesión"
                className="max-h-full max-w-full object-cover rounded"
                onError={(e) => {
                  e.currentTarget.src = "/login.webp";
                }}
              />
              {isUploadingLoginImage && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              )}
            </div>

            <div className="flex w-full gap-2">
              <div className="flex-1">
                <input
                  type="file"
                  id="login-image-file-input"
                  accept="image/webp"
                  onChange={handleLoginImageUpload}
                  disabled={!isAdmin || isUploadingLoginImage}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={!isAdmin || isUploadingLoginImage}
                  onClick={() => document.getElementById("login-image-file-input")?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {isAdmin ? "Cargar .webp" : "Solo Administrador"}
                </Button>
              </div>
              {loginImageUrl && isAdmin && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleRemoveLoginImage}
                  disabled={isUploadingLoginImage}
                  title="Eliminar imagen de inicio de sesión"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* APLICAR COMO CORPORATIVO */}
        <Card className="shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Guardar Identidad Corporativa
            </CardTitle>
            <CardDescription>
              Aplica el tema seleccionado, los colores personalizados, el logo y la imagen de inicio de sesión para todos los usuarios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-2 text-sm text-muted-foreground p-3 bg-muted/40 rounded-lg border border-border">
              <div className="flex justify-between">
                <span>Modo de pantalla:</span>
                <span className="font-semibold text-foreground capitalize">{mode}</span>
              </div>
              <div className="flex justify-between">
                <span>Paleta activa:</span>
                <span className="font-semibold text-foreground capitalize">
                  {palette === "custom" ? "Personalizada" : palette}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Logo personalizado:</span>
                <span className="font-semibold text-foreground">
                  {logoUrl ? "Sí (Cargado)" : "No (Por defecto)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Imagen de login:</span>
                <span className="font-semibold text-foreground">
                  {loginImageUrl ? "Sí (Cargada)" : "No (Por defecto)"}
                </span>
              </div>
            </div>

            <Button
              onClick={handleSaveCorporate}
              disabled={!isAdmin || isSaving}
              className="w-full gap-2"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isAdmin ? "Guardar Cambios Corporativos" : "Requiere Rol de Administrador"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* BÓVEDA FISCAL SAT & SEGURIDAD CIEC */}
      <Card className="shadow-sm border-emerald-200/60 dark:border-emerald-800/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Bóveda de Seguridad CIEC (SAT)</CardTitle>
              <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-mono">
                AES-256 pgcrypto
              </Badge>
            </div>
            <CardDescription className="mt-1">
              Protección criptográfica en reposo para las contraseñas CIEC del SAT, control de acceso mediante PIN Maestro y bitácora inmutable de auditoría.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLogs}
            disabled={isLoadingLogs}
            className="gap-2 text-muted-foreground hover:text-foreground h-8 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLogs ? "animate-spin" : ""}`} />
            Actualizar Bitácora
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* PIN Master Update Form */}
            <form onSubmit={handleUpdatePin} className="lg:col-span-4 p-4 rounded-xl border border-border bg-card/60 space-y-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-emerald-600" />
                <h4 className="text-sm font-semibold text-foreground">Configurar PIN Maestro</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                El PIN Maestro se requiere para autorizar el descifrado temporal (15s) de las contraseñas CIEC. PIN por defecto inicial: <span className="font-mono font-semibold text-foreground">1234</span>.
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">PIN Actual</Label>
                  <Input
                    type="password"
                    maxLength={8}
                    placeholder="••••"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    className="h-8 text-xs font-mono tracking-widest"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nuevo PIN Maestro (4-8 dígitos)</Label>
                  <Input
                    type="password"
                    maxLength={8}
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="h-8 text-xs font-mono tracking-widest"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Confirmar Nuevo PIN</Label>
                  <Input
                    type="password"
                    maxLength={8}
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className="h-8 text-xs font-mono tracking-widest"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={!isAdmin || isUpdatingPin || !currentPin || !newPin || !confirmPin}
                className="w-full bg-[#1e3a5f] hover:bg-[#152a45] text-white text-xs h-8 gap-2"
              >
                {isUpdatingPin ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                {isAdmin ? "Actualizar PIN Maestro" : "Solo Administradores"}
              </Button>
            </form>

            {/* Audit Logs Table */}
            <div className="lg:col-span-8 p-4 rounded-xl border border-border bg-card/60 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-sm font-semibold text-foreground">Bitácora de Auditoría de Accesos SAT</h4>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {auditLogs.length} eventos recientes
                </Badge>
              </div>

              <div className="rounded-md border border-border/60 overflow-hidden overflow-x-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-[11px]">
                      <TableHead className="py-2">Fecha / Hora</TableHead>
                      <TableHead className="py-2">Usuario</TableHead>
                      <TableHead className="py-2">Cliente / RFC</TableHead>
                      <TableHead className="py-2">Motivo</TableHead>
                      <TableHead className="py-2 text-right">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                          {isLoadingLogs ? "Cargando bitácora..." : "No hay registros de acceso recientes a la Bóveda."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log) => {
                        const isAuthorized = log.action === "ACCESO_AUTORIZADO_CIEC_SAT";
                        const isPinChange = log.action === "CAMBIO_PIN_BOVEDA_SAT";
                        const dateFormatted = new Date(log.created_at).toLocaleString("es-MX", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        });

                        return (
                          <TableRow key={log.id} className="hover:bg-muted/20">
                            <TableCell className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                              {dateFormatted}
                            </TableCell>
                            <TableCell className="font-medium text-[11px] whitespace-nowrap">
                              {log.user_email || "Usuario del sistema"}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate text-[11px]">
                              {isPinChange ? (
                                <span className="font-mono text-muted-foreground">Bóveda Global</span>
                              ) : (
                                <div>
                                  <div className="truncate font-semibold text-foreground">{log.details?.client_name || "Cliente"}</div>
                                  <div className="font-mono text-[10px] text-muted-foreground">{log.details?.client_rfc || "—"}</div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[11px] max-w-[180px] truncate text-muted-foreground" title={log.details?.reason || log.details?.action_desc}>
                              {log.details?.reason || log.details?.action_desc || (isPinChange ? "Actualización de PIN" : "Consulta")}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {isAuthorized ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 font-normal py-0">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Autorizado
                                </Badge>
                              ) : isPinChange ? (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] gap-1 font-normal py-0">
                                  <Key className="h-3 w-3 text-blue-600" /> PIN Cambiado
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] gap-1 font-normal py-0">
                                  <AlertTriangle className="h-3 w-3 text-rose-600" /> Denegado
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BITÁCORA GLOBAL DE MOVIMIENTOS Y LÓGICA DE NEGOCIO */}
      <Card className="shadow-sm border-primary/20">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Bitácora Global de Movimientos y Lógica de Negocio
            </CardTitle>
            <CardDescription>
              Registro auditable en tiempo real de cada movimiento en la aplicación y transiciones de lógica contable, fiscal, documentos y facturación.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar cliente, acción o usuario..."
              value={globalLogSearch}
              onChange={(e) => setGlobalLogSearch(e.target.value)}
              className="h-8 text-xs w-56"
            />
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {formattedGlobalLogs.length} registros
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "Todos" },
              { id: "contabilidad", label: "Contabilidad e Impuestos" },
              { id: "cumplimiento", label: "Opiniones 32-D" },
              { id: "documentos", label: "Expediente Digital" },
              { id: "clientes", label: "Clientes y Servicios" },
              { id: "finanzas", label: "Finanzas y Facturación" },
              { id: "seguridad", label: "Bóveda SAT" },
              { id: "sistema", label: "Sistema" },
            ].map((cat) => (
              <Button
                key={cat.id}
                type="button"
                size="sm"
                variant={globalLogFilter === cat.id ? "default" : "outline"}
                onClick={() => setGlobalLogFilter(cat.id)}
                className="h-7 text-xs px-2.5"
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="rounded-md border border-border/60 overflow-hidden overflow-x-auto max-h-[380px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-[11px]">
                  <TableHead className="py-2">Fecha / Hora</TableHead>
                  <TableHead className="py-2">Movimiento / Regla de Negocio</TableHead>
                  <TableHead className="py-2">Cliente</TableHead>
                  <TableHead className="py-2">Detalle</TableHead>
                  <TableHead className="py-2">Responsable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {formattedGlobalLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No se encontraron movimientos con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  formattedGlobalLogs.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                        {item.formattedDate}
                      </TableCell>
                      <TableCell className="font-semibold text-[11px] whitespace-nowrap text-foreground">
                        {item.title}
                      </TableCell>
                      <TableCell className="text-[11px] whitespace-nowrap">
                        {item.clientName ? (
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {item.clientName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] max-w-[320px] truncate text-muted-foreground" title={item.description}>
                        {item.description}
                      </TableCell>
                      <TableCell className="text-[11px] whitespace-nowrap font-medium">
                        {item.actorName}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* PERSONALIZACIÓN AVANZADA */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Personalización de Colores
            </CardTitle>
            <CardDescription>Modifica los colores individuales para crear un tema a tu gusto. Cambiar un color activará el modo personalizado.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={resetToDefaults} className="gap-2 text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {palette === "custom" && (
            <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-md text-xs font-semibold">
              Tema Personalizado Activo: Estás visualizando colores personalizados almacenados en este navegador.
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {colorItems.map((item) => {
              const currentHex = getActiveHex(item.key);
              return (
                <div key={item.key} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card/50 hover:bg-card transition-colors">
                  <div className="space-y-0.5 max-w-[70%]">
                    <Label className="text-sm font-semibold">{item.label}</Label>
                    <p className="text-xs text-muted-foreground leading-normal">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono uppercase text-muted-foreground select-all">{currentHex}</span>
                    <input
                      type="color"
                      value={currentHex}
                      onChange={(e) => updateCustomColor(item.key, e.target.value)}
                      className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
