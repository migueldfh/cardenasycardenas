import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Share2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Check,
  Edit,
  Clock,
  ShieldCheck,
  Mail,
  Phone,
  FileSpreadsheet,
  Building2,
  User,
  ArrowRight,
  Lock,
  Upload,
  Eye,
  Download,
  Trash2,
  Plus,
  Loader2,
  ExternalLink,
  Search,
  FolderOpen,
  CheckCircle2,
  FileUp,
} from "lucide-react";
import { sileo } from "sileo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { CiecVaultModal } from "@/components/CiecVaultModal";
import { formatActivityLog, logActivity } from "@/api/logs";
import {
  useFinanceClients,
  useUpdateFinanceClient,
  useClientDocuments,
  useCreateClientDocument,
  useUpdateClientDocument,
  useDeleteClientDocument,
  useClientActivityLogs,
} from "../hooks";
import type { IClientDocument } from "../types";

const ALL_CONTRACTED_SERVICES = [
  "Contabilidad",
  "Declaraciones",
  "Nómina",
  "DIOT",
  "Estados financieros",
  "Facturación",
  "Asesoría fiscal",
];

const DEFAULT_CONTRACTED_SERVICES = [
  "Contabilidad",
  "Declaraciones",
  "DIOT",
  "Estados financieros",
  "Facturación",
];

const DOCUMENT_CATEGORIES = [
  "Importante",
  "Papelería",
  "Captura contable",
  "Cálculo de impuestos",
  "Presentación SAT",
  "DIOT",
  "Estados financieros",
  "Opinión de cumplimiento",
  "Otro",
];

interface DisplayDocument {
  id: string;
  name: string;
  category: string;
  date: string;
  period: string;
  badge?: string | null;
  notes?: string | null;
  file_url?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  isPersisted: boolean;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ControlMensualDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { data: clients = [], isLoading } = useFinanceClients();
  const updateClientMutation = useUpdateFinanceClient();

  // Client Documents (Supabase Storage)
  const { data: dbDocuments = [], isLoading: loadingDocs } = useClientDocuments(id || "");
  const createDocMutation = useCreateClientDocument();
  const updateDocMutation = useUpdateClientDocument();
  const deleteDocMutation = useDeleteClientDocument();

  const [activeTab, setActiveTab] = useState<string>("resumen");
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  // Document filter state in Documentos tab
  const [docSearch, setDocSearch] = useState("");
  const [docCategoryFilter, setDocCategoryFilter] = useState("all");

