import { useState } from "react";
import { Link } from "react-router-dom";
import { useProjects, useUpdateProjectStage } from "@/modules/finances/hooks";
import { useActiveWorkOrders } from "@/hooks/useWorkOrders";
import { DECRETO_PROCESS_STAGES, type DecretoProcessStage } from "@/modules/finances/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Scissors,
  Printer,
  Shirt,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Filter,
  ArrowRight,
  Eye,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { sileo } from "sileo";

export function ProductionLine() {
  const { data: projects = [], refetch: refetchProjects } = useProjects();
  const { data: workOrders = [], refetch: refetchOrders } = useActiveWorkOrders();
  const updateStageMutation = useUpdateProjectStage();
  const [searchTerm, setSearchTerm] = useState("");
  const [macroFilter, setMacroFilter] = useState<string>("all");

  const macroPhases = [
    { key: "all", label: "Todas las Fases" },
    { key: "Solicitud & Captura", label: "1. Captura & Solicitud" },
    { key: "Diseño & Aprobación", label: "2. Diseño & Aprobación" },
    { key: "Anticipo & Corte", label: "3. Anticipo & Corte" },
    { key: "Impresión & Sublimado", label: "4. Impresión & Sublimado" },
    { key: "Costura & Control", label: "5. Costura & Acabado" },
    { key: "Entrega & Finiquito", label: "6. Entrega & Finiquito" },
  ];

  const filteredStages = DECRETO_PROCESS_STAGES.filter((stage) => {
    if (macroFilter === "all") return true;
    return stage.macroPhase === macroFilter;
  });

  const filteredProjects = projects.filter((p) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = (p.name || "").toLowerCase().includes(term);
    const clientMatch = (p.client?.name || "").toLowerCase().includes(term);
    const codeMatch = (p.order_number || "").toLowerCase().includes(term);
    return nameMatch || clientMatch || codeMatch;
  });

  const getStageIcon = (stageId: DecretoProcessStage) => {
    switch (stageId) {
      case "corte":
        return <Scissors className="h-4 w-4 text-amber-500" />;
      case "impresion":
      case "diseno_impresion":
        return <Printer className="h-4 w-4 text-blue-500" />;
      case "costura":
      case "sublimado":
        return <Shirt className="h-4 w-4 text-purple-500" />;
      case "revision_final":
      case "entrega":
      case "finiquito":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  const handleAdvanceStage = async (projectId: string, currentStage: DecretoProcessStage) => {
    const currentIndex = DECRETO_PROCESS_STAGES.findIndex((s) => s.id === currentStage);
    if (currentIndex < DECRETO_PROCESS_STAGES.length - 1) {
      const nextStage = DECRETO_PROCESS_STAGES[currentIndex + 1].id;
      try {
        await updateStageMutation.mutateAsync({
          id: projectId,
          stage: nextStage,
          notes: `Avanzado a ${DECRETO_PROCESS_STAGES[currentIndex + 1].name} desde Línea de Producción`,
        });
        sileo.success({ title: "Etapa actualizada con éxito" });
      } catch {
        sileo.error({ title: "Error al actualizar etapa" });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" /> Línea de Producción
          </h2>
          <p className="text-muted-foreground mt-1">
            Visualización y control del flujo de fabricación por etapas en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchProjects();
              refetchOrders();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button size="sm" asChild>
            <Link to="/projects">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Proyecto
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Proyectos en Fabricación</p>
              <p className="text-2xl font-bold">
                {projects.filter((p) => p.status !== "completed" && p.current_stage !== "finiquito").length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">En Corte / Sublimado</p>
              <p className="text-2xl font-bold">
                {projects.filter((p) => ["corte", "impresion", "sublimado"].includes(p.current_stage || "")).length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Scissors className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">En Costura & Acabado</p>
              <p className="text-2xl font-bold">
                {projects.filter((p) => ["costura", "revision_final"].includes(p.current_stage || "")).length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Shirt className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Órdenes de Trabajo Activas</p>
              <p className="text-2xl font-bold">{workOrders.length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-lg border border-border">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por proyecto, cliente o folio..."
            className="pl-9 pr-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {macroPhases.map((phase) => (
            <Button
              key={phase.key}
              variant={macroFilter === phase.key ? "default" : "outline"}
              size="sm"
              className="text-xs shrink-0"
              onClick={() => setMacroFilter(phase.key)}
            >
              {phase.label}
            </Button>
          ))}
          {(searchTerm || macroFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setMacroFilter("all");
              }}
              className="text-xs px-2 text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1200px]">
          {filteredStages.map((stage) => {
            const stageProjects = filteredProjects.filter((p) => (p.current_stage || "solicitud") === stage.id);

            return (
              <div
                key={stage.id}
                className="flex-1 min-w-[280px] max-w-[320px] bg-muted/40 rounded-lg p-3 border border-border/70 flex flex-col"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    {getStageIcon(stage.id)}
                    <div>
                      <h4 className="font-semibold text-sm leading-tight">{stage.name}</h4>
                      <span className="text-[11px] text-muted-foreground">Etapa {stage.stepNumber}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {stageProjects.length}
                  </Badge>
                </div>

                {/* Stage Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {stageProjects.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-md">
                      Sin proyectos aquí
                    </div>
                  ) : (
                    stageProjects.map((project) => {
                      const pieces = project.roster_list?.length || 0;
                      return (
                        <Card
                          key={project.id}
                          className="bg-card shadow-sm hover:shadow-md transition-shadow border-border"
                        >
                          <CardHeader className="p-3 pb-1">
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-xs font-mono font-semibold text-primary">
                                {project.order_number || `PRJ-${project.id.slice(0, 6)}`}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {pieces > 0 ? `${pieces} pzs` : "A definir"}
                              </Badge>
                            </div>
                            <CardTitle className="text-sm font-bold line-clamp-1 mt-1">
                              {project.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {project.client?.name || "Cliente general"}
                            </p>
                          </CardHeader>
                          <CardContent className="p-3 pt-2 space-y-2">
                            {project.target_delivery_date && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Entrega: {new Date(project.target_delivery_date).toLocaleDateString()}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                                <Link to="/projects">
                                  <Eye className="h-3.5 w-3.5 mr-1" /> Ver Detalle
                                </Link>
                              </Button>
                              {stage.stepNumber < DECRETO_PROCESS_STAGES.length && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-primary"
                                  disabled={updateStageMutation.isPending}
                                  onClick={() => handleAdvanceStage(project.id, stage.id)}
                                >
                                  Siguiente <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
