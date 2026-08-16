import * as React from "react";
import { usePayments, useReconcilePayments } from "../hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/TablePagination";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { sileo } from "sileo";
import { Coins, Landmark, ArrowLeftRight, ExternalLink } from "lucide-react";

export function Transferencias() {
  const { data: payments = [], isLoading } = usePayments();
  const reconcileMutation = useReconcilePayments();

  // State to track current tab: "cash" | "transfer"
  const [activeTab, setActiveTab] = React.useState<"cash" | "transfer">("cash");

  // State to track selected payments for deposit/reconciliation
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  // Reset selected IDs when active tab changes
  React.useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
  }, [activeTab]);

  // Cash Payments filtering
  const cashPayments = React.useMemo(() => {
    return payments.filter((p) => p.method === "cash" || p.method === "atm_withdrawal");
  }, [payments]);

  const unreconciledCash = React.useMemo(() => {
    return cashPayments.filter((p) => !p.is_reconciled);
  }, [cashPayments]);

  const reconciledCash = React.useMemo(() => {
    return cashPayments.filter((p) => p.is_reconciled);
  }, [cashPayments]);

  // Transfer Payments filtering
  const transferPayments = React.useMemo(() => {
    return payments.filter((p) => p.method === "transfer");
  }, [payments]);

  const unreconciledTransfers = React.useMemo(() => {
    return transferPayments.filter((p) => !p.is_reconciled);
  }, [transferPayments]);

  const reconciledTransfers = React.useMemo(() => {
    return transferPayments.filter((p) => p.is_reconciled);
  }, [transferPayments]);

  const selectedTotal = React.useMemo(() => {
    return payments
      .filter((p) => selectedIds.includes(p.id))
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }, [selectedIds, payments]);

  const handleSelectToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    const pageIds = paginatedUnreconciledList.map((p) => p.id);
    const allSelectedOnPage = pageIds.every((id) => selectedIds.includes(id));
    if (allSelectedOnPage) {
      setSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    }
  };

  const handleReconcile = async () => {
    if (selectedIds.length === 0) return;
    try {
      await reconcileMutation.mutateAsync(selectedIds);
      const label = activeTab === "cash" ? "pagos en efectivo (Caja)" : "transferencias bancarias";
      sileo.success({ title: `Se conciliaron ${selectedIds.length} ${label} correctamente.` });
      setSelectedIds([]);
    } catch (err: any) {
      sileo.error({ title: `Error: ${err.message}` });
    }
  };

  // Cash totals
  const totalUnreconciledCash = unreconciledCash.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalReconciledCash = reconciledCash.reduce((sum, p) => sum + Number(p.amount), 0);

  // Transfer totals
  const totalUnreconciledTransfers = unreconciledTransfers.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalReconciledTransfers = reconciledTransfers.reduce((sum, p) => sum + Number(p.amount), 0);

  // Active list config
  const currentUnreconciledList = activeTab === "cash" ? unreconciledCash : unreconciledTransfers;

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  const totalPages = Math.ceil(currentUnreconciledList.length / itemsPerPage);
  const paginatedUnreconciledList = React.useMemo(() => {
    return currentUnreconciledList.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [currentUnreconciledList, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Conciliación & Verificación de Pagos</h2>
        <p className="text-muted-foreground text-sm">Monitorea y valida los cobros de tus clientes para asegurar que los fondos estén en tu cuenta bancaria.</p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border">
        <button
          className={`py-2.5 px-5 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "cash"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("cash")}
        >
          <Coins className="h-4 w-4" />
          Efectivo (Caja)
          {unreconciledCash.length > 0 && (
            <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">{unreconciledCash.length}</Badge>
          )}
        </button>
        <button
          className={`py-2.5 px-5 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "transfer"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("transfer")}
        >
          <Landmark className="h-4 w-4" />
          Transferencias Bancarias
          {unreconciledTransfers.length > 0 && (
            <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">{unreconciledTransfers.length}</Badge>
          )}
        </button>
      </div>

      {/* Stats Cards based on active tab */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeTab === "cash" ? (
          <>
            <Card className="bg-yellow-500/5 border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-yellow-700 dark:text-yellow-500 font-semibold flex items-center gap-1.5">
                  <Coins className="h-4 w-4" /> Efectivo Físico en Caja (Pendiente)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">
                  {formatCurrency(totalUnreconciledCash)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{unreconciledCash.length} cobros en espera de depósito</p>
              </CardContent>
            </Card>

            <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-green-700 dark:text-green-500 font-semibold flex items-center gap-1.5">
                  <Landmark className="h-4 w-4" /> Efectivo Depositado y Conciliado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-500">
                  {formatCurrency(totalReconciledCash)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{reconciledCash.length} cobros depositados</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="bg-yellow-500/5 border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-yellow-700 dark:text-yellow-500 font-semibold flex items-center gap-1.5">
                  <Landmark className="h-4 w-4" /> Transferencias por Verificar (Pendiente)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">
                  {formatCurrency(totalUnreconciledTransfers)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{unreconciledTransfers.length} transferencias sin validar en cuenta</p>
              </CardContent>
            </Card>

            <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-green-700 dark:text-green-500 font-semibold flex items-center gap-1.5">
                  <ArrowLeftRight className="h-4 w-4" /> Transferencias Verificadas (Conciliadas)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-500">
                  {formatCurrency(totalReconciledTransfers)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{reconciledTransfers.length} transferencias conciliadas</p>
              </CardContent>
            </Card>
          </>
        )}

        {selectedIds.length > 0 && (
          <Card className="bg-blue-500/5 border-blue-500/20 animate-in fade-in">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-700 dark:text-blue-500 font-semibold flex items-center justify-between">
                <span>Monto Seleccionado a Conciliar</span>
                <Badge variant="secondary">{selectedIds.length} seleccionados</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-500">
                {formatCurrency(selectedTotal)}
              </div>
              <Button size="sm" onClick={handleReconcile} disabled={reconcileMutation.isPending}>
                {activeTab === "cash" ? "Confirmar Depósito" : "Confirmar Validación"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Card / Table List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "cash" ? "Control de Caja de Efectivo Pendiente" : "Control de Transferencias Bancarias por Validar"}
          </CardTitle>
          <CardDescription>
            {activeTab === "cash"
              ? "Selecciona los cobros en dinero físico depositados al banco para conciliar el saldo de caja."
              : "Verifica que las siguientes transferencias ya se reflejen en tu cuenta bancaria y márcalas como verificadas."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">Cargando datos...</div>
          ) : currentUnreconciledList.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {activeTab === "cash"
                ? "No hay efectivo físico pendiente en caja."
                : "No hay transferencias bancarias pendientes por verificar."}
            </div>
          ) : (
            <>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={paginatedUnreconciledList.length > 0 && paginatedUnreconciledList.every((p) => selectedIds.includes(p.id))}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Monto Recibido</TableHead>
                  <TableHead>Folio / Operación</TableHead>
                  {activeTab === "transfer" && <TableHead className="text-right">Comprobante</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUnreconciledList.map((p) => (
                  <TableRow key={p.id} className={selectedIds.includes(p.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(p.id)}
                        onCheckedChange={() => handleSelectToggle(p.id)}
                      />
                    </TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-semibold text-foreground">{p.project?.client?.name}</TableCell>
                    <TableCell>{p.project?.name}</TableCell>
                    <TableCell>
                      <div className="font-bold text-green-600">{formatCurrency(p.amount)}</div>
                      {p.method === "atm_withdrawal" && (
                        <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-200 dark:border-yellow-900/50 mt-0.5 whitespace-nowrap">
                          Retiro sin tarjeta
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.method === "atm_withdrawal" ? (
                        <span className="text-yellow-600 font-semibold bg-yellow-50 dark:bg-yellow-950/20 px-2 py-1 rounded border border-yellow-200 dark:border-yellow-900/50">
                          ATM: {p.folio || "Sin código"}
                        </span>
                      ) : (
                        p.folio || "-"
                      )}
                    </TableCell>
                    {activeTab === "transfer" && (
                      <TableCell className="text-right">
                        {p.proof_url ? (
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <a href={p.proof_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3" /> Ver Recibo
                            </a>
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Sin comprobante</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
               currentPage={currentPage}
               totalPages={totalPages}
               onPageChange={setCurrentPage}
               totalItems={currentUnreconciledList.length}
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
