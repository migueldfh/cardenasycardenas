import { useState } from "react";
import { Link } from "react-router-dom";
import { useProjects } from "@/modules/finances/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  History,
  Search,
  CheckCircle2,
  Layers,
  TrendingUp,
  Package,
  X,
} from "lucide-react";

export function ProductionHistory() {
  const { data: projects = [] } = useProjects();
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const completedProjects = projects.filter(
    (p) => p.status === "completed" || p.current_stage === "finiquito" || p.current_stage === "entrega"
  );

  const totalPiecesManufactured = completedProjects.reduce(
    (acc, p) => acc + (p.roster_list?.length || 0),
    0
  );

  const filtered = completedProjects.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (p.name || "").toLowerCase().includes(term) ||
      (p.client?.name || "").toLowerCase().includes(term) ||
      (p.order_number || "").toLowerCase().includes(term);

    const matchesStage =
      stageFilter === "all" ||
      (stageFilter === "completed" && p.status === "completed") ||
      p.current_stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8 text-primary" /> Historial de Producción
          </h2>
          <p className="text-muted-foreground mt-1">
            Registro histórico de proyectos y órdenes finalizadas, entregadas y liquidadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/tracking">
              <Layers className="mr-2 h-4 w-4" /> Ir a Seguimiento
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/projects">
              <Package className="mr-2 h-4 w-4" /> Ver Proyectos
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Proyectos Completados</p>
              <p className="text-2xl font-bold">{completedProjects.length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Prendas / Piezas Producidas</p>
              <p className="text-2xl font-bold">{totalPiecesManufactured.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Cumplimiento de Entrega</p>
              <p className="text-2xl font-bold">98.5%</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-4 rounded-lg border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en el histórico por cliente, folio o proyecto..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={stageFilter}
            onValueChange={(val) => {
              setStageFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las etapas</SelectItem>
              <SelectItem value="entrega">En entrega</SelectItem>
              <SelectItem value="finiquito">En finiquito</SelectItem>
              <SelectItem value="completed">Concluido</SelectItem>
            </SelectContent>
          </Select>
          {(searchTerm || stageFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStageFilter("all");
                setCurrentPage(1);
              }}
              className="h-10 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código / Proyecto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Piezas</TableHead>
              <TableHead>Etapa de Cierre</TableHead>
              <TableHead>Fecha de Registro</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No hay proyectos en el historial con este filtro.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((item) => {
                const pieces = item.roster_list?.length || 0;
                return (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="font-semibold text-primary font-mono text-xs">
                        {item.order_number || `PRJ-${item.id.slice(0, 6)}`}
                      </div>
                      <div className="font-medium text-sm text-foreground">{item.name}</div>
                    </TableCell>
                    <TableCell className="text-sm">{item.client?.name || "Cliente General"}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {pieces > 0 ? `${pieces} pzs` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.current_stage || "Completado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">
                        Entregado / Concluido
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/projects">Ver Ficha</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
}
