import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Plus,
  Mail,
  Phone,
  ThumbsUp,
  ChevronRight,
  MoreVertical,
  BarChart3,
  Calendar,
  ExternalLink,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { sileo } from "sileo";
import { useFinanceClients } from "@/modules/finances/hooks";

interface ContadorItem {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: "Activo" | "Inactivo";
  assignedClients: number;
  completed: number;
  inProcess: number;
  atRisk: number;
  delayed: number;
  complianceRate: number;
}

const baseContadoresTeam = [
  { id: "1", name: "Alejandra Díaz", role: "Contadora Fiscalista", email: "alejandra@cardenasycardenas.mx", phone: "81 2010 3796", status: "Activo" as const },
  { id: "2", name: "Brandon Ruíz", role: "Contador de Operaciones", email: "brandon@cardenasycardenas.mx", phone: "81 1481 9559", status: "Activo" as const },
  { id: "3", name: "Carlos Martinez", role: "Contador Senior", email: "carlos@cardenasycardenas.mx", phone: "81 2686 9514", status: "Activo" as const },
  { id: "4", name: "Elder Corpus", role: "Contador General", email: "elder@cardenasycardenas.mx", phone: "81 1173 3652", status: "Activo" as const },
  { id: "5", name: "Marisol Sinahi", role: "Contadora Fiscalista", email: "marisol@cardenasycardenas.mx", phone: "81 1241 8596", status: "Activo" as const },
  { id: "6", name: "Rodrigo Cerda", role: "Contador Senior", email: "rodrigo@cardenasycardenas.mx", phone: "81 1905 5308", status: "Activo" as const },
  { id: "7", name: "Rubí Jimenez", role: "Contadora de Operaciones", email: "rubi@cardenasycardenas.mx", phone: "81 1810 0295", status: "Activo" as const },
  { id: "8", name: "Vero Aguillon", role: "Contadora Senior", email: "vero@cardenasycardenas.mx", phone: "81 8334 4376", status: "Activo" as const },
];

