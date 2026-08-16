import * as React from "react";
import { formatLocalDate, parseLocalDate } from "@/lib/utils";
import { DatePicker } from "@/components/shared/DatePicker";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useProjects,
  usePayments,
  useFinanceClients,
  useCreateProject,
  useCreatePayment,
  useUpdateProject,
  useDeleteProject,
  useUpdatePayment,
  useCreateFinanceClient,
  useExpenses,
  FINANCE_KEYS,
} from "../hooks";
import { bulkImportProjects, uploadPaymentProof, uploadPurchaseOrder } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { sileo } from "sileo";
import {
  Plus,
  Share2,
  FileSpreadsheet,
  Download,
  Check,
  Copy,
  DollarSign,
  UserPlus,
  Loader2,
  Trash2,
  Search,
  Pencil,
  Calendar,
  Clock,
  Eye,
  Upload,
  ExternalLink,
} from "lucide-react";

const projectStatusTranslations: Record<string, string> = {
  draft: "borrador",
  pending_approval: "pendiente de aprobación",
  approved: "aprobado",
  completed: "completado",
  cancelled: "cancelado",
};

const paymentMethodTranslations: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  gateway: "Pasarela Online",
  redistribution: "Redistribución",
  atm_withdrawal: "Retiro sin Tarjeta",
};

