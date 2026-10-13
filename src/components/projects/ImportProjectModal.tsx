import * as React from "react";
import type { IFinanceClient, IProject } from "@/modules/finances/types";
import { parseProjectExcel, type IParsedProjectExcel } from "@/modules/finances/utils/excelProject";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sileo } from "sileo";
import { Upload, FileSpreadsheet, Check, Loader2, RefreshCw, Layers } from "lucide-react";

interface ImportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: IFinanceClient[];
  projects: IProject[];
  targetProjectId?: string | null;
  onImportNewProject: (data: {
    client_id: string;
    client_name_new?: string;
    projectData: Partial<IProject>;
  }) => Promise<void>;
  onImportUpdateProject: (projectId: string, projectData: Partial<IProject>) => Promise<void>;
}

export function ImportProjectModal({
  isOpen,
  onClose,
  clients,
  projects,
  targetProjectId,
  onImportNewProject,
  onImportUpdateProject,
}: ImportProjectModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<IParsedProjectExcel | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Import mode: 'new' | 'update'
  const [mode, setMode] = React.useState<"new" | "update">(targetProjectId ? "update" : "new");

  // Selection states
  const [selectedClientId, setSelectedClientId] = React.useState<string>("");
  const [createNewClient, setCreateNewClient] = React.useState<boolean>(false);
  const [newClientName, setNewClientName] = React.useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(targetProjectId || "");

  React.useEffect(() => {
    if (targetProjectId) {
      setMode("update");
      setSelectedProjectId(targetProjectId);
    }
  }, [targetProjectId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      setIsParsing(true);
      setFile(selectedFile);
      const parsed = await parseProjectExcel(selectedFile);
      setParsedData(parsed);

      // Auto-match client name if found
      if (parsed.client_name) {
        const matched = clients.find(
          (c) => c.name.toLowerCase().trim() === parsed.client_name.toLowerCase().trim()
        );
        if (matched) {
          setSelectedClientId(matched.id);
          setCreateNewClient(false);
        } else {
          setCreateNewClient(true);
          setNewClientName(parsed.client_name);
        }
      }

      sileo.success({ title: "Excel analizado correctamente" });
    } catch (err: any) {
      sileo.error({ title: "Error al leer el archivo Excel", description: err.message });
      setFile(null);
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleResetFile = () => {
    setFile(null);
    setParsedData(null);
  };

  const handleSubmit = async () => {
    if (!parsedData) {
      sileo.error({ title: "Por favor selecciona un archivo Excel válido." });
      return;
    }

    try {
      setIsSubmitting(true);

      const projectPayload: Partial<IProject> = {
        name: parsedData.name || `Proyecto - ${parsedData.order_number || "Excel"}`,
        order_number: parsedData.order_number || undefined,
        custom_price_total: parsedData.unit_cost ? parsedData.unit_cost * parsedData.total_pieces : 0,
        unit_cost: parsedData.unit_cost || null,
        total_pieces: parsedData.total_pieces || 0,
        print_info: parsedData.print_info || null,
        status_note: parsedData.status_note || null,
        mold_name: parsedData.mold_name || undefined,
        fabric_name: parsedData.fabric_name || undefined,
        label_name: parsedData.label_name || undefined,
        target_delivery_date: parsedData.target_delivery_date || null,
        specifications: parsedData.specifications || undefined,
        sizes_breakdown: parsedData.sizes_breakdown,
        roster_list: parsedData.roster_list,
      };

      if (mode === "new") {
        let finalClientId = selectedClientId;
        let finalClientName = createNewClient ? newClientName : undefined;

        if (!createNewClient && !finalClientId) {
          sileo.error({ title: "Debes seleccionar o especificar un cliente para el nuevo proyecto." });
          setIsSubmitting(false);
          return;
        }

        await onImportNewProject({
          client_id: finalClientId,
          client_name_new: finalClientName,
          projectData: projectPayload,
        });

        sileo.success({ title: "Proyecto creado exitosamente desde Excel" });
      } else {
        if (!selectedProjectId) {
          sileo.error({ title: "Debes seleccionar un proyecto existente para actualizar." });
          setIsSubmitting(false);
          return;
        }

        await onImportUpdateProject(selectedProjectId, projectPayload);
        sileo.success({ title: "Proyecto actualizado con los datos del Excel" });
      }

      onClose();
      handleResetFile();
    } catch (err: any) {
      sileo.error({ title: "Error al importar el proyecto", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Importar Hoja de Trabajo desde Excel
          </DialogTitle>
          <DialogDescription>
            Sube un archivo de pedido Excel para crear un nuevo proyecto o llenar los datos de uno existente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-2">
          {/* File Uploader area */}
          {!parsedData ? (
            <div className="border-2 border-dashed rounded-xl p-8 text-center space-y-4 hover:border-primary transition-colors bg-muted/20">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {isParsing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              </div>
              <div>
                <p className="font-semibold text-foreground">Haz clic para subir o arrastra tu archivo Excel</p>
                <p className="text-xs text-muted-foreground mt-1">Soporta formatos .xlsx y .xls (Plantilla de Pedido Decreto)</p>
              </div>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                disabled={isParsing}
                className="hidden"
                id="excel-file-input"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("excel-file-input")?.click()}
                disabled={isParsing}
              >
                {isParsing ? "Analizando Excel..." : "Seleccionar Archivo"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File details banner */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-bold text-sm">{file?.name}</p>
                    <p className="text-xs opacity-90">{parsedData.total_pieces} prendas totales detectadas</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleResetFile} className="h-8">
                  <RefreshCw className="h-4 w-4 mr-1" /> Cambiar archivo
                </Button>
              </div>

              {/* Parsed Preview Card */}
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <p className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Datos Extraídos del Excel
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">No. Pedido:</span>
                    <span className="font-semibold text-foreground">{parsedData.order_number || "Sin especificar"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Cliente:</span>
                    <span className="font-semibold text-foreground">{parsedData.client_name || "Sin especificar"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Proyecto:</span>
                    <span className="font-semibold text-foreground">{parsedData.name || "Sin especificar"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Modelo:</span>
                    <span className="font-semibold text-foreground">{parsedData.mold_name || "Sin especificar"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Tela:</span>
                    <span className="font-semibold text-foreground">{parsedData.fabric_name || "Sin especificar"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Etiqueta:</span>
                    <span className="font-semibold text-foreground">{parsedData.label_name || "Sin especificar"}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t text-xs">
                  <Badge variant="outline" className="bg-primary/5">
                    Personalizados: {parsedData.roster_list.length} registros
                  </Badge>
                  <Badge variant="outline" className="bg-primary/5">
                    Caballero: {Object.values(parsedData.sizes_breakdown.Caballero || {}).reduce((a, b) => a + b, 0)} pcs
                  </Badge>
                  <Badge variant="outline" className="bg-primary/5">
                    Dama: {Object.values(parsedData.sizes_breakdown.Dama || {}).reduce((a, b) => a + b, 0)} pcs
                  </Badge>
                  <Badge variant="outline" className="bg-primary/5">
                    Infantil: {Object.values(parsedData.sizes_breakdown.Infantil || {}).reduce((a, b) => a + b, 0)} pcs
                  </Badge>
                </div>
              </div>

              {/* Mode selection tabs */}
              <div className="space-y-3">
                <Label className="font-semibold text-sm">¿Cómo deseas procesar estos datos?</Label>
                <Tabs value={mode} onValueChange={(val: any) => setMode(val)}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="new">Crear Nuevo Proyecto</TabsTrigger>
                    <TabsTrigger value="update">Actualizar Proyecto Existente</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Mode: NEW PROJECT */}
              {mode === "new" && (
                <div className="space-y-3 p-4 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-semibold">Asignar Cliente</Label>
                  {!createNewClient ? (
                    <div className="space-y-2">
                      <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente existente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="link"
                        className="text-xs p-0 h-auto text-primary"
                        onClick={() => setCreateNewClient(true)}
                      >
                        + Crear nuevo cliente con el nombre del Excel
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Nombre del nuevo cliente"
                        className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                      />
                      <Button
                        type="button"
                        variant="link"
                        className="text-xs p-0 h-auto text-muted-foreground"
                        onClick={() => setCreateNewClient(false)}
                      >
                        Seleccionar cliente existente
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Mode: UPDATE EXISTING PROJECT */}
              {mode === "update" && (
                <div className="space-y-3 p-4 rounded-xl border bg-muted/10">
                  <Label className="text-xs font-semibold">Seleccionar Proyecto a Llenar / Actualizar</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el proyecto a actualizar" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.order_number ? `[${p.order_number}] ` : ""}{p.name} - ({p.client?.name || "Sin cliente"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!parsedData || isSubmitting || isParsing}
            className="gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {mode === "new" ? "Crear Proyecto desde Excel" : "Actualizar Proyecto con Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
