import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { sileo } from "sileo";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/api/logs";

export type ObligationStatus =
  | "Programado"
  | "En proceso"
  | "Por vencer"
  | "Completado"
  | "Vencido";

export interface FiscalObligation {
  id: string;
  date: string; // e.g. "17 Sep 2026"
  isoDate: string; // e.g. "2026-09-17"
  title: string;
  type: string;
  status: ObligationStatus;
  description: string;
  clientsAffected: string;
}

const STORAGE_KEY = "cardenas_fiscal_calendar_obligations_v1";

const SHORT_MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const FULL_MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const OBLIGATION_TYPES = [
  "Obligación SAT",
  "IMSS / INFONAVIT",
  "Impuesto Estatal",
  "Interno",
  "Entregable Despacho",
];

const OBLIGATION_STATUSES: ObligationStatus[] = [
  "Programado",
  "En proceso",
  "Por vencer",
  "Completado",
  "Vencido",
];

function formatIsoToDisplayDate(isoDate: string): string {
  if (!isoDate) return "—";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2].padStart(2, "0");
  const monthName = SHORT_MONTHS[monthIdx] || "Sep";
  return `${day} ${monthName} ${year}`;
}

function formatIsoToLongDate(isoDate: string): string {
  if (!isoDate) return "Sin fecha";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = FULL_MONTHS[monthIdx] || "Septiembre";
  return `${day} ${monthName} ${year}`;
}

