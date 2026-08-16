import * as React from "react";
import type {
  IProject,
  IRosterEntry,
  ISizesBreakdown,
  ICutOrderData,
} from "@/modules/finances/types";
import { DECRETO_PROCESS_STAGES } from "@/modules/finances/types";
import {
  useUpdateProjectStage,
  useSaveProjectWorksheet,
  useProjectProcessLogs,
  usePayments,
  useProject,
  useFinanceClients,
  useProjects,
} from "@/modules/finances/hooks";
import { formatLocalDate } from "@/lib/utils";
import { exportProjectToExcel } from "@/modules/finances/utils/excelProject";
import { ImportProjectModal } from "@/components/projects/ImportProjectModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { uploadProjectDesign } from "@/modules/finances/api";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sileo } from "sileo";
import {
  ChevronRight,
  ChevronLeft,
  Scissors,
  Printer,
  Shirt,
  DollarSign,
  FileText,
  Clock,
  Plus,
  Trash2,
  Layers,
  Save,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  RefreshCw,
  Palette,
  FileSpreadsheet,
} from "lucide-react";

interface ProjectProcessSheetProps {
  project: IProject;
  onClose?: () => void;
}

interface DesignImageUploaderProps {
  label: string;
  stepNumber: number;
  value: string;
  onChange: (url: string) => void;
  folder: "digital" | "print";
  projectId: string;
  saveWorksheetMutation: any;
}