  // Upload / Edit Document Modal State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DisplayDocument | null>(null);
  const [docForm, setDocForm] = useState({
    name: "",
    category: "Importante",
    document_date: "",
    period: "",
    badge: "",
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview Document Modal State
  const [previewDoc, setPreviewDoc] = useState<DisplayDocument | null>(null);

  // Edit Client Info Modal State
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [clientEditForm, setClientEditForm] = useState({
    name: "",
    rfc: "",
    person_type: "Moral",
    fiscal_regime: "",
    economic_activity: "",
    email: "",
    invoice_email: "",
    phone: "",
    contact_person: "",
    assigned_accountant: "",
    notes: "",
  });

  // Edit Contracted Services Modal State
  const [isEditServicesOpen, setIsEditServicesOpen] = useState(false);
  const [servicesDraft, setServicesDraft] = useState<string[]>(DEFAULT_CONTRACTED_SERVICES);

  // Fetch complete historical accounting records for this client
  const { data: monthlyHistory = [] } = useQuery<any[]>({
    queryKey: ["client_monthly_accounting", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_monthly_accounting")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const foundClient = useMemo(() => {
    return clients.find((c) => c.id === id);
  }, [clients, id]);

  const currentPeriod =
    selectedPeriod ||
    foundClient?.accounting_period ||
    monthlyHistory[0]?.period ||
    "Septiembre 2026";

  const activeRecord = useMemo(() => {
    if (monthlyHistory.length > 0) {
      const match = monthlyHistory.find((m) => m.period === currentPeriod);
      if (match) return match;
    }
    return foundClient || null;
  }, [monthlyHistory, currentPeriod, foundClient]);

  const contractedServices: string[] = useMemo(() => {
    if (
      foundClient?.contracted_services &&
      Array.isArray(foundClient.contracted_services) &&
      foundClient.contracted_services.length > 0
    ) {
      return foundClient.contracted_services;
    }
    return DEFAULT_CONTRACTED_SERVICES;
  }, [foundClient]);

  const clientData = useMemo(() => {
    if (!foundClient) {
      return {
        id: id || "1",
        name: isLoading ? "Cargando cliente..." : "Cliente",
        rfc: "—",
        personType: "Persona Moral",
        rawPersonType: "Moral",
        regime: "—",
        accountant: "Sin asignar",
        email: "—",
        phone: "—",
        status: "Activo",
        economicActivity: "—",
        contactName: "—",
        ciec: "",
        invoiceEmail: "",
        notes: "",
        progress: 100,
        period: currentPeriod,
        complianceOpinion: "Positiva",
        accountingStatus: "En proceso",
      };
    }
    const hasReal =
      (activeRecord?.accounting_capture_pct !== null &&
        activeRecord?.accounting_capture_pct !== undefined) ||
      (foundClient.accounting_capture_pct !== null &&
        foundClient.accounting_capture_pct !== undefined);

    const activePct =
      activeRecord?.accounting_capture_pct !== null &&
      activeRecord?.accounting_capture_pct !== undefined
        ? Number(activeRecord.accounting_capture_pct)
        : foundClient.accounting_capture_pct !== null &&
          foundClient.accounting_capture_pct !== undefined
        ? Number(foundClient.accounting_capture_pct)
        : 100;

    return {
      id: foundClient.id,
      name: foundClient.name,
      rfc: foundClient.rfc || foundClient.tax_id_rfc || "—",
      personType: foundClient.person_type
        ? `Persona ${foundClient.person_type}`
        : "Persona Moral",
      rawPersonType: foundClient.person_type || "Moral",
      regime: foundClient.tax_regime || foundClient.fiscal_regime || "General de Ley",
      accountant: foundClient.assigned_accountant || "Sin asignar",
      email: foundClient.email || foundClient.invoice_email || "—",
      phone: foundClient.phone || "—",
      status: foundClient.status || "Activo",
      economicActivity: foundClient.economic_activity || "—",
      contactName: foundClient.contact_person || "—",
      ciec: foundClient.ciec || "",
      invoiceEmail: foundClient.invoice_email || "",
      notes:
        activeRecord?.accounting_notes ||
        foundClient.accounting_notes ||
        foundClient.notes ||
        "",
      progress: hasReal ? activePct : 100,
      period: currentPeriod,
      complianceOpinion:
        activeRecord?.compliance_opinion ||
        foundClient.compliance_opinion ||
        "Positiva",
      accountingStatus:
        activeRecord?.accounting_status ||
        foundClient.accounting_status ||
        "En proceso",
    };
  }, [foundClient, activeRecord, currentPeriod, id, isLoading]);

  // Combine the 5 default important document slots with real database documents
  const defaultImportantTemplates = useMemo(
    () => [
      {
        name: "Constancia de situación fiscal",
        date: "12 Ene 2025",
        category: "Importante",
        badge: null,
      },
      {
        name: "e.firma (CSD)",
        date: "15 Mar 2024",
        category: "Importante",
        badge: null,
      },
      {
        name: "Opinión de cumplimiento",
        date: "12 Sep 2026",
        category: "Importante",
        badge: clientData.complianceOpinion || "Positiva",
      },
      {
        name: "Última declaración presentada",
        date: "08 Sep 2026",
        category: "Importante",
        badge: null,
      },
      {
        name: "Contrato de servicios",
        date: "10 Ene 2025",
        category: "Importante",
        badge: null,
      },
    ],
    [clientData.complianceOpinion]
  );

  const allDocuments: DisplayDocument[] = useMemo(() => {
    const matchedDbIds = new Set<string>();
    const list: DisplayDocument[] = [];

    // 1. Resolve the 5 default important documents against dbDocuments
    defaultImportantTemplates.forEach((tpl, idx) => {
      const dbMatch = dbDocuments.find(
        (d) => d.name.trim().toLowerCase() === tpl.name.trim().toLowerCase()
      );
      if (dbMatch) {
        matchedDbIds.add(dbMatch.id);
        list.push({
          id: dbMatch.id,
          name: dbMatch.name,
          category: dbMatch.category || "Importante",
          date:
            dbMatch.document_date ||
            new Date(dbMatch.created_at).toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          period: dbMatch.period || currentPeriod,
          badge: dbMatch.badge ?? tpl.badge,
          notes: dbMatch.notes,
          file_url: dbMatch.file_url,
          file_path: dbMatch.file_path,
          file_name: dbMatch.file_name,
          file_size: dbMatch.file_size,
          mime_type: dbMatch.mime_type,
          isPersisted: true,
        });
      } else {
        list.push({
          id: `default-${idx}`,
          name: tpl.name,
          category: tpl.category,
          date: tpl.date,
          period: currentPeriod,
          badge: tpl.badge,
          notes: null,
          file_url: null,
          file_path: null,
          file_name: null,
          file_size: null,
          mime_type: null,
          isPersisted: false,
        });
      }
    });

    // 2. Append any additional database documents uploaded by the user
    dbDocuments.forEach((d: IClientDocument) => {
      if (!matchedDbIds.has(d.id)) {
        list.push({
          id: d.id,
          name: d.name,
          category: d.category || "Importante",
          date:
            d.document_date ||
            new Date(d.created_at).toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          period: d.period || currentPeriod,
          badge: d.badge,
          notes: d.notes,
          file_url: d.file_url,
          file_path: d.file_path,
          file_name: d.file_name,
          file_size: d.file_size,
          mime_type: d.mime_type,
          isPersisted: true,
        });
      }
    });

    return list;
  }, [dbDocuments, defaultImportantTemplates, currentPeriod]);

  // Important documents shown in the right-hand card on Resumen tab
  const importantDocuments = useMemo(() => {
    return allDocuments.filter(
      (d) =>
        d.category === "Importante" ||
        defaultImportantTemplates.some(
          (t) => t.name.toLowerCase() === d.name.toLowerCase()
        )
    );
  }, [allDocuments, defaultImportantTemplates]);

  // Filtered documents for the Documentos tab
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      const term = docSearch.toLowerCase();
      const matchesSearch =
        doc.name.toLowerCase().includes(term) ||
        doc.category.toLowerCase().includes(term) ||
        (doc.file_name && doc.file_name.toLowerCase().includes(term)) ||
        (doc.notes && doc.notes.toLowerCase().includes(term)) ||
        (doc.period && doc.period.toLowerCase().includes(term));
      if (!matchesSearch) return false;
      if (docCategoryFilter !== "all" && doc.category !== docCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [allDocuments, docSearch, docCategoryFilter]);

  const stages = useMemo(() => {
    const accountant = clientData.accountant || "Sin asignar";
    const hasReal =
      activeRecord?.accounting_capture_pct !== null &&
      activeRecord?.accounting_capture_pct !== undefined;

    const papeleriaRecibida = hasReal ? Boolean(activeRecord?.stationery_received) : true;
    const capturaPct = hasReal ? Number(activeRecord?.accounting_capture_pct) : 100;
    const calculoListo = hasReal ? Boolean(activeRecord?.tax_calculation) : true;
    const presentadoListo = hasReal ? Boolean(activeRecord?.tax_presented) : true;
    const diotListo = hasReal ? Boolean(activeRecord?.diot_presented) : false;
    const efListo = hasReal ? Boolean(activeRecord?.financial_statements) : false;
    const opinionStatus = hasReal
      ? activeRecord?.compliance_opinion || "Positiva"
      : "Positiva";

    const countByCat = (cat: string, fallback: number) => {
      const realCount = dbDocuments.filter(
        (d) => d.category.toLowerCase() === cat.toLowerCase()
      ).length;
      return realCount > 0 ? realCount : fallback;
    };

    return [
      {
        num: 1,
        name: "Papelería",
        category: "Papelería",
        status: papeleriaRecibida ? "Completado" : "Pendiente",
        targetDate: "05 Del Mes",
        completedDate: activeRecord?.stationery_date
          ? activeRecord.stationery_date === "CEROS"
            ? "Ceros"
            : activeRecord.stationery_date === "pte"
            ? "Pendiente"
            : activeRecord.stationery_date === "N/A"
            ? "N/A"
            : activeRecord.stationery_date
          : papeleriaRecibida
          ? "Recibida"
          : "—",
        responsible: accountant,
        comments: activeRecord?.stationery_date
          ? `Estatus: ${activeRecord.stationery_date}`
          : papeleriaRecibida
          ? "Recibida completa"
          : "Pendiente de recepción",
        docs: countByCat("Papelería", papeleriaRecibida ? 3 : 0),
      },
      {
        num: 2,
        name: "Captura contable",
        category: "Captura contable",
        status:
          capturaPct === 100
            ? "Completado"
            : capturaPct > 0
            ? "En proceso"
            : "Pendiente",
        targetDate: "10 Ago 2026",
        completedDate: capturaPct === 100 ? "Completada" : "—",
        responsible: accountant,
        comments: `Avance de captura: ${capturaPct}%`,
        docs: countByCat("Captura contable", capturaPct > 0 ? 2 : 0),
      },
      {
        num: 3,
        name: "Cálculo de impuestos",
        category: "Cálculo de impuestos",
        status: calculoListo ? "Completado" : "Pendiente",
        targetDate: "14 Ago 2026",
        completedDate: calculoListo ? "Calculado" : "—",
        responsible: accountant,
        comments: calculoListo ? "ISR e IVA calculados" : "En espera de cálculo",
        docs: countByCat("Cálculo de impuestos", calculoListo ? 2 : 0),
      },
      {
        num: 4,
        name: "Presentación SAT",
        category: "Presentación SAT",
        status: presentadoListo ? "Completado" : "Pendiente",
        targetDate: "17 Ago 2026",
        completedDate: presentadoListo ? "Presentado" : "—",
        responsible: accountant,
        comments: presentadoListo
          ? "Declaración presentada ante el SAT"
          : "Pendiente de presentación",
        docs: countByCat("Presentación SAT", presentadoListo ? 1 : 0),
      },
      {
        num: 5,
        name: "DIOT",
        category: "DIOT",
        status: diotListo ? "Completado" : "Pendiente",
        targetDate: "20 Ago 2026",
        completedDate: diotListo ? "Presentada" : "—",
        responsible: accountant,
        comments: diotListo ? "Declaración Informativa enviada" : "Pendiente",
        docs: countByCat("DIOT", diotListo ? 1 : 0),
      },
      {
        num: 6,
        name: "Estados financieros",
        category: "Estados financieros",
        status: efListo ? "Completado" : "Pendiente",
        targetDate: "25 Ago 2026",
        completedDate: efListo ? "Generados" : "—",
        responsible: accountant,
        comments: efListo ? "Estados financieros mensuales emitidos" : "Pendiente",
        docs: countByCat("Estados financieros", efListo ? 2 : 0),
      },
      {
        num: 7,
        name: "Opinión de cumplimiento",
        category: "Opinión de cumplimiento",
        status:
          opinionStatus === "Positiva"
            ? "Completado"
            : opinionStatus === "Negativa"
            ? "En riesgo"
            : "Pendiente",
        targetDate: "30 Ago 2026",
        completedDate: opinionStatus === "Positiva" ? "Positiva" : "—",
        responsible: accountant,
        comments: `Opinión SAT: ${opinionStatus}`,
        docs: countByCat("Opinión de cumplimiento", 1),
      },
    ];
  }, [activeRecord, clientData.accountant, dbDocuments]);

  // ─── Real-Time Client Activity & Business Logic Logs ──────────────
  const { data: rawClientLogs = [], isLoading: loadingClientLogs } = useClientActivityLogs(
    id || "",
    clientData.name
  );

  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [activitySearch, setActivitySearch] = useState<string>("");
  const [newLogTitle, setNewLogTitle] = useState<string>("");
  const [newLogCategory, setNewLogCategory] = useState<string>("contabilidad");
  const [newLogNotes, setNewLogNotes] = useState<string>("");
  const [isAddingLog, setIsAddingLog] = useState<boolean>(false);
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);
  const [commentDraft, setCommentDraft] = useState<string>("");

  const activityHistory = useMemo(() => {
    const getIconAndColor = (category: string, badgeTone: string, action: string) => {
      if (category === "cumplimiento" || action.includes("OPINION")) {
        return {
          icon: ShieldCheck,
          color:
            badgeTone === "rose"
              ? "text-rose-600 bg-rose-50"
              : "text-emerald-600 bg-emerald-50",
        };
      }
      if (action.includes("DIOT")) {
        return {
          icon: FileSpreadsheet,
          color: "text-purple-600 bg-purple-50",
        };
      }
      if (category === "impuestos" || action.includes("DECLARACION") || action.includes("CALCULO")) {
        return {
          icon: action.includes("CALCULO") ? Check : FileText,
          color: action.includes("CALCULO")
            ? "text-amber-600 bg-amber-50"
            : "text-blue-600 bg-blue-50",
        };
      }
      if (category === "documentos") {
        return {
          icon: FolderOpen,
          color: "text-indigo-600 bg-indigo-50",
        };
      }
      if (category === "servicios") {
        return {
          icon: Building2,
          color: "text-blue-600 bg-blue-50",
        };
      }
      if (category === "seguridad") {
        return {
          icon: Lock,
          color: "text-amber-600 bg-amber-50",
        };
      }
      return {
        icon: CheckCircle2,
        color:
          badgeTone === "emerald"
            ? "text-emerald-600 bg-emerald-50"
            : badgeTone === "amber"
            ? "text-amber-600 bg-amber-50"
            : badgeTone === "rose"
            ? "text-rose-600 bg-rose-50"
            : "text-blue-600 bg-blue-50",
      };
    };

    if (rawClientLogs.length > 0) {
      return rawClientLogs.map((raw) => {
        const formatted = formatActivityLog(raw);
        const { icon, color } = getIconAndColor(
          formatted.category,
          formatted.badgeTone,
          formatted.action
        );
        const formattedDate = new Date(formatted.createdAt).toLocaleString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return {
          id: formatted.id,
          date: formattedDate,
          title: formatted.title,
          description: formatted.description,
          category: formatted.category,
          moduleLabel: formatted.moduleLabel,
          period: formatted.period || currentPeriod,
          user: formatted.actorName || clientData.accountant,
          icon,
          color,
        };
      });
    }

    // Fallback synthesized from current client accounting state if DB logs haven't loaded yet
    return [
      {
        id: "fallback-1",
        date: "12 Sep 2026 10:15",
        title: `Opinión de cumplimiento ${(clientData.complianceOpinion || "positiva").toLowerCase()}`,
        description: `Verificación de Opinión del Cumplimiento 32-D ante el SAT (${currentPeriod}).`,
        category: "cumplimiento",
        moduleLabel: "Cumplimiento 32-D",
        period: currentPeriod,
        user: clientData.accountant,
        icon: ShieldCheck,
        color: "text-emerald-600 bg-emerald-50",
      },
      {
        id: "fallback-2",
        date: "11 Sep 2026 16:40",
        title: "DIOT presentada",
        description: `Declaración Informativa de Operaciones con Terceros enviada (${currentPeriod}).`,
        category: "impuestos",
        moduleLabel: "Declaración DIOT",
        period: currentPeriod,
        user: clientData.accountant,
        icon: FileSpreadsheet,
        color: "text-purple-600 bg-purple-50",
      },
      {
        id: "fallback-3",
        date: "08 Sep 2026 11:20",
        title: "Declaraciones presentadas",
        description: `Acuse de declaración provisional/definitiva registrado ante el SAT (${currentPeriod}).`,
        category: "impuestos",
        moduleLabel: "Declaraciones SAT",
        period: currentPeriod,
        user: clientData.accountant,
        icon: FileText,
        color: "text-blue-600 bg-blue-50",
      },
      {
        id: "fallback-4",
        date: "07 Sep 2026 09:15",
        title: "Cálculo de impuestos completado",
        description: `Determinación de ISR e IVA del periodo (${currentPeriod}).`,
        category: "impuestos",
        moduleLabel: "Impuestos",
        period: currentPeriod,
        user: clientData.accountant,
        icon: Check,
        color: "text-amber-600 bg-amber-50",
      },
    ];
  }, [rawClientLogs, clientData.accountant, clientData.complianceOpinion, currentPeriod]);

  const filteredActivityHistory = useMemo(() => {
    return activityHistory.filter((item) => {
      if (activityFilter !== "all") {
        if (activityFilter === "contabilidad_impuestos") {
          if (item.category !== "contabilidad" && item.category !== "impuestos") return false;
        } else if (item.category !== activityFilter) {
          return false;
        }
      }
      if (activitySearch.trim()) {
        const q = activitySearch.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q) ||
          item.user.toLowerCase().includes(q) ||
          (item.moduleLabel || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [activityHistory, activityFilter, activitySearch]);

  // ─── Interactive Business Logic Handlers (Stages, Status, Bitácora) ───

  const handleToggleStageStatus = async (stageNum: number) => {
    if (!id) return;
    const payload: Record<string, any> = {
      accounting_period: currentPeriod,
    };
    let actionCode = "CLIENT_ACCOUNTING_UPDATED";
    let logTitle = "";
    let logDesc = "";
    let logCategory = "contabilidad";

    const currentPapeleria = activeRecord?.stationery_received ?? true;
    const currentCaptura = Number(activeRecord?.accounting_capture_pct ?? 100);
    const currentCalculo = activeRecord?.tax_calculation ?? true;
    const currentPresentado = activeRecord?.tax_presented ?? true;
    const currentDiot = activeRecord?.diot_presented ?? true;
    const currentEf = activeRecord?.financial_statements ?? true;
    const currentOpinion = activeRecord?.compliance_opinion || "Positiva";

    if (stageNum === 1) {
      const nextVal = !currentPapeleria;
      payload.stationery_received = nextVal;
      payload.stationery_date = nextVal ? new Date().toISOString().slice(0, 10) : null;
      actionCode = "ACCOUNTING_STAGE_PAPELERIA";
      logTitle = nextVal ? "Papelería recibida completa" : "Papelería marcada como pendiente";
      logDesc = `Etapa 1 (Papelería) actualizada a "${nextVal ? "Recibida" : "Pendiente"}" en ${currentPeriod}.`;
    } else if (stageNum === 2) {
      const nextPct = currentCaptura >= 100 ? 0 : currentCaptura >= 80 ? 100 : currentCaptura >= 50 ? 80 : 50;
      payload.accounting_capture_pct = nextPct;
      actionCode = "ACCOUNTING_STAGE_CAPTURA";
      logTitle =
        nextPct === 100
          ? "Captura contable completada (100%)"
          : `Avance de captura contable: ${nextPct}%`;
      logDesc = `Etapa 2 (Captura contable) actualizada de ${currentCaptura}% a ${nextPct}% en ${currentPeriod}.`;
    } else if (stageNum === 3) {
      const nextVal = !currentCalculo;
      payload.tax_calculation = nextVal;
      actionCode = "ACCOUNTING_STAGE_CALCULO_IMPUESTOS";
      logTitle = nextVal ? "Cálculo de impuestos completado" : "Cálculo de impuestos pendiente";
      logDesc = `Etapa 3 (Cálculo de impuestos ISR/IVA) marcada como "${nextVal ? "Completado" : "Pendiente"}" en ${currentPeriod}.`;
      logCategory = "impuestos";
    } else if (stageNum === 4) {
      const nextVal = !currentPresentado;
      payload.tax_presented = nextVal;
      actionCode = "ACCOUNTING_STAGE_DECLARACION_SAT";
      logTitle = nextVal ? "Declaraciones presentadas" : "Declaración SAT pendiente";
      logDesc = `Etapa 4 (Presentación SAT) marcada como "${nextVal ? "Presentada" : "Pendiente"}" en ${currentPeriod}.`;
      logCategory = "impuestos";
    } else if (stageNum === 5) {
      const nextVal = !currentDiot;
      payload.diot_presented = nextVal;
      actionCode = "ACCOUNTING_STAGE_DIOT";
      logTitle = nextVal ? "DIOT presentada" : "DIOT marcada como pendiente";
      logDesc = `Etapa 5 (DIOT) actualizada a "${nextVal ? "Presentada" : "Pendiente"}" en ${currentPeriod}.`;
      logCategory = "impuestos";
    } else if (stageNum === 6) {
      const nextVal = !currentEf;
      payload.financial_statements = nextVal;
      actionCode = "ACCOUNTING_STAGE_ESTADOS_FINANCIEROS";
      logTitle = nextVal
        ? "Estados financieros enviados al cliente"
        : "Estados financieros pendientes";
      logDesc = `Etapa 6 (Estados financieros) actualizada a "${nextVal ? "Completado" : "Pendiente"}" en ${currentPeriod}.`;
    } else if (stageNum === 7) {
      const nextOpinion = currentOpinion === "Positiva" ? "Negativa" : "Positiva";
      payload.compliance_opinion = nextOpinion;
      actionCode = "ACCOUNTING_STAGE_OPINION_32D";
      logTitle = `Opinión de cumplimiento ${nextOpinion.toLowerCase()}`;
      logDesc = `Etapa 7 (Opinión de cumplimiento 32-D) actualizada a "${nextOpinion}" en ${currentPeriod}.`;
      logCategory = "cumplimiento";
    }

    try {
      await updateClientMutation.mutateAsync({ id, payload });
      await logActivity(actionCode, {
        client_id: id,
        client_name: clientData.name,
        user_name: profile?.full_name || clientData.accountant,
        period: currentPeriod,
        title: logTitle,
        description: logDesc,
        category: logCategory,
      });
      queryClient.invalidateQueries({ queryKey: ["client_monthly_accounting", id] });
      sileo.success({ title: logTitle });
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al actualizar etapa contable" });
    }
  };

  const handleUpdatePeriodStatus = async (newStatus: string) => {
    if (!id) return;
    try {
      await updateClientMutation.mutateAsync({
        id,
        payload: {
          accounting_status: newStatus,
          accounting_period: currentPeriod,
        },
      });
      await logActivity("ACCOUNTING_PERIOD_STATUS_UPDATED", {
        client_id: id,
        client_name: clientData.name,
        user_name: profile?.full_name || clientData.accountant,
        period: currentPeriod,
        new_value: newStatus,
        title: `Estatus del periodo: ${newStatus}`,
        description: `El estatus general de control mensual (${currentPeriod}) se actualizó a "${newStatus}".`,
        category: "contabilidad",
      });
      queryClient.invalidateQueries({ queryKey: ["client_monthly_accounting", id] });
      sileo.success({ title: `Estatus actualizado a ${newStatus}` });
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al actualizar estatus" });
    }
  };

  const handleSaveAccountantComment = async () => {
    if (!id || !commentDraft.trim()) return;
    try {
      await updateClientMutation.mutateAsync({
        id,
        payload: {
          accounting_notes: commentDraft.trim(),
          accounting_period: currentPeriod,
        },
      });
      await logActivity("ACCOUNTING_COMMENT_UPDATED", {
        client_id: id,
        client_name: clientData.name,
        user_name: profile?.full_name || clientData.accountant,
        period: currentPeriod,
        notes: commentDraft.trim(),
        title: "Comentario del contador actualizado",
        description: commentDraft.trim(),
        category: "comentario",
      });
      queryClient.invalidateQueries({ queryKey: ["client_monthly_accounting", id] });
      setIsEditingComment(false);
      sileo.success({ title: "Comentario guardado y registrado en bitácora" });
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al guardar comentario" });
    }
  };

  const handleCreateManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newLogTitle.trim()) return;
    try {
      await logActivity("MANUAL_CLIENT_LOG_CREATED", {
        client_id: id,
        client_name: clientData.name,
        user_name: profile?.full_name || clientData.accountant,
        period: currentPeriod,
        title: newLogTitle.trim(),
        description:
          newLogNotes.trim() ||
          `Registro manual en bitácora del cliente para el periodo ${currentPeriod}.`,
        category: newLogCategory,
      });
      setNewLogTitle("");
      setNewLogNotes("");
      setIsAddingLog(false);
      sileo.success({ title: "Movimiento registrado en la bitácora del cliente" });
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al registrar en bitácora" });
    }
  };

  // ─── Handlers for Document Upload / Edit / View / Delete ──────────

  const handleOpenCreateDoc = (defaultCategory = "Importante", defaultName = "") => {
    setEditingDoc(null);
    const todayFormatted = new Date().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    setDocForm({
      name: defaultName,
      category: defaultCategory,
      document_date: todayFormatted,
      period: currentPeriod,
      badge: defaultName.toLowerCase().includes("opinión") ? "Positiva" : "",
      notes: "",
    });
    setSelectedFile(null);
    setIsDocModalOpen(true);
  };

  const handleOpenEditDoc = (doc: DisplayDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingDoc(doc);
    setDocForm({
      name: doc.name,
      category: doc.category || "Importante",
      document_date: doc.date || "",
      period: doc.period || currentPeriod,
      badge: doc.badge || "",
      notes: doc.notes || "",
    });
    setSelectedFile(null);
    setIsDocModalOpen(true);
  };

  const handleViewDocument = (doc: DisplayDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewDoc(doc);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!docForm.name.trim()) {
      sileo.error({ title: "Ingresa el nombre del documento" });
      return;
    }

    try {
      if (editingDoc && editingDoc.isPersisted) {
        await updateDocMutation.mutateAsync({
          id: editingDoc.id,
          payload: {
            client_id: id,
            name: docForm.name.trim(),
            category: docForm.category,
            document_date: docForm.document_date.trim() || null,
            period: docForm.period.trim() || null,
            badge: docForm.badge.trim() || null,
            notes: docForm.notes.trim() || null,
            file: selectedFile,
            existing_file_path: editingDoc.file_path,
          },
        });
        sileo.success({
          title: selectedFile
            ? "Documento y archivo actualizados en Supabase Storage"
            : "Documento actualizado correctamente",
        });
      } else {
        await createDocMutation.mutateAsync({
          client_id: id,
          name: docForm.name.trim(),
          category: docForm.category,
          document_date: docForm.document_date.trim() || null,
          period: docForm.period.trim() || null,
          badge: docForm.badge.trim() || null,
          notes: docForm.notes.trim() || null,
          file: selectedFile,
        });
        sileo.success({
          title: selectedFile
            ? "Documento subido a Supabase Storage con éxito"
            : "Documento guardado correctamente",
        });
      }
      setIsDocModalOpen(false);
      setEditingDoc(null);
      setSelectedFile(null);
    } catch (err: any) {
      sileo.error({
        title: err.message || "Error al guardar el documento en Supabase Storage",
      });
    }
  };

  const handleDeleteDocument = async (doc: DisplayDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!id || !doc.isPersisted) return;
    try {
      await deleteDocMutation.mutateAsync({
        id: doc.id,
        clientId: id,
        filePath: doc.file_path,
      });
      sileo.success({ title: "Documento eliminado de Supabase Storage" });
      if (previewDoc?.id === doc.id) {
        setPreviewDoc(null);
      }
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al eliminar el documento" });
    }
  };

  // ─── Handlers for Contracted Services & Client Info Editing ──────

  const handleToggleServiceDirect = async (serviceName: string, checked: boolean) => {
    if (!id) return;
    const nextServices = checked
      ? Array.from(new Set([...contractedServices, serviceName]))
      : contractedServices.filter((s) => s !== serviceName);

    try {
      await updateClientMutation.mutateAsync({
        id,
        payload: {
          contracted_services: nextServices,
        },
      });
      sileo.success({ title: "Servicios contratados actualizados" });
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al actualizar servicios" });
    }
  };

  const handleOpenEditServices = () => {
    setServicesDraft(contractedServices);
    setIsEditServicesOpen(true);
  };

  const handleSaveServicesModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await updateClientMutation.mutateAsync({
        id,
        payload: {
          contracted_services: servicesDraft,
        },
      });
      sileo.success({ title: "Servicios contratados guardados con éxito" });
      setIsEditServicesOpen(false);
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al guardar servicios" });
    }
  };

