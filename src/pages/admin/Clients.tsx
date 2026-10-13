import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  useClients,
  useCreateClient,
  useDeleteClient,
  useUpdateClient,
} from "@/modules/inventory/hooks";
import type { IClient } from "@/modules/inventory/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Copy,
  ExternalLink,
  Package,
  Users,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { sileo } from "sileo";

export function Clients() {
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [clientForm, setClientForm] = useState({
    name: "",
    trade_name: "",
    fiscal_name: "",
    email: "",
    phone: "",
    tax_id_rfc: "",
    fiscal_regime: "",
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [editingClient, setEditingClient] = useState<IClient | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    trade_name: "",
    fiscal_name: "",
    email: "",
    phone: "",
    tax_id_rfc: "",
    fiscal_regime: "",
  });

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setIsCreateOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("create");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);


  const handleOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      setClientForm({ name: "", trade_name: "", fiscal_name: "", email: "", phone: "", tax_id_rfc: "", fiscal_regime: "" });
    }
  };

  const handleOpenEditChange = (open: boolean) => {
    setIsEditOpen(open);
    if (!open) {
      setEditingClient(null);
      setEditForm({ name: "", trade_name: "", fiscal_name: "", email: "", phone: "", tax_id_rfc: "", fiscal_regime: "" });
    }
  };

  const handleStartEdit = (client: IClient) => {
    setEditingClient(client);
    setEditForm({
      name: client.name || "",
      trade_name: client.trade_name || "",
      fiscal_name: client.fiscal_name || "",
      email: client.email || "",
      phone: client.phone || "",
      tax_id_rfc: client.tax_id_rfc || "",
      fiscal_regime: client.fiscal_regime || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editForm.name.trim()) return;

    try {
      await updateClientMutation.mutateAsync({
        id: editingClient.id,
        payload: {
          name: editForm.name.trim(),
          trade_name: editForm.trade_name.trim() || null,
          fiscal_name: editForm.fiscal_name.trim() || null,
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null,
          tax_id_rfc: editForm.tax_id_rfc.trim().toUpperCase() || null,
          fiscal_regime: editForm.fiscal_regime.trim() || null,
        },
      });
      sileo.success({ title: "Cliente actualizado con éxito" });
      setIsEditOpen(false);
      setEditingClient(null);
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al actualizar el cliente" });
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) return;

    try {
      await createClientMutation.mutateAsync({
        name: clientForm.name.trim(),
        trade_name: clientForm.trade_name.trim() || null,
        fiscal_name: clientForm.fiscal_name.trim() || null,
        email: clientForm.email.trim() || null,
        phone: clientForm.phone.trim() || null,
        tax_id_rfc: clientForm.tax_id_rfc.trim().toUpperCase() || null,
        fiscal_regime: clientForm.fiscal_regime.trim() || null,
      });
      sileo.success({ title: "Cliente creado con éxito" });
      setClientForm({ name: "", trade_name: "", fiscal_name: "", email: "", phone: "", tax_id_rfc: "", fiscal_regime: "" });
      setIsCreateOpen(false);
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al crear el cliente" });
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al cliente "${name}"? Se desvincularán todos sus productos.`)) {
      return;
    }

    try {
      await deleteClientMutation.mutateAsync(id);
      sileo.success({ title: "Cliente eliminado con éxito" });
    } catch (err: any) {
      sileo.error({ title: err.message || "Error al eliminar el cliente" });
    }
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/client-stock/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    sileo.success({ title: "Enlace de cliente copiado al portapapeles" });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleManageProducts = (client: IClient) => {
    navigate(`/clients/${client.id}`);
  };

  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredClients = React.useMemo(() => {
    return clients.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.trade_name && c.trade_name.toLowerCase().includes(q)) ||
        (c.fiscal_name && c.fiscal_name.toLowerCase().includes(q)) ||
        (c.tax_id_rfc && c.tax_id_rfc.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q));

      const matchesFilter =
        filterType === "all" ||
        (filterType === "with_rfc" && Boolean(c.tax_id_rfc)) ||
        (filterType === "without_rfc" && !c.tax_id_rfc) ||
        (filterType === "with_products" && (c.product_count ?? 0) > 0);

      return matchesSearch && matchesFilter;
    });
  }, [clients, searchTerm, filterType]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = React.useMemo(() => {
    return filteredClients.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredClients, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h2>
          <p className="text-muted-foreground mt-1">
            Administra los clientes vinculados a productos y genera enlaces públicos para consulta de stock.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
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
                  <label htmlFor="name" className="text-sm font-medium">
                    Nombre del Cliente / Empresa *
                  </label>
                  <Input
                    id="name"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    placeholder="Ej. Schumacher S.A."
                    required
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="trade_name" className="text-sm font-medium">
                      Nombre Comercial
                    </label>
                    <Input
                      id="trade_name"
                      value={clientForm.trade_name}
                      onChange={(e) => setClientForm({ ...clientForm, trade_name: e.target.value })}
                      placeholder="Ej. Schumacher"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="fiscal_name" className="text-sm font-medium">
                      Nombre Fiscal
                    </label>
                    <Input
                      id="fiscal_name"
                      value={clientForm.fiscal_name}
                      onChange={(e) => setClientForm({ ...clientForm, fiscal_name: e.target.value })}
                      placeholder="Ej. Schumacher e Hijos S.A. de C.V."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Correo Electrónico
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={clientForm.email}
                      onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Teléfono
                    </label>
                    <Input
                      id="phone"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                      placeholder="5512345678"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="rfc" className="text-sm font-medium">
                      RFC (Fiscal)
                    </label>
                    <Input
                      id="rfc"
                      value={clientForm.tax_id_rfc}
                      onChange={(e) => setClientForm({ ...clientForm, tax_id_rfc: e.target.value.toUpperCase() })}
                      placeholder="XAXX010101000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="regime" className="text-sm font-medium">
                      Régimen Fiscal
                    </label>
                    <Input
                      id="regime"
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
                  onClick={() => handleOpenChange(false)}
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

        <Dialog open={isEditOpen} onOpenChange={handleOpenEditChange}>
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
                  <label htmlFor="edit-name" className="text-sm font-medium">
                    Nombre del Cliente / Empresa *
                  </label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Ej. Schumacher S.A."
                    required
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="edit-trade_name" className="text-sm font-medium">
                      Nombre Comercial
                    </label>
                    <Input
                      id="edit-trade_name"
                      value={editForm.trade_name}
                      onChange={(e) => setEditForm({ ...editForm, trade_name: e.target.value })}
                      placeholder="Ej. Schumacher"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="edit-fiscal_name" className="text-sm font-medium">
                      Nombre Fiscal
                    </label>
                    <Input
                      id="edit-fiscal_name"
                      value={editForm.fiscal_name}
                      onChange={(e) => setEditForm({ ...editForm, fiscal_name: e.target.value })}
                      placeholder="Ej. Schumacher e Hijos S.A. de C.V."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="edit-email" className="text-sm font-medium">
                      Correo Electrónico
                    </label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="edit-phone" className="text-sm font-medium">
                      Teléfono
                    </label>
                    <Input
                      id="edit-phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="5512345678"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="edit-rfc" className="text-sm font-medium">
                      RFC (Fiscal)
                    </label>
                    <Input
                      id="edit-rfc"
                      value={editForm.tax_id_rfc}
                      onChange={(e) => setEditForm({ ...editForm, tax_id_rfc: e.target.value.toUpperCase() })}
                      placeholder="XAXX010101000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="edit-regime" className="text-sm font-medium">
                      Régimen Fiscal
                    </label>
                    <Input
                      id="edit-regime"
                      value={editForm.fiscal_regime}
                      onChange={(e) => setEditForm({ ...editForm, fiscal_regime: e.target.value })}
                      placeholder="601"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenEditChange(false)}
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Clientes
          </CardTitle>
          <CardDescription>
            Mostrando {filteredClients.length} de {clients.length} clientes registrados.
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, comercial, RFC, email o teléfono..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={filterType}
                onValueChange={(val) => {
                  setFilterType(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  <SelectItem value="with_rfc">Con RFC registrado</SelectItem>
                  <SelectItem value="without_rfc">Sin RFC</SelectItem>
                  <SelectItem value="with_products">Con productos</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || filterType !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterType("all");
                    setCurrentPage(1);
                  }}
                  className="h-10 px-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingClients ? (
            <div className="flex h-40 w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 border border-dashed rounded-lg text-center p-4">
              <Users className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="font-semibold text-muted-foreground">No se encontraron clientes</p>
              <p className="text-xs text-muted-foreground mt-1">Crea un cliente para comenzar a asociar productos.</p>
            </div>
          ) : (
            <>
              <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="w-[150px]">Productos Vinculados</TableHead>
                    <TableHead className="w-[300px]">Enlace Compartible</TableHead>
                    <TableHead className="text-right w-[150px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.map((client) => {
                    const shareUrl = `${window.location.origin}/client-stock/${client.token}`;
                    return (
                      <TableRow key={client.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell 
                          className="cursor-pointer hover:underline hover:text-primary transition-colors" 
                          onClick={() => handleManageProducts(client)}
                        >
                          <div className="font-semibold text-foreground">{client.name}</div>
                          {client.trade_name && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                              C: {client.trade_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1 font-semibold">
                            <Package className="h-3 w-3" />
                            {client.product_count ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 max-w-[280px]">
                            <span className="text-xs font-mono truncate text-muted-foreground select-all bg-muted px-2 py-1 rounded border">
                              {shareUrl}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 hover:text-primary"
                              onClick={() => copyShareLink(client.token)}
                              title="Copiar enlace"
                            >
                              {copiedToken === client.token ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 hover:text-primary"
                              asChild
                              title="Abrir vista pública"
                            >
                              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageProducts(client)}
                            >
                              Productos
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted"
                              onClick={() => handleStartEdit(client)}
                              title="Editar cliente"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteClient(client.id, client.name)}
                              title="Eliminar cliente"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredClients.length}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