export function Contadores() {
  const { data: clients = [] } = useFinanceClients();

  const contadores: ContadorItem[] = useMemo(() => {
    return baseContadoresTeam.map((c) => {
      const assigned = clients.filter((client) => {
        const acc = (client.assigned_accountant || "").toLowerCase();
        const firstName = c.name.toLowerCase().split(" ")[0];
        return acc.includes(firstName) || acc.includes(c.name.toLowerCase());
      });
      const assignedCount = assigned.length;
      const completed = Math.round(assignedCount * 0.78);
      const inProcess = Math.round(assignedCount * 0.16);
      const atRisk = Math.round(assignedCount * 0.04);
      const delayed = Math.max(0, assignedCount - completed - inProcess - atRisk);
      const complianceRate = assignedCount > 0 ? Math.round((completed / assignedCount) * 100) : 100;

      return {
        ...c,
        assignedClients: assignedCount,
        completed,
        inProcess,
        atRisk,
        delayed,
        complianceRate,
      };
    });
  }, [clients]);

  const [selectedContadorId, setSelectedContadorId] = useState<string>("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workloadFilter, setWorkloadFilter] = useState("all");
  const [sortBy, setSortBy] = useState("clients");
  const [activeTab, setActiveTab] = useState<"contador" | "cliente">("contador");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const selectedContador = useMemo(() => {
    return contadores.find((c) => c.id === selectedContadorId) || contadores[0] || baseContadoresTeam[0];
  }, [contadores, selectedContadorId]);

  const selectedContadorClients = useMemo(() => {
    if (!selectedContador) return [];
    return clients.filter((client) => {
      const acc = (client.assigned_accountant || "").toLowerCase();
      const firstName = selectedContador.name.toLowerCase().split(" ")[0];
      return acc.includes(firstName) || acc.includes(selectedContador.name.toLowerCase());
    });
  }, [clients, selectedContador]);

  const filteredContadores = useMemo(() => {
    return contadores
      .filter((c) => {
        const matchSearch =
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === "all" || c.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "clients") return b.assignedClients - a.assignedClients;
        if (sortBy === "compliance") return b.complianceRate - a.complianceRate;
        return 0;
      });
  }, [contadores, searchQuery, statusFilter, sortBy]);

  const workloadChartData = useMemo(() => {
    return contadores.map((c) => ({
      name: c.name.split(" ")[0],
      completados: c.completed,
      pendientes: c.assignedClients - c.completed,
    }));
  }, [contadores]);

  const donutData = [
    { name: "Completados", value: selectedContador.completed, color: "#10b981" },
    { name: "En proceso", value: selectedContador.inProcess, color: "#3b82f6" },
    { name: "En riesgo", value: selectedContador.atRisk, color: "#f59e0b" },
    { name: "Atrasados", value: selectedContador.delayed, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contadores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestión de carga de trabajo y desempeño del equipo contable
          </p>
        </div>

        <Button
          size="sm"
          className="bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-2 shadow-xs"
          onClick={() => setIsAssignModalOpen(true)}
        >
          <Plus className="h-4 w-4" /> Asignar clientes
        </Button>
      </div>

      {/* Row 1: 6 Top Metric Cards (Image 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Contadores activos</p>
              <p className="text-xl font-bold text-foreground leading-tight">6</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground font-medium">↑ 0% vs. mes anterior</p>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Clientes asignados</p>
              <p className="text-xl font-bold text-foreground leading-tight">186</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-600 font-medium">↑ 5.6% vs. mes anterior</p>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Contabilidades completadas</p>
              <p className="text-xl font-bold text-foreground leading-tight">142</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={76} indicatorClassName="bg-emerald-500" className="h-1.5" />
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">76% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">En proceso</p>
              <p className="text-xl font-bold text-foreground leading-tight">31</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={17} indicatorClassName="bg-blue-500" className="h-1.5" />
            <p className="text-[10px] text-blue-600 font-medium mt-0.5">17% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">En riesgo</p>
              <p className="text-xl font-bold text-foreground leading-tight">8</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={4} indicatorClassName="bg-amber-500" className="h-1.5" />
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">4% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Atrasadas</p>
              <p className="text-xl font-bold text-foreground leading-tight">5</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={3} indicatorClassName="bg-rose-500" className="h-1.5" />
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">3% del total</p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Left List + Right Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Tabs, Filters, Table and Workload Chart */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-border/80 shadow-xs">
            {/* View Switcher Tabs */}
            <div className="p-3 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === "contador" ? "default" : "ghost"}
                  size="sm"
                  className={`h-8 text-xs ${activeTab === "contador" ? "bg-[#1e3a5f] text-white" : ""}`}
                  onClick={() => setActiveTab("contador")}
                >
                  Vista por contador
                </Button>
                <Button
                  variant={activeTab === "cliente" ? "default" : "ghost"}
                  size="sm"
                  className={`h-8 text-xs ${activeTab === "cliente" ? "bg-[#1e3a5f] text-white" : ""}`}
                  onClick={() => setActiveTab("cliente")}
                >
                  Vista por cliente
                </Button>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="p-3 bg-muted/20 border-b border-border/60 flex flex-wrap items-center gap-2.5 text-xs">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar contador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-card"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs bg-card">
                  <span className="text-muted-foreground mr-1">Estatus:</span>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Activo">Activos</SelectItem>
                  <SelectItem value="Inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={workloadFilter} onValueChange={setWorkloadFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-card">
                  <span className="text-muted-foreground mr-1">Carga:</span>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="high">Alta (&gt;35)</SelectItem>
                  <SelectItem value="normal">Normal (20-35)</SelectItem>
                  <SelectItem value="low">Baja (&lt;20)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[170px] h-8 text-xs bg-card">
                  <span className="text-muted-foreground mr-1">Ordenar por:</span>
                  <SelectValue placeholder="Clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clients">Clientes asignados</SelectItem>
                  <SelectItem value="compliance">Cumplimiento %</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contadores Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 text-[11px] text-muted-foreground hover:bg-muted/30">
                    <TableHead className="py-2.5">Contador</TableHead>
                    <TableHead className="py-2.5 text-center">Clientes asignados</TableHead>
                    <TableHead className="py-2.5 text-center text-emerald-600">Completados</TableHead>
                    <TableHead className="py-2.5 text-center text-blue-600">En proceso</TableHead>
                    <TableHead className="py-2.5 text-center text-amber-600">En riesgo</TableHead>
                    <TableHead className="py-2.5 text-center text-rose-600">Atrasados</TableHead>
                    <TableHead className="py-2.5 text-center">Cumplimiento</TableHead>
                    <TableHead className="py-2.5 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredContadores.map((c) => {
                    const isSelected = selectedContador.id === c.id;
                    return (
                      <TableRow
                        key={c.id}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 font-medium border-l-2 border-l-primary" : "hover:bg-muted/40"
                        }`}
                        onClick={() => setSelectedContadorId(c.id)}
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-[#1e3a5f] text-white font-semibold text-xs">
                                {c.name.split(" ").map((n) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-foreground text-xs leading-tight">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">{c.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-foreground">
                          {c.assignedClients}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-emerald-600">
                          {c.completed}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-blue-600">
                          {c.inProcess}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-amber-600">
                          {c.atRisk}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-rose-600">
                          {c.delayed}
                        </TableCell>
                        <TableCell className="text-center min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-foreground w-8">
                              {c.complianceRate}%
                            </span>
                            <Progress
                              value={c.complianceRate}
                              indicatorClassName={
                                c.complianceRate >= 80
                                  ? "bg-emerald-500"
                                  : c.complianceRate >= 70
                                  ? "bg-blue-500"
                                  : "bg-amber-500"
                              }
                              className="flex-1 h-1.5"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Carga de trabajo Bar Chart */}
          <Card className="border-border/80 shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Carga de trabajo</h3>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#1e3a5f]" />
                  <span className="text-muted-foreground">Completados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-sky-300" />
                  <span className="text-muted-foreground">En proceso + pendientes</span>
                </div>
              </div>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="completados" stackId="a" fill="#1e3a5f" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pendientes" stackId="a" fill="#7dd3fc" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right Column: Selected Contador Profile & Deliverables */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selected Contador Profile Card */}
          <Card className="border-border/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-muted/20 border-b border-border/60">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback className="bg-[#1e3a5f] text-white font-bold text-base">
                    {selectedContador.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground leading-tight">
                      {selectedContador.name}
                    </h3>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                      ● Activo
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedContador.role}</p>
                  <div className="mt-2 text-[11px] text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{selectedContador.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{selectedContador.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className="p-4 space-y-4">
              <Tabs defaultValue="resumen">
                <TabsList className="w-full bg-muted/40 h-8">
                  <TabsTrigger value="resumen" className="flex-1 text-xs">Resumen</TabsTrigger>
                  <TabsTrigger value="clientes" className="flex-1 text-xs">
                    Clientes ({selectedContador.assignedClients})
                  </TabsTrigger>
                  <TabsTrigger value="actividad" className="flex-1 text-xs">Actividad</TabsTrigger>
                  <TabsTrigger value="documentos" className="flex-1 text-xs">Documentos</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="pt-3 space-y-4">
                  {/* Donut Chart: Cumplimiento Mensual */}
                  <div className="flex items-center justify-between">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={48}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {donutData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-base font-bold text-foreground">
                          {selectedContador.complianceRate}%
                        </span>
                        <span className="text-[8px] text-muted-foreground uppercase leading-none">
                          Cumplimiento
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs flex-1 pl-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-muted-foreground text-[11px]">Completados</span>
                        </div>
                        <span className="font-bold text-foreground">{selectedContador.completed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="text-muted-foreground text-[11px]">En proceso</span>
                        </div>
                        <span className="font-bold text-foreground">{selectedContador.inProcess}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          <span className="text-muted-foreground text-[11px]">En riesgo</span>
                        </div>
                        <span className="font-bold text-foreground">{selectedContador.atRisk}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          <span className="text-muted-foreground text-[11px]">Atrasados</span>
                        </div>
                        <span className="font-bold text-foreground">{selectedContador.delayed}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Callout */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <ThumbsUp className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-800 dark:text-emerald-400">Buen desempeño</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                        El contador mantiene un cumplimiento arriba del promedio institucional.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="clientes" className="pt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-semibold text-foreground text-xs">
                      Cartera asignada ({selectedContadorClients.length})
                    </span>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" asChild>
                      <Link to="/clients">Ver todos en padrón →</Link>
                    </Button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 divide-y divide-border/60">
                    {selectedContadorClients.length === 0 ? (
                      <p className="text-muted-foreground italic text-center py-4">
                        Sin clientes asignados actualmente.
                      </p>
                    ) : (
                      selectedContadorClients.map((client) => (
                        <div key={client.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate text-xs" title={client.name}>
                              {client.name}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span>{client.tax_id_rfc || "Sin RFC"}</span>
                              {client.ciec && <span>• CIEC: {client.ciec}</span>}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" asChild title="Ver ficha">
                            <Link to={`/clients/${client.id}`}>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Link>
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Card>

          {/* Clientes próximos a vencer Card */}
          <Card className="border-border/80 shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Clientes próximos a vencer</h3>
              </div>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                Ver todos →
              </Button>
            </div>

            <div className="divide-y divide-border/60 text-xs">
              {selectedContadorClients.length === 0 ? (
                <p className="text-muted-foreground italic py-3 text-center">
                  Sin entregables pendientes registrados.
                </p>
              ) : (
                selectedContadorClients.slice(0, 4).map((client, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between hover:bg-muted/20 px-1 rounded transition-colors">
                    <div>
                      <p className="font-medium text-foreground truncate max-w-[180px]">{client.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {idx % 2 === 0 ? "17 Oct 2026" : "20 Oct 2026"} • {idx % 2 === 0 ? "Declaración Mensual" : "Cálculo DIOT"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          idx % 2 === 0
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {idx % 2 === 0 ? "En proceso" : "En riesgo"}
                      </Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Assign Clients Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Clientes a Contador</DialogTitle>
            <DialogDescription>
              Selecciona el contador responsable y los clientes a reasignar en la cartera del despacho.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Contador asignado</label>
              <Select defaultValue={selectedContador.id}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Selecciona un contador" />
                </SelectTrigger>
                <SelectContent>
                  {contadores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Notas de asignación</label>
              <Input placeholder="Ej. Reasignación temporal por vacaciones o carga fiscal" className="text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
              onClick={() => {
                sileo.success({ title: "Asignación actualizada con éxito" });
                setIsAssignModalOpen(false);
              }}
            >
              Guardar Asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
