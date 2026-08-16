import * as React from "react";
import {
  useProjects,
  usePayments,
  useFinanceClients,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCreateFinanceClient,
  useUpdateProjectStage,
} from "@/modules/finances/hooks";
import type { IProject } from "@/modules/finances/types";
import { DECRETO_PROCESS_STAGES } from "@/modules/finances/types";
import { ProjectProcessSheet } from "@/components/projects/ProjectProcessSheet";
import { ImportProjectModal } from "@/components/projects/ImportProjectModal";
import { exportProjectToExcel } from "@/modules/finances/utils/excelProject";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/shared/DatePicker";
import { formatLocalDate, parseLocalDate } from "@/lib/utils";
import { uploadPurchaseOrder } from "@/modules/finances/api";
import { sileo } from "sileo";
import {
  Plus,
  Share2,
  DollarSign,
  UserPlus,
  Search,
  Clock,
  Eye,
  Layers,
  ListFilter,
  Kanban,
  Briefcase,
  Loader2,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Printer,
  FileSpreadsheet,
  GripVertical,
} from "lucide-react";

export function ProjectsPage() {
  const { data: projects = [] } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: clients = [] } = useFinanceClients();

  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const createClientMutation = useCreateFinanceClient();
  const updateStageMutation = useUpdateProjectStage();

  // Drag and Drop state
  const [draggingProjectId, setDraggingProjectId] = React.useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = React.useState<string | null>(null);
  const isDraggingRef = React.useRef(false);

  // Edit Project State
  const [editingProject, setEditingProject] = React.useState<IProject | null>(null);
  const [editForm, setEditForm] = React.useState({
    name: "",
    client_id: "",
    order_number: "",
    base_price_total: "",
    custom_price_total: "",
    status: "draft" as any,
    description: "",
    requires_invoice: false,
    cfdi_use: "G03",
    iva_rate: "0.16",
    isr_retention_rate: "0.0",
    iva_retention_rate: "0.0",
  });

  // Delete Project State
  const [deletingProjectId, setDeletingProjectId] = React.useState<string | null>(null);

  // Filter and view states
  const [projectSearch, setProjectSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [clientFilter, setClientFilter] = React.useState("all");
  const [activeTab, setActiveTab] = React.useState("kanban");

  // Selected project ID for Process Worksheet Sheet/Modal
  const [selectedProjectIdForSheet, setSelectedProjectIdForSheet] = React.useState<string | null>(null);

  // Files & Installments states
  const [purchaseOrderFile, setPurchaseOrderFile] = React.useState<File | null>(null);
  const [editPurchaseOrderFile, setEditPurchaseOrderFile] = React.useState<File | null>(null);
  const [editPurchaseOrderUrl, setEditPurchaseOrderUrl] = React.useState<string | null>(null);
  const [installments, setInstallments] = React.useState<any[]>([]);

  const getProjectTotals = (subtotal: number, requiresInvoice: boolean, iva: string, isr: string, ivaRet: string) => {
    if (!requiresInvoice) {
      return { subtotal, iva: 0, isrRetention: 0, ivaRetention: 0, total: subtotal };
    }
    const ivaVal = subtotal * parseFloat(iva || "0.16");
    const isrVal = subtotal * parseFloat(isr || "0");
    const ivaRetVal = subtotal * parseFloat(ivaRet || "0");
    const total = subtotal + ivaVal - isrVal - ivaRetVal;
    return { subtotal, iva: ivaVal, isrRetention: isrVal, ivaRetention: ivaRetVal, total };
  };

  const handleAddInstallment = () => {
    const subtotalVal = parseFloat(projectForm.custom_price_total || projectForm.base_price_total || "0");
    const { total: targetTotal } = getProjectTotals(subtotalVal, projectForm.requires_invoice, projectForm.iva_rate, projectForm.isr_retention_rate, projectForm.iva_retention_rate);
    const distributedTotal = installments.reduce((sum, inst) => sum + parseFloat(inst.expected_amount || "0"), 0);
    const remainingToDistribute = Math.max(0, targetTotal - distributedTotal);
    setInstallments([
      ...installments,
      { 
        expected_amount: remainingToDistribute > 0 ? remainingToDistribute.toString() : "", 
        due_date: formatLocalDate(new Date()) 
      },
    ]);
  };

  const handleRemoveInstallment = (index: number) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const handleInstallmentChange = (index: number, field: string, value: any) => {
    const updated = [...installments];
    updated[index][field] = value;
    setInstallments(updated);
  };

  const handleDropStage = async (targetStageId: string, targetStageName: string) => {
    if (!draggingProjectId) return;
    const projectToMove = processedProjects.find((p) => p.id === draggingProjectId);
    if (!projectToMove) return;

    const currentStage = projectToMove.current_stage || "solicitud";
    if (currentStage === targetStageId) {
      setDraggingProjectId(null);
      setDragOverStageId(null);
      return;
    }

    // Validation rule: Anticipo stage warning if paid < 50%
    if (targetStageId === "anticipo") {
      const paidPercentage = projectToMove.totalPrice > 0
        ? Math.min(100, Math.round((projectToMove.totalPaid / projectToMove.totalPrice) * 100))
        : 0;

      if (paidPercentage < 50) {
        const confirmAdvance = window.confirm(
          `El cliente solo ha pagado el ${paidPercentage}% de anticipo (se recomienda 50%). ¿Deseas mover el proyecto a "${targetStageName}" de todas formas?`
        );
        if (!confirmAdvance) {
          setDraggingProjectId(null);
          setDragOverStageId(null);
          return;
        }
      }
    }

    try {
      await updateStageMutation.mutateAsync({
        id: draggingProjectId,
        stage: targetStageId,
        notes: `Movido a ${targetStageName} mediante arrastrar y soltar`,
      });
      sileo.success({ title: `Proyecto movido a: ${targetStageName}` });
    } catch (err: any) {
      sileo.error({ title: "Error al mover proyecto", description: err.message });
    } finally {
      setDraggingProjectId(null);
      setDragOverStageId(null);
    }
  };

  // Import Excel Modal State
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

  // New Project Form State
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [projectForm, setProjectForm] = React.useState({
    client_id: "",
    name: "",
    base_price_total: "",
    custom_price_total: "",
    status: "draft" as any,
    requires_invoice: false,
    cfdi_use: "G03",
    order_number: "",
    description: "",
    is_sample: false,
    mold_name: "",
    fabric_name: "",
    label_name: "",
    target_delivery_date: "",
    iva_rate: "0.16",
    isr_retention_rate: "0.0",
    iva_retention_rate: "0.0",
  });

  // Inline Client Creation
  const [isCreateClientOpen, setIsCreateClientOpen] = React.useState(false);
  const [clientForm, setClientForm] = React.useState({
    name: "",
    trade_name: "",
    fiscal_name: "",
    email: "",
    phone: "",
    tax_id_rfc: "",
    fiscal_regime: "",
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  const copyToClipboard = (text: string) => {
    const fullUrl = `${window.location.origin}${text}`;
    navigator.clipboard.writeText(fullUrl);
    sileo.success({ title: "Enlace copiado al portapapeles" });
  };

  // Process projects to calculate debts and payments
  const processedProjects = React.useMemo(() => {
    return projects.map((p) => {
      const projPayments = payments.filter((pmt) => pmt.project_id === p.id);
      const totalPaid = projPayments.reduce((sum, pmt) => sum + Number(pmt.amount || 0), 0);
      
      const subtotal = Number(p.custom_price_total || p.base_price_total || 0);
      const totalPrice = p.requires_invoice
        ? subtotal + (subtotal * (p.iva_rate ?? 0.16)) - (subtotal * ((p.isr_retention_rate ?? 0) + (p.iva_retention_rate ?? 0)))
        : subtotal;

      const remainingDebt = p.status === 'cancelled' ? 0 : Math.max(0, totalPrice - totalPaid);
      const stageObj = DECRETO_PROCESS_STAGES.find((s) => s.id === (p.current_stage || "solicitud")) || DECRETO_PROCESS_STAGES[0];

      return {
        ...p,
        totalPaid,
        totalPrice,
        remainingDebt,
        stageObj,
      };
    });
  }, [projects, payments]);

  const selectedProjectForSheet = React.useMemo(() => {
    if (!selectedProjectIdForSheet) return null;
    return processedProjects.find((p) => p.id === selectedProjectIdForSheet) || null;
  }, [selectedProjectIdForSheet, processedProjects]);

  const filteredProjects = React.useMemo(() => {
    return processedProjects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
        (p.order_number && p.order_number.toLowerCase().includes(projectSearch.toLowerCase())) ||
        (p.client?.name && p.client.name.toLowerCase().includes(projectSearch.toLowerCase()));

      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesClient = clientFilter === "all" || p.client_id === clientFilter;

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [processedProjects, projectSearch, statusFilter, clientFilter]);

  // Key metrics
  const stats = React.useMemo(() => {
    const total = processedProjects.length;
    const activeProduction = processedProjects.filter((p) => p.status === "approved" || (p.current_stage && p.current_stage !== "solicitud" && p.current_stage !== "finiquito")).length;
    const completed = processedProjects.filter((p) => p.status === "completed" || p.current_stage === "finiquito").length;
    const totalVolume = processedProjects.reduce((sum, p) => sum + p.totalPrice, 0);
    const totalDebt = processedProjects.reduce((sum, p) => sum + p.remainingDebt, 0);

    return { total, activeProduction, completed, totalVolume, totalDebt };
  }, [processedProjects]);
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.client_id || !projectForm.name) {
      sileo.error({ title: "Por favor completa el cliente y nombre del proyecto" });
      return;
    }

    try {
      const parsedBase = projectForm.base_price_total ? parseFloat(projectForm.base_price_total) : 0;
      const parsedCustom = projectForm.custom_price_total ? parseFloat(projectForm.custom_price_total) : parsedBase;

      const { total: targetTotal } = getProjectTotals(
        parsedCustom,
        projectForm.requires_invoice,
        projectForm.iva_rate,
        projectForm.isr_retention_rate,
        projectForm.iva_retention_rate
      );

      // Validate installments total
      if (installments.length > 0) {
        const schedTotal = installments.reduce((sum, inst) => sum + parseFloat(inst.expected_amount || "0"), 0);
        if (Math.abs(schedTotal - targetTotal) > 0.01) {
          sileo.error({ title: `El monto de los plazos (${formatCurrency(schedTotal)}) debe coincidir con el precio total (${formatCurrency(targetTotal)})` });
          return;
        }
      }

      let purchase_order_url = null;
      if (purchaseOrderFile) {
        purchase_order_url = await uploadPurchaseOrder(purchaseOrderFile);
      }

      await createProjectMutation.mutateAsync({
        client_id: projectForm.client_id,
        name: projectForm.name,
        base_price_total: parsedBase,
        custom_price_total: parsedCustom,
        status: projectForm.status,
        requires_invoice: projectForm.requires_invoice,
        cfdi_use: projectForm.cfdi_use,
        order_number: projectForm.order_number || null,
        description: projectForm.description || null,
        purchase_order_url,
        iva_rate: parseFloat(projectForm.iva_rate),
        isr_retention_rate: parseFloat(projectForm.isr_retention_rate),
        iva_retention_rate: parseFloat(projectForm.iva_retention_rate),
        paymentSchedules: installments.length > 0 ? installments.map(inst => ({
          expected_amount: parseFloat(inst.expected_amount),
          due_date: inst.due_date,
          status: 'pending',
        })) : undefined,
      });

      setIsProjectOpen(false);
      setProjectForm({
        client_id: "",
        name: "",
        base_price_total: "",
        custom_price_total: "",
        status: "draft",
        requires_invoice: false,
        cfdi_use: "G03",
        order_number: "",
        description: "",
        is_sample: false,
        mold_name: "",
        fabric_name: "",
        label_name: "",
        target_delivery_date: "",
        iva_rate: "0.16",
        isr_retention_rate: "0.0",
        iva_retention_rate: "0.0",
      });
      setPurchaseOrderFile(null);
      setInstallments([]);

      sileo.success({ title: "Proyecto creado exitosamente" });
    } catch (err: any) {
      sileo.error({ title: "Error al crear proyecto", description: err.message });
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) return;

    try {
      const newClient = await createClientMutation.mutateAsync({
        name: clientForm.name.trim(),
        trade_name: clientForm.trade_name.trim() || null,
        fiscal_name: clientForm.fiscal_name.trim() || null,
        email: clientForm.email.trim() || null,
        phone: clientForm.phone.trim() || null,
        tax_id_rfc: clientForm.tax_id_rfc.trim().toUpperCase() || null,
        fiscal_regime: clientForm.fiscal_regime.trim() || null,
      });
      setProjectForm((prev) => ({ ...prev, client_id: newClient.id }));
      setIsCreateClientOpen(false);
      setClientForm({
        name: "",
        trade_name: "",
        fiscal_name: "",
        email: "",
        phone: "",
        tax_id_rfc: "",
        fiscal_regime: "",
      });
      sileo.success({ title: "Cliente creado con éxito" });
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al crear el cliente" });
    }
  };

  const handleOpenEdit = (p: IProject, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(p);
    setEditForm({
      name: p.name || "",
      client_id: p.client_id || "",
      order_number: p.order_number || "",
      base_price_total: p.base_price_total ? p.base_price_total.toString() : "",
      custom_price_total: String(p.custom_price_total || p.base_price_total || 0),
      status: (p.status || "draft") as any,
      description: p.description || "",
      requires_invoice: p.requires_invoice || false,
      cfdi_use: p.cfdi_use || "G03",
      iva_rate: p.iva_rate !== undefined ? p.iva_rate.toString() : "0.16",
      isr_retention_rate: p.isr_retention_rate !== undefined ? p.isr_retention_rate.toString() : "0.0",
      iva_retention_rate: p.iva_retention_rate !== undefined ? p.iva_retention_rate.toString() : "0.0",
    });
    setEditPurchaseOrderUrl(p.purchase_order_url || null);
    setEditPurchaseOrderFile(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    try {
      const parsedBase = editForm.base_price_total ? parseFloat(editForm.base_price_total) : 0;
      const parsedCustom = editForm.custom_price_total ? parseFloat(editForm.custom_price_total) : parsedBase;

      let purchase_order_url = editPurchaseOrderUrl;
      if (editPurchaseOrderFile) {
        purchase_order_url = await uploadPurchaseOrder(editPurchaseOrderFile);
      }

      await updateProjectMutation.mutateAsync({
        id: editingProject.id,
        payload: {
          name: editForm.name,
          client_id: editForm.client_id || undefined,
          order_number: editForm.order_number || null,
          base_price_total: parsedBase,
          custom_price_total: parsedCustom,
          status: editForm.status,
          description: editForm.description || null,
          requires_invoice: editForm.requires_invoice,
          cfdi_use: editForm.requires_invoice ? editForm.cfdi_use : null,
          purchase_order_url,
          iva_rate: editForm.requires_invoice ? parseFloat(editForm.iva_rate) : 0.16,
          isr_retention_rate: editForm.requires_invoice ? parseFloat(editForm.isr_retention_rate) : 0.0,
          iva_retention_rate: editForm.requires_invoice ? parseFloat(editForm.iva_retention_rate) : 0.0,
        },
      });
      setEditingProject(null);
      setEditPurchaseOrderFile(null);
      sileo.success({ title: "Proyecto actualizado correctamente" });
    } catch (err: any) {
      sileo.error({ title: "Error al actualizar proyecto", description: err.message });
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProjectId) return;
    try {
      await deleteProjectMutation.mutateAsync(deletingProjectId);
      setDeletingProjectId(null);
      sileo.success({ title: "Proyecto eliminado correctamente" });
    } catch (err: any) {
      sileo.error({ title: "Error al eliminar proyecto", description: err.message });
    }
  };

  const handleImportNewProject = async (data: {
    client_id: string;
    client_name_new?: string;
    projectData: Partial<IProject>;
  }) => {
    let clientId = data.client_id;
    if (data.client_name_new) {
      const createdClient = await createClientMutation.mutateAsync({
        name: data.client_name_new,
      });
      clientId = createdClient.id;
    }

    const createdProject = await createProjectMutation.mutateAsync({
      client_id: clientId,
      name: data.projectData.name || "Nuevo Proyecto",
      base_price_total: 0,
      custom_price_total: data.projectData.custom_price_total || 0,
      status: "draft",
      requires_invoice: false,
      order_number: data.projectData.order_number || null,
    });

    await updateProjectMutation.mutateAsync({
      id: createdProject.id,
      payload: {
        mold_name: data.projectData.mold_name,
        fabric_name: data.projectData.fabric_name,
        label_name: data.projectData.label_name,
        target_delivery_date: data.projectData.target_delivery_date,
        specifications: data.projectData.specifications,
        sizes_breakdown: data.projectData.sizes_breakdown,
        roster_list: data.projectData.roster_list,
      },
    });
  };

  const handleImportUpdateProject = async (projectId: string, projectData: Partial<IProject>) => {
    await updateProjectMutation.mutateAsync({
      id: projectId,
      payload: projectData,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-primary" /> Proyectos & Procesos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de proyectos, hoja de trabajo y secuencia de producción de sublimado
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
          >
            <FileSpreadsheet className="h-4 w-4" /> Importar Excel
          </Button>
          <Button onClick={() => setIsProjectOpen(true)} className="gap-2 bg-primary text-primary-foreground shadow">
            <Plus className="h-4 w-4" /> Nuevo Proyecto
          </Button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Proyectos Totales</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">En Producción Activa</p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.activeProduction}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Valor Total Proyectos</p>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(stats.totalVolume)}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Cuentas por Cobrar</p>
              <h3 className="text-2xl font-bold text-destructive mt-1">{formatCurrency(stats.totalDebt)}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Container */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2 flex-1 w-full md:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, n° pedido o cliente..."
                  className="pl-9 h-9 text-xs"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="pending_approval">Pendiente</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Clientes</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="h-9 p-0.5 bg-muted">
                  <TabsTrigger value="kanban" className="text-xs px-3 py-1 gap-1.5">
                    <Kanban className="h-3.5 w-3.5" /> Tablero de Procesos
                  </TabsTrigger>
                  <TabsTrigger value="list" className="text-xs px-3 py-1 gap-1.5">
                    <ListFilter className="h-3.5 w-3.5" /> Lista de Proyectos
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Tab 1: Kanban Pipeline Board */}
          {activeTab === "kanban" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Operación de Sublimado</h3>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <GripVertical className="h-3.5 w-3.5 text-primary" /> Arrastra y suelta tarjetas entre etapas o haz clic para abrir la Hoja de Trabajo
                </span>
              </div>

              {/* Kanban Column Horizontal Scroll */}
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[500px]">
                {DECRETO_PROCESS_STAGES.map((stage) => {
                  const stageProjects = filteredProjects.filter((p) => (p.current_stage || "solicitud") === stage.id);
                  const isDragOver = dragOverStageId === stage.id;

                  return (
                    <div
                      key={stage.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverStageId !== stage.id) {
                          setDragOverStageId(stage.id);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        if (dragOverStageId === stage.id) {
                          setDragOverStageId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropStage(stage.id, stage.name);
                      }}
                      className={`w-72 shrink-0 rounded-xl border flex flex-col max-h-[700px] transition-all duration-200 ${
                        isDragOver
                          ? "bg-primary/10 border-primary ring-2 ring-primary/40 shadow-lg scale-[1.01]"
                          : "bg-muted/40 border-border"
                      }`}
                    >
                      {/* Column Header */}
                      <div className={`p-3 border-b rounded-t-xl flex items-center justify-between transition-colors ${
                        isDragOver ? "bg-primary/20 border-primary/40" : "bg-muted/70 border-border/80"
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${isDragOver ? "bg-primary animate-ping" : "bg-primary"}`} />
                            <span className="font-bold text-xs text-foreground">N° {stage.stepNumber}. {stage.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">{stage.macroPhase}</span>
                        </div>
                        <Badge variant={isDragOver ? "default" : "secondary"} className="text-[10px] font-mono">
                          {stageProjects.length}
                        </Badge>
                      </div>

                      {/* Column Cards Container */}
                      <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[120px]">
                        {stageProjects.length === 0 ? (
                          <div className={`py-8 text-center text-xs border border-dashed rounded-lg transition-colors ${
                            isDragOver ? "border-primary/60 bg-primary/5 text-primary font-semibold" : "border-border text-muted-foreground"
                          }`}>
                            {isDragOver ? "Soltar proyecto aquí" : "Sin proyectos en esta etapa"}
                          </div>
                        ) : (
                          stageProjects.map((proj) => {
                            const isBeingDragged = draggingProjectId === proj.id;
                            return (
                              <Card
                                key={proj.id}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", proj.id);
                                  e.dataTransfer.effectAllowed = "move";
                                  isDraggingRef.current = true;
                                  setDraggingProjectId(proj.id);
                                }}
                                onDragEnd={() => {
                                  setDraggingProjectId(null);
                                  setDragOverStageId(null);
                                  setTimeout(() => {
                                    isDraggingRef.current = false;
                                  }, 100);
                                }}
                                onClick={() => {
                                  if (!isDraggingRef.current) {
                                    setSelectedProjectIdForSheet(proj.id);
                                  }
                                }}
                                className={`bg-card border-border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-primary/50 group ${
                                  isBeingDragged ? "opacity-40 border-primary border-dashed scale-95" : ""
                                }`}
                              >
                                <CardContent className="p-3 space-y-2 text-xs">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-1">
                                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                                        {proj.order_number || proj.id.slice(0, 6)}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {proj.is_sample && (
                                        <Badge variant="secondary" className="text-[9px] bg-amber-500/10 text-amber-600">
                                          MUESTRA
                                        </Badge>
                                      )}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                        title="Editar Proyecto"
                                        onClick={(e) => handleOpenEdit(proj, e)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        title="Eliminar Proyecto"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingProjectId(proj.id);
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>

                                  <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                    {proj.name}
                                  </h4>

                                  <p className="text-muted-foreground text-[11px] truncate">
                                    Cliente: <span className="font-medium text-foreground">{proj.client?.name || "Sin cliente"}</span>
                                  </p>

                                  {proj.mold_name && (
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      Molde: <span className="text-foreground">{proj.mold_name}</span>
                                    </p>
                                  )}

                                  {(proj.digital_design_url || proj.print_design_url) && (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                      {proj.digital_design_url && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1 font-normal">
                                          <ImageIcon className="h-2.5 w-2.5" /> P3 Diseño
                                        </Badge>
                                      )}
                                      {proj.print_design_url && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 gap-1 font-normal">
                                          <Printer className="h-2.5 w-2.5" /> P8 Impresión
                                        </Badge>
                                      )}
                                    </div>
                                  )}

                                  <div className="pt-2 border-t flex justify-between items-center text-[10px]">
                                    <span className="font-bold text-foreground">{formatCurrency(proj.totalPrice)}</span>
                                    <span className={proj.remainingDebt > 0 ? "text-destructive font-semibold" : "text-green-600 font-semibold"}>
                                      {proj.remainingDebt > 0 ? `Debe: ${formatCurrency(proj.remainingDebt)}` : "Pagado"}
                                    </span>
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
          )}

          {/* Tab 2: Project List View */}
          {activeTab === "list" && (
            <div className="space-y-4">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No se encontraron proyectos con los filtros seleccionados.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground font-semibold uppercase">
                      <tr>
                        <th className="p-3 border-b">Pedido / Proyecto</th>
                        <th className="p-3 border-b">Cliente</th>
                        <th className="p-3 border-b">Etapa Decreto</th>
                        <th className="p-3 border-b">Precio Total</th>
                        <th className="p-3 border-b">Cobrado</th>
                        <th className="p-3 border-b">Deuda</th>
                        <th className="p-3 border-b text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((proj) => (
                        <tr key={proj.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            <div className="font-bold text-sm text-foreground">{proj.name}</div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              N° {proj.order_number || proj.id.slice(0, 8)}
                            </span>
                          </td>

                          <td className="p-3 font-medium text-foreground">
                            {proj.client?.name || "Sin cliente"}
                          </td>

                          <td className="p-3">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              {proj.stageObj.stepNumber}. {proj.stageObj.name}
                            </Badge>
                          </td>

                          <td className="p-3 font-bold text-foreground">
                            {formatCurrency(proj.totalPrice)}
                          </td>

                          <td className="p-3 font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(proj.totalPaid)}
                          </td>

                          <td className="p-3 font-bold text-destructive">
                            {formatCurrency(proj.remainingDebt)}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedProjectIdForSheet(proj.id)}
                                className="gap-1 text-xs"
                              >
                                <Eye className="h-3.5 w-3.5" /> Hoja de Trabajo
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Descargar Excel"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                onClick={() => exportProjectToExcel(proj)}
                              >
                                <FileSpreadsheet className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Editar Proyecto"
                                onClick={() => handleOpenEdit(proj)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Eliminar Proyecto"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeletingProjectId(proj.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Copiar enlace de cotización"
                                onClick={() => copyToClipboard(`/quote/${proj.share_token}`)}
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet / Dialog for Process Worksheet & Stage Management */}
      <Dialog open={!!selectedProjectIdForSheet} onOpenChange={(open) => !open && setSelectedProjectIdForSheet(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-6">
          {selectedProjectForSheet && (
            <ProjectProcessSheet
              project={selectedProjectForSheet}
              onClose={() => setSelectedProjectIdForSheet(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: New Project */}
      <Dialog open={isProjectOpen} onOpenChange={setIsProjectOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Proyecto / Proceso</DialogTitle>
              <DialogDescription>Registra un nuevo proyecto en el sistema</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="client_id">Cliente *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-primary gap-1"
                    onClick={() => setIsCreateClientOpen(true)}
                  >
                    <UserPlus className="h-3 w-3" /> Registrar Nuevo Cliente
                  </Button>
                </div>
                <Select
                  value={projectForm.client_id}
                  onValueChange={(val) => setProjectForm({ ...projectForm, client_id: val })}
                >
                  <SelectTrigger id="client_id">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Proyecto *</Label>
                <Input
                  id="name"
                  placeholder="Ej. RAPTORS 2026, UNIFORMES CLASS 2026"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order_number">Número de Pedido / Código</Label>
                  <Input
                    id="order_number"
                    placeholder="Ej. C26271"
                    value={projectForm.order_number}
                    onChange={(e) => setProjectForm({ ...projectForm, order_number: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="p_purchase_order_file">Orden de Compra (Archivo)</Label>
                  <Input
                    id="p_purchase_order_file"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setPurchaseOrderFile(file);
                    }}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="p_base">Precio de Lista</Label>
                  <Input
                    id="p_base"
                    type="number"
                    value={projectForm.base_price_total}
                    onChange={(e) => setProjectForm({ ...projectForm, base_price_total: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p_custom">Precio Cobrado (Modificable)</Label>
                  <Input
                    id="p_custom"
                    type="number"
                    value={projectForm.custom_price_total}
                    onChange={(e) => setProjectForm({ ...projectForm, custom_price_total: e.target.value })}
                    placeholder="45000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center pt-2">
                <div className="space-y-2">
                  <Label htmlFor="p_status">Estado Inicial</Label>
                  <Select
                    value={projectForm.status}
                    onValueChange={(val: any) => setProjectForm({ ...projectForm, status: val })}
                  >
                    <SelectTrigger id="p_status">
                      <SelectValue placeholder="Estado inicial" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="pending_approval">Pendiente Aprobación</SelectItem>
                      <SelectItem value="approved">Aprobado (Orden de Venta)</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="p_invoice"
                    checked={projectForm.requires_invoice}
                    onCheckedChange={(checked) => setProjectForm({ ...projectForm, requires_invoice: !!checked })}
                  />
                  <Label htmlFor="p_invoice" className="cursor-pointer font-medium text-xs">¿Requiere Factura SAT CFDI?</Label>
                </div>
              </div>

              {projectForm.requires_invoice && (
                <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="p_cfdi" className="text-xs">Uso de CFDI (Default)</Label>
                      <Select
                        value={projectForm.cfdi_use}
                        onValueChange={(val) => setProjectForm({ ...projectForm, cfdi_use: val })}
                      >
                        <SelectTrigger id="p_cfdi" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="G01">G01 - Adquisición de mercancías</SelectItem>
                          <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                          <SelectItem value="I01">I01 - Construcciones</SelectItem>
                          <SelectItem value="P01">P01 - Por definir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="p_iva" className="text-xs">Tasa de IVA</Label>
                      <Select
                        value={projectForm.iva_rate}
                        onValueChange={(val) => setProjectForm({ ...projectForm, iva_rate: val })}
                      >
                        <SelectTrigger id="p_iva" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.16">16% (IVA General)</SelectItem>
                          <SelectItem value="0.08">8% (Fronterizo)</SelectItem>
                          <SelectItem value="0.00">0% (Tasa Cero)</SelectItem>
                          <SelectItem value="0.0">Exento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="p_isr_ret" className="text-xs">Retención ISR</Label>
                      <Select
                        value={projectForm.isr_retention_rate}
                        onValueChange={(val) => setProjectForm({ ...projectForm, isr_retention_rate: val })}
                      >
                        <SelectTrigger id="p_isr_ret" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.0">Sin Retención (0%)</SelectItem>
                          <SelectItem value="0.0125">1.25% (RESICO)</SelectItem>
                          <SelectItem value="0.10">10% (Honorarios/Servicios)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="p_iva_ret" className="text-xs">Retención IVA</Label>
                      <Select
                        value={projectForm.iva_retention_rate}
                        onValueChange={(val) => setProjectForm({ ...projectForm, iva_retention_rate: val })}
                      >
                        <SelectTrigger id="p_iva_ret" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.0">Sin Retención (0%)</SelectItem>
                          <SelectItem value="0.10667">10.667% (Servicios 2/3)</SelectItem>
                          <SelectItem value="0.04">4% (Fletes/Transporte)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(() => {
                    const subtotal = parseFloat(projectForm.custom_price_total || projectForm.base_price_total || "0");
                    if (subtotal <= 0) return null;
                    const totals = getProjectTotals(subtotal, true, projectForm.iva_rate, projectForm.isr_retention_rate, projectForm.iva_retention_rate);
                    return (
                      <div className="border-t pt-2 mt-2 space-y-1 text-[11px] font-mono">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>IVA ({(parseFloat(projectForm.iva_rate) * 100).toFixed(0)}%):</span>
                          <span className="text-green-600">+{formatCurrency(totals.iva)}</span>
                        </div>
                        {totals.isrRetention > 0 && (
                          <div className="flex justify-between text-red-500">
                            <span>Ret. ISR ({(parseFloat(projectForm.isr_retention_rate) * 100).toFixed(2)}%):</span>
                            <span>-{formatCurrency(totals.isrRetention)}</span>
                          </div>
                        )}
                        {totals.ivaRetention > 0 && (
                          <div className="flex justify-between text-red-500">
                            <span>Ret. IVA ({(parseFloat(projectForm.iva_retention_rate) * 100).toFixed(3)}%):</span>
                            <span>-{formatCurrency(totals.ivaRetention)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold border-t pt-1 text-xs text-foreground">
                          <span>Total Facturado:</span>
                          <span>{formatCurrency(totals.total)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="p_description">Descripción / Comentarios</Label>
                <textarea
                  id="p_description"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Ej: Detalles del pedido, tallas, requerimientos especiales..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Custom Payment Installments */}
              <div className="border-t pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold">Calendario de Pagos Personalizado</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddInstallment}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar Plazo
                  </Button>
                </div>

                {(() => {
                  const subtotalVal = parseFloat(projectForm.custom_price_total || projectForm.base_price_total || "0");
                  const { total: targetTotal } = getProjectTotals(subtotalVal, projectForm.requires_invoice, projectForm.iva_rate, projectForm.isr_retention_rate, projectForm.iva_retention_rate);
                  const distributedTotal = installments.reduce((sum, inst) => sum + parseFloat(inst.expected_amount || "0"), 0);
                  const remainingToDistribute = targetTotal - distributedTotal;
                  const percentDistributed = targetTotal > 0 ? Math.min(100, Math.max(0, (distributedTotal / targetTotal) * 100)) : 0;
                  
                  let progressColor = "bg-yellow-500";
                  if (Math.abs(remainingToDistribute) < 0.01) {
                    progressColor = "bg-green-600";
                  } else if (remainingToDistribute < 0) {
                    progressColor = "bg-red-500";
                  }

                  if (targetTotal <= 0 && installments.length === 0) return null;

                  return (
                    <div className="space-y-2 bg-muted/40 p-3 rounded-lg border text-xs">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Precio Total:</span>
                          <span className="font-semibold text-foreground">{formatCurrency(targetTotal)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Distribuido:</span>
                          <span className="font-semibold text-foreground">{formatCurrency(distributedTotal)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Por Distribuir:</span>
                          <span className={`font-bold block ${Math.abs(remainingToDistribute) < 0.01 ? "text-green-600" : remainingToDistribute > 0 ? "text-yellow-600" : "text-red-500"}`}>
                            {formatCurrency(remainingToDistribute)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                          <span>Progreso de Distribución</span>
                          <span>{percentDistributed.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                            style={{ width: `${percentDistributed}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {installments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Si no agregas plazos, se asumirá un solo pago por el precio cobrado.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {installments.map((inst, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <div className="flex-1">
                          <Input
                            placeholder="Monto ($)"
                            type="number"
                            value={inst.expected_amount}
                            onChange={(e) => handleInstallmentChange(index, "expected_amount", e.target.value)}
                            required
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="flex-1">
                          <DatePicker
                            date={inst.due_date ? parseLocalDate(inst.due_date) : undefined}
                            setDate={(d) => handleInstallmentChange(index, "due_date", d ? formatLocalDate(d) : "")}
                            className="w-full h-8 text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => handleRemoveInstallment(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProjectOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? "Guardando..." : "Crear Proyecto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Inline Client Creation */}
      <Dialog open={isCreateClientOpen} onOpenChange={setIsCreateClientOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateClient}>
            <DialogHeader>
              <DialogTitle>Agregar Cliente</DialogTitle>
              <DialogDescription>
                Registra un cliente en la base global. Se le generará un token único de acceso seguro.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="client_modal_name" className="text-sm font-medium">
                  Nombre del Cliente / Empresa *
                </label>
                <Input
                  id="client_modal_name"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="Ej. Schumacher S.A."
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="client_modal_trade_name" className="text-sm font-medium">
                    Nombre Comercial
                  </label>
                  <Input
                    id="client_modal_trade_name"
                    value={clientForm.trade_name}
                    onChange={(e) => setClientForm({ ...clientForm, trade_name: e.target.value })}
                    placeholder="Ej. Schumacher"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="client_modal_fiscal_name" className="text-sm font-medium">
                    Nombre Fiscal
                  </label>
                  <Input
                    id="client_modal_fiscal_name"
                    value={clientForm.fiscal_name}
                    onChange={(e) => setClientForm({ ...clientForm, fiscal_name: e.target.value })}
                    placeholder="Ej. Schumacher e Hijos S.A. de C.V."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="client_modal_email" className="text-sm font-medium">
                    Correo Electrónico
                  </label>
                  <Input
                    id="client_modal_email"
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="client_modal_phone" className="text-sm font-medium">
                    Teléfono
                  </label>
                  <Input
                    id="client_modal_phone"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    placeholder="5512345678"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="client_modal_rfc" className="text-sm font-medium">
                    RFC (Fiscal)
                  </label>
                  <Input
                    id="client_modal_rfc"
                    value={clientForm.tax_id_rfc}
                    onChange={(e) => setClientForm({ ...clientForm, tax_id_rfc: e.target.value.toUpperCase() })}
                    placeholder="XAXX010101000"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="client_modal_regime" className="text-sm font-medium">
                    Régimen Fiscal
                  </label>
                  <Input
                    id="client_modal_regime"
                    value={clientForm.fiscal_regime}
                    onChange={(e) => setClientForm({ ...clientForm, fiscal_regime: e.target.value })}
                    placeholder="601"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateClientOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createClientMutation.isPending}>
                {createClientMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Project */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="max-w-xl">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle>Editar Proyecto / Proceso</DialogTitle>
              <DialogDescription>Modifica los datos generales del proyecto</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Nombre del Proyecto *</Label>
                <Input
                  id="edit_name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_client_id">Cliente</Label>
                <Select
                  value={editForm.client_id}
                  onValueChange={(val) => setEditForm({ ...editForm, client_id: val })}
                >
                  <SelectTrigger id="edit_client_id">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_order_number">Número de Pedido / Código</Label>
                  <Input
                    id="edit_order_number"
                    value={editForm.order_number}
                    onChange={(e) => setEditForm({ ...editForm, order_number: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_p_purchase_order_file">Orden de Compra (Archivo)</Label>
                  <Input
                    id="edit_p_purchase_order_file"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setEditPurchaseOrderFile(file);
                    }}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_p_base">Precio de Lista</Label>
                  <Input
                    id="edit_p_base"
                    type="number"
                    value={editForm.base_price_total}
                    onChange={(e) => setEditForm({ ...editForm, base_price_total: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_p_custom">Precio Cobrado (Modificable)</Label>
                  <Input
                    id="edit_p_custom"
                    type="number"
                    value={editForm.custom_price_total}
                    onChange={(e) => setEditForm({ ...editForm, custom_price_total: e.target.value })}
                    placeholder="45000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <Label htmlFor="edit_status">Estado del Proyecto</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val: any) => setEditForm({ ...editForm, status: val })}
                  >
                    <SelectTrigger id="edit_status">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="pending_approval">Pendiente de Aprobación</SelectItem>
                      <SelectItem value="approved">Aprobado / En Producción</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="edit_p_invoice"
                    checked={editForm.requires_invoice}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, requires_invoice: !!checked })}
                  />
                  <Label htmlFor="edit_p_invoice" className="cursor-pointer font-medium text-xs">¿Requiere Factura SAT CFDI?</Label>
                </div>
              </div>

              {editForm.requires_invoice && (
                <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="edit_p_cfdi" className="text-xs">Uso de CFDI (Default)</Label>
                      <Select
                        value={editForm.cfdi_use}
                        onValueChange={(val) => setEditForm({ ...editForm, cfdi_use: val })}
                      >
                        <SelectTrigger id="edit_p_cfdi" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="G01">G01 - Adquisición de mercancías</SelectItem>
                          <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                          <SelectItem value="I01">I01 - Construcciones</SelectItem>
                          <SelectItem value="P01">P01 - Por definir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="edit_p_iva" className="text-xs">Tasa de IVA</Label>
                      <Select
                        value={editForm.iva_rate}
                        onValueChange={(val) => setEditForm({ ...editForm, iva_rate: val })}
                      >
                        <SelectTrigger id="edit_p_iva" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.16">16% (IVA General)</SelectItem>
                          <SelectItem value="0.08">8% (Fronterizo)</SelectItem>
                          <SelectItem value="0.00">0% (Tasa Cero)</SelectItem>
                          <SelectItem value="0.0">Exento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="edit_p_isr_ret" className="text-xs">Retención ISR</Label>
                      <Select
                        value={editForm.isr_retention_rate}
                        onValueChange={(val) => setEditForm({ ...editForm, isr_retention_rate: val })}
                      >
                        <SelectTrigger id="edit_p_isr_ret" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.0">Sin Retención (0%)</SelectItem>
                          <SelectItem value="0.0125">1.25% (RESICO)</SelectItem>
                          <SelectItem value="0.10">10% (Honorarios/Servicios)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="edit_p_iva_ret" className="text-xs">Retención IVA</Label>
                      <Select
                        value={editForm.iva_retention_rate}
                        onValueChange={(val) => setEditForm({ ...editForm, iva_retention_rate: val })}
                      >
                        <SelectTrigger id="edit_p_iva_ret" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.0">Sin Retención (0%)</SelectItem>
                          <SelectItem value="0.10667">10.667% (Servicios 2/3)</SelectItem>
                          <SelectItem value="0.04">4% (Fletes/Transporte)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(() => {
                    const subtotal = parseFloat(editForm.custom_price_total || editForm.base_price_total || "0");
                    if (subtotal <= 0) return null;
                    const totals = getProjectTotals(subtotal, true, editForm.iva_rate, editForm.isr_retention_rate, editForm.iva_retention_rate);
                    return (
                      <div className="border-t pt-2 mt-2 space-y-1 text-[11px] font-mono">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>IVA ({(parseFloat(editForm.iva_rate) * 100).toFixed(0)}%):</span>
                          <span className="text-green-600">+{formatCurrency(totals.iva)}</span>
                        </div>
                        {totals.isrRetention > 0 && (
                          <div className="flex justify-between text-red-500">
                            <span>Ret. ISR ({(parseFloat(editForm.isr_retention_rate) * 100).toFixed(2)}%):</span>
                            <span>-{formatCurrency(totals.isrRetention)}</span>
                          </div>
                        )}
                        {totals.ivaRetention > 0 && (
                          <div className="flex justify-between text-red-500">
                            <span>Ret. IVA ({(parseFloat(editForm.iva_retention_rate) * 100).toFixed(3)}%):</span>
                            <span>-{formatCurrency(totals.ivaRetention)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold border-t pt-1 text-xs text-foreground">
                          <span>Total Facturado:</span>
                          <span>{formatCurrency(totals.total)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit_p_description">Descripción / Comentarios</Label>
                <textarea
                  id="edit_p_description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Ej: Detalles del pedido, tallas, requerimientos especiales..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingProject(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateProjectMutation.isPending}>
                {updateProjectMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirm Delete Project */}
      <Dialog open={!!deletingProjectId} onOpenChange={(open) => !open && setDeletingProjectId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminar Proyecto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer y eliminará sus registros vinculados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeletingProjectId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? "Eliminando..." : "Eliminar Definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Import Excel */}
      <ImportProjectModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        clients={clients}
        projects={processedProjects}
        onImportNewProject={handleImportNewProject}
        onImportUpdateProject={handleImportUpdateProject}
      />
    </div>
  );
}
