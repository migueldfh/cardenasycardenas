import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUpdateClient } from "@/modules/inventory/hooks";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Building2,
  Lock,
  ShieldCheck,
  FileSpreadsheet,
  Mail,
  Phone,
  User,
  CheckCircle2,
  Clock,
  FileText,
  Calendar,
} from "lucide-react";
import { CiecVaultModal } from "@/components/CiecVaultModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sileo } from "sileo";

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

  const updateClientMutation = useUpdateClient();

  // Local state
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isVaultOpen, setIsVaultOpen] = React.useState(false);
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

  return (
    <div className="space-y-6">
      {/* Top Header with Back Button and Quick Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Link to="/clients">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-bold tracking-tight">
                {client.name}
              </h2>
              {client.trade_name && (
                <span className="text-muted-foreground font-normal text-lg">
                  ({client.trade_name})
                </span>
              )}
              <Badge
                variant="outline"
                className={`text-xs ${
                  client.status === "Inactivo"
                    ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                }`}
              >
                {client.status || "Activo"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm flex flex-wrap items-center gap-2 mt-1">
              <span>Cliente ID: {client.id.slice(0, 8).toUpperCase()}</span>
              {client.email && <span>• {client.email}</span>}
              {client.phone && <span>• {client.phone}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" className="gap-2 shadow-xs" asChild>
            <Link to={`/control-mensual/${client.id}`}>
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Ver Control Mensual
            </Link>
          </Button>
          <Button variant="default" className="gap-2 shadow-xs" onClick={handleStartEdit}>
            <Pencil className="h-4 w-4" />
            Editar Cliente
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 1. Datos Fiscales & Bóveda SAT */}
        <Card className="border-border/80 shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Datos Fiscales
                </CardTitle>
                <CardDescription className="text-xs">Información tributaria ante el SAT</CardDescription>
              </div>
              {client.person_type && (
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    client.person_type === "Física"
                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                      : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                  }`}
                >
                  {client.person_type}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              {client.fiscal_name && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Razón Social:</span>
                  <span className="font-semibold text-foreground text-sm">{client.fiscal_name}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                <div>
                  <span className="text-muted-foreground block text-[11px]">RFC:</span>
                  <span className="font-mono font-bold text-foreground text-sm tracking-wide">
                    {client.tax_id_rfc || "No registrado"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tipo de Persona:</span>
                  <span className="font-medium text-foreground">{client.person_type || "Moral"}</span>
                </div>
              </div>

              {/* Bóveda Fiscal SAT - CIEC Password */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-emerald-900 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Contraseña CIEC (SAT):
                  </span>
                  <Badge variant="outline" className="text-[9px] bg-background border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 font-mono">
                    AES-256
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-sm text-muted-foreground tracking-widest">
                    ••••••••••••
                  </span>
                  {client.ciec ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsVaultOpen(true)}
                      className="h-7 px-2.5 text-xs bg-white dark:bg-card border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100/50 text-emerald-800 dark:text-emerald-300 font-medium gap-1.5 shadow-xs"
                    >
                      <Lock className="h-3 w-3 text-emerald-600" /> Desbloquear Bóveda
                    </Button>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">No registrada</span>
                  )}
                </div>
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
            </CardContent>
          </div>
        </Card>

        {/* 2. Estatus Contable & Fiscal */}
        <Card className="border-border/80 shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" /> Control Contable
                </CardTitle>
                <CardDescription className="text-xs">
                  Periodo: {client.accounting_period || "Julio 2026"}
                </CardDescription>
              </div>
              {client.compliance_opinion && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-medium ${
                    client.compliance_opinion === "Positiva"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                  }`}
                >
                  {client.compliance_opinion === "Positiva" ? "SAT Positiva" : `SAT ${client.compliance_opinion}`}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              <div>
                <span className="text-muted-foreground block text-[11px]">Contador(a) Asignado(a):</span>
                <span className="font-semibold text-primary text-sm">
                  {client.assigned_accountant || "Sin asignar"}
                </span>
              </div>

              {/* Progress of capture */}
              {client.accounting_capture_pct !== null && client.accounting_capture_pct !== undefined && (
                <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Avance de Captura:</span>
                    <span className="font-bold text-foreground">{client.accounting_capture_pct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        client.accounting_capture_pct === 100
                          ? "bg-emerald-500"
                          : client.accounting_capture_pct > 50
                          ? "bg-blue-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, client.accounting_capture_pct))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Checklist stages */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/20 border border-border/40">
                  {client.tax_calculation ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate">Cálculo Impuesto</span>
                </div>

                <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/20 border border-border/40">
                  {client.tax_presented ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate">Imp. Presentado</span>
                </div>

                <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/20 border border-border/40">
                  {client.diot_presented ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate">DIOT Presentada</span>
                </div>

                <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/20 border border-border/40">
                  {client.financial_statements ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate">Estados Finan.</span>
                </div>
              </div>

              {/* Stationery */}
              {client.stationery_received && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Papelería recibida:
                  </span>
                  <span className="font-medium text-foreground">
                    {client.stationery_date || "Registrada"}
                  </span>
                </div>
              )}

              {/* Internal accounting note */}
              {client.accounting_notes && (
                <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 p-2 rounded border border-amber-200/60 dark:border-amber-800/50">
                  <span className="font-semibold block text-[10px] uppercase">Nota Contable:</span>
                  {client.accounting_notes}
                </div>
              )}
            </CardContent>
          </div>
          <div className="p-4 pt-0">
            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
              <Link to={`/control-mensual/${client.id}`}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Abrir Tablero de Control
              </Link>
            </Button>
          </div>
        </Card>

        {/* 3. Contacto & Facturación */}
        <Card className="border-border/80 shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Contacto & Facturación
              </CardTitle>
              <CardDescription className="text-xs">Medios de comunicación y notas</CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              {client.contact_person && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Encargado / Contacto:</span>
                  <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> {client.contact_person}
                  </span>
                </div>
              )}

              {client.email && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Correo General:</span>
                  <a
                    href={`mailto:${client.email}`}
                    className="font-medium text-primary hover:underline flex items-center gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {client.email}
                  </a>
                </div>
              )}

              {client.invoice_email && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Envío de Facturas:</span>
                  <a
                    href={`mailto:${client.invoice_email}`}
                    className="font-medium text-primary hover:underline flex items-center gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" /> {client.invoice_email}
                  </a>
                </div>
              )}

              {client.phone && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Teléfono:</span>
                  <a
                    href={`tel:${client.phone}`}
                    className="font-medium text-foreground hover:underline flex items-center gap-1.5"
                  >
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {client.phone}
                  </a>
                </div>
              )}

              {client.notes && (
                <div className="pt-2 border-t border-border/60 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/50">
                  <span className="text-amber-800 dark:text-amber-300 font-semibold block text-[10px] uppercase">
                    Comentarios / Observaciones:
                  </span>
                  <p className="text-muted-foreground italic text-xs mt-1 leading-relaxed">
                    {client.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Edit Client Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleUpdateClient}>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Modifica la información general o fiscal del cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <label htmlFor="edit-detail-name" className="text-xs font-semibold text-foreground">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="edit-detail-trade_name" className="text-xs font-semibold text-foreground">
                    Nombre Comercial
                  </label>
                  <Input
                    id="edit-detail-trade_name"
                    value={editForm.trade_name}
                    onChange={(e) => setEditForm({ ...editForm, trade_name: e.target.value })}
                    placeholder="Ej. Schumacher"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-detail-fiscal_name" className="text-xs font-semibold text-foreground">
                    Nombre Fiscal
                  </label>
                  <Input
                    id="edit-detail-fiscal_name"
                    value={editForm.fiscal_name}
                    onChange={(e) => setEditForm({ ...editForm, fiscal_name: e.target.value })}
                    placeholder="Ej. Schumacher e Hijos S.A."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="edit-detail-email" className="text-xs font-semibold text-foreground">
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
                <div className="space-y-1.5">
                  <label htmlFor="edit-detail-phone" className="text-xs font-semibold text-foreground">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="edit-detail-rfc" className="text-xs font-semibold text-foreground">
                    RFC (Fiscal)
                  </label>
                  <Input
                    id="edit-detail-rfc"
                    value={editForm.tax_id_rfc}
                    onChange={(e) => setEditForm({ ...editForm, tax_id_rfc: e.target.value.toUpperCase() })}
                    placeholder="XAXX010101000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-detail-ciec" className="text-xs font-semibold text-foreground">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="edit-detail-person-type" className="text-xs font-semibold text-foreground">
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
                <div className="space-y-1.5">
                  <label htmlFor="edit-detail-regime" className="text-xs font-semibold text-foreground">
                    Régimen Fiscal
                  </label>
                  <Input
                    id="edit-detail-regime"
                    value={editForm.fiscal_regime}
                    onChange={(e) => setEditForm({ ...editForm, fiscal_regime: e.target.value })}
                    placeholder="601 General / RESICO"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-detail-economic-activity" className="text-xs font-semibold text-foreground">
                  Actividad Económica Principal
                </label>
                <Input
                  id="edit-detail-economic-activity"
                  value={editForm.economic_activity}
                  onChange={(e) => setEditForm({ ...editForm, economic_activity: e.target.value })}
                  placeholder="Ej. Transporte de carga / Consultoría"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="edit-detail-contact" className="text-xs font-semibold text-foreground">
                    Encargado / Contacto
                  </label>
                  <Input
                    id="edit-detail-contact"
                    value={editForm.contact_person}
                    onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                    placeholder="Lic. Encargado"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-detail-accountant" className="text-xs font-semibold text-foreground">
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
              <div className="space-y-1.5">
                <label htmlFor="edit-detail-invoice-email" className="text-xs font-semibold text-foreground">
                  Correo para Envío de Factura
                </label>
                <Input
                  id="edit-detail-invoice-email"
                  value={editForm.invoice_email}
                  onChange={(e) => setEditForm({ ...editForm, invoice_email: e.target.value })}
                  placeholder="facturas@empresa.com"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-detail-notes" className="text-xs font-semibold text-foreground">
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

      {/* CIEC Security Vault Modal */}
      <CiecVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        clientId={client?.id || null}
        clientName={client?.name || ""}
        clientRfc={client?.tax_id_rfc || ""}
      />
    </div>
  );
}
