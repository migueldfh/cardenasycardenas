import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  UserPlus,
  Search,
  Plus,
  Download,
  Upload,
  Columns,
  MoreVertical,
  X,
  Edit,
  FileText,
  DollarSign,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { sileo } from "sileo";

export interface FiscalClient {
  id: string;
  name: string;
  legalName: string;
  rfc: string;
  personType: "Moral" | "Física";
  regime: string;
  assignedAccountant: string;
  status: "Activo" | "Inactivo" | "Prospecto";
  economicActivity: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  clientSince: string;
  lastActivity: string;
  lastAccountingMonth: string;
  lastAccountingStatus: string;
  lastInvoiceFolio: string;
  lastInvoiceDate: string;
  lastInvoiceStatus: string;
  notes: string;
  notesAuthor: string;
  notesDate: string;
  services: {
    contabilidad: boolean;
    facturacion: boolean;
    usuarios: boolean;
    reportes: boolean;
  };
}

const mockFiscalClients: FiscalClient[] = [
  {
    id: "1",
    name: "Solupatch",
    legalName: "Solupatch S.A. de C.V.",
    rfc: "SOL220101ABC",
    personType: "Moral",
    regime: "PM General",
    assignedAccountant: "Rodrigo Martínez",
    status: "Activo",
    economicActivity: "Fabricación de productos químicos",
    contactName: "Lic. Juan Pérez",
    email: "contacto@solupatch.com",
    phone: "81 1234 5678",
    address: "Av. Industrias 100, Monterrey, NL",
    clientSince: "12 Ene 2023",
    lastActivity: "08 Sep 2026",
    lastAccountingMonth: "Septiembre 2026",
    lastAccountingStatus: "Completada",
    lastInvoiceFolio: "F-5823",
    lastInvoiceDate: "01 Sep 2026",
    lastInvoiceStatus: "Pagada",
    notes: "Cliente cumple en tiempo y forma. Buena comunicación. Pendiente renovación de e.firma en marzo 2027.",
    notesAuthor: "Rodrigo Martínez",
    notesDate: "08 Sep 2026 14:32",
    services: { contabilidad: true, facturacion: true, usuarios: true, reportes: true },
  },
  {
    id: "2",
    name: "Comercial del Norte",
    legalName: "Comercial del Norte S.A. de C.V.",
    rfc: "CON180315XYZ",
    personType: "Moral",
    regime: "RESICO",
    assignedAccountant: "Alejandra Torres",
    status: "Activo",
    economicActivity: "Comercialización de insumos industriales",
    contactName: "Ing. Roberto Garza",
    email: "facturacion@comercialnorte.com",
    phone: "81 8345 6789",
    address: "Blvd. Díaz Ordaz 450, San Pedro, NL",
    clientSince: "15 Mar 2024",
    lastActivity: "08 Sep 2026",
    lastAccountingMonth: "Septiembre 2026",
    lastAccountingStatus: "En proceso",
    lastInvoiceFolio: "F-5819",
    lastInvoiceDate: "02 Sep 2026",
    lastInvoiceStatus: "Pagada",
    notes: "Solicita envío de opinión de cumplimiento antes del día 15.",
    notesAuthor: "Alejandra Torres",
    notesDate: "08 Sep 2026 10:15",
    services: { contabilidad: true, facturacion: true, usuarios: false, reportes: true },
  },
  {
    id: "3",
    name: "Grupo Industrial MX",
    legalName: "Grupo Industrial MX S. de R.L.",
    rfc: "GIM150620KL9",
    personType: "Moral",
    regime: "PM General",
    assignedAccountant: "Rubí Jiménez",
    status: "Activo",
    economicActivity: "Manufactura y ensamble metálico",
    contactName: "C.P. Mónica Treviño",
    email: "mtrevino@grupoindustrialmx.com",
    phone: "81 8122 3344",
    address: "Parque Industrial Huinalá, Apodaca, NL",
    clientSince: "20 Jun 2022",
    lastActivity: "07 Sep 2026",
    lastAccountingMonth: "Septiembre 2026",
    lastAccountingStatus: "Pendiente",
    lastInvoiceFolio: "F-5790",
    lastInvoiceDate: "28 Ago 2026",
    lastInvoiceStatus: "Pagada",
    notes: "Falta envío de estados de cuenta bancarios de Banorte.",
    notesAuthor: "Rubí Jiménez",
    notesDate: "07 Sep 2026 17:42",
    services: { contabilidad: true, facturacion: false, usuarios: true, reportes: true },
  },
  {
    id: "4",
    name: "Servicios Profesionales",
    legalName: "Servicios Profesionales S.C.",
    rfc: "SPR190101QW1",
    personType: "Física",
    regime: "PFAE",
    assignedAccountant: "Luis Ramírez",
    status: "Activo",
    economicActivity: "Consultoría de tecnologías y software",
    contactName: "Lic. Daniel Salinas",
    email: "finanzas@serviciosprof.mx",
    phone: "81 4455 6677",
    address: "Calzada del Valle 200, San Pedro, NL",
    clientSince: "10 Ene 2023",
    lastActivity: "08 Sep 2026",
    lastAccountingMonth: "Septiembre 2026",
    lastAccountingStatus: "En riesgo",
    lastInvoiceFolio: "F-5830",
    lastInvoiceDate: "05 Sep 2026",
    lastInvoiceStatus: "Pendiente",
    notes: "Requiere apoyo para acreditamiento de IVA por compras de equipo.",
    notesAuthor: "Luis Ramírez",
    notesDate: "08 Sep 2026 12:31",
    services: { contabilidad: true, facturacion: true, usuarios: true, reportes: true },
  },
  {
    id: "5",
    name: "Empresa ABC",
    legalName: "Empresa ABC S.A. de C.V.",
    rfc: "ABC210101RT8",
    personType: "Moral",
    regime: "PM Coordinados",
    assignedAccountant: "Mariana López",
    status: "Activo",
    economicActivity: "Logística y autotransporte federal",
    contactName: "Ing. Carlos Sada",
    email: "contabilidad@empresaabc.com",
    phone: "81 2233 4455",
    address: "Carretera a Laredo Km 14, Escobedo, NL",
    clientSince: "05 May 2023",
    lastActivity: "08 Sep 2026",
    lastAccountingMonth: "Septiembre 2026",
    lastAccountingStatus: "Completada",
    lastInvoiceFolio: "F-5825",
    lastInvoiceDate: "03 Sep 2026",
    lastInvoiceStatus: "Pagada",
    notes: "Todo presentado al 100%. Sin observaciones del SAT.",
    notesAuthor: "Mariana López",
    notesDate: "08 Sep 2026 15:00",
    services: { contabilidad: true, facturacion: true, usuarios: false, reportes: true },
  },
  {
    id: "6",
    name: "Construcciones Delta",
    legalName: "Construcciones Delta S.A.",
    rfc: "CDE171010MN4",
    personType: "Moral",
    regime: "PM General",
    assignedAccountant: "Rodrigo Martínez",
    status: "Inactivo",
    economicActivity: "Construcción y obra civil pesada",
    contactName: "Arq. Manuel Flores",
    email: "delta@construcciones.com",
    phone: "81 3344 5566",
    address: "Av. Félix U. Gómez 1200, Monterrey, NL",
    clientSince: "18 Oct 2021",
    lastActivity: "30 Ago 2026",
    lastAccountingMonth: "Agosto 2026",
    lastAccountingStatus: "En pausa",
    lastInvoiceFolio: "F-5700",
    lastInvoiceDate: "15 Jul 2026",
    lastInvoiceStatus: "Pagada",
    notes: "Cliente suspendió operaciones temporales por término de contrato gubernamental.",
    notesAuthor: "Rodrigo Martínez",
    notesDate: "30 Ago 2026 11:20",
    services: { contabilidad: true, facturacion: false, usuarios: true, reportes: false },
  },
  {
    id: "7",
    name: "Logística del Bajío",
    legalName: "Logística del Bajío S.A. de C.V.",
    rfc: "LBA210709PL2",
    personType: "Moral",
    regime: "PM General",
    assignedAccountant: "Alejandra Torres",
    status: "Activo",
    economicActivity: "Distribución y almacenaje regional",
    contactName: "Lic. Andrea Morales",
    email: "operaciones@logisticabajio.com",
    phone: "477 123 4567",
    address: "Puerto Interior, Silao, Gto",
    clientSince: "09 Jul 2024",
    lastActivity: "06 Sep 2026",
    lastAccountingMonth: "Septiembre 2026",
    lastAccountingStatus: "Atrasado",
    lastInvoiceFolio: "F-5810",
    lastInvoiceDate: "29 Ago 2026",
    lastInvoiceStatus: "Pendiente",
    notes: "Urgente: Solicitar papelería fiscal antes del 10 para evitar opinión negativa.",
    notesAuthor: "Alejandra Torres",
    notesDate: "06 Sep 2026 09:40",
    services: { contabilidad: true, facturacion: true, usuarios: false, reportes: true },
  },
  {
    id: "8",
    name: "Consultoría Integral",
    legalName: "Consultoría Integral S.C.",
    rfc: "CIN200120AS9",
    personType: "Física",
    regime: "RESICO",
    assignedAccountant: "Luis Ramírez",
    status: "Activo",
    economicActivity: "Servicios de auditoría y recursos humanos",
    contactName: "Lic. Teresa Mendoza",
    email: "contacto@consultoriaintegral.mx",
    phone: "81 5566 7788",
    address: "Av. Vasconcelos 310, San Pedro, NL",
    clientSince: "20 Ene 2023",
    lastActivity: "08 Sep 2026",
    lastAccountingMonth: "Septiembre 2026",
    lastAccountingStatus: "En proceso",
    lastInvoiceFolio: "F-5827",
    lastInvoiceDate: "04 Sep 2026",
    lastInvoiceStatus: "Pagada",
    notes: "Cálculo preliminar de RESICO enviado para revisión del socio director.",
    notesAuthor: "Luis Ramírez",
    notesDate: "08 Sep 2026 16:15",
    services: { contabilidad: true, facturacion: true, usuarios: true, reportes: true },
  },
  {
    id: "9",
    name: "Inversiones Monterrey",
    legalName: "Inversiones Monterrey S.A.",
    rfc: "IMO160405ZX1",
    personType: "Moral",
    regime: "PM General",
    assignedAccountant: "Rubí Jiménez",
    status: "Activo",
    economicActivity: "Fondo de inversión de capital privado",
    contactName: "Lic. Fernando Elizondo",
    email: "info@inversionesmty.com",
    phone: "81 8333 4444",
    address: "Torre Althea, Valle Oriente, San Pedro, NL",
    clientSince: "05 Abr 2020",
    lastActivity: "07 Sep 2026",
    lastAccountingMonth: "Septiembre 2026",
    lastAccountingStatus: "En proceso",
    lastInvoiceFolio: "F-5815",
    lastInvoiceDate: "01 Sep 2026",
    lastInvoiceStatus: "Pagada",
    notes: "Revisando retenciones de dividendos para cierre de trimestre.",
    notesAuthor: "Rubí Jiménez",
    notesDate: "07 Sep 2026 14:10",
    services: { contabilidad: true, facturacion: false, usuarios: true, reportes: true },
  },
  {
    id: "10",
    name: "Alimentos y Bebidas",
    legalName: "Alimentos y Bebidas S. de R.L.",
    rfc: "AYB220330DF7",
    personType: "Física",
    regime: "PFAE",
    assignedAccountant: "Mariana López",
    status: "Prospecto",
    economicActivity: "Operación de franquicias gastronómicas",
    contactName: "C.P. Gerardo Garza",
    email: "ggarza@aybfranquicias.com",
    phone: "81 7788 9900",
    address: "Av. Gómez Morín 900, San Pedro, NL",
    clientSince: "28 Ago 2026",
    lastActivity: "28 Ago 2026",
    lastAccountingMonth: "Agosto 2026",
    lastAccountingStatus: "Diagnóstico inicial",
    lastInvoiceFolio: "—",
    lastInvoiceDate: "—",
    lastInvoiceStatus: "Sin facturar",
    notes: "Propuesta de honorarios enviada. Esperando constancia fiscal actualizada.",
    notesAuthor: "Mariana López",
    notesDate: "28 Ago 2026 10:00",
    services: { contabilidad: false, facturacion: false, usuarios: false, reportes: false },
  },
];