export function Proyectos() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const canManageProjects = isAdmin || profile?.role === "project_manager";
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: clients = [] } = useFinanceClients();
  const { data: expenses = [] } = useExpenses();

  const createProjectMutation = useCreateProject();
  const createPaymentMutation = useCreatePayment();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const updatePaymentMutation = useUpdatePayment();
  const createClientMutation = useCreateFinanceClient();

  // State
  const [projectSearch, setProjectSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [clientFilter, setClientFilter] = React.useState("all");
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [selectedProjectForPayment, setSelectedProjectForPayment] = React.useState<any>(null);
  const [selectedProjectForViewPayments, setSelectedProjectForViewPayments] = React.useState<any>(null);
  const [isViewPaymentsOpen, setIsViewPaymentsOpen] = React.useState(false);
  const [uploadingProofId, setUploadingProofId] = React.useState<string | null>(null);

  // Inline Client creation state
  const [isCreateClientOpen, setIsCreateClientOpen] = React.useState(false);
  const [clientForm, setClientForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    tax_id_rfc: "",
    fiscal_regime: "",
  });

  // New Project Form
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
    iva_rate: "0.16",
    isr_retention_rate: "0.0",
    iva_retention_rate: "0.0",
  });

  const [isEditProjectOpen, setIsEditProjectOpen] = React.useState(false);
  const [editProjectForm, setEditProjectForm] = React.useState({
    id: "",
    client_id: "",
    name: "",
    base_price_total: "",
    custom_price_total: "",
    status: "draft" as any,
    requires_invoice: false,
    cfdi_use: "G03",
    order_number: "",
    description: "",
    iva_rate: "0.16",
    isr_retention_rate: "0.0",
    iva_retention_rate: "0.0",
  });
  
  // Installment schedules state
  const [installments, setInstallments] = React.useState<any[]>([]);

  // Register Payment Form (linked to specific card)
  const [paymentForm, setPaymentForm] = React.useState({
    amount: "",
    method: "transfer" as any,
    folio: "",
    proof_file: null as File | null,
  });

  const [allocatedAmounts, setAllocatedAmounts] = React.useState<Record<string, string>>({});

  const [isUploading, setIsUploading] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);

  const [purchaseOrderFile, setPurchaseOrderFile] = React.useState<File | null>(null);
  const [editPurchaseOrderFile, setEditPurchaseOrderFile] = React.useState<File | null>(null);
  const [editPurchaseOrderUrl, setEditPurchaseOrderUrl] = React.useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { client_id, name, base_price_total, custom_price_total } = projectForm;
    if (!client_id || !name) {
      sileo.error({ title: "Por favor llena los campos requeridos" });
      return;
    }

    try {
      const parsedBase = base_price_total ? parseFloat(base_price_total) : 0;
      const parsedCustom = custom_price_total ? parseFloat(custom_price_total) : parsedBase;

      const { total: targetTotal } = getProjectTotals(
        parsedCustom,
        projectForm.requires_invoice,
        projectForm.iva_rate,
        projectForm.isr_retention_rate,
        projectForm.iva_retention_rate
      );

      // Validate schedules total
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
        client_id,
        name,
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

      sileo.success({ title: "Proyecto registrado correctamente" });
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
        iva_rate: "0.16",
        isr_retention_rate: "0.0",
        iva_retention_rate: "0.0",
      });
      setPurchaseOrderFile(null);
      setInstallments([]);
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    }
  };

  const handleOpenEditDialog = (project: any) => {
    setEditProjectForm({
      id: project.id,
      client_id: project.client_id,
      name: project.name,
      base_price_total: project.base_price_total ? project.base_price_total.toString() : "",
      custom_price_total: project.custom_price_total ? project.custom_price_total.toString() : "",
      status: project.status,
      requires_invoice: project.requires_invoice,
      cfdi_use: project.cfdi_use || "G03",
      order_number: project.order_number || "",
      description: project.description || "",
      iva_rate: project.iva_rate !== undefined ? project.iva_rate.toString() : "0.16",
      isr_retention_rate: project.isr_retention_rate !== undefined ? project.isr_retention_rate.toString() : "0.0",
      iva_retention_rate: project.iva_retention_rate !== undefined ? project.iva_retention_rate.toString() : "0.0",
    });
    setEditPurchaseOrderUrl(project.purchase_order_url || null);
    setEditPurchaseOrderFile(null);
    setIsEditProjectOpen(true);
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.")) return;
    try {
      await deleteProjectMutation.mutateAsync(id);
      sileo.success({ title: "Proyecto eliminado con éxito" });
    } catch (err: any) {
      sileo.error({ title: `Error al eliminar proyecto: ${err.message}` });
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, client_id, name, base_price_total, custom_price_total, status, requires_invoice, cfdi_use, order_number, description } = editProjectForm;
    if (!client_id || !name) {
      sileo.error({ title: "Por favor llena los campos requeridos" });
      return;
    }

    try {
      const parsedBase = base_price_total ? parseFloat(base_price_total) : 0;
      const parsedCustom = custom_price_total ? parseFloat(custom_price_total) : parsedBase;

      let purchase_order_url = editPurchaseOrderUrl;
      if (editPurchaseOrderFile) {
        purchase_order_url = await uploadPurchaseOrder(editPurchaseOrderFile);
      }

      await updateProjectMutation.mutateAsync({
        id,
        payload: {
          client_id,
          name,
          base_price_total: parsedBase,
          custom_price_total: parsedCustom,
          status,
          requires_invoice,
          cfdi_use: requires_invoice ? cfdi_use : null,
          order_number: order_number || null,
          description: description || null,
          purchase_order_url,
          iva_rate: requires_invoice ? parseFloat(editProjectForm.iva_rate) : 0.16,
          isr_retention_rate: requires_invoice ? parseFloat(editProjectForm.isr_retention_rate) : 0.0,
          iva_retention_rate: requires_invoice ? parseFloat(editProjectForm.iva_retention_rate) : 0.0,
        },
      });

      sileo.success({ title: "Proyecto actualizado correctamente" });
      setIsEditProjectOpen(false);
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    }
  };

  const handleOpenPaymentDialog = (project: any) => {
    setSelectedProjectForPayment(project);
    setPaymentForm({
      amount: project.remainingDebt.toString(),
      method: "transfer",
      folio: "",
      proof_file: null,
    });
    setAllocatedAmounts({});
    setIsPaymentOpen(true);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForPayment || !paymentForm.amount) {
      sileo.error({ title: "Monto requerido" });
      return;
    }

    const mainDebt = selectedProjectForPayment.remainingDebt;
    const enteredAmount = parseFloat(paymentForm.amount);
    const excess = enteredAmount - mainDebt;

    let distributedSum = 0;
    if (excess > 0) {
      distributedSum = Object.values(allocatedAmounts).reduce((sum, val) => sum + parseFloat(val || "0"), 0);
      if (distributedSum > excess + 0.01) {
        sileo.error({ title: "La distribución excede el dinero restante" });
        return;
      }
    }

    setIsUploading(true);
    try {
      let proof_url = null;
      if (paymentForm.proof_file) {
        proof_url = await uploadPaymentProof(paymentForm.proof_file);
      }

      const promises = [];
      const mainAmount = enteredAmount - distributedSum;

      if (mainAmount > 0) {
        promises.push(createPaymentMutation.mutateAsync({
          project_id: selectedProjectForPayment.id,
          amount: mainAmount,
          method: paymentForm.method,
          folio: paymentForm.folio || null,
          proof_url,
        }));
      }

      for (const pId of Object.keys(allocatedAmounts)) {
        const amt = parseFloat(allocatedAmounts[pId] || "0");
        if (amt > 0) {
          promises.push(createPaymentMutation.mutateAsync({
            project_id: pId,
            amount: amt,
            method: paymentForm.method,
            folio: paymentForm.folio || null,
            proof_url,
          }));
        }
      }

      await Promise.all(promises);

      sileo.success({ title: "Pago registrado correctamente" });
      setIsPaymentOpen(false);
      setSelectedProjectForPayment(null);
      setAllocatedAmounts({});
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAttachProof = async (paymentId: string, file: File) => {
    if (!file) return;
    setUploadingProofId(paymentId);
    
    const promise = (async () => {
      const proof_url = await uploadPaymentProof(file);
      await updatePaymentMutation.mutateAsync({
        id: paymentId,
        payload: { proof_url },
      });
    })();

    sileo.promise(promise, {
      loading: { title: "Subiendo comprobante..." },
      success: { title: "Comprobante guardado correctamente" },
      error: {
        title: "Error al subir el comprobante",
        description: "No se pudo guardar el comprobante de pago."
      }
    });

    try {
      await promise;
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingProofId(null);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "client_name,client_email,client_phone,project_name,base_price,custom_price,status,requires_invoice,cfdi_use\n" +
      "Nike Mexico,contact@nike.com,5512345678,Uniformes Futbol G1,50000,45000,approved,true,G03\n" +
      "Adidas Outlet,outlet@adidas.mx,5587654321,Uniformes Basket V2,30000,30000,draft,false,\n";
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "proyecto_importacion_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").filter((line) => line.trim() !== "");
      if (lines.length <= 1) {
        sileo.error({ title: "El archivo está vacío o no tiene registros." });
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const currentline = lines[i].split(",").map((v) => v.trim());
        if (currentline.length < headers.length) continue;

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = currentline[index];
        });
        rows.push(row);
      }

      setIsUploading(true);
      try {
        const res = await bulkImportProjects(rows);
        sileo.success({ title: `Importados ${res.imported} proyectos.` });
        if (res.errors.length > 0) {
          sileo.warning({ title: "Errores en la importación", description: res.errors.slice(0, 3).join("\n") });
        }
        setIsImportOpen(false);
        queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      } catch (err: any) {
        sileo.error({ title: `Error: ${err.message}` });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(importFile);
  };

  const copyToClipboard = (path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    sileo.success({ title: "Enlace copiado al portapapeles" });
  };

  // Helper functions for dynamic initials logos
  const getInitials = (name: string = "") => {
    const parts = name.trim().split(" ");
    if (parts.length === 0 || !name) return "?";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getGradient = (name: string = "") => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${h}, 70%, 55%) 0%, hsl(${(h + 40) % 360}, 70%, 40%) 100%)`;
  };

  // Compute stats in memory
  const processedProjects = React.useMemo(() => {
    return projects.map((p) => {
      const projPayments = payments.filter((pay) => pay.project_id === p.id);
      const totalPaid = projPayments.reduce((sum, pay) => sum + Number(pay.amount), 0);
      
      const subtotal = Number(p.custom_price_total);
      const effectiveTotal = p.requires_invoice
        ? subtotal + (subtotal * (p.iva_rate ?? 0.16)) - (subtotal * ((p.isr_retention_rate ?? 0) + (p.iva_retention_rate ?? 0)))
        : subtotal;

      const remainingDebt = p.status === 'cancelled' ? 0 : effectiveTotal - totalPaid;
      const progressPercent = effectiveTotal > 0 
        ? Math.min(Math.round((totalPaid / effectiveTotal) * 100), 100) 
        : 0;

      return {
        ...p,
        totalPaid,
        remainingDebt: remainingDebt > 0 ? remainingDebt : 0,
        progressPercent,
        effectiveTotal,
      };
    });
  }, [projects, payments]);

  const otherProjectsWithDebt = React.useMemo(() => {
    if (!selectedProjectForPayment) return [];
    return processedProjects.filter((p) => 
      p.client_id === selectedProjectForPayment.client_id && 
      p.id !== selectedProjectForPayment.id &&
      p.remainingDebt > 0
    );
  }, [selectedProjectForPayment, processedProjects]);

  const projectPaymentsForView = React.useMemo(() => {
    if (!selectedProjectForViewPayments) return [];
    return payments.filter((pay) => pay.project_id === selectedProjectForViewPayments.id);
  }, [selectedProjectForViewPayments, payments]);

  const currentViewProjectDetails = React.useMemo(() => {
    if (!selectedProjectForViewPayments) return null;
    return processedProjects.find((p) => p.id === selectedProjectForViewPayments.id) || null;
  }, [selectedProjectForViewPayments, processedProjects]);

  // Summatory of incomes and outcomes for selected client
  const clientMetrics = React.useMemo(() => {
    if (clientFilter === "all") return null;

    // Filter projects of this client
    const targetProjects = processedProjects.filter((p) => p.client_id === clientFilter);
    const targetProjectIds = new Set(targetProjects.map((p) => p.id));

    // Sum of payments for these projects
    const totalIncomes = payments
      .filter((pay) => targetProjectIds.has(pay.project_id))
      .reduce((sum, pay) => sum + Number(pay.amount), 0);

    // Sum of expenses for these projects
    const totalOutcomes = expenses
      .filter((exp) => exp.project_id && targetProjectIds.has(exp.project_id))
      .reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Sum of remaining debts of the projects
    const totalDebt = targetProjects.reduce((sum, p) => sum + p.remainingDebt, 0);

    return {
      totalIncomes,
      totalOutcomes,
      totalDebt,
      netDifference: totalIncomes - totalOutcomes,
      projectsCount: targetProjects.length,
    };
  }, [clientFilter, processedProjects, payments, expenses]);

  // Filter projects list
  const filteredProjects = processedProjects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.client?.name.toLowerCase().includes(projectSearch.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesClient = clientFilter === "all" || p.client_id === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Proyectos y Cotizaciones</h2>
          <p className="text-muted-foreground text-sm">Administración del catálogo de cotizaciones, precios personalizados y seguimiento de contratos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Importar Excel/CSV
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/clients?create=true">
              <UserPlus className="h-4 w-4 mr-2" /> Nuevo Cliente
            </Link>
          </Button>
          <Button size="sm" onClick={() => setIsProjectOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Crear Proyecto/Cotización
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar proyecto o cliente..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="pending_approval">Pendiente Aprobación</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Client Financial Metrics Banner */}
      {clientMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <Card className="bg-green-500/5 border-green-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Ingresos del Cliente (Cobrado)</CardDescription>
              <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(clientMetrics.totalIncomes)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-red-500/5 border-red-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">Egresos del Cliente (Gastos)</CardDescription>
              <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(clientMetrics.totalOutcomes)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className={clientMetrics.totalDebt > 0 ? "bg-yellow-500/5 border-yellow-500/20" : "bg-green-500/5 border-green-500/20"}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deuda Pendiente</CardDescription>
              <CardTitle className={`text-2xl font-bold ${clientMetrics.totalDebt > 0 ? "text-yellow-600 dark:text-yellow-500" : "text-green-600"}`}>
                {clientMetrics.totalDebt > 0 ? formatCurrency(clientMetrics.totalDebt) : "Liquidado"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className={clientMetrics.netDifference >= 0 ? "bg-primary/5 border-primary/20" : "bg-yellow-500/5 border-yellow-500/20"}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Diferencia Neta</CardDescription>
              <CardTitle className={`text-2xl font-bold ${clientMetrics.netDifference >= 0 ? "text-primary" : "text-yellow-600"}`}>
                {clientMetrics.netDifference >= 0 ? "+" : ""}{formatCurrency(clientMetrics.netDifference)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Cards Grid */}
      {projectsLoading ? (
        <div className="text-center py-10 flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Cargando proyectos...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-card/50">
          <p className="font-semibold text-sm">No se encontraron proyectos</p>
          <p className="text-xs mt-1">Crea un nuevo proyecto o cotización para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => (
            <Card key={p.id} className="flex flex-col h-full hover:shadow-md transition-shadow relative overflow-hidden group">
              {/* Dynamic decorative border top */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ background: getGradient(p.client?.name) }}
              />

              <CardHeader className="pt-6 pb-4 flex flex-row items-start gap-4 justify-between">
                <div className="flex flex-row items-start gap-4 min-w-0 flex-1">
                  {/* Dynamic gradient default logo avatar */}
                  <div 
                    className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white text-base font-bold shadow-inner"
                    style={{ background: getGradient(p.client?.name) }}
                  >
                    {getInitials(p.client?.name)}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight text-foreground truncate block">
                      {p.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1 truncate block">
                      {p.client ? (
                        <Link
                          to={`/clients/${p.client.id}`}
                          className="hover:underline hover:text-primary transition-colors"
                        >
                          {p.client.name}
                        </Link>
                      ) : (
                        "Sin Cliente"
                      )}
                    </CardDescription>
                    {p.order_number && (
                      <span className="inline-block text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded mt-1 mr-1">
                        Pedido: {p.order_number}
                      </span>
                    )}
                    {p.purchase_order_url && (
                      <a
                        href={p.purchase_order_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-primary font-mono bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded mt-1 transition-colors"
                      >
                        <Download className="h-3 w-3" /> OC
                      </a>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge
                        variant={
                          p.status === "completed"
                            ? "default"
                            : p.status === "approved"
                            ? "secondary"
                            : p.status === "pending_approval"
                            ? "outline"
                            : p.status === "cancelled"
                            ? "destructive"
                            : "outline"
                        }
                        className="capitalize text-[10px] py-0 px-2"
                      >
                        {projectStatusTranslations[p.status] || p.status}
                      </Badge>
                      {(!p.base_price_total || p.base_price_total === 0) && (
                        <Badge
                          variant="outline"
                          className="border-amber-500 text-amber-500 bg-amber-500/10 text-[10px] py-0 px-2 font-medium"
                        >
                          Precio Pendiente
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenEditDialog(p)}
                    title="Editar Proyecto"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteProject(p.id)}
                    title="Eliminar Proyecto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="py-2 flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4 border-t border-b py-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Precio Lista</span>
                    {p.base_price_total > 0 ? (
                      <span className="font-semibold text-foreground">{formatCurrency(p.base_price_total)}</span>
                    ) : (
                      <span className="text-amber-500 font-medium italic">Pendiente</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Precio Cobrado</span>
                    {p.custom_price_total > 0 ? (
                      <span className="font-bold text-foreground">{formatCurrency(p.custom_price_total)}</span>
                    ) : (
                      <span className="text-amber-500 font-bold italic">Pendiente</span>
                    )}
                  </div>
                </div>

                {/* Progress Bar of Payments */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Progreso de Pago</span>
                    <span className="text-foreground">{p.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${p.progressPercent}%`,
                        background: getGradient(p.client?.name),
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span>Cobrado: {formatCurrency(p.totalPaid)}</span>
                    {p.remainingDebt > 0 ? (
                      <span className="text-yellow-600 dark:text-yellow-500 font-semibold">Deuda: {formatCurrency(p.remainingDebt)}</span>
                    ) : (
                      <span className="text-green-600 font-semibold flex items-center gap-0.5"><Check className="h-3 w-3 inline" /> Liquidado</span>
                    )}
                  </div>
                </div>

                {p.requires_invoice && (
                  <div className="bg-slate-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-border/60 text-[10px] space-y-1.5 mt-3">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="font-medium text-foreground">{formatCurrency(p.custom_price_total)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>IVA ({( (p.iva_rate ?? 0.16) * 100).toFixed(0)}%):</span>
                      <span className="text-green-600 font-medium">+{formatCurrency(p.custom_price_total * (p.iva_rate ?? 0.16))}</span>
                    </div>
                    {(p.isr_retention_rate ?? 0) > 0 && (
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>Ret. ISR ({((p.isr_retention_rate ?? 0) * 100).toFixed(2)}%):</span>
                        <span className="font-medium">-{formatCurrency(p.custom_price_total * (p.isr_retention_rate ?? 0))}</span>
                      </div>
                    )}
                    {(p.iva_retention_rate ?? 0) > 0 && (
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>Ret. IVA ({((p.iva_retention_rate ?? 0) * 100).toFixed(3)}%):</span>
                        <span className="font-medium">-{formatCurrency(p.custom_price_total * (p.iva_retention_rate ?? 0))}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t pt-1.5 text-foreground mt-1">
                      <span>Total Facturado:</span>
                      <span>{formatCurrency(p.effectiveTotal)}</span>
                    </div>
                  </div>
                )}

                {p.description && (
                  <p className="text-xs text-muted-foreground italic line-clamp-2 mt-2 pt-2 border-t" title={p.description}>
                    {p.description}
                  </p>
                )}

                <div className="flex flex-col gap-1 text-[10px] text-muted-foreground pt-2 mt-2 border-t">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                    <span>Creado: {formatDateTime(p.created_at)}</span>
                  </div>
                  {p.updated_at && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                      <span>Actualizado: {formatDateTime(p.updated_at)}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-4 pb-5 border-t gap-2 flex flex-col items-stretch">
                <div className="flex gap-2 justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => copyToClipboard(`/quote/${p.share_token}`)}
                    title="Copiar Enlace Cotización"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Cotización
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => copyToClipboard(`/report-payment/${p.share_token}`)}
                    title="Copiar Enlace de Pago"
                  >
                    <Copy className="h-3.5 w-3.5" /> Enlace Pago
                  </Button>
                </div>

                <div className="flex gap-2">
                  {p.status === "draft" && (
                    <Button
                      size="sm"
                      className="flex-1 text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-medium"
                      onClick={() =>
                        updateProjectMutation.mutate({ id: p.id, payload: { status: "pending_approval" } })
                      }
                    >
                      Enviar a Aprobación
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => {
                      setSelectedProjectForViewPayments(p);
                      setIsViewPaymentsOpen(true);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver Pagos
                  </Button>
                  {p.remainingDebt > 0 && (
                    <Button
                      size="sm"
                      className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white font-medium"
                      onClick={() => handleOpenPaymentDialog(p)}
                    >
                      <DollarSign className="h-3.5 w-3.5 mr-1 inline" /> Registrar Cobro
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: Create Project */}
      <Dialog open={isProjectOpen} onOpenChange={setIsProjectOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Proyecto / Cotización</DialogTitle>
            <DialogDescription>Registra un nuevo proyecto con precios y plazos de pago personalizados.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="p_client">Cliente *</Label>
                <Select
                  value={projectForm.client_id}
                  onValueChange={(val) => {
                    if (val === "CREATE_NEW") {
                      setIsCreateClientOpen(true);
                    } else {
                      setProjectForm({ ...projectForm, client_id: val });
                    }
                  }}
                >
                  <SelectTrigger id="p_client">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREATE_NEW" className="text-primary font-semibold">
                      + Crear Cliente
                    </SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="p_name">Nombre del Proyecto *</Label>
                <Input
                  id="p_name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="Ej: Uniformes Escuela A"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="p_order_number">Número de Pedido</Label>
                <Input
                  id="p_order_number"
                  value={projectForm.order_number}
                  onChange={(e) => setProjectForm({ ...projectForm, order_number: e.target.value })}
                  placeholder="Ej: PO-2026-102"
                />
              </div>
              <div className="space-y-1">
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
              <div className="space-y-1">
                <Label htmlFor="p_base">Precio de Lista</Label>
                <Input
                  id="p_base"
                  type="number"
                  value={projectForm.base_price_total}
                  onChange={(e) => setProjectForm({ ...projectForm, base_price_total: e.target.value })}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1">
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

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-1">
                <Label htmlFor="p_status">Estado Inicial</Label>
                <Select
                  value={projectForm.status}
                  onValueChange={(val: any) => setProjectForm({ ...projectForm, status: val })}
                >
                  <SelectTrigger id="p_status">
                    <SelectValue />
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

              <div className="flex items-center space-x-2 pt-5">
                <Checkbox
                  id="p_invoice"
                  checked={projectForm.requires_invoice}
                  onCheckedChange={(checked) => setProjectForm({ ...projectForm, requires_invoice: !!checked })}
                />
                <Label htmlFor="p_invoice" className="cursor-pointer">¿Requiere Factura SAT CFDI?</Label>
              </div>
            </div>

            {projectForm.requires_invoice && (
              <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="p_cfdi">Uso de CFDI (Default)</Label>
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
                    <Label htmlFor="p_iva">Tasa de IVA</Label>
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
                    <Label htmlFor="p_isr_ret">Retención ISR</Label>
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
                    <Label htmlFor="p_iva_ret">Retención IVA</Label>
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

                {/* Dynamic breakdown */}
                {(() => {
                  const subtotal = parseFloat(projectForm.custom_price_total || projectForm.base_price_total || "0");
                  if (subtotal <= 0) return null;
                  const totals = getProjectTotals(subtotal, true, projectForm.iva_rate, projectForm.isr_retention_rate, projectForm.iva_retention_rate);
                  return (
                    <div className="border-t pt-2 mt-2 space-y-1 text-xs font-mono">
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
                      <div className="flex justify-between font-bold border-t pt-1 text-sm text-foreground">
                        <span>Total Facturado:</span>
                        <span>{formatCurrency(totals.total)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="space-y-1">
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

              {/* Installments Visual Progress & Summary */}
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
                <div className="space-y-2">
                  {installments.map((inst, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <div className="flex-1">
                        <Input
                          placeholder="Monto ($)"
                          type="number"
                          value={inst.expected_amount}
                          onChange={(e) => handleInstallmentChange(index, "expected_amount", e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <DatePicker
                          date={inst.due_date ? parseLocalDate(inst.due_date) : undefined}
                          setDate={(d) => handleInstallmentChange(index, "due_date", d ? formatLocalDate(d) : "")}
                          className="w-full"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveInstallment(index)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? "Guardando..." : "Crear Proyecto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Project */}
      <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Proyecto / Cotización</DialogTitle>
            <DialogDescription>Modifica los datos del proyecto o cotización existente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit_p_client">Cliente *</Label>
                <Select
                  value={editProjectForm.client_id}
                  onValueChange={(val) => setEditProjectForm({ ...editProjectForm, client_id: val })}
                >
                  <SelectTrigger id="edit_p_client">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_p_name">Nombre del Proyecto *</Label>
                <Input
                  id="edit_p_name"
                  value={editProjectForm.name}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, name: e.target.value })}
                  placeholder="Ej: Uniformes Escuela A"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit_p_order_number">Número de Pedido</Label>
                <Input
                  id="edit_p_order_number"
                  value={editProjectForm.order_number}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, order_number: e.target.value })}
                  placeholder="Ej: PO-2026-102"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_p_purchase_order_file">Orden de Compra (Archivo)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit_p_purchase_order_file"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setEditPurchaseOrderFile(file);
                    }}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                    className="flex-1"
                  />
                  {editPurchaseOrderUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(editPurchaseOrderUrl, "_blank")}
                      title="Ver archivo actual"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {editPurchaseOrderUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditPurchaseOrderUrl(null)}
                      title="Eliminar archivo"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit_p_base">Precio de Lista</Label>
                <Input
                  id="edit_p_base"
                  type="number"
                  value={editProjectForm.base_price_total}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, base_price_total: e.target.value })}
                  placeholder="50000"
                  disabled={!canManageProjects}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_p_custom">Precio Cobrado (Modificable)</Label>
                <Input
                  id="edit_p_custom"
                  type="number"
                  value={editProjectForm.custom_price_total}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, custom_price_total: e.target.value })}
                  placeholder="45000"
                  disabled={!canManageProjects}
                />
              </div>
            </div>
            {!canManageProjects && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                * Solo los administradores o gestores de proyectos pueden definir o modificar los precios de lista y cobrados.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-1">
                <Label htmlFor="edit_p_status">Estado</Label>
                <Select
                  value={editProjectForm.status}
                  onValueChange={(val: any) => setEditProjectForm({ ...editProjectForm, status: val })}
                >
                  <SelectTrigger id="edit_p_status">
                    <SelectValue />
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

              <div className="flex items-center space-x-2 pt-5">
                <Checkbox
                  id="edit_p_invoice"
                  checked={editProjectForm.requires_invoice}
                  onCheckedChange={(checked) => setEditProjectForm({ ...editProjectForm, requires_invoice: !!checked })}
                />
                <Label htmlFor="edit_p_invoice" className="cursor-pointer">¿Requiere Factura SAT CFDI?</Label>
              </div>
            </div>

            {editProjectForm.requires_invoice && (
              <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit_p_cfdi">Uso de CFDI (Default)</Label>
                    <Select
                      value={editProjectForm.cfdi_use}
                      onValueChange={(val) => setEditProjectForm({ ...editProjectForm, cfdi_use: val })}
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
                    <Label htmlFor="edit_p_iva">Tasa de IVA</Label>
                    <Select
                      value={editProjectForm.iva_rate}
                      onValueChange={(val) => setEditProjectForm({ ...editProjectForm, iva_rate: val })}
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
                    <Label htmlFor="edit_p_isr_ret">Retención ISR</Label>
                    <Select
                      value={editProjectForm.isr_retention_rate}
                      onValueChange={(val) => setEditProjectForm({ ...editProjectForm, isr_retention_rate: val })}
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
                    <Label htmlFor="edit_p_iva_ret">Retención IVA</Label>
                    <Select
                      value={editProjectForm.iva_retention_rate}
                      onValueChange={(val) => setEditProjectForm({ ...editProjectForm, iva_retention_rate: val })}
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

                {/* Dynamic breakdown */}
                {(() => {
                  const subtotal = parseFloat(editProjectForm.custom_price_total || editProjectForm.base_price_total || "0");
                  if (subtotal <= 0) return null;
                  const totals = getProjectTotals(subtotal, true, editProjectForm.iva_rate, editProjectForm.isr_retention_rate, editProjectForm.iva_retention_rate);
                  return (
                    <div className="border-t pt-2 mt-2 space-y-1 text-xs font-mono">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>IVA ({(parseFloat(editProjectForm.iva_rate) * 100).toFixed(0)}%):</span>
                        <span className="text-green-600">+{formatCurrency(totals.iva)}</span>
                      </div>
                      {totals.isrRetention > 0 && (
                        <div className="flex justify-between text-red-500">
                          <span>Ret. ISR ({(parseFloat(editProjectForm.isr_retention_rate) * 100).toFixed(2)}%):</span>
                          <span>-{formatCurrency(totals.isrRetention)}</span>
                        </div>
                      )}
                      {totals.ivaRetention > 0 && (
                        <div className="flex justify-between text-red-500">
                          <span>Ret. IVA ({(parseFloat(editProjectForm.iva_retention_rate) * 100).toFixed(3)}%):</span>
                          <span>-{formatCurrency(totals.ivaRetention)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t pt-1 text-sm text-foreground">
                        <span>Total Facturado:</span>
                        <span>{formatCurrency(totals.total)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="edit_p_description">Descripción / Comentarios</Label>
              <textarea
                id="edit_p_description"
                value={editProjectForm.description}
                onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
                placeholder="Ej: Detalles del pedido, tallas, requerimientos especiales..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditProjectOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateProjectMutation.isPending}>
                {updateProjectMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Historial de Pagos */}
      {currentViewProjectDetails && (
        <Dialog open={isViewPaymentsOpen} onOpenChange={setIsViewPaymentsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Historial de Pagos: {currentViewProjectDetails.name}</DialogTitle>
              <DialogDescription>
                Resumen de cobros y comprobantes asociados al proyecto de **{currentViewProjectDetails.client?.name}**.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="grid grid-cols-3 gap-4 border p-3 rounded-lg bg-slate-50 dark:bg-zinc-900/50 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Total Proyecto:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(currentViewProjectDetails.effectiveTotal)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Total Cobrado:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(currentViewProjectDetails.totalPaid)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Deuda Restante:</span>
                  <span className={`font-semibold ${currentViewProjectDetails.remainingDebt > 0 ? "text-yellow-600" : "text-green-600"}`}>
                    {currentViewProjectDetails.remainingDebt > 0 ? formatCurrency(currentViewProjectDetails.remainingDebt) : "Liquidado"}
                  </span>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3">Fecha/Hora</th>
                        <th className="p-3">Monto</th>
                        <th className="p-3">Método</th>
                        <th className="p-3">Folio / Ref</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-right">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {projectPaymentsForView.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-muted-foreground italic">
                            No hay pagos registrados para este proyecto.
                          </td>
                        </tr>
                      ) : (
                        projectPaymentsForView.map((pay) => (
                          <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20">
                            <td className="p-3 text-xs">{formatDateTime(pay.created_at)}</td>
                            <td className="p-3 font-semibold text-foreground">{formatCurrency(pay.amount)}</td>
                            <td className="p-3 text-xs">{paymentMethodTranslations[pay.method] || pay.method}</td>
                            <td className="p-3 text-xs font-mono">{pay.folio || "-"}</td>
                            <td className="p-3">
                              <Badge variant={pay.is_reconciled ? "default" : "secondary"} className="text-[10px] py-0 px-2">
                                {pay.is_reconciled ? "Conciliado" : "Pendiente"}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              {pay.proof_url ? (
                                <div className="flex justify-end gap-2 items-center">
                                  <a
                                    href={pay.proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-xs text-primary hover:underline gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" /> Ver
                                  </a>
                                  <label className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 border border-dashed rounded px-1.5 py-0.5">
                                    <Upload className="h-2.5 w-2.5" /> Reemplazar
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleAttachProof(pay.id, file);
                                      }}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <div className="flex justify-end">
                                  {uploadingProofId === pay.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <label className="cursor-pointer text-xs text-primary hover:underline flex items-center gap-1">
                                      <Upload className="h-3.5 w-3.5" /> Adjuntar
                                      <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleAttachProof(pay.id, file);
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between items-center gap-2 sm:justify-between">
              <Button variant="outline" size="sm" onClick={() => setIsViewPaymentsOpen(false)}>
                Cerrar
              </Button>
              {currentViewProjectDetails.remainingDebt > 0 && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium"
                  onClick={() => {
                    setIsViewPaymentsOpen(false);
                    handleOpenPaymentDialog(currentViewProjectDetails);
                  }}
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1 inline" /> Registrar Cobro
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Registrar Cobro */}
      {selectedProjectForPayment && (
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Cobro para {selectedProjectForPayment.name}</DialogTitle>
              <DialogDescription>
                Abona un monto al proyecto de **{selectedProjectForPayment.client?.name}** (Deuda pendiente: {formatCurrency(selectedProjectForPayment.remainingDebt)}).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pb-1 border-b border-border/40">
                  <span className="text-foreground font-semibold truncate max-w-[200px]">{selectedProjectForPayment.name}</span>
                  {selectedProjectForPayment.client?.name && (
                    <span className="truncate max-w-[150px]">{selectedProjectForPayment.client.name}</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-background/80 border border-border/50">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Monto Total
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                      {formatCurrency(selectedProjectForPayment.effectiveTotal ?? selectedProjectForPayment.custom_price_total)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Pagado a la Fecha
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {formatCurrency(selectedProjectForPayment.totalPaid)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Deuda Pendiente
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                      {formatCurrency(selectedProjectForPayment.remainingDebt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="pay_amt">Monto a Registrar ($) *</Label>
                  <Input
                    id="pay_amt"
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="15000"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay_method">Método de Pago</Label>
                  <Select
                    value={paymentForm.method}
                    onValueChange={(val: any) => setPaymentForm({ ...paymentForm, method: val })}
                  >
                    <SelectTrigger id="pay_method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo (Físico)</SelectItem>
                      <SelectItem value="transfer">Transferencia Bancaria</SelectItem>
                      <SelectItem value="card">Tarjeta Crédito/Débito</SelectItem>
                      <SelectItem value="gateway">Pasarela Online (Stripe)</SelectItem>
                      <SelectItem value="atm_withdrawal">Retiro sin Tarjeta (ATM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pay_folio">
                  {paymentForm.method === "atm_withdrawal" ? "Código de Retiro ATM *" : "Folio / Número de Operación"}
                </Label>
                <Input
                  id="pay_folio"
                  value={paymentForm.folio}
                  onChange={(e) => setPaymentForm({ ...paymentForm, folio: e.target.value })}
                  placeholder={paymentForm.method === "atm_withdrawal" ? "Ej: Código de 12 dígitos" : "Ej: FOL-129841"}
                  required={paymentForm.method === "atm_withdrawal"}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pay_proof">Archivo del Comprobante (Opcional)</Label>
                <Input
                  id="pay_proof"
                  type="file"
                  onChange={(e) => setPaymentForm({ ...paymentForm, proof_file: e.target.files?.[0] || null })}
                />
              </div>

              {/* Excess Payment Distribution Section */}
              {(() => {
                const mainDebt = selectedProjectForPayment?.remainingDebt || 0;
                const enteredAmount = parseFloat(paymentForm.amount || "0");
                const excess = enteredAmount - mainDebt;

                if (excess <= 0 || otherProjectsWithDebt.length === 0) return null;

                const distributedSum = Object.keys(allocatedAmounts).reduce((sum, key) => sum + parseFloat(allocatedAmounts[key] || "0"), 0);
                const remainingExcess = excess - distributedSum;

                return (
                  <div className="space-y-3 border-t pt-3 animate-in fade-in">
                    <Label className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 block">
                      El pago excede la deuda de este proyecto por {formatCurrency(excess)}. Puedes distribuir el excedente en otros proyectos con deuda del mismo cliente:
                    </Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2.5 bg-muted/20">
                      {otherProjectsWithDebt.map((p) => (
                        <div key={p.id} className="flex justify-between items-center gap-3 text-xs border-b pb-2 last:border-0 last:pb-0">
                          <div className="flex-1 truncate">
                            <span className="font-medium text-foreground block truncate">{p.name}</span>
                            <span className="text-muted-foreground text-[10px]">Pendiente: {formatCurrency(p.remainingDebt)}</span>
                          </div>
                          <div className="w-28">
                            <Input
                              type="number"
                              placeholder="Monto ($)"
                              className="h-8 text-xs"
                              value={allocatedAmounts[p.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAllocatedAmounts(prev => ({ ...prev, [p.id]: val }));
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Restante por distribuir:</span>
                      <span className={Math.abs(remainingExcess) < 0.01 ? "text-green-600" : remainingExcess > 0 ? "text-yellow-600" : "text-red-500"}>
                        {formatCurrency(remainingExcess)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUploading || createPaymentMutation.isPending}>
                  {(isUploading || createPaymentMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Confirmar Cobro"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Import Excel/CSV */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Proyectos desde Excel/CSV</DialogTitle>
            <DialogDescription>
              Descarga la plantilla, llénala con tus cotizaciones y súbela para importación masiva.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCsvImport} className="space-y-4">
            <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border text-xs">
              <span className="text-muted-foreground">¿No tienes la plantilla?</span>
              <Button type="button" size="sm" variant="ghost" className="text-primary gap-1" onClick={handleDownloadTemplate}>
                <Download className="h-3.5 w-3.5" /> Descargar Plantilla
              </Button>
            </div>

            <div className="space-y-1">
              <Label htmlFor="csv_file">Selecciona el archivo CSV</Label>
              <Input
                id="csv_file"
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading || !importFile}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  "Iniciar Importación"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create Client Inline */}
      <Dialog open={isCreateClientOpen} onOpenChange={setIsCreateClientOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!clientForm.name.trim()) return;
            try {
              const newClient = await createClientMutation.mutateAsync({
                name: clientForm.name.trim(),
                email: clientForm.email.trim() || null,
                phone: clientForm.phone.trim() || null,
                tax_id_rfc: clientForm.tax_id_rfc.trim().toUpperCase() || null,
                fiscal_regime: clientForm.fiscal_regime.trim() || null,
              });
              sileo.success({ title: "Cliente creado con éxito" });
              setProjectForm(prev => ({ ...prev, client_id: newClient.id }));
              setIsCreateClientOpen(false);
              setClientForm({ name: "", email: "", phone: "", tax_id_rfc: "", fiscal_regime: "" });
            } catch (err: any) {
              sileo.error({ title: err.message || "Error al crear el cliente" });
            }
          }}>
            <DialogHeader>
              <DialogTitle>Agregar Cliente</DialogTitle>
              <DialogDescription>
                Registra un cliente en la base global para seleccionarlo en el proyecto.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="c_name">Nombre del Cliente / Empresa *</Label>
                <Input
                  id="c_name"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="Ej. Schumacher S.A."
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c_email">Correo Electrónico</Label>
                  <Input
                    id="c_email"
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c_phone">Teléfono</Label>
                  <Input
                    id="c_phone"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    placeholder="5512345678"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c_rfc">RFC (Fiscal)</Label>
                  <Input
                    id="c_rfc"
                    value={clientForm.tax_id_rfc}
                    onChange={(e) => setClientForm({ ...clientForm, tax_id_rfc: e.target.value.toUpperCase() })}
                    placeholder="XAXX010101000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c_regime">Régimen Fiscal</Label>
                  <Input
                    id="c_regime"
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
                onClick={() => {
                  setIsCreateClientOpen(false);
                  setClientForm({ name: "", email: "", phone: "", tax_id_rfc: "", fiscal_regime: "" });
                }}
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
    </div>
  );
}
