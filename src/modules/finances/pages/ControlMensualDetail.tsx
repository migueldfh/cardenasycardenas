import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { sileo } from "sileo";
import { CiecVaultModal } from "@/components/CiecVaultModal";
import { useFinanceClients } from "../hooks";

export function ControlMensualDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useFinanceClients();
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  const foundClient = useMemo(() => {
    return clients.find((c) => c.id === id);
  }, [clients, id]);

  const clientData = useMemo(() => {
    if (!foundClient) {
      return {
        id: id || "1",
        name: isLoading ? "Cargando cliente..." : "Cliente",
        rfc: "—",
        personType: "Persona Moral",
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
      };
    }
    return {
      id: foundClient.id,
      name: foundClient.name,
      rfc: foundClient.rfc || "—",
      personType: foundClient.person_type ? `Persona ${foundClient.person_type}` : "Persona Moral",
      regime: foundClient.tax_regime || "General de Ley",
      accountant: foundClient.assigned_accountant || "Sin asignar",
      email: foundClient.email || foundClient.invoice_email || "—",
      phone: foundClient.phone || "—",
      status: foundClient.status || "Activo",
      economicActivity: foundClient.economic_activity || "—",
      contactName: foundClient.contact_person || "—",
      ciec: foundClient.ciec || "",
      invoiceEmail: foundClient.invoice_email || "",
      notes: foundClient.notes || "",
      progress: 100,
    };
  }, [foundClient, id, isLoading]);

  const stages = [
    {
      num: 1,
      name: "Papelería",
      status: "Completado",
      targetDate: "01 Sep 2026",
      completedDate: "29 Ago 2026",
      responsible: "Rodrigo",
      comments: "Recibida completa",
      docs: 3,
    },
    {
      num: 2,
      name: "Captura contable",
      status: "Completado",
      targetDate: "05 Sep 2026",
      completedDate: "03 Sep 2026",
      responsible: "Rodrigo",
      comments: "Sin observaciones",
      docs: 2,
    },
    {
      num: 3,
      name: "Cálculo de impuestos",
      status: "Completado",
      targetDate: "08 Sep 2026",
      completedDate: "07 Sep 2026",
      responsible: "Rodrigo",
      comments: "ISR e IVA calculados",
      docs: 2,
    },
    {
      num: 4,
      name: "Revisión",
      status: "Completado",
      targetDate: "08 Sep 2026",
      completedDate: "07 Sep 2026",
      responsible: "Alejandra",
      comments: "Revisado y validado",
      docs: 1,
    },
    {
      num: 5,
      name: "Presentación",
      status: "Completado",
      targetDate: "10 Sep 2026",
      completedDate: "08 Sep 2026",
      responsible: "Rodrigo",
      comments: "Acuses en sistema",
      docs: 4,
    },
    {
      num: 6,
      name: "DIOT",
      status: "Completado",
      targetDate: "12 Sep 2026",
      completedDate: "11 Sep 2026",
      responsible: "Rodrigo",
      comments: "Presentada",
      docs: 1,
    },
    {
      num: 7,
      name: "Estados financieros",
      status: "Completado",
      targetDate: "12 Sep 2026",
      completedDate: "11 Sep 2026",
      responsible: "Rodrigo",
      comments: "Enviados al cliente",
      docs: 2,
    },
    {
      num: 8,
      name: "Opinión de cumplimiento",
      status: "Completado",
      targetDate: "15 Sep 2026",
      completedDate: "12 Sep 2026",
      responsible: "Rodrigo",
      comments: "Positiva",
      docs: 1,
    },
  ];

  const activityHistory = [
    {
      date: "12 Sep 2026 10:15",
      title: "Opinión de cumplimiento positiva",
      user: "Rodrigo",
      icon: ShieldCheck,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      date: "11 Sep 2026 16:40",
      title: "DIOT presentada",
      user: "Rodrigo",
      icon: FileSpreadsheet,
      color: "text-purple-600 bg-purple-50",
    },
    {
      date: "08 Sep 2026 11:20",
      title: "Declaraciones presentadas",
      user: "Rodrigo",
      icon: FileText,
      color: "text-blue-600 bg-blue-50",
    },
    {
      date: "07 Sep 2026 09:15",
      title: "Cálculo de impuestos completado",
      user: "Rodrigo",
      icon: Check,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  const importantDocuments = [
    { name: "Constancia de situación fiscal", date: "12 Ene 2025", type: "pdf" },
    { name: "e.firma (CSD)", date: "15 Mar 2024", type: "key" },
    { name: "Opinión de cumplimiento", date: "12 Sep 2026", type: "pdf", badge: "Positiva" },
    { name: "Última declaración presentada", date: "08 Sep 2026", type: "pdf" },
    { name: "Contrato de servicios", date: "10 Ene 2025", type: "pdf" },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation (Image 3) */}
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

      {/* Page Header (Image 3) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {clientData.name}
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-normal">
              Completado ▾
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {clientData.rfc} | {clientData.personType} | {clientData.regime} | Contador: {clientData.accountant}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => sileo.success({ title: "Enlace copiado al portapapeles" })}
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
              <DropdownMenuItem onClick={() => sileo.info({ title: "Descargando acuses..." })}>
                Descargar todos los acuses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sileo.info({ title: "Generando reporte mensual..." })}>
                Generar reporte en PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/clients")}>
                Ver perfil del cliente
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
              onClick={() => sileo.info({ title: "Siguiente cliente" })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Image 3) */}
      <Tabs defaultValue="resumen">
        <TabsList className="bg-muted/40 h-9 p-1 border-b border-border/40">
          <TabsTrigger value="resumen" className="text-xs">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="contabilidad" className="text-xs flex items-center gap-1.5">
            Contabilidad <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          </TabsTrigger>
          <TabsTrigger value="obligaciones" className="text-xs">
            Obligaciones
          </TabsTrigger>
          <TabsTrigger value="opiniones" className="text-xs">
            Opiniones
          </TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs">
            Documentos
          </TabsTrigger>
          <TabsTrigger value="facturacion" className="text-xs">
            Facturación
          </TabsTrigger>
          <TabsTrigger value="finanzas" className="text-xs">
            Finanzas
          </TabsTrigger>
          <TabsTrigger value="actividad" className="text-xs">
            Actividad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="pt-4 space-y-6">
          {/* Quick Info Cards Row (Image 3) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-3 bg-muted/20 border-border/80 shadow-xs flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate font-mono">{clientData.rfc}</p>
                <p className="text-[11px] text-muted-foreground">{clientData.regime}</p>
              </div>
            </Card>

            <Card className="p-3 bg-muted/20 border-border/80 shadow-xs flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{clientData.accountant}</p>
                <p className="text-[11px] text-muted-foreground">Contador asignado</p>
              </div>
            </Card>

            <Card className="p-3 bg-muted/20 border-border/80 shadow-xs flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{clientData.email}</p>
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
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Contraseña CIEC (SAT)
                </span>
                <Badge variant="outline" className="text-[9px] bg-background border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 font-mono">
                  AES-256
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="font-mono text-xs text-muted-foreground tracking-widest">
                  ••••••••••••
                </span>
                {clientData.ciec ? (
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
                  <span className="text-muted-foreground italic text-[11px]">No registrada</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block">Correo Facturación</span>
              <span className="font-semibold text-foreground truncate block">{clientData.invoiceEmail || "—"}</span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block">Encargado / Contacto</span>
              <span className="font-semibold text-foreground truncate block">{clientData.contactName || "—"}</span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block">Actividad Económica</span>
              <span className="font-semibold text-foreground truncate block">{clientData.economicActivity || "—"}</span>
            </div>
          </div>

          {clientData.notes && (
            <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-lg text-xs">
              <span className="text-[10px] text-amber-800 block font-medium">Observaciones del Cliente</span>
              <p className="text-amber-900 mt-0.5">{clientData.notes}</p>
            </div>
          )}

          {/* Main 2-Column Content (Image 3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Progress Checklist, Accountant Notes, Timeline */}
            <div className="lg:col-span-8 space-y-6">
              {/* Avance de Contabilidad Card (Image 3) */}
              <Card className="p-5 border-border/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">
                      Avance de contabilidad — Septiembre 2026
                    </h3>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-normal">
                    ✓ Mes completado
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-end text-xs font-bold text-foreground">
                    100%
                  </div>
                  <Progress value={100} indicatorClassName="bg-emerald-500" className="h-2" />
                </div>

                {/* 8-Stage Checklist Table (Image 3) */}
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
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 font-normal"
                            >
                              ✓ {stage.status}
                            </Badge>
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
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline cursor-pointer">
                              <FileText className="h-3 w-3" /> {stage.docs} docs
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Bottom 2 sub-cards: Comentarios del contador + Historial de actividad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Comentarios del contador (Image 3) */}
                <Card className="p-4 border-border/80 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-bold text-foreground">Comentarios del contador</h4>
                  </div>

                  <div className="p-3 bg-muted/20 rounded-lg border border-border/60 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-[#1e3a5f] text-white text-[10px]">
                            R
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-foreground">{clientData.accountant}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">08 Sep 2026 14:32</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Se terminó la contabilidad de septiembre sin observaciones. Se presentaron declaraciones y DIOT correctamente. Opinión de cumplimiento positiva. Se enviaron estados financieros al cliente.
                    </p>
                  </div>
                </Card>

                {/* Historial de actividad (Image 3) */}
                <Card className="p-4 border-border/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-foreground">Historial de actividad</h4>
                    </div>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                      Ver toda la actividad →
                    </Button>
                  </div>

                  <div className="space-y-3 text-xs">
                    {activityHistory.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div key={index} className="flex items-start gap-2.5">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.color}`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-foreground text-xs leading-tight truncate">
                                {item.title}
                              </p>
                              <span className="text-[10px] text-muted-foreground shrink-0">{item.user}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{item.date}</span>
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
              {/* Información del cliente Card (Image 3) */}
              <Card className="p-4 border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-bold text-foreground">Información del cliente</h4>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
                    <Edit className="h-3 w-3" /> Editar
                  </Button>
                </div>

                <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border/60 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Razón social</span>
                    <span className="font-semibold text-foreground text-right">{clientData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RFC</span>
                    <span className="font-mono font-semibold text-foreground">{clientData.rfc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Persona</span>
                    <span className="font-medium text-foreground">{clientData.personType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Régimen fiscal</span>
                    <span className="font-medium text-foreground">{clientData.regime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actividad económica</span>
                    <span className="font-medium text-foreground text-right">{clientData.economicActivity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Correo</span>
                    <span className="font-medium text-foreground truncate max-w-[170px]">{clientData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teléfono</span>
                    <span className="font-medium text-foreground">{clientData.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contacto</span>
                    <span className="font-medium text-foreground">{clientData.contactName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contador asignado</span>
                    <span className="font-semibold text-primary">{clientData.accountant}</span>
                  </div>
                </div>
              </Card>

              {/* Servicios contratados Card (Image 3) */}
              <Card className="p-4 border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <h4 className="text-sm font-bold text-foreground">Servicios contratados</h4>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
                    <Edit className="h-3 w-3" /> Editar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Checkbox defaultChecked id="srv-1" />
                    <label htmlFor="srv-1" className="cursor-pointer">Contabilidad</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox defaultChecked id="srv-2" />
                    <label htmlFor="srv-2" className="cursor-pointer">Declaraciones</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="srv-3" />
                    <label htmlFor="srv-3" className="cursor-pointer text-muted-foreground">Nómina</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox defaultChecked id="srv-4" />
                    <label htmlFor="srv-4" className="cursor-pointer">DIOT</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox defaultChecked id="srv-5" />
                    <label htmlFor="srv-5" className="cursor-pointer">Estados financieros</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox defaultChecked id="srv-6" />
                    <label htmlFor="srv-6" className="cursor-pointer">Facturación</label>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Checkbox id="srv-7" />
                    <label htmlFor="srv-7" className="cursor-pointer text-muted-foreground">Asesoría fiscal</label>
                  </div>
                </div>
              </Card>

              {/* Documentos importantes Card (Image 3) */}
              <Card className="p-4 border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-bold text-foreground">Documentos importantes</h4>
                  </div>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                    Ver todos →
                  </Button>
                </div>

                <div className="divide-y divide-border/60 text-xs">
                  {importantDocuments.map((doc, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between hover:bg-muted/20 px-1 rounded transition-colors">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <div>
                          <p className="font-medium text-foreground leading-tight">{doc.name}</p>
                          <p className="text-[10px] text-muted-foreground">{doc.date}</p>
                        </div>
                      </div>
                      {doc.badge && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 font-normal">
                          {doc.badge}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