export function Clients() {
  const [clients, setClients] = useState<FiscalClient[]>(mockFiscalClients);
  const [selectedClient, setSelectedClient] = useState<FiscalClient | null>(mockFiscalClients[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [regimeFilter, setRegimeFilter] = useState("all");
  const [accountantFilter, setAccountantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // New Client Form
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    legalName: "",
    rfc: "",
    personType: "Moral" as "Moral" | "Física",
    regime: "PM General",
    assignedAccountant: "Rodrigo Martínez",
    email: "",
    phone: "",
    economicActivity: "",
  });

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(q) ||
        c.legalName.toLowerCase().includes(q) ||
        c.rfc.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);

      const matchType = typeFilter === "all" || c.personType === typeFilter;
      const matchRegime = regimeFilter === "all" || c.regime === regimeFilter;
      const matchAccountant =
        accountantFilter === "all" || c.assignedAccountant.includes(accountantFilter);
      const matchStatus = statusFilter === "all" || c.status === statusFilter;

      return matchSearch && matchType && matchRegime && matchAccountant && matchStatus;
    });
  }, [clients, searchQuery, typeFilter, regimeFilter, accountantFilter, statusFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredClients.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    const created: FiscalClient = {
      id: String(Date.now()),
      name: newClientForm.name,
      legalName: newClientForm.legalName || newClientForm.name,
      rfc: newClientForm.rfc.toUpperCase(),
      personType: newClientForm.personType,
      regime: newClientForm.regime,
      assignedAccountant: newClientForm.assignedAccountant,
      status: "Activo",
      economicActivity: newClientForm.economicActivity || "Servicios",
      contactName: "Contacto Principal",
      email: newClientForm.email,
      phone: newClientForm.phone,
      address: "Monterrey, N.L.",
      clientSince: "Hoy",
      lastActivity: "Hoy",
      lastAccountingMonth: "Septiembre 2026",
      lastAccountingStatus: "En proceso",
      lastInvoiceFolio: "—",
      lastInvoiceDate: "—",
      lastInvoiceStatus: "Al corriente",
      notes: "Cliente registrado en sistema.",
      notesAuthor: "Administrador",
      notesDate: new Date().toLocaleDateString("es-MX"),
      services: { contabilidad: true, facturacion: true, usuarios: true, reportes: true },
    };

    setClients([created, ...clients]);
    setSelectedClient(created);
    setIsNewClientOpen(false);
    sileo.success({ title: "Cliente agregado con éxito" });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row (Image 5) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona la información de tus clientes y sus servicios
          </p>
        </div>

        <Button
          size="sm"
          className="bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-2 shadow-xs"
          onClick={() => setIsNewClientOpen(true)}
        >
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      {/* Row 1: 4 Top Metric Cards (Image 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">186</p>
              <p className="text-[11px] text-muted-foreground font-medium">Clientes totales</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-600 font-medium">↑ 5.6% vs. mes anterior</p>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">158</p>
              <p className="text-[11px] text-muted-foreground font-medium">Clientes activos</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={85} indicatorClassName="bg-emerald-500" className="h-1.5" />
            <p className="text-[11px] text-emerald-600 font-medium mt-1">85% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">18</p>
              <p className="text-[11px] text-muted-foreground font-medium">Clientes inactivos</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={10} indicatorClassName="bg-blue-500" className="h-1.5" />
            <p className="text-[11px] text-muted-foreground font-medium mt-1">10% del total</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">10</p>
              <p className="text-[11px] text-muted-foreground font-medium">Prospectos</p>
            </div>
          </div>
          <div className="mt-2">
            <Progress value={5} indicatorClassName="bg-rose-500" className="h-1.5" />
            <p className="text-[11px] text-rose-600 font-medium mt-1">5% del total</p>
          </div>
        </Card>
      </div>

      {/* Row 2: Filter bar (Image 5) */}
      <div className="bg-card p-3 rounded-lg border border-border/80 flex flex-wrap items-center gap-2.5 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RFC, contacto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/20"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Tipo:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Moral">Moral</SelectItem>
            <SelectItem value="Física">Física</SelectItem>
          </SelectContent>
        </Select>

        <Select value={regimeFilter} onValueChange={setRegimeFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Régimen:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PM General">PM General</SelectItem>
            <SelectItem value="RESICO">RESICO</SelectItem>
            <SelectItem value="PFAE">PFAE</SelectItem>
            <SelectItem value="PM Coordinados">PM Coordinados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={accountantFilter} onValueChange={setAccountantFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Contador:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Rodrigo">Rodrigo</SelectItem>
            <SelectItem value="Alejandra">Alejandra</SelectItem>
            <SelectItem value="Rubí">Rubí</SelectItem>
            <SelectItem value="Luis">Luis</SelectItem>
            <SelectItem value="Mariana">Mariana</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/20">
            <span className="text-muted-foreground mr-1">Estatus:</span>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Activo">Activo</SelectItem>
            <SelectItem value="Inactivo">Inactivo</SelectItem>
            <SelectItem value="Prospecto">Prospecto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Container: Split View (Table Left + Slide Drawer Right if selected) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Clients Table Card (col-span-8 or 12) */}
        <div className={`${selectedClient ? "lg:col-span-8" : "lg:col-span-12"} transition-all space-y-4`}>
          <Card className="border-border/80 shadow-xs">
            <div className="p-3 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Clientes ({filteredClients.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Download className="h-3 w-3" /> Exportar
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Upload className="h-3 w-3" /> Importar
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Columns className="h-3 w-3" /> Columnas
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 text-[11px] text-muted-foreground hover:bg-muted/30">
                    <TableHead className="w-8 py-2.5">
                      <Checkbox
                        checked={selectedIds.length === filteredClients.length && filteredClients.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="py-2.5">Cliente</TableHead>
                    <TableHead className="py-2.5">RFC</TableHead>
                    <TableHead className="py-2.5">Régimen</TableHead>
                    <TableHead className="py-2.5">Contador asignado</TableHead>
                    <TableHead className="py-2.5 text-center">Estatus</TableHead>
                    <TableHead className="py-2.5 text-center">Servicios</TableHead>
                    <TableHead className="py-2.5">Última actividad</TableHead>
                    <TableHead className="py-2.5 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredClients.map((c) => {
                    const isSelected = selectedClient?.id === c.id;
                    return (
                      <TableRow
                        key={c.id}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 border-l-2 border-l-primary font-medium" : "hover:bg-muted/40"
                        }`}
                        onClick={() => setSelectedClient(c)}
                      >
                        <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(c.id)}
                            onCheckedChange={(checked) => handleSelectOne(c.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <div>
                            <p className="font-semibold text-foreground text-xs leading-tight">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">{c.legalName}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-foreground">
                          {c.rfc}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {c.regime}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {c.assignedAccountant.split(" ")[0]}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              c.status === "Activo"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : c.status === "Inactivo"
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {/* 4 Service Badges */}
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] ${
                                c.services.contabilidad
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-muted text-muted-foreground/40"
                              }`}
                              title="Contabilidad"
                            >
                              <FileText className="h-2.5 w-2.5" />
                            </span>
                            <span
                              className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] ${
                                c.services.facturacion
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-muted text-muted-foreground/40"
                              }`}
                              title="Facturación"
                            >
                              <DollarSign className="h-2.5 w-2.5" />
                            </span>
                            <span
                              className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] ${
                                c.services.usuarios
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-muted text-muted-foreground/40"
                              }`}
                              title="Portal Usuario"
                            >
                              <Users className="h-2.5 w-2.5" />
                            </span>
                            <span
                              className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] ${
                                c.services.reportes
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-muted text-muted-foreground/40"
                              }`}
                              title="Reportes Financieros"
                            >
                              <BarChart3 className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {c.lastActivity}
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

            {/* Pagination footer */}
            <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>Mostrando 1-10 de 186 clientes</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button size="icon" className="h-7 w-7 text-xs bg-[#1e3a5f]">1</Button>
                <Button variant="outline" size="icon" className="h-7 w-7 text-xs">2</Button>
                <Button variant="outline" size="icon" className="h-7 w-7 text-xs">3</Button>
                <Button variant="outline" size="icon" className="h-7 w-7">
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Slide-over / Detail Card (Image 5) */}
        {selectedClient && (
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-border/80 shadow-xs overflow-hidden">
              {/* Drawer Header */}
              <div className="p-4 bg-muted/20 border-b border-border/60 flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {selectedClient.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground leading-tight">
                        {selectedClient.legalName}
                      </h3>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        ● {selectedClient.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Cliente desde {selectedClient.clientSince}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedClient(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Drawer Tabs */}
              <div className="p-4 space-y-4">
                <Tabs defaultValue="info">
                  <TabsList className="w-full bg-muted/40 h-8">
                    <TabsTrigger value="info" className="flex-1 text-xs">Información</TabsTrigger>
                    <TabsTrigger value="servicios" className="flex-1 text-xs">Servicios</TabsTrigger>
                    <TabsTrigger value="documentos" className="flex-1 text-xs">Documentos</TabsTrigger>
                    <TabsTrigger value="actividad" className="flex-1 text-xs">Actividad</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="pt-3 space-y-4 text-xs">
                    {/* Datos Generales Section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs uppercase tracking-tight">
                          Datos generales
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-primary gap-1">
                          <Edit className="h-3 w-3" /> Editar
                        </Button>
                      </div>

                      <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border/60">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Razón social</span>
                          <span className="font-semibold text-foreground text-right">{selectedClient.legalName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">RFC</span>
                          <span className="font-mono font-semibold text-foreground">{selectedClient.rfc}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo de persona</span>
                          <span className="font-medium text-foreground">{selectedClient.personType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Régimen fiscal</span>
                          <span className="font-medium text-foreground">{selectedClient.regime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actividad económica</span>
                          <span className="font-medium text-foreground text-right">{selectedClient.economicActivity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Contacto</span>
                          <span className="font-medium text-foreground">{selectedClient.contactName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Correo</span>
                          <span className="font-medium text-foreground truncate max-w-[180px]">{selectedClient.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Teléfono</span>
                          <span className="font-medium text-foreground">{selectedClient.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dirección</span>
                          <span className="font-medium text-foreground text-right truncate max-w-[180px]">{selectedClient.address}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Contador asignado</span>
                          <span className="font-semibold text-primary">{selectedClient.assignedAccountant}</span>
                        </div>
                      </div>
                    </div>

                    {/* Resumen Section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs uppercase tracking-tight">
                          Resumen
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-primary gap-1">
                          <Edit className="h-3 w-3" /> Editar
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 bg-muted/20 rounded-lg border border-border/60">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                            <FileText className="h-3 w-3 text-blue-600" /> Última contabilidad
                          </div>
                          <p className="font-bold text-foreground mt-1 text-xs">{selectedClient.lastAccountingMonth}</p>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] mt-1">
                            {selectedClient.lastAccountingStatus}
                          </Badge>
                        </div>

                        <div className="p-3 bg-muted/20 rounded-lg border border-border/60">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                            <DollarSign className="h-3 w-3 text-emerald-600" /> Última factura
                          </div>
                          <p className="font-bold text-foreground mt-1 text-xs">{selectedClient.lastInvoiceFolio}</p>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] mt-1">
                            {selectedClient.lastInvoiceStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Notas Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs uppercase tracking-tight">
                          Notas
                        </span>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                          Ver todas →
                        </Button>
                      </div>

                      <div className="p-3 bg-muted/20 rounded-lg border border-border/60 space-y-2 text-xs">
                        <p className="text-muted-foreground leading-relaxed italic">
                          "{selectedClient.notes}"
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-slate-700 text-white text-[9px] font-bold">
                                {selectedClient.notesAuthor.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">Por {selectedClient.notesAuthor}</span>
                          </div>
                          <span>{selectedClient.notesDate}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Card Footer Link */}
              <div className="p-3 bg-muted/20 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-primary font-semibold flex items-center justify-center gap-1.5"
                  asChild
                >
                  <Link to={`/control-mensual/${selectedClient.id}`}>
                    Ver expediente completo <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* New Client Modal */}
      <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateClient}>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
              <DialogDescription>
                Ingresa los datos fiscales y asigna un contador del despacho.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Nombre Comercial *</label>
                <Input
                  required
                  placeholder="Ej. Solupatch"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-foreground">Razón Social *</label>
                <Input
                  required
                  placeholder="Ej. Solupatch S.A. de C.V."
                  value={newClientForm.legalName}
                  onChange={(e) => setNewClientForm({ ...newClientForm, legalName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">RFC *</label>
                  <Input
                    required
                    placeholder="SOL220101ABC"
                    value={newClientForm.rfc}
                    onChange={(e) => setNewClientForm({ ...newClientForm, rfc: e.target.value })}
                    className="h-8 text-xs uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Tipo de Persona</label>
                  <Select
                    value={newClientForm.personType}
                    onValueChange={(val: any) => setNewClientForm({ ...newClientForm, personType: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Moral">Moral</SelectItem>
                      <SelectItem value="Física">Física</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Régimen Fiscal</label>
                  <Select
                    value={newClientForm.regime}
                    onValueChange={(val) => setNewClientForm({ ...newClientForm, regime: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PM General">PM General</SelectItem>
                      <SelectItem value="RESICO">RESICO</SelectItem>
                      <SelectItem value="PFAE">PFAE</SelectItem>
                      <SelectItem value="PM Coordinados">PM Coordinados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Contador Asignado</label>
                  <Select
                    value={newClientForm.assignedAccountant}
                    onValueChange={(val) => setNewClientForm({ ...newClientForm, assignedAccountant: val })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rodrigo Martínez">Rodrigo Martínez</SelectItem>
                      <SelectItem value="Alejandra Torres">Alejandra Torres</SelectItem>
                      <SelectItem value="Rubí Jiménez">Rubí Jiménez</SelectItem>
                      <SelectItem value="Luis Ramírez">Luis Ramírez</SelectItem>
                      <SelectItem value="Mariana López">Mariana López</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Correo</label>
                  <Input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Teléfono</label>
                  <Input
                    placeholder="81 1234 5678"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" type="button" onClick={() => setIsNewClientOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" type="submit" className="bg-[#1e3a5f] hover:bg-[#152a45]">
                Crear Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