  const handleOpenEditClient = () => {
    setClientEditForm({
      name: foundClient?.name || clientData.name || "",
      rfc: foundClient?.tax_id_rfc || foundClient?.rfc || "",
      person_type: foundClient?.person_type || "Moral",
      fiscal_regime: foundClient?.fiscal_regime || foundClient?.tax_regime || "",
      economic_activity: foundClient?.economic_activity || "",
      email: foundClient?.email || "",
      invoice_email: foundClient?.invoice_email || "",
      phone: foundClient?.phone || "",
      contact_person: foundClient?.contact_person || "",
      assigned_accountant: foundClient?.assigned_accountant || "",
      notes: foundClient?.notes || "",
    });
    setIsEditClientOpen(true);
  };

  const handleSaveClientInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !clientEditForm.name.trim()) return;
    try {
      await updateClientMutation.mutateAsync({
        id,
        payload: {
          name: clientEditForm.name.trim(),
          tax_id_rfc: clientEditForm.rfc.trim().toUpperCase() || null,
          person_type: clientEditForm.person_type || "Moral",
          fiscal_regime: clientEditForm.fiscal_regime.trim() || null,
          economic_activity: clientEditForm.economic_activity.trim() || null,
          email: clientEditForm.email.trim() || null,
          invoice_email: clientEditForm.invoice_email.trim() || null,
          phone: clientEditForm.phone.trim() || null,
          contact_person: clientEditForm.contact_person.trim() || null,
          assigned_accountant: isAdmin
            ? clientEditForm.assigned_accountant.trim() || null
            : foundClient?.assigned_accountant,
          notes: clientEditForm.notes.trim() || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      sileo.success({ title: "Información del cliente actualizada" });
      setIsEditClientOpen(false);
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al actualizar el cliente" });
    }
  };

  const isSavingDoc = createDocMutation.isPending || updateDocMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/control-mensual" className="hover:text-foreground">
          Operaciones
        </Link>
        <span>›</span>
        <Link to="/control-mensual" className="hover:text-foreground">
          Control mensual
        </Link>
        <span>›</span>
        <span className="text-foreground font-medium">{clientData.name}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {clientData.name}
            </h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="cursor-pointer focus:outline-none">
                  <Badge
                    className={`text-xs font-normal ${
                      clientData.accountingStatus === "Completado" ||
                      clientData.accountingStatus === "Concluido"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : clientData.accountingStatus === "Declarado"
                        ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        : clientData.accountingStatus === "En riesgo" ||
                          clientData.accountingStatus === "Atrasado"
                        ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    {clientData.accountingStatus || "Completado"} ▾
                  </Badge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="text-xs">
                {["Completado", "Declarado", "En proceso", "En riesgo", "Atrasado"].map((st) => (
                  <DropdownMenuItem key={st} onClick={() => handleUpdatePeriodStatus(st)}>
                    Cambiar estatus a: <strong className="ml-1">{st}</strong>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {clientData.rfc} | {clientData.personType} | {clientData.regime} | Contador:{" "}
            {clientData.accountant}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => handleOpenCreateDoc("Importante")}
          >
            <Upload className="h-3.5 w-3.5 text-primary" /> Subir documento
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              sileo.success({ title: "Enlace copiado al portapapeles" });
            }}
          >
            <Share2 className="h-3.5 w-3.5" /> Compartir
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Más acciones ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => setActiveTab("documentos")}>
                Ver todos los documentos ({allDocuments.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenCreateDoc("Importante")}>
                Subir nuevo documento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenEditClient}>
                Editar información del cliente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/clients/${clientData.id}`)}>
                Ver ficha completa del cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-none border-r"
              onClick={() => navigate("/control-mensual")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => navigate("/control-mensual")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Controlled Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/40 h-9 p-1 border-b border-border/40 flex-wrap">
          <TabsTrigger value="resumen" className="text-xs">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="contabilidad" className="text-xs flex items-center gap-1.5">
            Contabilidad <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          </TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs flex items-center gap-1.5">
            Documentos
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[10px] bg-primary/10 text-primary"
            >
              {allDocuments.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="obligaciones" className="text-xs">
            Obligaciones
          </TabsTrigger>
          <TabsTrigger value="opiniones" className="text-xs">
            Opiniones
          </TabsTrigger>
          <TabsTrigger value="actividad" className="text-xs">
            Actividad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="pt-4 space-y-6">
          {/* Quick Info Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-3 bg-muted/20 border-border/80 shadow-xs flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate font-mono">
                  {clientData.rfc}
                </p>
                <p className="text-[11px] text-muted-foreground">{clientData.regime}</p>
              </div>
            </Card>

            <Card className="p-3 bg-muted/20 border-border/80 shadow-xs flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {clientData.accountant}
                </p>
                <p className="text-[11px] text-muted-foreground">Contador asignado</p>
              </div>
            </Card>

            <Card className="p-3 bg-muted/20 border-border/80 shadow-xs flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {clientData.email}
                </p>
                <p className="text-[11px] text-muted-foreground">Correo</p>
              </div>
            </Card>

            <Card className="p-3 bg-muted/20 border-border/80 shadow-xs flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Phone className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{clientData.phone}</p>
                <p className="text-[11px] text-muted-foreground">Teléfono</p>
              </div>
            </Card>

            <Card className="p-3 bg-muted/20 border-border/80 shadow-xs flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-primary font-semibold flex items-center justify-center gap-1 h-full"
                asChild
              >
                <Link to={clientData.id ? `/clients/${clientData.id}` : "/clients"}>
                  Ver ficha completa <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </Card>
          </div>

          {/* Secondary Fiscal & SAT Credentials Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-muted/20 rounded-lg border text-xs">
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-emerald-900 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Contraseña CIEC
                  (SAT)
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] bg-background border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 font-mono"
                >
                  AES-256
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="font-mono text-xs text-muted-foreground tracking-widest">
                  ••••••••••••
                </span>
                {clientData.ciec ? (
                  isAdmin ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsVaultOpen(true)}
                      className="h-6 px-2 text-[10px] bg-white dark:bg-card border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100/50 text-emerald-800 dark:text-emerald-300 font-medium gap-1 shadow-xs"
                    >
                      <Lock className="h-3 w-3 text-emerald-600" /> Desbloquear
                    </Button>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono bg-muted/70 px-2 py-0.5 rounded border border-border/60"
                      title="Protegido en Bóveda SAT (Acceso exclusivo Administrador)"
                    >
                      <Lock className="h-2.5 w-2.5 text-muted-foreground/70" />
                      <span>Protegido (Admin)</span>
                    </span>
                  )
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">
                    No registrada
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block">
                Correo Facturación
              </span>
              <span className="font-semibold text-foreground truncate block">
                {clientData.invoiceEmail || "—"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block">
                Encargado / Contacto
              </span>
              <span className="font-semibold text-foreground truncate block">
                {clientData.contactName || "—"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block">
                Actividad Económica
              </span>
              <span className="font-semibold text-foreground truncate block">
                {clientData.economicActivity || "—"}
              </span>
            </div>
          </div>

          {clientData.notes && (
            <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-lg text-xs">
              <span className="text-[10px] text-amber-800 block font-medium">
                Observaciones del Cliente
              </span>
              <p className="text-amber-900 mt-0.5">{clientData.notes}</p>
            </div>
          )}

          {/* Main 2-Column Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Progress Checklist, Accountant Notes, Timeline */}
            <div className="lg:col-span-8 space-y-6">
              {/* Avance de Contabilidad Card */}
              <Card className="p-5 border-border/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">
                      Avance de contabilidad — {currentPeriod}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {monthlyHistory.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Periodo:
                        </span>
                        <select
                          value={currentPeriod}
                          onChange={(e) => setSelectedPeriod(e.target.value)}
                          className="h-7 text-xs font-semibold rounded-md border border-input bg-background text-foreground px-2 py-0.5 shadow-2xs focus-visible:outline-hidden"
                        >
                          {monthlyHistory.map((m: any) => (
                            <option key={m.period} value={m.period}>
                              {m.period} ({m.accounting_status})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <Badge
                      className={`text-xs font-normal ${
                        clientData.accountingStatus === "Concluido" ||
                        clientData.progress === 100
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : clientData.accountingStatus === "Declarado"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : clientData.accountingStatus === "En riesgo"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {clientData.accountingStatus}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-end text-xs font-bold text-foreground">
                    {clientData.progress}%
                  </div>
                  <Progress
                    value={clientData.progress}
                    indicatorClassName={
                      clientData.progress === 100
                        ? "bg-emerald-500"
                        : clientData.progress > 50
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    }
                    className="h-2"
                  />
                </div>

                {/* 7-Stage Checklist Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px] text-muted-foreground bg-muted/20">
                        <TableHead className="py-2.5">Etapa</TableHead>
                        <TableHead className="py-2.5">Estatus</TableHead>
                        <TableHead className="py-2.5">Fecha objetivo</TableHead>
                        <TableHead className="py-2.5">Fecha completada</TableHead>
                        <TableHead className="py-2.5">Responsable</TableHead>
                        <TableHead className="py-2.5">Comentarios</TableHead>
                        <TableHead className="py-2.5 text-right">Documentos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {stages.map((stage) => (
                        <TableRow key={stage.num} className="hover:bg-muted/40">
                          <TableCell className="font-semibold text-foreground py-2.5">
                            › {stage.num}. {stage.name}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => handleToggleStageStatus(stage.num)}
                              className="cursor-pointer focus:outline-none"
                              title="Haz clic para actualizar el estatus de esta etapa contable (se registrará en la bitácora)"
                            >
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0 font-normal transition-colors ${
                                  stage.status === "Completado"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    : stage.status === "En riesgo"
                                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                    : stage.status === "En proceso"
                                    ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                    : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                }`}
                              >
                                {stage.status === "Completado" ? "✓ " : "↻ "}
                                {stage.status}
                              </Badge>
                            </button>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[11px]">
                            {stage.targetDate}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[11px]">
                            {stage.completedDate}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {stage.responsible}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[11px]">
                            {stage.comments}
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setDocCategoryFilter(stage.category);
                                setActiveTab("documentos");
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline cursor-pointer"
                              title={`Ver o subir documentos de ${stage.name}`}
                            >
                              <FileText className="h-3 w-3" /> {stage.docs} docs
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Bottom 2 sub-cards: Comentarios del contador + Historial de actividad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Comentarios del contador */}
                <Card className="p-4 border-border/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-foreground">
                        Comentarios del contador
                      </h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-primary"
                      onClick={() => {
                        setCommentDraft(
                          activeRecord?.accounting_notes ||
                            clientData.notes ||
                            "Se terminó la contabilidad del periodo sin observaciones. Se presentaron declaraciones y DIOT correctamente."
                        );
                        setIsEditingComment((prev) => !prev);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {isEditingComment ? "Cancelar" : "Actualizar"}
                    </Button>
                  </div>

                  {isEditingComment ? (
                    <div className="space-y-2">
                      <textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        rows={3}
                        placeholder="Escribe una observación contable o fiscal del periodo..."
                        className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setIsEditingComment(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white"
                          onClick={handleSaveAccountantComment}
                        >
                          Guardar y registrar en bitácora
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/20 rounded-lg border border-border/60 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-[#1e3a5f] text-white text-[10px]">
                              {(clientData.accountant || "R").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-foreground">
                            {clientData.accountant}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {currentPeriod}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {activeRecord?.accounting_notes ||
                          clientData.notes ||
                          "Se terminó la contabilidad del periodo sin observaciones. Se presentaron declaraciones y DIOT correctamente. Opinión de cumplimiento positiva. Se enviaron estados financieros al cliente."}
                      </p>
                    </div>
                  )}
                </Card>

                {/* Historial de actividad */}
                <Card className="p-4 border-border/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-foreground">
                        Historial de actividad ({activityHistory.length})
                      </h4>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => setActiveTab("actividad")}
                    >
                      Ver toda la actividad →
                    </Button>
                  </div>

                  <div className="space-y-3 text-xs">
                    {activityHistory.slice(0, 5).map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.id || index} className="flex items-start gap-2.5">
                          <div
                            className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.color}`}
                          >
                            <Icon className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-foreground text-xs leading-tight truncate">
                                {item.title}
                              </p>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {item.user}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {item.date}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>

            {/* Right Column: Información del cliente, Servicios contratados, Documentos importantes */}
            <div className="lg:col-span-4 space-y-5">
              {/* Información del cliente Card */}
              <Card className="p-4 border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-bold text-foreground">
                      Información del cliente
                    </h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary gap-1"
                    onClick={handleOpenEditClient}
                  >
                    <Edit className="h-3 w-3" /> Editar
                  </Button>
                </div>

                <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border/60 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Razón social</span>
                    <span className="font-semibold text-foreground text-right">
                      {clientData.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RFC</span>
                    <span className="font-mono font-semibold text-foreground">
                      {clientData.rfc}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Persona</span>
                    <span className="font-medium text-foreground">
                      {clientData.personType}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Régimen fiscal</span>
                    <span className="font-medium text-foreground text-right">
                      {clientData.regime}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">
                      Actividad económica
                    </span>
                    <span className="font-medium text-foreground text-right">
                      {clientData.economicActivity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Correo</span>
                    <span className="font-medium text-foreground truncate max-w-[170px]">
                      {clientData.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teléfono</span>
                    <span className="font-medium text-foreground">
                      {clientData.phone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contacto</span>
                    <span className="font-medium text-foreground">
                      {clientData.contactName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contador asignado</span>
                    <span className="font-semibold text-primary">
                      {clientData.accountant}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Servicios contratados Card */}
              <Card className="p-4 border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <h4 className="text-sm font-bold text-foreground">
                      Servicios contratados
                    </h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary gap-1"
                    onClick={handleOpenEditServices}
                  >
                    <Edit className="h-3 w-3" /> Editar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {ALL_CONTRACTED_SERVICES.map((srv, idx) => {
                    const isChecked = contractedServices.includes(srv);
                    const checkId = `srv-check-${idx}`;
                    return (
                      <div
                        key={srv}
                        className={`flex items-center gap-2 ${
                          idx === ALL_CONTRACTED_SERVICES.length - 1 ? "col-span-2" : ""
                        }`}
                      >
                        <Checkbox
                          id={checkId}
                          checked={isChecked}
                          onCheckedChange={(val) =>
                            handleToggleServiceDirect(srv, Boolean(val))
                          }
                        />
                        <label
                          htmlFor={checkId}
                          className={`cursor-pointer select-none ${
                            isChecked ? "text-foreground font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {srv}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Documentos importantes Card */}
              <Card className="p-4 border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-bold text-foreground">
                      Documentos importantes
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[11px] gap-1"
                      onClick={() => handleOpenCreateDoc("Importante")}
                    >
                      <Upload className="h-3 w-3 text-primary" /> Subir
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => {
                        setDocCategoryFilter("all");
                        setActiveTab("documentos");
                      }}
                    >
                      Ver todos →
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-border/60 text-xs">
                  {importantDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => handleViewDocument(doc)}
                      className="py-2.5 flex items-center justify-between gap-2 hover:bg-muted/30 px-1.5 rounded transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText
                          className={`h-4 w-4 shrink-0 ${
                            doc.file_url ? "text-emerald-600" : "text-blue-600"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                              {doc.name}
                            </p>
                            {doc.file_url && (
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"
                                title="Archivo almacenado en Supabase Storage"
                              />
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {doc.date}
                            {doc.file_name ? ` • ${doc.file_name}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {doc.badge && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 font-normal ${
                              doc.badge === "Negativa"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {doc.badge}
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          title="Ver / Previsualizar documento"
                          onClick={(e) => handleViewDocument(doc, e)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          title="Editar o subir archivo a Supabase Storage"
                          onClick={(e) => handleOpenEditDoc(doc, e)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Contabilidad - Historial Completo de Periodos */}
        <TabsContent value="contabilidad" className="pt-4 space-y-6">
          <Card className="p-5 border-border/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Historial Contable y Declaraciones ({clientData.name})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Registro histórico y trazabilidad de papelería, cálculo, declaraciones y DIOT
                  por periodo.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                {monthlyHistory.length} periodos registrados
              </Badge>
            </div>

            {monthlyHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs border border-dashed rounded-lg">
                No hay historial registrado para este cliente aún.
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs font-semibold">
                      <TableHead>Periodo</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead className="text-right">Avance</TableHead>
                      <TableHead>Papelería</TableHead>
                      <TableHead className="text-center">Cálculo</TableHead>
                      <TableHead className="text-center">Declaración SAT</TableHead>
                      <TableHead className="text-center">DIOT</TableHead>
                      <TableHead className="text-center">Estados Fin.</TableHead>
                      <TableHead>Observaciones / Pendientes</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {monthlyHistory.map((row: any) => (
                      <TableRow
                        key={row.period}
                        className={`hover:bg-muted/30 transition-colors ${
                          row.period === currentPeriod ? "bg-primary/5 font-medium" : ""
                        }`}
                      >
                        <TableCell className="font-bold text-foreground">
                          {row.period}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 font-normal ${
                              row.accounting_status === "Concluido" ||
                              row.accounting_capture_pct === 100
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : row.accounting_status === "Declarado"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : row.accounting_status === "En riesgo"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {row.accounting_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {row.accounting_capture_pct}%
                        </TableCell>
                        <TableCell>
                          {row.stationery_received ? (
                            <span className="text-emerald-700 font-medium">
                              {row.stationery_date || "Recibida"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">
                              Pendiente
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.tax_calculation ? (
                            <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.tax_presented ? (
                            <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.diot_presented ? (
                            <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.financial_statements ? (
                            <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground max-w-[200px] truncate"
                          title={row.accounting_notes}
                        >
                          {row.accounting_notes || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px] text-primary"
                            onClick={() => {
                              setSelectedPeriod(row.period);
                              setActiveTab("resumen");
                              sileo.info({ title: `Periodo seleccionado: ${row.period}` });
                            }}
                          >
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab 3: Documentos (Supabase Storage) */}
        <TabsContent value="documentos" className="pt-4 space-y-6">
          <Card className="p-5 border-border/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  Expediente Digital y Documentos ({clientData.name})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualiza, edita, reemplaza o sube nuevos documentos fiscales y contables
                  directamente a Supabase Storage.
                </p>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-[#1e3a5f] hover:bg-[#152a45] text-white"
                onClick={() => handleOpenCreateDoc("Importante")}
              >
                <Plus className="h-3.5 w-3.5" /> Subir Documento
              </Button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-muted/20 p-3 rounded-lg border border-border/60">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar documento por nombre, categoría, archivo o notas..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={docCategoryFilter}
                  onChange={(e) => setDocCategoryFilter(e.target.value)}
                  className="h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 focus-visible:outline-hidden"
                >
                  <option value="all">Todas las categorías ({allDocuments.length})</option>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {(docSearch || docCategoryFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setDocSearch("");
                      setDocCategoryFilter("all");
                    }}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {/* Documents Table */}
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 text-[11px] text-muted-foreground">
                    <TableHead className="py-2.5">Documento</TableHead>
                    <TableHead className="py-2.5">Categoría</TableHead>
                    <TableHead className="py-2.5">Periodo</TableHead>
                    <TableHead className="py-2.5">Fecha</TableHead>
                    <TableHead className="py-2.5">Estatus</TableHead>
                    <TableHead className="py-2.5">Archivo (Supabase Storage)</TableHead>
                    <TableHead className="py-2.5 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {loadingDocs ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1 text-primary" />
                        Cargando documentos del cliente...
                      </TableCell>
                    </TableRow>
                  ) : filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron documentos con este filtro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <TableRow key={doc.id} className="hover:bg-muted/30">
                        <TableCell className="py-2.5">
                          <div
                            className="flex items-start gap-2.5 cursor-pointer"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <FileText
                              className={`h-4 w-4 mt-0.5 shrink-0 ${
                                doc.file_url ? "text-emerald-600" : "text-blue-600"
                              }`}
                            />
                            <div>
                              <p className="font-semibold text-foreground hover:text-primary hover:underline">
                                {doc.name}
                              </p>
                              {doc.notes && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                  {doc.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {doc.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {doc.period || currentPeriod}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{doc.date}</TableCell>
                        <TableCell>
                          {doc.badge ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] py-0 font-normal ${
                                doc.badge === "Negativa"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {doc.badge}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {doc.file_url ? (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:underline font-medium text-[11px]"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[160px]">
                                {doc.file_name || "Ver archivo"}
                              </span>
                              {doc.file_size ? (
                                <span className="text-[10px] text-muted-foreground">
                                  ({formatFileSize(doc.file_size)})
                                </span>
                              ) : null}
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEditDoc(doc)}
                              className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 hover:underline text-[11px]"
                            >
                              <Upload className="h-3 w-3" /> Pendiente subir archivo
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => handleViewDocument(doc)}
                              title="Ver documento"
                            >
                              <Eye className="h-3.5 w-3.5" /> Ver
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1 text-primary"
                              onClick={() => handleOpenEditDoc(doc)}
                              title="Editar o subir archivo"
                            >
                              <Edit className="h-3.5 w-3.5" />{" "}
                              {doc.file_url ? "Editar" : "Subir / Editar"}
                            </Button>
                            {doc.file_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                asChild
                                title="Descargar archivo"
                              >
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={doc.file_name || doc.name}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            )}
                            {doc.isPersisted && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={(e) => handleDeleteDocument(doc, e)}
                                disabled={deleteDocMutation.isPending}
                                title="Eliminar documento"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: Obligaciones */}
        <TabsContent value="obligaciones" className="pt-4 space-y-6">
          <Card className="p-5 border-border/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Obligaciones Fiscales y Servicios Contratados
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Régimen fiscal: {clientData.regime} ({clientData.personType})
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleOpenEditServices}>
                <Edit className="h-3.5 w-3.5" /> Editar servicios
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {ALL_CONTRACTED_SERVICES.map((srv) => {
                const active = contractedServices.includes(srv);
                return (
                  <div
                    key={srv}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      active
                        ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20"
                        : "bg-muted/20 border-border/60 text-muted-foreground"
                    }`}
                  >
                    <span className="font-medium">{srv}</span>
                    <Badge
                      variant="outline"
                      className={
                        active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                          : "text-[10px]"
                      }
                    >
                      {active ? "Activo" : "No contratado"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 5: Opiniones */}
        <TabsContent value="opiniones" className="pt-4 space-y-6">
          <Card className="p-5 border-border/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Opinión de Cumplimiento Fiscal (Art. 32-D SAT)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estatus actual ante el SAT: {clientData.complianceOpinion}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  const opDoc = importantDocuments.find((d) =>
                    d.name.toLowerCase().includes("opinión")
                  );
                  if (opDoc) handleOpenEditDoc(opDoc);
                  else handleOpenCreateDoc("Opinión de cumplimiento", "Opinión de cumplimiento");
                }}
              >
                <Upload className="h-3.5 w-3.5" /> Subir Acuse 32-D
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 6: Actividad */}
        <TabsContent value="actividad" className="pt-4 space-y-6">
          <Card className="p-5 border-border/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    Bitácora de Actividad del Cliente
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {filteredActivityHistory.length} movimientos
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Historial auditable de etapas contables, declaraciones SAT, opiniones 32-D, documentos y cambios operativos.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    placeholder="Buscar en bitácora..."
                    className="pl-8 h-8 text-xs bg-muted/20"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-1.5 shrink-0"
                  onClick={() => setIsAddingLog((prev) => !prev)}
                >
                  <Plus className="h-3.5 w-3.5" /> Registrar movimiento
                </Button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              {[
                { key: "all", label: "Todos" },
                { key: "contabilidad_impuestos", label: "Contabilidad e Impuestos" },
                { key: "cumplimiento", label: "Cumplimiento 32-D" },
                { key: "documentos", label: "Expediente Digital" },
                { key: "servicios", label: "Servicios y Cliente" },
                { key: "comentario", label: "Observaciones" },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setActivityFilter(pill.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                    activityFilter === pill.key
                      ? "bg-[#1e3a5f] text-white"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Quick Manual Log Form */}
            {isAddingLog && (
              <form
                onSubmit={handleCreateManualLog}
                className="p-3.5 rounded-lg border border-primary/30 bg-primary/5 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    Registrar nuevo movimiento o evento de negocio en bitácora
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setIsAddingLog(false)}
                  >
                    Cerrar
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <Input
                      value={newLogTitle}
                      onChange={(e) => setNewLogTitle(e.target.value)}
                      placeholder="Título del movimiento (ej. Revisión de balanza de comprobación, Aclaración SAT...)"
                      className="h-8 text-xs bg-background"
                      required
                    />
                  </div>
                  <div>
                    <select
                      value={newLogCategory}
                      onChange={(e) => setNewLogCategory(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs"
                    >
                      <option value="contabilidad">Contabilidad</option>
                      <option value="impuestos">Impuestos / SAT</option>
                      <option value="cumplimiento">Cumplimiento 32-D</option>
                      <option value="documentos">Documentos</option>
                      <option value="servicios">Servicios / Cliente</option>
                      <option value="comentario">Observación</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newLogNotes}
                    onChange={(e) => setNewLogNotes(e.target.value)}
                    placeholder="Detalle adicional u observaciones del movimiento (opcional)..."
                    className="h-8 text-xs bg-background flex-1"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white shrink-0"
                  >
                    Guardar en bitácora
                  </Button>
                </div>
              </form>
            )}

            {loadingClientLogs ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Cargando bitácora de actividad...</span>
              </div>
            ) : filteredActivityHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No se encontraron movimientos con los filtros seleccionados.
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {filteredActivityHistory.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id || index}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.color}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{item.title}</p>
                            {item.moduleLabel && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 font-normal bg-background"
                              >
                                {item.moduleLabel}
                              </Badge>
                            )}
                            {item.period && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] py-0 px-1.5 font-normal"
                              >
                                {item.period}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            Por <strong className="font-medium text-foreground">{item.user}</strong> • {item.date}
                          </span>
                        </div>
                        {item.description && item.description !== item.title && (
                          <p className="text-muted-foreground text-[11px] mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Modal: Upload / Edit Document (Supabase Storage) ───────────── */}
      <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveDocument}>
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? `Editar Documento: ${editingDoc.name}` : "Subir Nuevo Documento"}
              </DialogTitle>
              <DialogDescription>
                Carga o reemplaza el archivo en Supabase Storage y edita los datos del
                documento.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3.5 py-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Nombre del documento *
                </label>
                <Input
                  value={docForm.name}
                  onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                  placeholder="Ej. Constancia de situación fiscal"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Categoría</label>
                  <select
                    value={docForm.category}
                    onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs focus-visible:outline-hidden"
                  >
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Fecha del documento
                  </label>
                  <Input
                    value={docForm.document_date}
                    onChange={(e) =>
                      setDocForm({ ...docForm, document_date: e.target.value })
                    }
                    placeholder="Ej. 12 Sep 2026"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Periodo</label>
                  <Input
                    value={docForm.period}
                    onChange={(e) => setDocForm({ ...docForm, period: e.target.value })}
                    placeholder="Ej. Septiembre 2026"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Etiqueta / Estatus (opcional)
                  </label>
                  <Input
                    value={docForm.badge}
                    onChange={(e) => setDocForm({ ...docForm, badge: e.target.value })}
                    placeholder="Ej. Positiva, Vigente..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Archivo (Supabase Storage)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/60 rounded-lg p-4 text-center cursor-pointer transition-colors bg-muted/20"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      if (file && !docForm.name.trim()) {
                        setDocForm((prev) => ({
                          ...prev,
                          name: file.name.replace(/\.[^/.]+$/, ""),
                        }));
                      }
                    }}
                  />
                  <FileUp className="h-6 w-6 mx-auto text-primary mb-1.5" />
                  {selectedFile ? (
                    <div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatFileSize(selectedFile.size)} • Clic para cambiar archivo
                      </p>
                    </div>
                  ) : editingDoc?.file_url ? (
                    <div>
                      <p className="font-medium text-foreground">
                        Archivo actual: {editingDoc.file_name || editingDoc.name}
                      </p>
                      <p className="text-[11px] text-primary mt-0.5">
                        Haz clic aquí para seleccionar un nuevo archivo y reemplazarlo
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-foreground">
                        Haz clic para seleccionar un archivo (PDF, Imagen, XML, CER/KEY, ZIP)
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Se almacenará de forma segura en Supabase Storage
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Notas / Observaciones
                </label>
                <textarea
                  rows={2}
                  value={docForm.notes}
                  onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                  placeholder="Comentarios adicionales sobre este documento..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs focus-visible:outline-hidden"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDocModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isSavingDoc}>
                {isSavingDoc && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {selectedFile ? "Subir y Guardar" : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Preview / View Document ────────────────────────────── */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          {previewDoc && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {previewDoc.name}
                      {previewDoc.badge && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-normal"
                        >
                          {previewDoc.badge}
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-1">
                      Categoría: {previewDoc.category} • Fecha: {previewDoc.date} • Periodo:{" "}
                      {previewDoc.period || currentPeriod}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {previewDoc.notes && (
                <div className="p-3 rounded-lg bg-muted/30 border text-xs">
                  <span className="font-semibold block text-[11px] text-muted-foreground">
                    Notas:
                  </span>
                  {previewDoc.notes}
                </div>
              )}

              {previewDoc.file_url ? (
                <div className="space-y-3">
                  <div className="border rounded-lg overflow-hidden bg-muted/20 min-h-[380px] flex items-center justify-center">
                    {previewDoc.mime_type?.startsWith("image/") ||
                    /\.(png|jpe?g|webp|gif)$/i.test(previewDoc.file_url) ? (
                      <img
                        src={previewDoc.file_url}
                        alt={previewDoc.name}
                        className="max-h-[480px] w-auto object-contain mx-auto"
                      />
                    ) : previewDoc.mime_type === "application/pdf" ||
                      /\.pdf(\?|$)/i.test(previewDoc.file_url) ? (
                      <iframe
                        src={previewDoc.file_url}
                        title={previewDoc.name}
                        className="w-full h-[460px] border-0"
                      />
                    ) : (
                      <div className="p-8 text-center space-y-3">
                        <FileText className="h-12 w-12 text-primary mx-auto" />
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {previewDoc.file_name || previewDoc.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatFileSize(previewDoc.file_size)} • Archivo almacenado en
                            Supabase Storage
                          </p>
                        </div>
                        <Button size="sm" asChild>
                          <a
                            href={previewDoc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={previewDoc.file_name || previewDoc.name}
                          >
                            <Download className="h-4 w-4 mr-1.5" /> Descargar Archivo
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3 bg-muted/10">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Aún no se ha subido un archivo para "{previewDoc.name}"
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sube el archivo PDF, imagen o certificado a Supabase Storage para
                      poder visualizarlo o descargarlo en cualquier momento.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const docToEdit = previewDoc;
                      setPreviewDoc(null);
                      handleOpenEditDoc(docToEdit);
                    }}
                  >
                    <Upload className="h-4 w-4 mr-1.5" /> Subir Archivo Ahora
                  </Button>
                </div>
              )}

              <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const docToEdit = previewDoc;
                      setPreviewDoc(null);
                      handleOpenEditDoc(docToEdit);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />{" "}
                    {previewDoc.file_url ? "Editar / Reemplazar" : "Editar / Subir Archivo"}
                  </Button>
                  {previewDoc.isPersisted && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => handleDeleteDocument(previewDoc, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {previewDoc.file_url && (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={previewDoc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir en pestaña
                        </a>
                      </Button>
                      <Button size="sm" asChild>
                        <a
                          href={previewDoc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={previewDoc.file_name || previewDoc.name}
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" /> Descargar
                        </a>
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setPreviewDoc(null)}
                  >
                    Cerrar
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Edit Contracted Services ───────────────────────────── */}
      <Dialog open={isEditServicesOpen} onOpenChange={setIsEditServicesOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSaveServicesModal}>
            <DialogHeader>
              <DialogTitle>Editar Servicios Contratados</DialogTitle>
              <DialogDescription>
                Selecciona los servicios activos para {clientData.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2.5 py-4 text-xs">
              {ALL_CONTRACTED_SERVICES.map((srv) => {
                const checked = servicesDraft.includes(srv);
                return (
                  <label
                    key={srv}
                    className="flex items-center gap-2.5 p-2 rounded-md border border-border/60 hover:bg-muted/30 cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        if (val) {
                          setServicesDraft((prev) =>
                            Array.from(new Set([...prev, srv]))
                          );
                        } else {
                          setServicesDraft((prev) => prev.filter((s) => s !== srv));
                        }
                      }}
                    />
                    <span className="font-medium text-foreground">{srv}</span>
                  </label>
                );
              })}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditServicesOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={updateClientMutation.isPending}>
                {updateClientMutation.isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Guardar Servicios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Edit Client Information ────────────────────────────── */}
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveClientInfo}>
            <DialogHeader>
              <DialogTitle>Editar Información del Cliente</DialogTitle>
              <DialogDescription>
                Actualiza los datos fiscales y de contacto de {clientData.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3.5 py-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold">Razón Social / Nombre *</label>
                <Input
                  value={clientEditForm.name}
                  onChange={(e) =>
                    setClientEditForm({ ...clientEditForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold">RFC</label>
                  <Input
                    value={clientEditForm.rfc}
                    onChange={(e) =>
                      setClientEditForm({
                        ...clientEditForm,
                        rfc: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Tipo de Persona</label>
                  <select
                    value={clientEditForm.person_type}
                    onChange={(e) =>
                      setClientEditForm({
                        ...clientEditForm,
                        person_type: e.target.value,
                      })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                  >
                    <option value="Moral">Moral</option>
                    <option value="Física">Física</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold">Régimen Fiscal</label>
                  <Input
                    value={clientEditForm.fiscal_regime}
                    onChange={(e) =>
                      setClientEditForm({
                        ...clientEditForm,
                        fiscal_regime: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Actividad Económica</label>
                  <Input
                    value={clientEditForm.economic_activity}
                    onChange={(e) =>
                      setClientEditForm({
                        ...clientEditForm,
                        economic_activity: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold">Correo General</label>
                  <Input
                    value={clientEditForm.email}
                    onChange={(e) =>
                      setClientEditForm({ ...clientEditForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Teléfono</label>
                  <Input
                    value={clientEditForm.phone}
                    onChange={(e) =>
                      setClientEditForm({ ...clientEditForm, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold">Contacto / Encargado</label>
                  <Input
                    value={clientEditForm.contact_person}
                    onChange={(e) =>
                      setClientEditForm({
                        ...clientEditForm,
                        contact_person: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Contador Asignado</label>
                  <Input
                    disabled={!isAdmin}
                    value={clientEditForm.assigned_accountant}
                    onChange={(e) =>
                      setClientEditForm({
                        ...clientEditForm,
                        assigned_accountant: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-semibold">Correo Facturación</label>
                <Input
                  value={clientEditForm.invoice_email}
                  onChange={(e) =>
                    setClientEditForm({
                      ...clientEditForm,
                      invoice_email: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  value={clientEditForm.notes}
                  onChange={(e) =>
                    setClientEditForm({ ...clientEditForm, notes: e.target.value })
                  }
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditClientOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={updateClientMutation.isPending}>
                {updateClientMutation.isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
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
        clientId={clientData.id || null}
        clientName={clientData.name || ""}
        clientRfc={clientData.rfc || ""}
      />
    </div>
  );
}
