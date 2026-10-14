import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  useClientProducts,
  useAttachProductToClient,
  useDetachProductFromClient,
  useProducts,
  useUpdateClient,
} from "@/modules/inventory/hooks";
import { useProjects, useUpdateProject, usePayments, useExpenses } from "@/modules/finances/hooks";
import {
  Briefcase,
  Package,
  Copy,
  ExternalLink,
  ArrowLeft,
  Loader2,
  X,
  TrendingUp,
  FileText,
  Pencil,
  Search,
  Eye,
  EyeOff,
  Key,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sileo } from "sileo";

const projectStatusTranslations: Record<string, string> = {
  draft: "borrador",
  pending_approval: "pendiente de aprobación",
  approved: "aprobado",
  completed: "completado",
  cancelled: "cancelado",
};

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();

  // Fetch client details
  const { data: client, isLoading: loadingClient, error: clientError } = useQuery<any>({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: attachedProducts = [], isLoading: loadingAttached } = useClientProducts(id || "");
  const { data: allProducts = [] } = useProducts();
  const { data: projects = [], isLoading: loadingProjects } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();

  const attachProductMutation = useAttachProductToClient();
  const detachProductMutation = useDetachProductFromClient(id || "");
  const updateProjectMutation = useUpdateProject();
  const updateClientMutation = useUpdateClient();

  // Local state
  const [activeTab, setActiveTab] = React.useState<"products" | "projects" | "reports">("products");
  const [searchProductTerm, setSearchProductTerm] = React.useState("");
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [selectedProjectIdToLink, setSelectedProjectIdToLink] = React.useState("");
  const [productToDetach, setProductToDetach] = React.useState<{ id: string; partNumber: string } | null>(null);
  const [projectToDetach, setProjectToDetach] = React.useState<{ id: string; name: string } | null>(null);
  const [searchAttachedTerm, setSearchAttachedTerm] = React.useState("");
  const [searchProjectTerm, setSearchProjectTerm] = React.useState("");
  const [projectStatusFilter, setProjectStatusFilter] = React.useState("all");

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [showCiec, setShowCiec] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    name: "",
    trade_name: "",
    fiscal_name: "",
    email: "",
    phone: "",
    tax_id_rfc: "",
    fiscal_regime: "",
    ciec: "",
    economic_activity: "",
    invoice_email: "",
    contact_person: "",
    assigned_accountant: "",
    notes: "",
    person_type: "Moral",
    status: "Activo",
  });

  const handleStartEdit = () => {
    if (!client) return;
    setEditForm({
      name: client.name || "",
      trade_name: client.trade_name || "",
      fiscal_name: client.fiscal_name || "",
      email: client.email || "",
      phone: client.phone || "",
      tax_id_rfc: client.tax_id_rfc || "",
      fiscal_regime: client.fiscal_regime || "",
      ciec: client.ciec || "",
      economic_activity: client.economic_activity || "",
      invoice_email: client.invoice_email || "",
      contact_person: client.contact_person || "",
      assigned_accountant: client.assigned_accountant || "",
      notes: client.notes || "",
      person_type: client.person_type || "Moral",
      status: client.status || "Activo",
    });
    setIsEditOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editForm.name.trim()) return;

    try {
      await updateClientMutation.mutateAsync({
        id,
        payload: {
          name: editForm.name.trim(),
          trade_name: editForm.trade_name.trim() || null,
          fiscal_name: editForm.fiscal_name.trim() || null,
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null,
          tax_id_rfc: editForm.tax_id_rfc.trim().toUpperCase() || null,
          fiscal_regime: editForm.fiscal_regime.trim() || null,
          ciec: editForm.ciec.trim() || null,
          economic_activity: editForm.economic_activity.trim() || null,
          invoice_email: editForm.invoice_email.trim() || null,
          contact_person: editForm.contact_person.trim() || null,
          assigned_accountant: editForm.assigned_accountant.trim() || null,
          notes: editForm.notes.trim() || null,
          person_type: editForm.person_type || "Moral",
          status: editForm.status || "Activo",
        },
      });
      sileo.success({ title: "Cliente actualizado con éxito" });
      setIsEditOpen(false);
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al actualizar el cliente" });
    }
  };
  
  // Tax report state
  const [selectedReportProjectId, setSelectedReportProjectId] = React.useState<string>("all");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  const handleAttachProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedProductId) return;

    const promise = attachProductMutation.mutateAsync({
      clientId: id,
      productId: selectedProductId,
    });

    sileo.promise(promise, {
      loading: { title: "Vinculando producto..." },
      success: { title: "Producto vinculado con éxito" },
      error: {
        title: "Error al vincular el producto",
        description: "Es posible que ya esté asignado a otro cliente."
      }
    });

    try {
      await promise;
      setSelectedProductId("");
    } catch (err) {
      // Handled by sileo.promise
    }
  };

  const handleDetachProduct = (productId: string, partNumber: string) => {
    setProductToDetach({ id: productId, partNumber });
  };

  const confirmDetachProduct = async () => {
    if (!productToDetach) return;
    const productId = productToDetach.id;
    setProductToDetach(null);

    const promise = detachProductMutation.mutateAsync(productId);

    sileo.promise(promise, {
      loading: { title: "Desvinculando producto..." },
      success: { title: "Producto desvinculado con éxito" },
      error: { title: "Error al desvincular el producto" }
    });

    try {
      await promise;
    } catch (err) {
      // Handled by sileo.promise
    }
  };

  const handleAttachProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedProjectIdToLink) return;

    const promise = updateProjectMutation.mutateAsync({
      id: selectedProjectIdToLink,
      payload: { client_id: id }
    });

    sileo.promise(promise, {
      loading: { title: "Vinculando proyecto..." },
      success: { title: "Proyecto vinculado con éxito" },
      error: { title: "Error al vincular el proyecto" }
    });

    try {
      await promise;
      setSelectedProjectIdToLink("");
    } catch (err) {
      // Handled by sileo.promise
    }
  };

  const handleDetachProject = (projectId: string, projectName: string) => {
    setProjectToDetach({ id: projectId, name: projectName });
  };

  const confirmDetachProject = async () => {
    if (!projectToDetach || !id) return;
    const projectId = projectToDetach.id;
    setProjectToDetach(null);

    const promise = updateProjectMutation.mutateAsync({
      id: projectId,
      payload: { client_id: null as any }
    });

    sileo.promise(promise, {
      loading: { title: "Desvinculando proyecto..." },
      success: { title: "Proyecto desvinculado con éxito" },
      error: { title: "Error al desvincular el proyecto" }
    });
  };

  // Filter out products already attached to this client
  const attachedIds = new Set(attachedProducts.map((p) => p.id));
  const availableProducts = allProducts.filter(
    (p) => !attachedIds.has(p.id) &&
      (p.part_number.toLowerCase().includes(searchProductTerm.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(searchProductTerm.toLowerCase()))
  );

  const clientProjects = React.useMemo(() => {
    if (!client) return [];
    return projects.filter((p) => p.client_id === client.id);
  }, [projects, client?.id]);

  const availableProjects = React.useMemo(() => {
    if (!client) return [];
    return projects.filter((p) => p.client_id !== client.id);
  }, [projects, client?.id]);

  const filteredAttachedProducts = React.useMemo(() => {
    if (!searchAttachedTerm.trim()) return attachedProducts;
    const term = searchAttachedTerm.toLowerCase();
    return attachedProducts.filter(
      (p) =>
        p.part_number.toLowerCase().includes(term) ||
        (p.description || "").toLowerCase().includes(term)
    );
  }, [attachedProducts, searchAttachedTerm]);

  const filteredClientProjects = React.useMemo(() => {
    return clientProjects.filter((p) => {
      const term = searchProjectTerm.toLowerCase();
      const matchesSearch =
        (p.name || "").toLowerCase().includes(term) ||
        (p.order_number || "").toLowerCase().includes(term);
      if (!matchesSearch) return false;
      if (projectStatusFilter !== "all" && p.status !== projectStatusFilter) return false;
      return true;
    });
  }, [clientProjects, searchProjectTerm, projectStatusFilter]);

  const clientProjectsMetrics = React.useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;

    clientProjects.forEach((p) => {
      const subtotal = Number(p.custom_price_total);
      const effectiveTotal = p.requires_invoice
        ? subtotal + (subtotal * (p.iva_rate ?? 0.16)) - (subtotal * ((p.isr_retention_rate ?? 0) + (p.iva_retention_rate ?? 0)))
        : subtotal;
      totalInvoiced += effectiveTotal;

      const projectPayments = payments.filter((pay) => pay.project_id === p.id);
      totalPaid += projectPayments.reduce((sum, pay) => sum + Number(pay.amount), 0);
    });

    const totalDebt = Math.max(0, totalInvoiced - totalPaid);

    return {
      totalCount: clientProjects.length,
      totalInvoiced,
      totalPaid,
      totalDebt,
    };
  }, [clientProjects, payments]);

  // Tax report calculations for client's projects
  const clientProjectsMonthlyBreakdown = React.useMemo(() => {
    if (!client || clientProjects.length === 0) return [];

    const monthsMap: Record<string, { monthName: string; subtotalPaid: number; ivaPaid: number; totalPaid: number; totalExpense: number }> = {};
    const monthsList = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const addRecord = (dateStr: string) => {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      if (!monthsMap[key]) {
        monthsMap[key] = {
          monthName: `${monthsList[monthIdx]} ${year.toString().slice(-2)}`,
          subtotalPaid: 0,
          ivaPaid: 0,
          totalPaid: 0,
          totalExpense: 0,
        };
      }
      return key;
    };

    // Filter projects based on dropdown selection ("all" or specific ID)
    const targetProjects = selectedReportProjectId === "all"
      ? clientProjects
      : clientProjects.filter(p => p.id === selectedReportProjectId);

    targetProjects.forEach((proj) => {
      const subtotalPrice = Number(proj.custom_price_total);
      const ivaRate = proj.requires_invoice ? (proj.iva_rate ?? 0.16) : 0;
      const isrRate = proj.requires_invoice ? (proj.isr_retention_rate ?? 0) : 0;
      const ivaRetRate = proj.requires_invoice ? (proj.iva_retention_rate ?? 0) : 0;
      const totalTaxInclusive = subtotalPrice + (subtotalPrice * ivaRate) - (subtotalPrice * isrRate) - (subtotalPrice * ivaRetRate);

      const projPayments = payments.filter((pay) => pay.project_id === proj.id);
      const projExpenses = expenses.filter((exp) => exp.project_id === proj.id);

      projPayments.forEach((pay) => {
        const key = addRecord(pay.created_at);
        const amountPaid = Number(pay.amount);

        let paymentSubtotal = amountPaid;
        let paymentIva = 0;

        if (totalTaxInclusive > 0 && proj.requires_invoice) {
          paymentSubtotal = amountPaid * (subtotalPrice / totalTaxInclusive);
          paymentIva = amountPaid * ((subtotalPrice * ivaRate) / totalTaxInclusive);
        }

        monthsMap[key].totalPaid += amountPaid;
        monthsMap[key].subtotalPaid += paymentSubtotal;
        monthsMap[key].ivaPaid += paymentIva;
      });

      projExpenses.forEach((exp) => {
        const key = addRecord(exp.created_at);
        monthsMap[key].totalExpense += Number(exp.amount);
      });
    });

    return Object.keys(monthsMap)
      .sort()
      .map((key) => ({
        key,
        ...monthsMap[key],
        utility: monthsMap[key].totalPaid - monthsMap[key].totalExpense,
      }));
  }, [client, clientProjects, payments, expenses, selectedReportProjectId]);

  if (loadingClient) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (clientError || !client) {
    return <div className="text-destructive p-4">Error al cargar los detalles del cliente.</div>;
  }

  const shareUrl = `${window.location.origin}/client-stock/${client.token}`;

  return (
    <div className="space-y-6">
      {/* Top Header with Back Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Link to="/clients">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {client.name}
              {client.trade_name && (
                <span className="text-muted-foreground font-normal ml-2 text-lg">
                  ({client.trade_name})
                </span>
              )}
            </h2>
            <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
              <span>Cliente ID: {client.id.slice(0, 8).toUpperCase()}</span>
              {client.email && <span>• {client.email}</span>}
              {client.phone && <span>• {client.phone}</span>}
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2 shrink-0" onClick={handleStartEdit}>
          <Pencil className="h-4 w-4" />
          Editar Cliente
        </Button>
      </div>

      {/* Shareable Link & Client Metadata Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Enlace Público de Inventario (Consulta de Stock)</CardTitle>
            <CardDescription>Comparte este enlace para que el cliente consulte sus niveles de existencias en tiempo real.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono truncate bg-muted px-3 py-2 rounded-lg border flex-1 text-muted-foreground select-all">
                {shareUrl}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  sileo.success({ title: "Enlace copiado al portapapeles" });
                }}
                title="Copiar enlace"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild title="Abrir vista pública">
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Datos Fiscales & Contables
              </CardTitle>
              <CardDescription className="text-xs">Información tributaria y credenciales del SAT</CardDescription>
            </div>
            {client.person_type && (
              <Badge variant="outline" className={`text-[10px] ${client.person_type === 'Física' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                {client.person_type}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="text-xs space-y-2.5">
            {client.fiscal_name && (
              <div>
                <span className="text-muted-foreground block text-[11px]">Razón Social:</span>
                <span className="font-semibold text-foreground">{client.fiscal_name}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground block text-[11px]">RFC:</span>
                <span className="font-mono font-semibold text-foreground">{client.tax_id_rfc || "No registrado"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Contador(a):</span>
                <span className="font-semibold text-primary">{client.assigned_accountant || "Sin asignar"}</span>
              </div>
            </div>

            {/* CIEC Password field */}
            <div className="bg-muted/40 p-2 rounded-md border border-border/60">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <Key className="h-3 w-3 text-amber-600" /> Contraseña CIEC (SAT):
                </span>
                {client.ciec && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowCiec(!showCiec)}
                      className="text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-0.5"
                    >
                      {showCiec ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showCiec ? "Ocultar" : "Mostrar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(client.ciec);
                        sileo.success({ title: "CIEC copiada al portapapeles" });
                      }}
                      className="text-primary hover:underline text-[10px] ml-1.5 flex items-center gap-0.5"
                    >
                      <Copy className="h-3 w-3" /> Copiar
                    </button>
                  </div>
                )}
              </div>
              <p className="font-mono font-medium text-foreground text-xs select-all">
                {client.ciec ? (showCiec ? client.ciec : "••••••••") : <span className="text-muted-foreground italic">No registrada</span>}
              </p>
            </div>

            {client.fiscal_regime && (
              <div>
                <span className="text-muted-foreground block text-[11px]">Régimen Fiscal:</span>
                <span className="font-medium text-foreground">{client.fiscal_regime}</span>
              </div>
            )}

            {client.economic_activity && (
              <div>
                <span className="text-muted-foreground block text-[11px]">Actividad Principal:</span>
                <span className="font-medium text-foreground">{client.economic_activity}</span>
              </div>
            )}

            <div className="pt-2 border-t border-border/60 grid grid-cols-1 gap-1.5">
              {client.contact_person && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Encargado:</span>
                  <span className="font-medium text-foreground text-right">{client.contact_person}</span>
                </div>
              )}
              {client.invoice_email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío Facturas:</span>
                  <span className="font-medium text-foreground text-right truncate max-w-[200px]" title={client.invoice_email}>
                    {client.invoice_email}
                  </span>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="pt-2 border-t border-border/60 bg-amber-50/50 p-2 rounded border-amber-200/60">
                <span className="text-amber-800 font-semibold block text-[10px] uppercase">Comentarios / Notas:</span>
                <p className="text-muted-foreground italic text-[11px] mt-0.5 leading-relaxed">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Financial KPI Metrics Grid */}
      {clientProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">Proyectos</CardDescription>
              <CardTitle className="text-2xl font-bold">{clientProjectsMetrics.totalCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-primary">Monto Contratado</CardDescription>
              <CardTitle className="text-2xl font-extrabold text-primary">{formatCurrency(clientProjectsMetrics.totalInvoiced)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-green-700 dark:text-green-400">Monto Cobrado</CardDescription>
              <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(clientProjectsMetrics.totalPaid)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className={`${clientProjectsMetrics.totalDebt > 0 ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Monto Pendiente</CardDescription>
              <CardTitle className={`text-2xl font-bold ${clientProjectsMetrics.totalDebt > 0 ? 'text-yellow-600 dark:text-yellow-500' : 'text-green-600 dark:text-green-400'}`}>
                {clientProjectsMetrics.totalDebt > 0 ? formatCurrency(clientProjectsMetrics.totalDebt) : 'Liquidado'}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Navigation Tab Headers */}
      <div className="flex border-b border-border my-6">
        <button
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "products"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("products")}
        >
          <Package className="h-4 w-4" />
          Catálogo / Stock ({attachedProducts.length})
        </button>
        <button
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "projects"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("projects")}
        >
          <Briefcase className="h-4 w-4" />
          Proyectos / Cotizaciones ({clientProjects.length})
        </button>
        <button
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "reports"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("reports")}
        >
          <TrendingUp className="h-4 w-4" />
          Reporte Financiero Mensual
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "products" && (
        <div className="grid gap-6 md:grid-cols-3 items-start">
          {/* Link new product */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Vincular Nuevo Producto</CardTitle>
              <CardDescription>Asigna un artículo del catálogo general a este cliente.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAttachProduct} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Filtrar por número de parte o concepto..."
                    value={searchProductTerm}
                    onChange={(e) => setSearchProductTerm(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Selecciona un producto...</option>
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.part_number} - {p.description || "Sin descripción"}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="submit"
                  className="w-full h-9 text-xs"
                  disabled={!selectedProductId || attachProductMutation.isPending}
                >
                  {attachProductMutation.isPending && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  Vincular al Cliente
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Linked Products list */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base font-bold">Catálogo Vinculado</CardTitle>
                <CardDescription>Productos que forman parte del inventario exclusivo de este cliente ({attachedProducts.length}).</CardDescription>
              </div>
              {attachedProducts.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto vinculado..."
                    value={searchAttachedTerm}
                    onChange={(e) => setSearchAttachedTerm(e.target.value)}
                    className="h-8 pl-8 pr-7 text-xs"
                  />
                  {searchAttachedTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearchAttachedTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loadingAttached ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : attachedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-12 text-center text-muted-foreground bg-muted/10">
                  <Package className="h-10 w-10 mb-2 opacity-50 text-muted-foreground" />
                  <p className="font-semibold text-sm">Sin productos vinculados</p>
                  <p className="text-xs mt-1 max-w-[280px]">Utiliza el formulario de la izquierda para vincular artículos a este cliente.</p>
                </div>
              ) : filteredAttachedProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg p-6 bg-muted/10">
                  <p className="text-sm">No se encontraron productos que coincidan con "{searchAttachedTerm}".</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs mt-1 text-primary"
                    onClick={() => setSearchAttachedTerm("")}
                  >
                    Limpiar búsqueda
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredAttachedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="font-semibold text-xs truncate text-foreground">{product.part_number}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{product.description || "Sin descripción"}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => handleDetachProduct(product.id, product.part_number)}
                        title="Desvincular"
                        disabled={detachProductMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "projects" && (
        <div className="grid gap-6 md:grid-cols-3 items-start">
          {/* Link new project */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Vincular Proyecto / Cotización</CardTitle>
              <CardDescription>Asocia un proyecto existente del sistema a este cliente.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAttachProject} className="space-y-4">
                <div className="space-y-2">
                  <select
                    value={selectedProjectIdToLink}
                    onChange={(e) => setSelectedProjectIdToLink(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Selecciona un proyecto...</option>
                    {availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCurrency(p.custom_price_total)})
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="submit"
                  className="w-full h-9 text-xs"
                  disabled={!selectedProjectIdToLink || updateProjectMutation.isPending}
                >
                  {updateProjectMutation.isPending && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  Vincular Proyecto
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Linked projects list */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base font-bold">Proyectos Registrados</CardTitle>
                <CardDescription>Presupuestos y órdenes de venta asociadas a {client.name} ({clientProjects.length}).</CardDescription>
              </div>
              {clientProjects.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar proyecto..."
                      value={searchProjectTerm}
                      onChange={(e) => setSearchProjectTerm(e.target.value)}
                      className="h-8 pl-8 pr-7 text-xs"
                    />
                    {searchProjectTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setSearchProjectTerm("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <select
                    value={projectStatusFilter}
                    onChange={(e) => setProjectStatusFilter(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background text-foreground px-2 py-1 text-xs"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="draft">Borrador</option>
                    <option value="pending_approval">Pendiente</option>
                    <option value="approved">Aprobado</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loadingProjects ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : clientProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-12 text-center text-muted-foreground bg-muted/10">
                  <Briefcase className="h-10 w-10 mb-2 opacity-50 text-muted-foreground" />
                  <p className="font-semibold text-sm">Sin proyectos asociados</p>
                  <p className="text-xs mt-1 max-w-[280px]">Vincula cotizaciones del listado izquierdo para asociarlas a la facturación de este cliente.</p>
                </div>
              ) : filteredClientProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg p-6 bg-muted/10">
                  <p className="text-sm">No se encontraron proyectos con los filtros seleccionados.</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs mt-1 text-primary"
                    onClick={() => {
                      setSearchProjectTerm("");
                      setProjectStatusFilter("all");
                    }}
                  >
                    Restablecer filtros
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClientProjects.map((p) => {
                    const subtotal = Number(p.custom_price_total);
                    const effectiveTotal = p.requires_invoice
                      ? subtotal + (subtotal * (p.iva_rate ?? 0.16)) - (subtotal * ((p.isr_retention_rate ?? 0) + (p.iva_retention_rate ?? 0)))
                      : subtotal;

                    return (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-lg border bg-muted/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative group hover:bg-muted/20 transition-colors"
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-sm text-foreground block">{p.name}</span>
                          <span className="text-xs text-muted-foreground block">
                            Registro: {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
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
                            className="text-[10px] uppercase font-semibold"
                          >
                            {projectStatusTranslations[p.status] || p.status}
                          </Badge>

                          {p.current_stage && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                              {p.current_stage}
                            </Badge>
                          )}

                          <div className="text-right sm:pr-4">
                            <span className="text-[10px] text-muted-foreground block">{p.requires_invoice ? 'Total (Factura)' : 'Importe'}</span>
                            <span className="font-extrabold text-xs text-foreground">{formatCurrency(effectiveTotal)}</span>
                          </div>

                          <div className="flex gap-1">
                            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0" title="Ver cotización pública">
                              <a href={`/quote/${p.share_token}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDetachProject(p.id, p.name)}
                              title="Desvincular proyecto"
                              disabled={updateProjectMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "reports" && (
        <Card className="border border-border/80 shadow-md">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Balance Mensual y Desglose de Impuestos
                </CardTitle>
                <CardDescription>
                  Generación proporcional de ingresos, IVA y gastos asociados a los proyectos de <strong>{client.name}</strong>.
                </CardDescription>
              </div>

              {clientProjects.length > 0 && (
                <div className="w-full md:w-[280px]">
                  <select
                    value={selectedReportProjectId}
                    onChange={(e) => setSelectedReportProjectId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background text-foreground px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">Todos los proyectos de este cliente</option>
                    {clientProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.requires_invoice ? 'Con Factura' : 'Sin Factura'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {clientProjects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg bg-muted/10">
                <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="font-semibold">Sin proyectos registrados</p>
                <p className="text-xs mt-1">Este cliente no cuenta con proyectos asignados para generar reportes financieros.</p>
              </div>
            ) : clientProjectsMonthlyBreakdown.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg bg-muted/10">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="font-semibold">Sin movimientos registrados</p>
                <p className="text-xs mt-1">Aún no se han recibido pagos ni cargado egresos vinculados a los proyectos de este cliente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-muted/60 border-b text-xs font-semibold text-muted-foreground">
                      <th className="p-3.5">Mes</th>
                      <th className="p-3.5 text-right">Subtotal Facturado</th>
                      <th className="p-3.5 text-right font-medium">IVA Facturado</th>
                      <th className="p-3.5 text-right font-medium text-foreground bg-primary/5">Total Cobrado (Ingresos)</th>
                      <th className="p-3.5 text-right text-red-600 dark:text-red-400">Gasto Asociado</th>
                      <th className="p-3.5 text-right font-bold">Diferencia Neta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clientProjectsMonthlyBreakdown.map((row) => (
                      <tr key={row.key} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-medium text-foreground">{row.monthName}</td>
                        <td className="p-3.5 text-right font-mono">{formatCurrency(row.subtotalPaid)}</td>
                        <td className="p-3.5 text-right font-mono text-green-600">+{formatCurrency(row.ivaPaid)}</td>
                        <td className="p-3.5 text-right font-mono font-semibold text-foreground bg-primary/5">{formatCurrency(row.totalPaid)}</td>
                        <td className="p-3.5 text-right font-mono text-red-600 dark:text-red-400">-{formatCurrency(row.totalExpense)}</td>
                        <td className={`p-3.5 text-right font-mono font-bold ${row.utility >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'}`}>
                          {row.utility >= 0 ? '+' : ''}{formatCurrency(row.utility)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Alerts */}
      <AlertDialog open={!!productToDetach} onOpenChange={(open) => !open && setProductToDetach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desvincular producto?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas desvincular el producto "{productToDetach?.partNumber}" de este cliente? Ya no aparecerá en el enlace compartible de stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDetachProduct} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!projectToDetach} onOpenChange={(open) => !open && setProjectToDetach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desvincular proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas desvincular el proyecto "{projectToDetach?.name}" de este cliente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDetachProject} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleUpdateClient}>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Modifica la información general o fiscal del cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-detail-name" className="text-sm font-medium">
                  Nombre del Cliente / Empresa *
                </label>
                <Input
                  id="edit-detail-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Ej. Schumacher S.A."
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-detail-trade_name" className="text-sm font-medium">
                    Nombre Comercial
                  </label>
                  <Input
                    id="edit-detail-trade_name"
                    value={editForm.trade_name}
                    onChange={(e) => setEditForm({ ...editForm, trade_name: e.target.value })}
                    placeholder="Ej. Schumacher"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-detail-fiscal_name" className="text-sm font-medium">
                    Nombre Fiscal
                  </label>
                  <Input
                    id="edit-detail-fiscal_name"
                    value={editForm.fiscal_name}
                    onChange={(e) => setEditForm({ ...editForm, fiscal_name: e.target.value })}
                    placeholder="Ej. Schumacher e Hijos S.A. de C.V."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-detail-email" className="text-sm font-medium">
                    Correo Electrónico
                  </label>
                  <Input
                    id="edit-detail-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-detail-phone" className="text-sm font-medium">
                    Teléfono
                  </label>
                  <Input
                    id="edit-detail-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="5512345678"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-detail-rfc" className="text-sm font-medium">
                    RFC (Fiscal)
                  </label>
                  <Input
                    id="edit-detail-rfc"
                    value={editForm.tax_id_rfc}
                    onChange={(e) => setEditForm({ ...editForm, tax_id_rfc: e.target.value.toUpperCase() })}
                    placeholder="XAXX010101000"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-detail-ciec" className="text-sm font-medium">
                    Contraseña CIEC (SAT)
                  </label>
                  <Input
                    id="edit-detail-ciec"
                    value={editForm.ciec}
                    onChange={(e) => setEditForm({ ...editForm, ciec: e.target.value })}
                    placeholder="Clave CIEC"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-detail-person-type" className="text-sm font-medium">
                    Tipo de Persona
                  </label>
                  <select
                    id="edit-detail-person-type"
                    value={editForm.person_type}
                    onChange={(e) => setEditForm({ ...editForm, person_type: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Moral">Moral</option>
                    <option value="Física">Física</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-detail-regime" className="text-sm font-medium">
                    Régimen Fiscal
                  </label>
                  <Input
                    id="edit-detail-regime"
                    value={editForm.fiscal_regime}
                    onChange={(e) => setEditForm({ ...editForm, fiscal_regime: e.target.value })}
                    placeholder="601 General de Ley / RESICO / PFAE"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-detail-economic-activity" className="text-sm font-medium">
                  Actividad Económica Principal
                </label>
                <Input
                  id="edit-detail-economic-activity"
                  value={editForm.economic_activity}
                  onChange={(e) => setEditForm({ ...editForm, economic_activity: e.target.value })}
                  placeholder="Ej. Transporte de carga / Consultoría"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-detail-contact" className="text-sm font-medium">
                    Encargado / Contacto
                  </label>
                  <Input
                    id="edit-detail-contact"
                    value={editForm.contact_person}
                    onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                    placeholder="Lic. Encargado"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-detail-accountant" className="text-sm font-medium">
                    Contador(a) Asignado
                  </label>
                  <Input
                    id="edit-detail-accountant"
                    value={editForm.assigned_accountant}
                    onChange={(e) => setEditForm({ ...editForm, assigned_accountant: e.target.value })}
                    placeholder="Nombre del contador"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-detail-invoice-email" className="text-sm font-medium">
                  Correo para Envío de Factura
                </label>
                <Input
                  id="edit-detail-invoice-email"
                  value={editForm.invoice_email}
                  onChange={(e) => setEditForm({ ...editForm, invoice_email: e.target.value })}
                  placeholder="facturas@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-detail-notes" className="text-sm font-medium">
                  Comentarios / Notas
                </label>
                <textarea
                  id="edit-detail-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Notas internas del cliente..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateClientMutation.isPending}>
                {updateClientMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
