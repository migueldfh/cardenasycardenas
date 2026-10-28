import React, { useState, useMemo, useEffect } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Plus,
  UserPlus,
  Mail,
  Phone,
  ThumbsUp,
  ChevronRight,
  MoreVertical,
  BarChart3,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Lock,
  Loader2,
  Share2,
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
import { useFinanceClients, useActivityLogs } from "@/modules/finances/hooks";
import { formatActivityLog, logActivity } from "@/api/logs";
import {
  fetchContadoresTeam,
  createAccountantUser,
  DEFAULT_ACCOUNTANT_PASSWORD,
  generateAccountantWelcomeMessage,
  BASE_CONTADORES_TEAM,
  type ContadorTeamMember,
} from "@/api/users";

interface ContadorItem extends ContadorTeamMember {
  assignedClients: number;
  completed: number;
  inProcess: number;
  atRisk: number;
  delayed: number;
  complianceRate: number;
}

export function Contadores() {
  const { data: clients = [] } = useFinanceClients();
  const { data: rawLogs = [] } = useActivityLogs(60);

  // 1. Team State: initialized with base team, enriched from Supabase / LocalStorage
  const [teamMembers, setTeamMembers] = useState<ContadorTeamMember[]>(BASE_CONTADORES_TEAM);

  useEffect(() => {
    let isMounted = true;
    async function loadTeam() {
      try {
        const team = await fetchContadoresTeam();
        if (isMounted && team.length > 0) {
          setTeamMembers(team);
        }
      } catch (e) {
        console.warn("Error fetching contadores team:", e);
      }
    }
    loadTeam();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Computed Contadores with metrics per accountant
  const contadores: ContadorItem[] = useMemo(() => {
    return teamMembers.map((c) => {
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
  }, [teamMembers, clients]);

  // Dynamic Dashboard Totals
  const overallMetrics = useMemo(() => {
    const totalActive = contadores.filter((c) => c.status === "Activo").length;
    const totalClients = contadores.reduce((sum, c) => sum + c.assignedClients, 0);
    const totalCompleted = contadores.reduce((sum, c) => sum + c.completed, 0);
    const totalInProcess = contadores.reduce((sum, c) => sum + c.inProcess, 0);
    const totalAtRisk = contadores.reduce((sum, c) => sum + c.atRisk, 0);
    const totalDelayed = contadores.reduce((sum, c) => sum + c.delayed, 0);
    const completedRate = totalClients > 0 ? Math.round((totalCompleted / totalClients) * 100) : 100;
    const inProcessRate = totalClients > 0 ? Math.round((totalInProcess / totalClients) * 100) : 0;
    const atRiskRate = totalClients > 0 ? Math.round((totalAtRisk / totalClients) * 100) : 0;
    const delayedRate = totalClients > 0 ? Math.round((totalDelayed / totalClients) * 100) : 0;

    return {
      totalActive,
      totalClients,
      totalCompleted,
      totalInProcess,
      totalAtRisk,
      totalDelayed,
      completedRate,
      inProcessRate,
      atRiskRate,
      delayedRate,
    };
  }, [contadores]);

  const [selectedContadorId, setSelectedContadorId] = useState<string>("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workloadFilter, setWorkloadFilter] = useState("all");
  const [sortBy, setSortBy] = useState("clients");
  const [activeTab, setActiveTab] = useState<"contador" | "cliente">("contador");

  // Modals & Forms State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showDefaultPassword, setShowDefaultPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    roleTitle: "Contadora Fiscalista",
    status: "Activo" as "Activo" | "Inactivo",
    defaultPassword: DEFAULT_ACCOUNTANT_PASSWORD,
  });

  const [createdResult, setCreatedResult] = useState<{
    contador: ContadorTeamMember;
    defaultPassword: string;
    welcomeMessage: string;
  } | null>(null);

  const selectedContador = useMemo(() => {
    return contadores.find((c) => c.id === selectedContadorId) || contadores[0] || BASE_CONTADORES_TEAM[0];
  }, [contadores, selectedContadorId]);

  const selectedContadorClients = useMemo(() => {
    if (!selectedContador) return [];
    return clients.filter((client) => {
      const acc = (client.assigned_accountant || "").toLowerCase();
      const firstName = selectedContador.name.toLowerCase().split(" ")[0];
      return acc.includes(firstName) || acc.includes(selectedContador.name.toLowerCase());
    });
  }, [clients, selectedContador]);

  const selectedContadorLogs = useMemo(() => {
    const formatted = rawLogs.map((l) => formatActivityLog(l));
    if (!selectedContador) return formatted.slice(0, 12);
    const firstName = selectedContador.name.toLowerCase().split(" ")[0];
    const clientIds = new Set(selectedContadorClients.map((c) => c.id));
    const clientNames = new Set(selectedContadorClients.map((c) => (c.name || "").toLowerCase()));

    const matched = formatted.filter((item) => {
      const actorMatch = item.actorName.toLowerCase().includes(firstName);
      const idMatch = item.clientId && clientIds.has(item.clientId);
      const nameMatch = item.clientName && clientNames.has(item.clientName.toLowerCase());
      return actorMatch || idMatch || nameMatch;
    });

    return matched.length > 0 ? matched.slice(0, 15) : formatted.slice(0, 10);
  }, [rawLogs, selectedContador, selectedContadorClients]);

  const filteredContadores = useMemo(() => {
    return contadores
      .filter((c) => {
        const matchSearch =
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === "all" || c.status === statusFilter;
        let matchWorkload = true;
        if (workloadFilter === "high") matchWorkload = c.assignedClients > 35;
        if (workloadFilter === "normal") matchWorkload = c.assignedClients >= 20 && c.assignedClients <= 35;
        if (workloadFilter === "low") matchWorkload = c.assignedClients < 20;

        return matchSearch && matchStatus && matchWorkload;
      })
      .sort((a, b) => {
        if (sortBy === "clients") return b.assignedClients - a.assignedClients;
        if (sortBy === "compliance") return b.complianceRate - a.complianceRate;
        return 0;
      });
  }, [contadores, searchQuery, statusFilter, workloadFilter, sortBy]);

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

  const copyToClipboard = (text: string, key: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      sileo.success({ title: `${label} copiado al portapapeles` });
      setTimeout(() => setCopiedKey(null), 3000);
    }
  };

  const handleCreateContador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName.trim()) {
      sileo.error({ title: "El nombre del contador es obligatorio" });
      return;
    }
    if (!createForm.email.trim() || !createForm.email.includes("@")) {
      sileo.error({ title: "Ingresa un correo institucional válido" });
      return;
    }

    setIsCreating(true);
    try {
      const res = await createAccountantUser({
        fullName: createForm.fullName,
        email: createForm.email,
        phone: createForm.phone,
        roleTitle: createForm.roleTitle,
        defaultPassword: createForm.defaultPassword || DEFAULT_ACCOUNTANT_PASSWORD,
        status: createForm.status,
      });

      // Update state immediately
      setTeamMembers((prev) => {
        const exists = prev.some((c) => c.email.toLowerCase() === res.contador.email.toLowerCase());
        if (exists) {
          return prev.map((c) =>
            c.email.toLowerCase() === res.contador.email.toLowerCase() ? res.contador : c
          );
        }
        return [res.contador, ...prev];
      });

      setSelectedContadorId(res.contador.id);
      setCreatedResult(res);
      sileo.success({
        title: "¡Contador creado con éxito!",
        description: `Se registró a ${res.contador.name} con la contraseña por defecto ${res.defaultPassword}.`,
      });
    } catch (err: any) {
      console.error("Error creating accountant:", err);
      sileo.error({
        title: "Error al registrar contador",
        description: err.message || "No se pudo registrar el nuevo contador.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetCreateForm = () => {
    setCreateForm({
      fullName: "",
      email: "",
      phone: "",
      roleTitle: "Contadora Fiscalista",
      status: "Activo",
      defaultPassword: DEFAULT_ACCOUNTANT_PASSWORD,
    });
    setCreatedResult(null);
    setShowDefaultPassword(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contadores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestión de equipo contable, asignación de carteras y administración de credenciales de acceso
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 shadow-xs text-xs"
            onClick={() => setIsAssignModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Asignar clientes
          </Button>

          <Button
            size="sm"
            className="bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-2 shadow-xs text-xs font-semibold"
            onClick={() => {
              handleResetCreateForm();
              setIsCreateModalOpen(true);
            }}
          >
            <UserPlus className="h-3.5 w-3.5" /> Nuevo Contador
          </Button>
        </div>
      </div>

      {/* Row 1: 6 Top Metric Cards (Calculated dynamically) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Contadores activos</p>
              <p className="text-xl font-bold text-foreground leading-tight">{overallMetrics.totalActive}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground font-medium">
            {teamMembers.length} registrados en total
          </p>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Clientes asignados</p>
              <p className="text-xl font-bold text-foreground leading-tight">{overallMetrics.totalClients}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-600 font-medium">En cartera activa</p>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Completadas</p>
              <p className="text-xl font-bold text-foreground leading-tight">{overallMetrics.totalCompleted}</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={overallMetrics.completedRate} indicatorClassName="bg-emerald-500" className="h-1.5" />
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{overallMetrics.completedRate}% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">En proceso</p>
              <p className="text-xl font-bold text-foreground leading-tight">{overallMetrics.totalInProcess}</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={overallMetrics.inProcessRate} indicatorClassName="bg-blue-500" className="h-1.5" />
            <p className="text-[10px] text-blue-600 font-medium mt-0.5">{overallMetrics.inProcessRate}% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">En riesgo</p>
              <p className="text-xl font-bold text-foreground leading-tight">{overallMetrics.totalAtRisk}</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={overallMetrics.atRiskRate} indicatorClassName="bg-amber-500" className="h-1.5" />
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">{overallMetrics.atRiskRate}% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Atrasadas</p>
              <p className="text-xl font-bold text-foreground leading-tight">{overallMetrics.totalDelayed}</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={overallMetrics.delayedRate} indicatorClassName="bg-rose-500" className="h-1.5" />
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">{overallMetrics.delayedRate}% del total</p>
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

              <span className="text-[11px] text-muted-foreground">
                {filteredContadores.length} {filteredContadores.length === 1 ? "contador" : "contadores"}
              </span>
            </div>

            {/* Filter controls row */}
            <div className="p-3 bg-muted/20 border-b border-border/60 flex flex-wrap items-center gap-2.5 text-xs">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o correo..."
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
                    const changePasswordUrl = `${window.location.origin}/cambiar-password?email=${encodeURIComponent(c.email)}`;

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
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-foreground text-xs leading-tight">{c.name}</p>
                                {c.temporary_password && (
                                  <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 px-1 py-0 leading-none">
                                    Nuevo
                                  </Badge>
                                )}
                              </div>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 text-xs">
                              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                                Accesos y Credenciales
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  copyToClipboard(
                                    changePasswordUrl,
                                    `link-${c.id}`,
                                    "Enlace de cambio de contraseña"
                                  )
                                }
                                className="cursor-pointer gap-2"
                              >
                                <KeyRound className="h-3.5 w-3.5 text-primary" />
                                <span>Copiar enlace de contraseña</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  copyToClipboard(
                                    DEFAULT_ACCOUNTANT_PASSWORD,
                                    `pwd-${c.id}`,
                                    "Contraseña por defecto (Cardenas2026!)"
                                  )
                                }
                                className="cursor-pointer gap-2"
                              >
                                <Lock className="h-3.5 w-3.5 text-amber-600" />
                                <span>Copiar contraseña por defecto</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const msg = generateAccountantWelcomeMessage({
                                    fullName: c.name,
                                    email: c.email,
                                    temporaryPassword: DEFAULT_ACCOUNTANT_PASSWORD,
                                    roleTitle: c.role,
                                  });
                                  copyToClipboard(msg, `msg-${c.id}`, "Mensaje de bienvenida");
                                }}
                                className="cursor-pointer gap-2"
                              >
                                <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Copiar mensaje de bienvenida</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedContadorId(c.id);
                                  setIsAssignModalOpen(true);
                                }}
                                className="cursor-pointer gap-2"
                              >
                                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Asignar clientes</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                      ● {selectedContador.status || "Activo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedContador.role}</p>

                  <div className="mt-2 text-[11px] text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{selectedContador.email}</span>
                    </div>
                    {selectedContador.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{selectedContador.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick credential sharing pill for selected contador */}
              <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Contraseña inicial: <strong className="font-mono text-foreground">{DEFAULT_ACCOUNTANT_PASSWORD}</strong></span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 text-primary hover:text-primary"
                  onClick={() => {
                    const msg = generateAccountantWelcomeMessage({
                      fullName: selectedContador.name,
                      email: selectedContador.email,
                      temporaryPassword: DEFAULT_ACCOUNTANT_PASSWORD,
                      roleTitle: selectedContador.role,
                    });
                    copyToClipboard(msg, `top-msg-${selectedContador.id}`, "Instrucciones de acceso");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar accesos
                </Button>
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

                <TabsContent value="actividad" className="pt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-semibold text-foreground text-xs">
                      Bitácora de movimientos ({selectedContadorLogs.length})
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Tiempo real
                    </Badge>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1 divide-y divide-border/60">
                    {selectedContadorLogs.length === 0 ? (
                      <p className="text-muted-foreground italic text-center py-4">
                        Sin movimientos recientes registrados.
                      </p>
                    ) : (
                      selectedContadorLogs.map((item) => (
                        <div key={item.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  item.tone === "emerald"
                                    ? "bg-emerald-500"
                                    : item.tone === "purple"
                                    ? "bg-purple-500"
                                    : item.tone === "amber"
                                    ? "bg-amber-500"
                                    : item.tone === "rose"
                                    ? "bg-rose-500"
                                    : "bg-blue-500"
                                }`}
                              />
                              <p className="font-semibold text-foreground truncate text-xs" title={item.title}>
                                {item.title}
                              </p>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 pl-3.5">
                              {item.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 pl-3.5">
                              {item.relativeTime} {item.clientName ? `• ${item.clientName}` : ""}
                            </p>
                          </div>
                          {item.clientId && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" asChild title="Ver control mensual">
                              <Link to={`/control-mensual/${item.clientId}`}>
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="documentos" className="pt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-semibold text-foreground text-xs">
                      Expedientes gestionados
                    </span>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" asChild>
                      <Link to="/control-mensual">Ir a Control Mensual →</Link>
                    </Button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 divide-y divide-border/60">
                    {selectedContadorClients.slice(0, 8).map((client) => (
                      <div key={client.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate text-xs">{client.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            CSF, Opinión 32-D y Acuses SAT
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" asChild>
                          <Link to={`/control-mensual/${client.id}`}>Expediente</Link>
                        </Button>
                      </div>
                    ))}
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

      {/* Modal: Crear Nuevo Contador con Contraseña por Defecto */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          {!createdResult ? (
            /* Creation Form View */
            <form onSubmit={handleCreateContador}>
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-[#1e3a5f] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground">
                      Registrar Nuevo Contador
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Crea la cuenta del contador y asígnale la contraseña inicial por defecto para su primer ingreso.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4 text-xs">
                {/* Nombre Completo */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Nombre completo <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Ej. Mariana Ruiz Sánchez"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    required
                    className="text-xs"
                    autoFocus
                  />
                </div>

                {/* Grid: Email & Telefono */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">
                      Correo institucional <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="ejemplo@cardenasycardenas.mx"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      required
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">
                      Teléfono / WhatsApp
                    </label>
                    <Input
                      placeholder="81 1234 5678"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Grid: Cargo y Estatus */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Cargo / Especialidad</label>
                    <Select
                      value={createForm.roleTitle}
                      onValueChange={(val) => setCreateForm({ ...createForm, roleTitle: val })}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Selecciona un cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Contadora Fiscalista">Contadora Fiscalista</SelectItem>
                        <SelectItem value="Contador Senior">Contador Senior</SelectItem>
                        <SelectItem value="Contador de Operaciones">Contador de Operaciones</SelectItem>
                        <SelectItem value="Contador General">Contador General</SelectItem>
                        <SelectItem value="Auditor Contable">Auditor Contable</SelectItem>
                        <SelectItem value="Auxiliar Contable">Auxiliar Contable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Estatus inicial</label>
                    <Select
                      value={createForm.status}
                      onValueChange={(val: "Activo" | "Inactivo") => setCreateForm({ ...createForm, status: val })}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Selecciona estatus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Default / Temporary Password Card */}
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold">
                      <KeyRound className="h-4 w-4 text-amber-600" />
                      <span>Contraseña Provisional por Defecto</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 font-mono">
                      Cardenas2026!
                    </Badge>
                  </div>

                  <div className="relative">
                    <Input
                      type={showDefaultPassword ? "text" : "password"}
                      value={createForm.defaultPassword}
                      onChange={(e) => setCreateForm({ ...createForm, defaultPassword: e.target.value })}
                      required
                      className="text-xs font-mono pr-20 bg-background"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowDefaultPassword(!showDefaultPassword)}
                        title={showDefaultPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        {showDefaultPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => copyToClipboard(createForm.defaultPassword, "form-pwd", "Contraseña")}
                        title="Copiar contraseña"
                      >
                        {copiedKey === "form-pwd" ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    💡 <strong>Flujo de acceso:</strong> El contador ingresará inicialmente con esta contraseña por defecto. En su primer acceso, el sistema le solicitará definir su propia contraseña privada y definitiva desde la pantalla de cambio de credencial.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating}
                  className="bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-2 font-semibold"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Registrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" /> Crear Contador y Asignar Contraseña
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            /* Created Result View */
            <div className="space-y-4 py-2">
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground">
                      ¡Contador Registrado Exitosamente!
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      La cuenta fue dada de alta con la contraseña por defecto. Comparte los accesos para que defina su contraseña definitiva.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Summary Card */}
              <div className="p-3.5 rounded-lg bg-card border border-border/80 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-muted-foreground">Contador:</span>
                  <span className="font-bold text-foreground">{createdResult.contador.name}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-muted-foreground">Correo:</span>
                  <span className="font-mono text-foreground">{createdResult.contador.email}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-muted-foreground">Cargo:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {createdResult.contador.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Contraseña por defecto:</span>
                  <div className="flex items-center gap-1.5">
                    <code className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-bold px-2 py-0.5 rounded text-xs">
                      {createdResult.defaultPassword}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        copyToClipboard(createdResult.defaultPassword, "res-pwd", "Contraseña temporal")
                      }
                    >
                      {copiedKey === "res-pwd" ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Ready-to-send Message Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    <Share2 className="h-3.5 w-3.5 text-primary" />
                    <span>Instrucciones de bienvenida (WhatsApp / Correo)</span>
                  </label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary font-semibold"
                    onClick={() =>
                      copyToClipboard(
                        createdResult.welcomeMessage,
                        "full-welcome",
                        "Mensaje de bienvenida completo"
                      )
                    }
                  >
                    {copiedKey === "full-welcome" ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Copiado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="h-3 w-3" /> Copiar todo
                      </span>
                    )}
                  </Button>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border border-border/80 text-[11px] font-mono leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
                  {createdResult.welcomeMessage}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetCreateForm}
                  className="text-xs"
                >
                  Registrar otro contador
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#1e3a5f] hover:bg-[#152a45] text-white text-xs font-semibold"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Listo, ver en la lista
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                void logActivity("CLIENT_ACCOUNTANT_ASSIGNED", {
                  module: "contadores",
                  accountant_name: selectedContador.name,
                  title: "Asignación de cartera actualizada",
                  description: `Se actualizó la asignación de cartera contable para ${selectedContador.name}`,
                });
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
