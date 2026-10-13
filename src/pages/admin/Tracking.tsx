import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useProjects } from "@/modules/finances/hooks";
import { DECRETO_PROCESS_STAGES } from "@/modules/finances/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Activity,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  X,
  Filter,
} from "lucide-react";

export function Tracking() {
  const { data: projects = [] } = useProjects();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (p.name || "").toLowerCase().includes(term) ||
        (p.client?.name || "").toLowerCase().includes(term) ||
        (p.order_number || "").toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (statusFilter === "completed" && !(p.status === "completed" || p.current_stage === "finiquito")) return false;
      if (statusFilter === "in_progress" && (p.status === "completed" || p.current_stage === "finiquito")) return false;
      if (stageFilter !== "all" && p.current_stage !== stageFilter) return false;
      return true;
    });
  }, [projects, searchTerm, statusFilter, stageFilter]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStageFilter("all");
    setCurrentPage(1);
  };

  const getStageProgress = (currentStageId?: string) => {
    if (!currentStageId) return { step: 1, percent: 7 };
    const index = DECRETO_PROCESS_STAGES.findIndex((s) => s.id === currentStageId);
    if (index === -1) return { step: 1, percent: 7 };
    const step = index + 1;
    const percent = Math.round((step / DECRETO_PROCESS_STAGES.length) * 100);
    return { step, percent };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" /> Seguimiento en Tiempo Real
          </h2>
          <p className="text-muted-foreground mt-1">
            Control de avance de pedidos, etapas completadas y fechas límite de entrega.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/line">
              <Layers className="mr-2 h-4 w-4" /> Ver Tablero de Línea
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/orders">
              <ChevronRight className="mr-2 h-4 w-4" /> Órdenes de Trabajo
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Proyectos Monitoreados</p>
              <p className="text-2xl font-bold">{projects.length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">En Fabricación Activa</p>
              <p className="text-2xl font-bold">
                {projects.filter((p) => p.status !== "completed" && p.current_stage !== "finiquito").length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Finalizados y Entregados</p>
              <p className="text-2xl font-bold">
                {projects.filter((p) => p.status === "completed" || p.current_stage === "finiquito").length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-card p-4 rounded-lg border border-border">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, cliente o proyecto..."
            className="pl-9 pr-8"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todas las etapas</option>
              {DECRETO_PROCESS_STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setStatusFilter("all");
              setCurrentPage(1);
            }}
          >
            Todos ({projects.length})
          </Button>
          <Button
            variant={statusFilter === "in_progress" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setStatusFilter("in_progress");
              setCurrentPage(1);
            }}
          >
            En Proceso
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setStatusFilter("completed");
              setCurrentPage(1);
            }}
          >
            Completados
          </Button>

          {(searchTerm || statusFilter !== "all" || stageFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Tracking Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden space-y-4 p-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código / Proyecto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Etapa Actual</TableHead>
              <TableHead>Progreso General</TableHead>
              <TableHead>Piezas</TableHead>
              <TableHead>Fecha Entrega</TableHead>
              <TableHead className="text-right">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No se encontraron proyectos para este criterio.
                </TableCell>
              </TableRow>
            ) : (
              paginatedProjects.map((project) => {
                const { step, percent } = getStageProgress(project.current_stage);
                const currentStageObj = DECRETO_PROCESS_STAGES.find((s) => s.id === project.current_stage);
                const pieces = project.roster_list?.length || 0;

                return (
                  <TableRow key={project.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="font-semibold text-primary font-mono text-xs">
                        {project.order_number || `PRJ-${project.id.slice(0, 6)}`}
                      </div>
                      <div className="font-medium text-sm text-foreground">{project.name}</div>
                    </TableCell>
                    <TableCell className="text-sm">{project.client?.name || "Cliente General"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {currentStageObj ? currentStageObj.name : "Solicitud"}
                      </Badge>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Paso {step} de {DECRETO_PROCESS_STAGES.length}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent === 100
                                ? "bg-emerald-500"
                                : percent > 50
                                ? "bg-primary"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-9 text-right">{percent}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {pieces > 0 ? `${pieces} pzs` : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {project.target_delivery_date ? (
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(project.target_delivery_date).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Por definir</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/projects">
                          Ver <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {filteredProjects.length > 0 && (
          <div className="px-3 pb-3">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredProjects.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