function DesignImageUploader({
  label,
  stepNumber,
  value,
  onChange,
  folder,
  projectId,
  saveWorksheetMutation,
}: DesignImageUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const publicUrl = await uploadProjectDesign(file, folder);
      onChange(publicUrl);

      const updatePayload: Record<string, string> = {};
      if (folder === "digital") updatePayload.digital_design_url = publicUrl;
      else updatePayload.print_design_url = publicUrl;

      await saveWorksheetMutation.mutateAsync({
        id: projectId,
        worksheet: updatePayload,
      });

      sileo.success({ title: `Imagen para Paso ${stepNumber} subida correctamente` });
    } catch (err: any) {
      sileo.error({ title: "Error al subir imagen", description: err.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`¿Deseas eliminar la imagen del Paso ${stepNumber}?`)) return;
    onChange("");
    const updatePayload: Record<string, string | null> = {};
    if (folder === "digital") updatePayload.digital_design_url = null;
    else updatePayload.print_design_url = null;

    try {
      await saveWorksheetMutation.mutateAsync({
        id: projectId,
        worksheet: updatePayload,
      });
      sileo.info({ title: `Imagen del Paso ${stepNumber} eliminada` });
    } catch (err: any) {
      sileo.error({ title: "Error al actualizar", description: err.message });
    }
  };

  const isImage =
    value &&
    (/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(value) ||
      value.startsWith("data:image/") ||
      value.includes("supabase.co/storage/v1/object/public/"));

  return (
    <div className="p-4 border rounded-xl bg-card space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold">
            Paso {stepNumber}
          </Badge>
          <span className="font-bold text-sm text-foreground">{label}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground h-7"
          onClick={() => setShowUrlInput(!showUrlInput)}
        >
          {showUrlInput ? "Ocultar URL" : "Editar URL directa"}
        </Button>
      </div>

      {showUrlInput && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="text-xs font-mono"
        />
      )}

      {value ? (
        <div className="space-y-3">
          <div className="relative group rounded-lg overflow-hidden border bg-muted/30 flex items-center justify-center min-h-[160px] max-h-[260px] p-2">
            {isImage ? (
              <img
                src={value}
                alt={`Diseño Paso ${stepNumber}`}
                className="max-h-60 max-w-full object-contain rounded-md shadow-sm transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="p-6 text-center space-y-2">
                <FileText className="h-10 w-10 text-primary mx-auto" />
                <p className="text-xs font-medium text-foreground truncate max-w-xs">{value}</p>
              </div>
            )}

            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-gray-100 shadow"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ver en Grande
              </a>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 text-xs gap-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Cambiar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 text-xs gap-1"
                onClick={handleRemove}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate max-w-[240px] font-mono text-[10px]">{value}</span>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              Abrir Enlace <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            isUploading ? "bg-muted/50 border-primary/50" : "bg-muted/20 hover:bg-muted/50 border-border hover:border-primary/50"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2 py-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-semibold text-foreground">Subiendo archivo a Supabase...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Haz clic para subir imagen de Paso {stepNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Soporta PNG, JPG, WEBP, SVG, PDF</p>
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}


const CATEGORIES = ["Caballero", "Dama", "Infantil"] as const;
const CHILD_SIZES = ["2", "4", "6", "8", "10", "12", "14", "16"];
const ADULT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

const getSizesForCategory = (category: string) => {
  return category === "Infantil" ? CHILD_SIZES : ADULT_SIZES;
};

export function ProjectProcessSheet({ project: initialProject, onClose }: ProjectProcessSheetProps) {
  const { data: fetchedProject } = useProject(initialProject.id);
  const project = fetchedProject || initialProject;

  const { data: clients = [] } = useFinanceClients();
  const { data: projects = [] } = useProjects();
  const updateStageMutation = useUpdateProjectStage();
  const saveWorksheetMutation = useSaveProjectWorksheet();
  const { data: logs = [] } = useProjectProcessLogs(project.id);
  const { data: allPayments = [] } = usePayments();
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

  const handleImportUpdateCurrentProject = async (_projId: string, projectData: Partial<IProject>) => {
    await saveWorksheetMutation.mutateAsync({
      id: project.id,
      worksheet: projectData,
    });
    if (projectData.mold_name !== undefined) setWorksheetForm((prev) => ({ ...prev, mold_name: projectData.mold_name || "" }));
    if (projectData.fabric_name !== undefined) setWorksheetForm((prev) => ({ ...prev, fabric_name: projectData.fabric_name || "" }));
    if (projectData.label_name !== undefined) setWorksheetForm((prev) => ({ ...prev, label_name: projectData.label_name || "" }));
    if (projectData.target_delivery_date !== undefined) setWorksheetForm((prev) => ({ ...prev, target_delivery_date: projectData.target_delivery_date || "" }));
    if (projectData.specifications !== undefined) setWorksheetForm((prev) => ({ ...prev, specifications: projectData.specifications || "" }));
    if (projectData.sizes_breakdown) setSizesBreakdown(projectData.sizes_breakdown);
    if (projectData.roster_list) setRosterList(projectData.roster_list);
  };

  const projectPayments = React.useMemo(() => {
    return allPayments.filter((p) => p.project_id === project.id);
  }, [allPayments, project.id]);

  const totalPaid = React.useMemo(() => {
    return projectPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [projectPayments]);

  const projectPrice = project.custom_price_total || project.base_price_total || 0;
  const remainingDebt = Math.max(0, projectPrice - totalPaid);
  const paidPercentage = projectPrice > 0 ? Math.min(100, Math.round((totalPaid / projectPrice) * 100)) : 0;

  const currentStageIndex = React.useMemo(() => {
    const stageId = project.current_stage || "solicitud";
    const idx = DECRETO_PROCESS_STAGES.findIndex((s) => s.id === stageId);
    return idx >= 0 ? idx : 0;
  }, [project.current_stage]);

  const currentStageObj = DECRETO_PROCESS_STAGES[currentStageIndex];

  // Form states for worksheet
  const [worksheetForm, setWorksheetForm] = React.useState({
    order_number: project.order_number || "",
    mold_name: project.mold_name || "",
    fabric_name: project.fabric_name || "",
    label_name: project.label_name || "",
    cutting_location: project.cutting_location || "taller_interno",
    maquila_name: project.maquila_name || "",
    target_delivery_date: project.target_delivery_date || "",
    specifications: project.specifications || "",
    digital_design_url: project.digital_design_url || "",
    print_design_url: project.print_design_url || "",
    sample_approved: !!project.sample_approved,
    sample_plotter_name: project.sample_plotter_name || "",
  });

  // Sizes breakdown state
  const [sizesBreakdown, setSizesBreakdown] = React.useState<ISizesBreakdown>(
    project.sizes_breakdown || {
      Caballero: { S: 0, M: 0, L: 0, XL: 0 },
      Dama: { S: 0, M: 0, L: 0 },
      Infantil: { "2": 0, "4": 0, "6": 0, "8": 0, "10": 0, "12": 0, "14": 0, "16": 0 },
    }
  );

  // Roster entries state
  const [rosterList, setRosterList] = React.useState<IRosterEntry[]>(
    project.roster_list || []
  );

  // Cut order state
  const [cutOrderData, setCutOrderData] = React.useState<ICutOrderData>(
    project.cut_order_data || {
      cut_number: `CORTE-${project.order_number || project.name.slice(0, 6)}`,
      cutting_date: formatLocalDate(new Date()),
      cutter_type: (project.cutting_location as any) || "taller_interno",
      cutter_name: project.maquila_name || "",
      notes: "Cortar al hilo, marcar mechas del centro.",
    }
  );

  // Keep local state in sync when project object updates from server query
  React.useEffect(() => {
    if (!project) return;
    setWorksheetForm({
      order_number: project.order_number || "",
      mold_name: project.mold_name || "",
      fabric_name: project.fabric_name || "",
      label_name: project.label_name || "",
      cutting_location: project.cutting_location || "taller_interno",
      maquila_name: project.maquila_name || "",
      target_delivery_date: project.target_delivery_date || "",
      specifications: project.specifications || "",
      digital_design_url: project.digital_design_url || "",
      print_design_url: project.print_design_url || "",
      sample_approved: !!project.sample_approved,
      sample_plotter_name: project.sample_plotter_name || "",
    });
    if (project.sizes_breakdown) {
      setSizesBreakdown(project.sizes_breakdown);
    }
    if (project.roster_list) {
      setRosterList(project.roster_list);
    }
    if (project.cut_order_data) {
      setCutOrderData(project.cut_order_data);
    }
  }, [
    project.id,
    project.updated_at,
    project.current_stage,
    project.digital_design_url,
    project.print_design_url,
    project.sample_approved,
    project.sample_plotter_name,
  ]);

  const [stageNotes, setStageNotes] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSizeCountChange = (category: string, size: string, value: number) => {
    setSizesBreakdown((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [size]: Math.max(0, value),
      },
    }));
  };

  const handleAddRosterEntry = () => {
    setRosterList((prev) => [
      ...prev,
      { category: "Caballero", size: "M", name: "", number: "" },
    ]);
  };

  const handleRemoveRosterEntry = (index: number) => {
    setRosterList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRosterChange = (index: number, field: keyof IRosterEntry, value: string) => {
    setRosterList((prev) => {
      const updated = [...prev];
      const entry = { ...updated[index] };
      if (field === "category") {
        entry.category = value as any;
        const validSizes = getSizesForCategory(value);
        if (!validSizes.includes(entry.size)) {
          entry.size = validSizes[0];
        }
      } else {
        (entry as any)[field] = value;
      }
      updated[index] = entry;
      return updated;
    });
  };

  const handleSaveWorksheet = async () => {
    try {
      setIsSaving(true);
      await saveWorksheetMutation.mutateAsync({
        id: project.id,
        worksheet: {
          ...worksheetForm,
          target_delivery_date: worksheetForm.target_delivery_date || null,
          sizes_breakdown: sizesBreakdown,
          roster_list: rosterList,
          cut_order_data: cutOrderData,
        },
      });
      sileo.success({ title: "Hoja de trabajo guardada correctamente" });
    } catch (err: any) {
      sileo.error({ title: "Error al guardar hoja de trabajo", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdvanceStage = async () => {
    if (currentStageIndex >= DECRETO_PROCESS_STAGES.length - 1) return;
    const nextStage = DECRETO_PROCESS_STAGES[currentStageIndex + 1];

    // Stage validation rules
    if (nextStage.id === "anticipo" && paidPercentage < 50) {
      const confirmAdvance = window.confirm(
        `El cliente solo ha pagado el ${paidPercentage}% de anticipo (se recomienda 50%). ¿Deseas avanzar de todas formas?`
      );
      if (!confirmAdvance) return;
    }

    try {
      await updateStageMutation.mutateAsync({
        id: project.id,
        stage: nextStage.id,
        notes: stageNotes || `Avanzado a ${nextStage.name}`,
      });
      setStageNotes("");
      sileo.success({ title: `Proceso avanzado a: ${nextStage.name}` });
    } catch (err: any) {
      sileo.error({ title: "Error al cambiar etapa", description: err.message });
    }
  };

  const handleRegressStage = async () => {
    if (currentStageIndex <= 0) return;
    const prevStage = DECRETO_PROCESS_STAGES[currentStageIndex - 1];

    try {
      await updateStageMutation.mutateAsync({
        id: project.id,
        stage: prevStage.id,
        notes: stageNotes || `Regresado a ${prevStage.name}`,
      });
      setStageNotes("");
      sileo.info({ title: `Proceso retornado a: ${prevStage.name}` });
    } catch (err: any) {
      sileo.error({ title: "Error al retornar etapa", description: err.message });
    }
  };

  const calculateTotalPiecesFromBreakdown = () => {
    let total = 0;
    Object.values(sizesBreakdown).forEach((catMap) => {
      Object.values(catMap).forEach((cnt) => {
        total += Number(cnt || 0);
      });
    });
    return total;
  };

  const totalPieces = calculateTotalPiecesFromBreakdown();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs uppercase px-2 py-0.5">
                  N° Pedido: {project.order_number || project.id.slice(0, 8)}
                </Badge>
                {project.is_sample && (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                    MUESTRA 1 PZ
                  </Badge>
                )}
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-medium">
                  {currentStageObj.macroPhase}
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
                {project.name}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Cliente: <span className="font-semibold text-foreground">{project.client?.name || "Sin cliente"}</span> | Piezas totales:{" "}
                <span className="font-semibold text-foreground">{totalPieces} pzs</span>
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => exportProjectToExcel(project)}
                className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <FileSpreadsheet className="h-4 w-4" /> Descargar Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsImportModalOpen(true)}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Upload className="h-4 w-4" /> Importar / Actualizar Excel
              </Button>
              <Button onClick={handleSaveWorksheet} disabled={isSaving} className="gap-2 bg-primary text-primary-foreground">
                <Save className="h-4 w-4" />
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
              {onClose && (
                <Button variant="ghost" onClick={onClose} size="icon">
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Financial Progress & Stage Bar */}
        <CardContent className="pt-0 border-t border-border mt-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
            <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Etapa Actual</span>
              <div className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {currentStageObj.stepNumber}. {currentStageObj.name}
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Precio Proyecto</span>
              <div className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(projectPrice)}</div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Cobrado ({paidPercentage}%)</span>
              <div className="text-sm font-bold text-green-600 dark:text-green-400 mt-0.5">{formatCurrency(totalPaid)}</div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Saldo Pendiente</span>
              <div className="text-sm font-bold text-destructive mt-0.5">{formatCurrency(remainingDebt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted">
          <TabsTrigger value="timeline" className="gap-2 py-2">
            <Layers className="h-4 w-4" /> Etapas
          </TabsTrigger>
          <TabsTrigger value="worksheet" className="gap-2 py-2">
            <FileText className="h-4 w-4" /> Hoja de Trabajo
          </TabsTrigger>
          <TabsTrigger value="sizes_roster" className="gap-2 py-2">
            <Shirt className="h-4 w-4" /> Tallas & Personalizado
          </TabsTrigger>
          <TabsTrigger value="cut_order" className="gap-2 py-2">
            <Scissors className="h-4 w-4" /> Orden de Corte
          </TabsTrigger>
          <TabsTrigger value="finances" className="gap-2 py-2">
            <DollarSign className="h-4 w-4" /> Cobros & Estado
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Timeline & Stage Controller */}
        <TabsContent value="timeline" className="mt-6 space-y-6">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Secuencia de Producción de Sublimado (Decreto)</CardTitle>
                <CardDescription>Visualización y avance por las etapas del proceso operativo</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegressStage}
                  disabled={currentStageIndex <= 0 || updateStageMutation.isPending}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Regresar Etapa
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdvanceStage}
                  disabled={currentStageIndex >= DECRETO_PROCESS_STAGES.length - 1 || updateStageMutation.isPending}
                  className="gap-1 bg-primary text-primary-foreground"
                >
                  Siguiente Etapa <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Stepper Timeline Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
                {DECRETO_PROCESS_STAGES.map((st, idx) => {
                  const isCurrent = idx === currentStageIndex;
                  const isPast = idx < currentStageIndex;

                  return (
                    <div
                      key={st.id}
                      onClick={async () => {
                        if (window.confirm(`¿Deseas cambiar manualmente la etapa del proyecto a "${st.name}"?`)) {
                          try {
                            await updateStageMutation.mutateAsync({ id: project.id, stage: st.id, notes: `Cambio manual a ${st.name}` });
                            sileo.success({ title: `Proceso cambiado a: ${st.name}` });
                          } catch (err: any) {
                            sileo.error({ title: "Error al cambiar etapa", description: err.message });
                          }
                        }
                      }}
                      className={`cursor-pointer p-3 rounded-xl border transition-all text-xs flex flex-col justify-between h-28 relative ${isCurrent
                        ? "bg-primary/10 border-primary ring-2 ring-primary/30"
                        : isPast
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-300"
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs ${isCurrent ? "text-primary" : ""}`}>
                          N° {st.stepNumber}
                        </span>
                        {isPast && <Check className="h-4 w-4 text-green-600 dark:text-green-400" />}
                        {isCurrent && <span className="h-2.5 w-2.5 rounded-full bg-primary animate-ping" />}
                      </div>

                      <div className="font-semibold leading-tight line-clamp-2 my-1">{st.name}</div>

                      <div className="text-[10px] text-muted-foreground truncate">{st.macroPhase}</div>
                    </div>
                  );
                })}
              </div>

              {/* Current Stage Controller Box */}
              <div className="bg-muted/40 p-5 rounded-xl border border-border space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="mb-1 text-primary border-primary/30">
                      Etapa Activa: {currentStageObj.stepNumber} de 14
                    </Badge>
                    <h3 className="text-xl font-bold text-foreground">{currentStageObj.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{currentStageObj.description}</p>
                  </div>

                  <Badge variant={project.status === "completed" ? "default" : "secondary"} className="uppercase font-mono">
                    Estado: {project.status}
                  </Badge>
                </div>

                {/* Step 3 Uploader inside stage box */}
                {currentStageObj.stepNumber === 3 && (
                  <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-primary" /> Imagen de Diseño Digital (Paso 3)
                    </h4>
                    <DesignImageUploader
                      label="Diseño Digital (Bosquejo Frente/Espalda)"
                      stepNumber={3}
                      value={worksheetForm.digital_design_url}
                      onChange={(url) => setWorksheetForm((prev) => ({ ...prev, digital_design_url: url }))}
                      folder="digital"
                      projectId={project.id}
                      saveWorksheetMutation={saveWorksheetMutation}
                    />
                  </div>
                )}

                {/* Step 8 Uploader inside stage box */}
                {currentStageObj.stepNumber === 8 && (
                  <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Printer className="h-4 w-4 text-primary" /> Archivo para Impresión Plotter (Paso 8)
                    </h4>
                    <DesignImageUploader
                      label="Diseño para Impresión (Plotter)"
                      stepNumber={8}
                      value={worksheetForm.print_design_url}
                      onChange={(url) => setWorksheetForm((prev) => ({ ...prev, print_design_url: url }))}
                      folder="print"
                      projectId={project.id}
                      saveWorksheetMutation={saveWorksheetMutation}
                    />
                  </div>
                )}

                {/* Quick preview links if in other steps */}
                {currentStageObj.stepNumber !== 3 && currentStageObj.stepNumber !== 8 && (worksheetForm.digital_design_url || worksheetForm.print_design_url) && (
                  <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap gap-4 text-xs">
                    {worksheetForm.digital_design_url && (
                      <div className="flex items-center gap-2 bg-background p-2.5 rounded-lg border">
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Paso 3</Badge>
                        <span className="font-semibold text-foreground">Diseño Digital:</span>
                        <a href={worksheetForm.digital_design_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold flex items-center gap-1">
                          Ver Imagen <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {worksheetForm.print_design_url && (
                      <div className="flex items-center gap-2 bg-background p-2.5 rounded-lg border">
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Paso 8</Badge>
                        <span className="font-semibold text-foreground">Diseño Impresión:</span>
                        <a href={worksheetForm.print_design_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold flex items-center gap-1">
                          Ver Archivo <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="stageNotes" className="text-xs font-semibold">Notas de Bitácora / Avance</Label>
                  <Input
                    id="stageNotes"
                    placeholder="Escribe un comentario sobre este avance o ajuste..."
                    value={stageNotes}
                    onChange={(e) => setStageNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Audit Log Timeline */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Historial de Transición de Etapas
                </h4>

                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No hay registros de bitácora todavía.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {logs.map((log) => (
                      <div key={log.id} className="p-3 bg-card border border-border rounded-lg text-xs flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-foreground">
                            Etapa: {DECRETO_PROCESS_STAGES.find((s) => s.id === log.to_stage)?.name || log.to_stage}
                          </span>
                          {log.notes && <p className="text-muted-foreground mt-0.5">{log.notes}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(log.created_at).toLocaleString("es-MX")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Worksheet (Captura en Sistema) */}
        <TabsContent value="worksheet" className="mt-6 space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Hoja de Trabajo y Datos del Proyecto</CardTitle>
              <CardDescription>Parámetros técnicos de corte, patronaje, telas y diseño</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order_number">Número de Proyecto / Pedido</Label>
                  <Input
                    id="order_number"
                    value={worksheetForm.order_number}
                    onChange={(e) => setWorksheetForm({ ...worksheetForm, order_number: e.target.value })}
                    placeholder="Ej. C26271"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mold_name">Molde / Modelo de Prenda</Label>
                  <Input
                    id="mold_name"
                    value={worksheetForm.mold_name}
                    onChange={(e) => setWorksheetForm({ ...worksheetForm, mold_name: e.target.value })}
                    placeholder="Ej. JERSEY E / SIN MANGA / CAPUCHA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fabric_name">Nombre de Tela (Ojo: Omitir en PDF cliente)</Label>
                  <Input
                    id="fabric_name"
                    value={worksheetForm.fabric_name}
                    onChange={(e) => setWorksheetForm({ ...worksheetForm, fabric_name: e.target.value })}
                    placeholder="Ej. PEPITO, SECORAPID, MICROFIBRA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="label_name">Etiqueta Requerida</Label>
                  <Input
                    id="label_name"
                    value={worksheetForm.label_name}
                    onChange={(e) => setWorksheetForm({ ...worksheetForm, label_name: e.target.value })}
                    placeholder="Ej. ATHLETIX, DECRETO70"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cutting_location">Destino / Decisión de Corte</Label>
                  <Select
                    value={worksheetForm.cutting_location}
                    onValueChange={(val) => setWorksheetForm({ ...worksheetForm, cutting_location: val })}
                  >
                    <SelectTrigger id="cutting_location">
                      <SelectValue placeholder="Seleccionar destino" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="taller_interno">Corte en Oficina / Taller Interno</SelectItem>
                      <SelectItem value="cortador_externo">Cortador Externo (Maquila)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maquila_name">Maquila / Taller Asignado</Label>
                  <Input
                    id="maquila_name"
                    value={worksheetForm.maquila_name}
                    onChange={(e) => setWorksheetForm({ ...worksheetForm, maquila_name: e.target.value })}
                    placeholder="Ej. Maquila 1, Maquila 2, Taller Central"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_delivery_date">Fecha Estimada de Entrega</Label>
                  <Input
                    id="target_delivery_date"
                    type="date"
                    value={worksheetForm.target_delivery_date}
                    onChange={(e) => setWorksheetForm({ ...worksheetForm, target_delivery_date: e.target.value })}
                  />
                </div>

              </div>

              {/* Design Image Uploaders Section for Step 3 and Step 8 */}
              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" /> Imágenes & Archivos de Diseño (Pasos 3 y 8)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sube directamente las imágenes del bosquejo digital (Paso 3) y del archivo formateado para impresión (Paso 8)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DesignImageUploader
                    label="Diseño Digital (Bosquejo Frente/Espalda)"
                    stepNumber={3}
                    value={worksheetForm.digital_design_url}
                    onChange={(url) => setWorksheetForm((prev) => ({ ...prev, digital_design_url: url }))}
                    folder="digital"
                    projectId={project.id}
                    saveWorksheetMutation={saveWorksheetMutation}
                  />

                  <DesignImageUploader
                    label="Diseño para Impresión (Plotter)"
                    stepNumber={8}
                    value={worksheetForm.print_design_url}
                    onChange={(url) => setWorksheetForm((prev) => ({ ...prev, print_design_url: url }))}
                    folder="print"
                    projectId={project.id}
                    saveWorksheetMutation={saveWorksheetMutation}
                  />
                </div>
              </div>

              {/* Sample test approval box */}
              <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sample_approved"
                    checked={worksheetForm.sample_approved}
                    onCheckedChange={(checked) => setWorksheetForm({ ...worksheetForm, sample_approved: !!checked })}
                  />
                  <Label htmlFor="sample_approved" className="font-bold text-sm cursor-pointer">
                    Muestra Física de Impresión & Color Aprobada por el Cliente
                  </Label>
                </div>

                {worksheetForm.sample_approved && (
                  <div className="pl-6 space-y-2">
                    <Label htmlFor="sample_plotter_name" className="text-xs">Plotter Utilizado para la Muestra</Label>
                    <Input
                      id="sample_plotter_name"
                      placeholder="Ej. Plotter 1 EPSON SureColor, Plotter 2"
                      value={worksheetForm.sample_plotter_name}
                      onChange={(e) => setWorksheetForm({ ...worksheetForm, sample_plotter_name: e.target.value })}
                      className="max-w-md"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specifications">Especificaciones Especiales / Observaciones de Producción</Label>
                <Textarea
                  id="specifications"
                  rows={4}
                  placeholder="Detalles sobre cuello, manga, cardigan, vivos o aclaraciones del cliente..."
                  value={worksheetForm.specifications}
                  onChange={(e) => setWorksheetForm({ ...worksheetForm, specifications: e.target.value })}
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-end border-t pt-4">
              <Button onClick={handleSaveWorksheet} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" /> Guardar Hoja de Trabajo
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tab 3: Sizes & Roster List */}
        <TabsContent value="sizes_roster" className="mt-6 space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Desglose de Tallas y Personalizado (Jugadores)</CardTitle>
              <CardDescription>Matriz de cantidades por género/categoría y lista con nombres y números</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Matrix Table */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-foreground">1. Matriz Generales de Tallas</h4>

                {/* Adult Sizes Table (Caballero & Dama) */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adultos (Caballero / Dama)</span>
                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground font-semibold uppercase">
                        <tr>
                          <th className="p-2.5 border-b">Categoría</th>
                          {ADULT_SIZES.map((sz) => (
                            <th key={sz} className="p-2.5 border-b text-center">{sz}</th>
                          ))}
                          <th className="p-2.5 border-b text-center">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(["Caballero", "Dama"] as const).map((cat) => {
                          const catMap = sizesBreakdown[cat] || {};
                          const catTotal = ADULT_SIZES.reduce((sum, sz) => sum + Number(catMap[sz] || 0), 0);

                          return (
                            <tr key={cat} className="border-b">
                              <td className="p-2.5 font-bold">{cat}</td>
                              {ADULT_SIZES.map((sz) => (
                                <td key={sz} className="p-1.5 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    className="h-8 w-14 text-center mx-auto text-xs"
                                    value={catMap[sz] || 0}
                                    onChange={(e) => handleSizeCountChange(cat, sz, parseInt(e.target.value) || 0)}
                                  />
                                </td>
                              ))}
                              <td className="p-2.5 font-bold text-center text-primary">{catTotal}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Child Sizes Table (Infantil) */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Infantil</span>
                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground font-semibold uppercase">
                        <tr>
                          <th className="p-2.5 border-b">Categoría</th>
                          {CHILD_SIZES.map((sz) => (
                            <th key={sz} className="p-2.5 border-b text-center">{sz}</th>
                          ))}
                          <th className="p-2.5 border-b text-center">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(["Infantil"] as const).map((cat) => {
                          const catMap = sizesBreakdown[cat] || {};
                          const catTotal = CHILD_SIZES.reduce((sum, sz) => sum + Number(catMap[sz] || 0), 0);

                          return (
                            <tr key={cat} className="border-b">
                              <td className="p-2.5 font-bold">{cat}</td>
                              {CHILD_SIZES.map((sz) => (
                                <td key={sz} className="p-1.5 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    className="h-8 w-14 text-center mx-auto text-xs"
                                    value={catMap[sz] || 0}
                                    onChange={(e) => handleSizeCountChange(cat, sz, parseInt(e.target.value) || 0)}
                                  />
                                </td>
                              ))}
                              <td className="p-2.5 font-bold text-center text-primary">{catTotal}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Roster Table */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">2. Lista Personalizada (Nombres & Números)</h4>
                  <Button size="sm" variant="outline" onClick={handleAddRosterEntry} className="gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Agregar Jugador
                  </Button>
                </div>

                {rosterList.length === 0 ? (
                  <div className="p-6 text-center border border-dashed rounded-xl bg-muted/20 text-muted-foreground text-xs">
                    No hay lista de personalizados agregada. Haz clic en "Agregar Jugador" si el proyecto incluye nombres/números.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground font-semibold uppercase">
                        <tr>
                          <th className="p-2.5 border-b">#</th>
                          <th className="p-2.5 border-b">Categoría</th>
                          <th className="p-2.5 border-b">Talla</th>
                          <th className="p-2.5 border-b">Nombre del Jugador</th>
                          <th className="p-2.5 border-b">Número</th>
                          <th className="p-2.5 border-b text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rosterList.map((entry, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/30">
                            <td className="p-2.5 font-mono text-muted-foreground">{idx + 1}</td>
                            <td className="p-1.5">
                              <Select
                                value={entry.category}
                                onValueChange={(val: any) => handleRosterChange(idx, "category", val)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-1.5">
                              <Select
                                value={entry.size}
                                onValueChange={(val) => handleRosterChange(idx, "size", val)}
                              >
                                <SelectTrigger className="h-8 w-20 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {getSizesForCategory(entry.category).map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-1.5">
                              <Input
                                className="h-8 text-xs"
                                placeholder="Ej. ALISA, LUCY"
                                value={entry.name}
                                onChange={(e) => handleRosterChange(idx, "name", e.target.value)}
                              />
                            </td>
                            <td className="p-1.5">
                              <Input
                                className="h-8 w-20 text-xs"
                                placeholder="Ej. 5, 10"
                                value={entry.number}
                                onChange={(e) => handleRosterChange(idx, "number", e.target.value)}
                              />
                            </td>
                            <td className="p-1.5 text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleRemoveRosterEntry(idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex justify-end border-t pt-4">
              <Button onClick={handleSaveWorksheet} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" /> Guardar Tallas y Roster
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tab 4: Orden de Corte */}
        <TabsContent value="cut_order" className="mt-6 space-y-6">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Orden de Corte para Taller / Cortador Externo</CardTitle>
                <CardDescription>Generador de orden con cantidades extra de respaldo</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                <Printer className="h-4 w-4" /> Imprimir Orden
              </Button>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Formated Printable Card */}
              <div className="p-6 border-2 border-primary/20 rounded-2xl bg-background space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <Badge variant="outline" className="font-mono text-xs mb-1">DECRETO SUBLIMADO</Badge>
                    <h3 className="text-2xl font-black uppercase text-foreground">ORDEN DE CORTE</h3>
                    <p className="text-xs text-muted-foreground">Fecha: {formatLocalDate(new Date())}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Modelo / Molde:</span>
                    <span className="font-bold text-foreground text-sm">{worksheetForm.mold_name || "Sin especificar"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-muted/40 p-4 rounded-xl">
                  <div>
                    <span className="text-muted-foreground block font-semibold">Cliente:</span>
                    <span className="font-bold text-foreground">{project.client?.name || "Sin cliente"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-semibold">Piezas Solicitadas:</span>
                    <span className="font-bold text-foreground">{totalPieces} pzs</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-semibold">Tela:</span>
                    <span className="font-bold text-foreground">{worksheetForm.fabric_name || "PEPITO"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-semibold">Cortador:</span>
                    <span className="font-bold text-foreground">{worksheetForm.cutting_location === "cortador_externo" ? "EXTERNO" : "TALLER INTERNO"}</span>
                  </div>
                </div>

                {/* Sizes Summary Breakdown Table */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cantidades Solicitadas por Talla</h4>

                  {/* Adult Sizes Summary */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Adultos (Caballero / Dama)</span>
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-xs text-center">
                        <thead className="bg-muted font-bold">
                          <tr>
                            <th className="p-2 text-left">Categoría</th>
                            {ADULT_SIZES.map((sz) => (
                              <th key={sz} className="p-2">{sz}</th>
                            ))}
                            <th className="p-2">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(["Caballero", "Dama"] as const).map((cat) => {
                            const catMap = sizesBreakdown[cat] || {};
                            const catTotal = ADULT_SIZES.reduce((sum, sz) => sum + Number(catMap[sz] || 0), 0);
                            return (
                              <tr key={cat} className="border-t">
                                <td className="p-2 font-bold text-left">{cat}</td>
                                {ADULT_SIZES.map((sz) => (
                                  <td key={sz} className="p-2 font-semibold">{catMap[sz] || 0}</td>
                                ))}
                                <td className="p-2 font-black text-primary">{catTotal}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Child Sizes Summary */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Infantil</span>
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-xs text-center">
                        <thead className="bg-muted font-bold">
                          <tr>
                            <th className="p-2 text-left">Categoría</th>
                            {CHILD_SIZES.map((sz) => (
                              <th key={sz} className="p-2">{sz}</th>
                            ))}
                            <th className="p-2">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(["Infantil"] as const).map((cat) => {
                            const catMap = sizesBreakdown[cat] || {};
                            const catTotal = CHILD_SIZES.reduce((sum, sz) => sum + Number(catMap[sz] || 0), 0);
                            return (
                              <tr key={cat} className="border-t">
                                <td className="p-2 font-bold text-left">{cat}</td>
                                {CHILD_SIZES.map((sz) => (
                                  <td key={sz} className="p-2 font-semibold">{catMap[sz] || 0}</td>
                                ))}
                                <td className="p-2 font-black text-primary">{catTotal}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-1">
                  <h5 className="font-bold text-xs text-amber-900 dark:text-amber-300 uppercase">Observaciones & Instrucciones de Corte</h5>
                  <p className="text-xs text-amber-800 dark:text-amber-400">
                    {worksheetForm.specifications || "Cortar al hilo, señalar piquetes del centro en frente, espalda y mangas."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Finances & Payments Status */}
        <TabsContent value="finances" className="mt-6 space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Control Financiero del Proyecto</CardTitle>
              <CardDescription>Verificación del 50% de anticipo y 50% de finiquito</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">Anticipo (50%)</span>
                    <Badge variant={paidPercentage >= 50 ? "default" : "outline"} className={paidPercentage >= 50 ? "bg-green-600" : ""}>
                      {paidPercentage >= 50 ? "COMPLETADO" : "PENDIENTE"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Requerido para autorizar inicio de corte y producción.</p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">Finiquito (50%)</span>
                    <Badge variant={remainingDebt === 0 ? "default" : "outline"} className={remainingDebt === 0 ? "bg-green-600" : ""}>
                      {remainingDebt === 0 ? "PAGADO EN TOTALIDAD" : "PENDIENTE AL ENTREGAR"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Requerido para liberar la entrega final al cliente.</p>
                </div>
              </div>

              {/* Payments List */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-foreground">Pagos Registrados ({projectPayments.length})</h4>
                {projectPayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No se han registrado pagos para este proyecto.</p>
                ) : (
                  <div className="space-y-2">
                    {projectPayments.map((pmt) => (
                      <div key={pmt.id} className="p-3 border rounded-xl bg-card flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-foreground">{formatCurrency(pmt.amount)}</span> —{" "}
                          <span className="text-muted-foreground uppercase font-semibold">{pmt.method}</span>
                          {pmt.folio && <span className="ml-2 font-mono text-[10px] text-muted-foreground">(Folio: {pmt.folio})</span>}
                        </div>
                        <span className="text-muted-foreground">{new Date(pmt.created_at).toLocaleDateString("es-MX")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ImportProjectModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        clients={clients}
        projects={projects}
        targetProjectId={project.id}
        onImportNewProject={async () => {}}
        onImportUpdateProject={handleImportUpdateCurrentProject}
      />
    </div>
  );
}
