import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme, hslToHex } from "@/contexts/ThemeContext";
import { CLIENT_THEMES, DEFAULT_CLIENT_THEME, type ThemeColorPalette } from "@/config/themes";
import { Sun, Moon, RotateCcw, Palette, Check, Shield, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { sileo } from "sileo";

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