function parseDisplayDateToIso(displayDate: string): string {
  const parts = displayDate.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const monthIdx = SHORT_MONTHS.findIndex(
      (m) => m.toLowerCase() === parts[1].toLowerCase().slice(0, 3)
    );
    const year = parts[2];
    if (monthIdx !== -1 && /^\d{4}$/.test(year)) {
      return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${day}`;
    }
  }
  return "2026-09-17";
}

const DEFAULT_OBLIGATIONS: FiscalObligation[] = [
  {
    id: "obl-1",
    date: "05 Sep 2026",
    isoDate: "2026-09-05",
    title: "Cierre de recepción de papelería contable",
    type: "Interno",
    status: "Completado",
    description:
      "Límite para que clientes entreguen estados de cuenta y facturas de compras de agosto.",
    clientsAffected: "186 clientes",
  },
  {
    id: "obl-2",
    date: "10 Sep 2026",
    isoDate: "2026-09-10",
    title: "Revisión y validación de cálculos de impuestos",
    type: "Interno",
    status: "En proceso",
    description:
      "Supervisión de papeles de trabajo ISR e IVA por contadores senior.",
    clientsAffected: "142 clientes terminados",
  },
  {
    id: "obl-3",
    date: "17 Sep 2026",
    isoDate: "2026-09-17",
    title: "Declaración y Pago Provisional de ISR e IVA (SAT)",
    type: "Obligación SAT",
    status: "Por vencer",
    description:
      "Presentación obligatoria ante el portal del SAT para Personas Morales y Personas Físicas.",
    clientsAffected: "186 clientes",
  },
  {
    id: "obl-4",
    date: "17 Sep 2026",
    isoDate: "2026-09-17",
    title: "Entero de retenciones de ISR por salarios y asimilados",
    type: "Obligación SAT",
    status: "Por vencer",
    description:
      "Pago de retenciones efectuadas a trabajadores en el mes inmediato anterior.",
    clientsAffected: "95 clientes con nómina",
  },
  {
    id: "obl-5",
    date: "30 Sep 2026",
    isoDate: "2026-09-30",
    title: "Presentación de la DIOT (Operaciones con Terceros)",
    type: "Obligación SAT",
    status: "Programado",
    description:
      "Envío del archivo de información de proveedores y desglose de IVA acreditable.",
    clientsAffected: "186 clientes",
  },
  {
    id: "obl-6",
    date: "30 Sep 2026",
    isoDate: "2026-09-30",
    title: "Envío de Estados Financieros y balanzas al cliente",
    type: "Entregable Despacho",
    status: "Programado",
    description:
      "Emisión de balance general, estado de resultados y ratios fiscales.",
    clientsAffected: "186 clientes",
  },
];

function normalizeObligations(list: any[]): FiscalObligation[] {
  return list.map((item, idx) => {
    const isoDate =
      item.isoDate ||
      (item.date ? parseDisplayDateToIso(item.date) : "2026-09-17");
    const date = item.date || formatIsoToDisplayDate(isoDate);
    return {
      id: item.id || `obl-${Date.now()}-${idx}`,
      date,
      isoDate,
      title: item.title || "Obligación Fiscal",
      type: item.type || "Obligación SAT",
      status: (item.status as ObligationStatus) || "Programado",
      description: item.description || "",
      clientsAffected: item.clientsAffected || "Todos los clientes",
    };
  });
}

export function CalendarioFiscal() {
  const [obligations, setObligations] = useState<FiscalObligation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return normalizeObligations(parsed);
        }
      }
    } catch (e) {
      console.error("Error loading fiscal obligations from localStorage:", e);
    }
    return DEFAULT_OBLIGATIONS;
  });

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  // Month filter: null means show all obligations, or "YYYY-MM" for a specific month
  const [selectedYearMonth, setSelectedYearMonth] = useState<string | null>(null);

  // Add / Edit Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingObligation, setEditingObligation] =
    useState<FiscalObligation | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    isoDate: "2026-09-17",
    type: "Obligación SAT",
    status: "Programado" as ObligationStatus,
    description: "",
    clientsAffected: "186 clientes",
  });

  // Delete confirmation Dialog state
  const [deletingObligation, setDeletingObligation] =
    useState<FiscalObligation | null>(null);

  // Sync from Supabase app_settings on mount if available
  useEffect(() => {
    let isMounted = true;
    const fetchRemoteObligations = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("other_settings")
          .eq("id", "global")
          .single();

        if (!error && data?.other_settings?.fiscal_obligations) {
          const remoteList = data.other_settings.fiscal_obligations;
          if (Array.isArray(remoteList) && isMounted) {
            const normalized = normalizeObligations(remoteList);
            setObligations(normalized);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          }
        }
      } catch {
        // Fallback to local state silently
      }
    };
    fetchRemoteObligations();
    return () => {
      isMounted = false;
    };
  }, []);

  const persistObligations = async (updatedList: FiscalObligation[]) => {
    setObligations(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }

    try {
      const { data: currentData } = await supabase
        .from("app_settings")
        .select("other_settings")
        .eq("id", "global")
        .single();

      const updatedOtherSettings = {
        ...(currentData?.other_settings || {}),
        fiscal_obligations: updatedList,
      };

      await supabase
        .from("app_settings")
        .update({
          other_settings: updatedOtherSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "global");
    } catch {
      // Non-admin or offline users still have localStorage persistence
    }
  };

  // Month navigation helpers
  const activeMonthLabel = useMemo(() => {
    if (!selectedYearMonth) {
      // Determine dominant or default month from obligations
      const months = Array.from(
        new Set(obligations.map((o) => o.isoDate.slice(0, 7)))
      ).sort();
      if (months.length === 1) {
        const [y, m] = months[0].split("-");
        const mIdx = parseInt(m, 10) - 1;
        return `${FULL_MONTHS[mIdx] || "Septiembre"} ${y}`;
      }
      return "Todos los periodos";
    }
    const [y, m] = selectedYearMonth.split("-");
    const mIdx = parseInt(m, 10) - 1;
    return `${FULL_MONTHS[mIdx] || "Septiembre"} ${y}`;
  }, [selectedYearMonth, obligations]);

  const handleShiftMonth = (delta: number) => {
    const baseYm =
      selectedYearMonth ||
      obligations[0]?.isoDate?.slice(0, 7) ||
      "2026-09";
    const [yearStr, monthStr] = baseYm.split("-");
    const dateObj = new Date(
      parseInt(yearStr, 10),
      parseInt(monthStr, 10) - 1 + delta,
      1
    );
    const nextYm = `${dateObj.getFullYear()}-${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}`;
    setSelectedYearMonth(nextYm);
  };

  // Filtered and sorted obligations
  const filteredObligations = useMemo(() => {
    return [...obligations]
      .filter((item) => {
        if (
          selectedYearMonth &&
          !item.isoDate.startsWith(selectedYearMonth)
        ) {
          return false;
        }
        if (typeFilter !== "all" && item.type !== typeFilter) {
          return false;
        }
        if (statusFilter !== "all" && item.status !== statusFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchType = item.type.toLowerCase().includes(q);
          const matchClients = item.clientsAffected.toLowerCase().includes(q);
          const matchDate = item.date.toLowerCase().includes(q);
          if (
            !matchTitle &&
            !matchDesc &&
            !matchType &&
            !matchClients &&
            !matchDate
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  }, [
    obligations,
    selectedYearMonth,
    typeFilter,
    statusFilter,
    searchQuery,
  ]);

  // Dynamic KPI metrics
  const completedCount = useMemo(
    () => filteredObligations.filter((o) => o.status === "Completado").length,
    [filteredObligations]
  );

  const nextMajorObligation = useMemo(() => {
    const pending = filteredObligations.filter(
      (o) => o.status !== "Completado"
    );
    const satPending = pending.find((o) => o.type === "Obligación SAT");
    return satPending || pending[0] || filteredObligations[0] || null;
  }, [filteredObligations]);

  const pendingOrExpiringCount = useMemo(
    () =>
      filteredObligations.filter(
        (o) => o.status === "Por vencer" || o.status === "Vencido"
      ).length,
    [filteredObligations]
  );

  // Open Modal to Add New Obligation
  const handleOpenCreate = () => {
    setEditingObligation(null);
    const defaultYm = selectedYearMonth || "2026-09";
    setFormData({
      title: "",
      isoDate: `${defaultYm}-17`,
      type: "Obligación SAT",
      status: "Programado",
      description: "",
      clientsAffected: "186 clientes",
    });
    setIsFormOpen(true);
  };

  // Open Modal to Edit Obligation
  const handleOpenEdit = (obligation: FiscalObligation) => {
    setEditingObligation(obligation);
    setFormData({
      title: obligation.title,
      isoDate: obligation.isoDate || parseDisplayDateToIso(obligation.date),
      type: obligation.type,
      status: obligation.status,
      description: obligation.description,
      clientsAffected: obligation.clientsAffected,
    });
    setIsFormOpen(true);
  };

  // Submit Create or Update
  const handleSaveObligation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      sileo.error({ title: "Por favor ingresa el título de la obligación fiscal" });
      return;
    }
    if (!formData.isoDate) {
      sileo.error({ title: "Por favor selecciona una fecha límite" });
      return;
    }

    const formattedDate = formatIsoToDisplayDate(formData.isoDate);

    if (editingObligation) {
      const updatedList = obligations.map((item) =>
        item.id === editingObligation.id
          ? {
              ...item,
              title: formData.title.trim(),
              isoDate: formData.isoDate,
              date: formattedDate,
              type: formData.type,
              status: formData.status,
              description: formData.description.trim(),
              clientsAffected:
                formData.clientsAffected.trim() || "Todos los clientes",
            }
          : item
      );
      await persistObligations(updatedList);
      logActivity("CALENDAR_OBLIGATION_STATUS_UPDATED", {
        obligationId: editingObligation.id,
        title: `Obligación actualizada: ${formData.title.trim()}`,
        description: `Se actualizó "${formData.title.trim()}" (${formattedDate}) — Estatus: ${formData.status}.`,
        category: "calendario",
      });
      sileo.success({ title: "Obligación fiscal actualizada correctamente" });
    } else {
      const newObligation: FiscalObligation = {
        id: `obl-${Date.now()}`,
        title: formData.title.trim(),
        isoDate: formData.isoDate,
        date: formattedDate,
        type: formData.type,
        status: formData.status,
        description: formData.description.trim(),
        clientsAffected:
          formData.clientsAffected.trim() || "Todos los clientes",
      };
      const updatedList = [...obligations, newObligation];
      await persistObligations(updatedList);
      logActivity("CALENDAR_OBLIGATION_CREATED", {
        obligationId: newObligation.id,
        title: `Obligación agendada: ${newObligation.title}`,
        description: `Se programó "${newObligation.title}" para el ${formattedDate} (${newObligation.type}).`,
        category: "calendario",
      });
      sileo.success({ title: "Nueva obligación fiscal agregada al calendario" });
    }

    // If a month filter is active and the saved obligation is in a different month,
    // clear the month filter so the user immediately sees the obligation they just saved
    if (
      selectedYearMonth &&
      !formData.isoDate.startsWith(selectedYearMonth)
    ) {
      setSelectedYearMonth(null);
    }

    setIsFormOpen(false);
    setEditingObligation(null);
  };

  // Confirm Delete Obligation
  const handleConfirmDelete = async () => {
    if (!deletingObligation) return;
    const updatedList = obligations.filter(
      (item) => item.id !== deletingObligation.id
    );
    await persistObligations(updatedList);
    logActivity("CALENDAR_OBLIGATION_DELETED", {
      obligationId: deletingObligation.id,
      title: `Obligación eliminada: ${deletingObligation.title}`,
      description: `Se eliminó la obligación "${deletingObligation.title}" (${deletingObligation.date}) del calendario fiscal.`,
      category: "calendario",
    });
    sileo.success({
      title: `Obligación "${deletingObligation.title}" eliminada`,
    });
    setDeletingObligation(null);
  };

  const getStatusBadgeClasses = (status: ObligationStatus) => {
    switch (status) {
      case "Completado":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Por vencer":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "En proceso":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Vencido":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Calendario de Obligaciones Fiscales
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fechas límite de cumplimiento ante el SAT, IMSS, INFONAVIT y entregables del despacho
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleShiftMonth(-1)}
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Mes Anterior
          </Button>
          {selectedYearMonth && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedYearMonth(null)}
            >
              Ver todos
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleShiftMonth(1)}
          >
            Mes Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-1.5"
            onClick={handleOpenCreate}
          >
            <Plus className="h-3.5 w-3.5" /> Nueva Obligación Fiscal
          </Button>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card shadow-xs border-blue-500/30">
          <p className="text-xs text-muted-foreground font-medium">
            Próximo Vencimiento Mayor
          </p>
          <p className="text-xl font-bold text-foreground mt-1">
            {nextMajorObligation
              ? formatIsoToLongDate(nextMajorObligation.isoDate)
              : "Sin vencimientos"}
          </p>
          <p className="text-xs text-blue-600 mt-1 font-medium truncate">
            {nextMajorObligation
              ? nextMajorObligation.title
              : "Todas las obligaciones completadas"}
          </p>
        </Card>

        <Card className="p-4 bg-card shadow-xs border-emerald-500/30">
          <p className="text-xs text-muted-foreground font-medium">
            Hitos Completados del Mes
          </p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {completedCount} de {filteredObligations.length} hitos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredObligations.length > 0
              ? `${Math.round(
                  (completedCount / filteredObligations.length) * 100
                )}% de avance en calendario`
              : "Sin obligaciones registradas"}
          </p>
        </Card>

        <Card className="p-4 bg-card shadow-xs border-amber-500/30">
          <p className="text-xs text-muted-foreground font-medium">
            Obligaciones Por Vencer / Críticas
          </p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {pendingOrExpiringCount}{" "}
            {pendingOrExpiringCount === 1 ? "obligación" : "obligaciones"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {nextMajorObligation
              ? `Próximo límite: ${nextMajorObligation.date}`
              : "Al corriente"}
          </p>
        </Card>
      </div>

      {/* Timeline List Card */}
      <Card className="border-border/80 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" /> Cronograma{" "}
            {activeMonthLabel} ({filteredObligations.length})
          </h3>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar obligación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[165px] h-8 text-xs bg-muted/20">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {OBLIGATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[145px] h-8 text-xs bg-muted/20">
                <SelectValue placeholder="Estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estatus</SelectItem>
                {OBLIGATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredObligations.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border/70 rounded-xl space-y-3">
            <p className="text-sm text-muted-foreground">
              No se encontraron obligaciones fiscales en este criterio.
            </p>
            <div className="flex items-center justify-center gap-2">
              {(searchQuery ||
                typeFilter !== "all" ||
                statusFilter !== "all" ||
                selectedYearMonth) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("all");
                    setStatusFilter("all");
                    setSelectedYearMonth(null);
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
              <Button
                size="sm"
                className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-1.5"
                onClick={handleOpenCreate}
              >
                <Plus className="h-3.5 w-3.5" /> Agregar Obligación Fiscal
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredObligations.map((event) => {
              const dateParts = event.date.split(" ");
              const dayPart = dateParts[0] || "—";
              const monthPart = dateParts[1] || "";

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-[#1e3a5f] text-white flex flex-col items-center justify-center font-bold text-xs shrink-0 leading-tight">
                      <span>{dayPart}</span>
                      <span className="text-[9px] uppercase font-normal">
                        {monthPart}
                      </span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">
                          {event.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-muted/40"
                        >
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                        {event.description}
                      </p>
                      <p className="text-[11px] font-medium text-primary mt-1">
                        Alcance: {event.clientsAffected}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-xs px-2.5 py-0.5 ${getStatusBadgeClasses(
                        event.status
                      )}`}
                    >
                      {event.status}
                    </Badge>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(event)}
                      title="Editar obligación fiscal"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-border/70"
                      onClick={() => setDeletingObligation(event)}
                      title="Eliminar obligación fiscal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Dialog: Create / Edit Fiscal Obligation */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingObligation
                ? "Editar Obligación Fiscal"
                : "Nueva Obligación Fiscal"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingObligation
                ? "Modifica los detalles, fecha de vencimiento o estatus de la obligación fiscal."
                : "Registra una nueva fecha límite o entregable en el calendario de obligaciones fiscales."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveObligation} className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="obl-title" className="text-xs">
                Título de la Obligación *
              </Label>
              <Input
                id="obl-title"
                placeholder="Ej. Declaración y Pago Provisional de ISR e IVA (SAT)"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="obl-date" className="text-xs">
                  Fecha Límite / Vencimiento *
                </Label>
                <Input
                  id="obl-date"
                  type="date"
                  value={formData.isoDate}
                  onChange={(e) =>
                    setFormData({ ...formData, isoDate: e.target.value })
                  }
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Obligación *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) =>
                    setFormData({ ...formData, type: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {OBLIGATION_TYPES.map((typeOption) => (
                      <SelectItem key={typeOption} value={typeOption}>
                        {typeOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Estatus *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData({
                      ...formData,
                      status: val as ObligationStatus,
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Seleccionar estatus" />
                  </SelectTrigger>
                  <SelectContent>
                    {OBLIGATION_STATUSES.map((statusOption) => (
                      <SelectItem key={statusOption} value={statusOption}>
                        {statusOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="obl-clients" className="text-xs">
                  Alcance / Clientes Afectados
                </Label>
                <Input
                  id="obl-clients"
                  placeholder="Ej. 186 clientes, 95 clientes con nómina..."
                  value={formData.clientsAffected}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clientsAffected: e.target.value,
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="obl-desc" className="text-xs">
                Descripción
              </Label>
              <Textarea
                id="obl-desc"
                placeholder="Describe el requerimiento fiscal, entregable o lineamiento..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white"
              >
                {editingObligation ? "Guardar Cambios" : "Crear Obligación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirm Delete */}
      <Dialog
        open={!!deletingObligation}
        onOpenChange={(open) => !open && setDeletingObligation(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Obligación Fiscal</DialogTitle>
            <DialogDescription className="text-xs pt-1">
              ¿Estás seguro de que deseas eliminar la obligación{" "}
              <strong className="text-foreground">
                "{deletingObligation?.title}"
              </strong>{" "}
              ({deletingObligation?.date})? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setDeletingObligation(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              onClick={handleConfirmDelete}
            >
              Eliminar Obligación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
