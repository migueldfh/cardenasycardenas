import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  useProjects,
  useFinanceClients,
  useCreateProject,
  useUpdateProject,
  useUpdateProjectStage,
} from "../hooks";
import type { IProject } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sileo } from "sileo";
import {
  Plus,
  Share2,
  FileText,
  Search,
  ExternalLink,
  Play,
  ArrowRight,
} from "lucide-react";

export function Cotizaciones() {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { data: clients = [] } = useFinanceClients();

  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const updateStageMutation = useUpdateProjectStage();

  const [search, setSearch] = React.useState("");
  const [isQuoteOpen, setIsQuoteOpen] = React.useState(false);
  const [quoteForm, setQuoteForm] = React.useState({
    client_id: "",
    name: "",
    base_price_total: "",
    custom_price_total: "",
    requires_invoice: false,
    order_number: "",
    description: "",
  });

  // Filter quotes (status draft or pending_approval, or all)
  const quotes = React.useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.client?.name && p.client.name.toLowerCase().includes(search.toLowerCase()));

      return matchesSearch;
    });
  }, [projects, search]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  const copyToClipboard = (token: string) => {
    const fullUrl = `${window.location.origin}/quote/${token}`;
    navigator.clipboard.writeText(fullUrl);
    sileo.success({ title: "Enlace de cotización copiado al portapapeles" });
  };

  const handleStartProcess = async (project: IProject) => {
    try {
      await updateStageMutation.mutateAsync({
        id: project.id,
        stage: "captura",
        notes: "Cotización aceptada por el cliente -> Proceso de producción iniciado",
      });
      await updateProjectMutation.mutateAsync({
        id: project.id,
        payload: { status: "approved" },
      });
      sileo.success({ title: "¡Proceso de producción iniciado!", description: "Cotización aprobada. Proyecto disponible en el módulo de Procesos." });
      navigate("/projects");
    } catch (err: any) {
      sileo.error({ title: "Error al iniciar proceso", description: err.message });
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.client_id || !quoteForm.name) {
      sileo.error({ title: "Completa el cliente y nombre de la cotización" });
      return;
    }

    try {
      const priceVal = parseFloat(quoteForm.custom_price_total || quoteForm.base_price_total || "0");
      await createProjectMutation.mutateAsync({
        client_id: quoteForm.client_id,
        name: quoteForm.name,
        base_price_total: parseFloat(quoteForm.base_price_total || "0"),
        custom_price_total: priceVal,
        status: "pending_approval",
        requires_invoice: quoteForm.requires_invoice,
        order_number: quoteForm.order_number || null,
        description: quoteForm.description || null,
      });

      setIsQuoteOpen(false);
      setQuoteForm({
        client_id: "",
        name: "",
        base_price_total: "",
        custom_price_total: "",
        requires_invoice: false,
        order_number: "",
        description: "",
      });
      sileo.success({ title: "Cotización creada exitosamente" });
    } catch (err: any) {
      sileo.error({ title: "Error al crear cotización", description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" /> Cotizaciones & Propuestas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de cotizaciones enviadas a clientes. Al ser aprobadas, se convierten en Proyectos activos.
          </p>
        </div>

        <Button onClick={() => setIsQuoteOpen(true)} className="gap-2 bg-primary text-primary-foreground">
          <Plus className="h-4 w-4" /> Nueva Cotización
        </Button>
      </div>

      {/* Main Table */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cotización..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {quotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No hay cotizaciones registradas.
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-semibold uppercase">
                  <tr>
                    <th className="p-3 border-b">Cotización</th>
                    <th className="p-3 border-b">Cliente</th>
                    <th className="p-3 border-b">Monto Estimado</th>
                    <th className="p-3 border-b">Estado</th>
                    <th className="p-3 border-b text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => {
                    const price = q.custom_price_total || q.base_price_total || 0;
                    const isPending = q.status === "pending_approval" || q.status === "draft";

                    return (
                      <tr key={q.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <div className="font-bold text-sm text-foreground">{q.name}</div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ID: {q.id.slice(0, 8)}
                          </span>
                        </td>

                        <td className="p-3 font-medium text-foreground">
                          {q.client?.name || "Sin cliente"}
                        </td>

                        <td className="p-3 font-bold text-foreground">
                          {formatCurrency(price)}
                        </td>

                        <td className="p-3">
                          <Badge
                            variant={q.status === "approved" ? "default" : "outline"}
                            className={q.status === "approved" ? "bg-green-600" : "text-amber-600 border-amber-300"}
                          >
                            {q.status}
                          </Badge>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(q.share_token)}
                              className="gap-1 text-xs"
                            >
                              <Share2 className="h-3.5 w-3.5" /> Compartir Link
                            </Button>

                            <a href={`/quote/${q.share_token}`} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>

                            {isPending && (
                              <Button
                                size="sm"
                                onClick={() => handleStartProcess(q)}
                                className="gap-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                              >
                                <Play className="h-3.5 w-3.5" /> Iniciar Proceso <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: New Quote */}
      <Dialog open={isQuoteOpen} onOpenChange={setIsQuoteOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateQuote}>
            <DialogHeader>
              <DialogTitle>Nueva Cotización</DialogTitle>
              <DialogDescription>Genera una propuesta para enviar al cliente</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-3">
              <div className="space-y-1">
                <Label htmlFor="client_id">Cliente *</Label>
                <Select
                  value={quoteForm.client_id}
                  onValueChange={(val) => setQuoteForm({ ...quoteForm, client_id: val })}
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

              <div className="space-y-1">
                <Label htmlFor="name">Nombre / Concepto Cotización *</Label>
                <Input
                  id="name"
                  placeholder="Ej. Cotización 50 Jerseyes Raptors"
                  value={quoteForm.name}
                  onChange={(e) => setQuoteForm({ ...quoteForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="custom_price_total">Monto Estimado ($ MXN)</Label>
                <Input
                  id="custom_price_total"
                  type="number"
                  placeholder="0.00"
                  value={quoteForm.custom_price_total}
                  onChange={(e) => setQuoteForm({ ...quoteForm, custom_price_total: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsQuoteOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createProjectMutation.isPending}>Crear Cotización</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
