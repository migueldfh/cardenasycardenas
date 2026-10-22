import * as React from "react";
import { usePayments, useReconcilePayments } from "../hooks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/TablePagination";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { sileo } from "sileo";
import {
  Coins,
  Landmark,
  ArrowLeftRight,
  ExternalLink,
  Search,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export function Transferencias() {
  const { data: payments = [], isLoading } = usePayments();
  const reconcileMutation = useReconcilePayments();

  // State to track current tab: "cash" | "transfer"
  const [activeTab, setActiveTab] = React.useState<"cash" | "transfer">("cash");

  // State to track selected payments for deposit/reconciliation
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = React.useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  // Reset selected IDs when active tab changes
  React.useEffect(() => {
    setSelectedIds([]);
    setSearchQuery("");
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

  // Cash totals
  const totalUnreconciledCash = unreconciledCash.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalReconciledCash = reconciledCash.reduce((sum, p) => sum + Number(p.amount), 0);

  // Transfer totals
  const totalUnreconciledTransfers = unreconciledTransfers.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalReconciledTransfers = reconciledTransfers.reduce((sum, p) => sum + Number(p.amount), 0);

  // Active list config
  const currentUnreconciledList = activeTab === "cash" ? unreconciledCash : unreconciledTransfers;

  const filteredUnreconciledList = React.useMemo(() => {
    return currentUnreconciledList.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (p.folio && p.folio.toLowerCase().includes(q)) ||
        (p.project?.name && p.project.name.toLowerCase().includes(q)) ||
        (p.project?.client?.name && p.project.client.name.toLowerCase().includes(q)) ||
        (p.amount && String(p.amount).includes(q))
      );
    });
  }, [currentUnreconciledList, searchQuery]);

  const totalPages = Math.ceil(filteredUnreconciledList.length / itemsPerPage);
  const paginatedUnreconciledList = React.useMemo(() => {
    return filteredUnreconciledList.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredUnreconciledList, currentPage, itemsPerPage]);

  const handleSelectToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    const pageIds = paginatedUnreconciledList.map((p) => p.id);
    const allSelectedOnPage = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
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

  const activeUnreconciledAmount = activeTab === "cash" ? totalUnreconciledCash : totalUnreconciledTransfers;
  const activeReconciledAmount = activeTab === "cash" ? totalReconciledCash : totalReconciledTransfers;
  const activeTotalVolume = activeUnreconciledAmount + activeReconciledAmount;
  const reconciledPercent = activeTotalVolume > 0 ? Math.min(100, (activeReconciledAmount / activeTotalVolume) * 100) : 100;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Finanzas</span>
            <span>›</span>
            <span className="text-foreground font-medium">Conciliación Bancaria</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Conciliación & Verificación de Pagos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitorea y valida los cobros de tus clientes para asegurar que los fondos estén en tu cuenta bancaria.
          </p>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="inline-flex items-center rounded-lg border border-border/80 bg-card p-1 gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("cash")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "cash"
                ? "bg-[#1e3a5f] text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            <span>Efectivo (Caja)</span>
            {unreconciledCash.length > 0 && (
              <span
                className={`px-1.5 py-0 rounded-full text-[10px] font-semibold ${
                  activeTab === "cash" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                }`}
              >
                {unreconciledCash.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("transfer")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "transfer"
                ? "bg-[#1e3a5f] text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Landmark className="h-3.5 w-3.5" />
            <span>Transferencias</span>
            {unreconciledTransfers.length > 0 && (
              <span
                className={`px-1.5 py-0 rounded-full text-[10px] font-semibold ${
                  activeTab === "transfer" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                }`}
              >
                {unreconciledTransfers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              {activeTab === "cash" ? <Coins className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-amber-50/60 text-amber-700 border-amber-200">
              {activeTab === "cash" ? `${unreconciledCash.length} en caja` : `${unreconciledTransfers.length} por validar`}
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">
              {activeTab === "cash"
                ? "Efectivo Físico en Caja (Pendiente)"
                : "Transferencias por Verificar (Pendiente)"}
            </p>
            <h3 className="text-xl font-bold text-amber-600 leading-tight mt-0.5">
              {formatCurrency(activeUnreconciledAmount)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={Math.max(0, 100 - reconciledPercent)} indicatorClassName="bg-amber-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">
              {activeTab === "cash"
                ? "Cobros en espera de depósito bancario"
                : "Transferencias pendientes de validar en banco"}
            </p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-emerald-50/60 text-emerald-700 border-emerald-200">
              {reconciledPercent.toFixed(1)}% conciliado
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">
              {activeTab === "cash"
                ? "Efectivo Depositado y Conciliado"
                : "Transferencias Verificadas (Conciliadas)"}
            </p>
            <h3 className="text-xl font-bold text-emerald-600 leading-tight mt-0.5">
              {formatCurrency(activeReconciledAmount)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={reconciledPercent} indicatorClassName="bg-emerald-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">
              {activeTab === "cash"
                ? `${reconciledCash.length} cobros depositados en banco`
                : `${reconciledTransfers.length} transferencias conciliadas`}
            </p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-blue-50/60 text-blue-700 border-blue-200">
              {selectedIds.length} seleccionados
            </Badge>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Monto Seleccionado a Conciliar</p>
              <h3 className="text-xl font-bold text-foreground leading-tight mt-0.5">
                {formatCurrency(selectedTotal)}
              </h3>
            </div>
            {selectedIds.length > 0 && (
              <Button
                size="sm"
                onClick={handleReconcile}
                disabled={reconcileMutation.isPending}
                className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white shrink-0"
              >
                {reconcileMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                )}
                {activeTab === "cash" ? "Confirmar Depósito" : "Confirmar Validación"}
              </Button>
            )}
          </div>
          <div className="mt-3 space-y-1">
            <Progress
              value={activeUnreconciledAmount > 0 ? Math.min(100, (selectedTotal / activeUnreconciledAmount) * 100) : 0}
              indicatorClassName="bg-blue-600"
              className="h-1.5"
            />
            <p className="text-[10px] text-muted-foreground">
              {selectedIds.length > 0
                ? "Haz clic en el botón para conciliar los pagos marcados"
                : "Selecciona filas en la tabla inferior para conciliar"}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card shadow-xs border-border/80 overflow-hidden">
        <div className="p-3.5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {activeTab === "cash"
                ? "Control de Caja de Efectivo Pendiente"
                : "Control de Transferencias Bancarias por Validar"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {activeTab === "cash"
                ? "Selecciona los cobros en dinero físico depositados al banco para conciliar el saldo de caja."
                : "Verifica que las siguientes transferencias ya se reflejen en tu cuenta bancaria y márcalas como verificadas."}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, proyecto, folio..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 h-8 text-xs bg-muted/20"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Cargando datos de conciliación...</span>
          </div>
        ) : filteredUnreconciledList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            {currentUnreconciledList.length === 0
              ? activeTab === "cash"
                ? "No hay efectivo físico pendiente en caja."
                : "No hay transferencias bancarias pendientes por verificar."
              : "No se encontraron cobros con la búsqueda especificada."}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] text-muted-foreground bg-muted/20">
                  <TableHead className="w-[48px] py-2.5">
                    <Checkbox
                      checked={
                        paginatedUnreconciledList.length > 0 &&
                        paginatedUnreconciledList.every((p) => selectedIds.includes(p.id))
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="py-2.5">Fecha</TableHead>
                  <TableHead className="py-2.5">Cliente</TableHead>
                  <TableHead className="py-2.5">Proyecto</TableHead>
                  <TableHead className="py-2.5">Monto Recibido</TableHead>
                  <TableHead className="py-2.5">Folio / Operación</TableHead>
                  {activeTab === "transfer" && <TableHead className="py-2.5 text-right">Comprobante</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {paginatedUnreconciledList.map((p) => (
                  <TableRow
                    key={p.id}
                    className={selectedIds.includes(p.id) ? "bg-blue-50/40 hover:bg-blue-50/60" : "hover:bg-muted/40"}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(p.id)}
                        onCheckedChange={() => handleSelectToggle(p.id)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">{p.project?.client?.name || "-"}</TableCell>
                    <TableCell className="font-medium text-foreground">{p.project?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="font-bold text-emerald-600">{formatCurrency(p.amount)}</div>
                      {p.method === "atm_withdrawal" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-normal py-0 mt-0.5 whitespace-nowrap"
                        >
                          Retiro sin tarjeta
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {p.method === "atm_withdrawal" ? (
                        <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          ATM: {p.folio || "Sin código"}
                        </span>
                      ) : (
                        p.folio || "-"
                      )}
                    </TableCell>
                    {activeTab === "transfer" && (
                      <TableCell className="text-right">
                        {p.proof_url ? (
                          <Button asChild size="sm" variant="outline" className="h-7 text-[11px] px-2.5 gap-1">
                            <a href={p.proof_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3" /> Ver Recibo
                            </a>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Sin comprobante</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-3 border-t border-border/50">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredUnreconciledList.length}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
