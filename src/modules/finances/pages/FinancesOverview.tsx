import * as React from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  Briefcase,
  ArrowLeftRight,
  PieChart as PieChartIcon,
  BarChart3,
  Receipt,
  Coins,
} from "lucide-react";
import {
  useFinancialStats,
  usePayments,
  useExpenses,
} from "../hooks";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const paymentMethodTranslations: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  gateway: "Pasarela",
  redistribution: "Redistribución",
  atm_withdrawal: "Retiro ATM",
};

export function FinancesOverview() {
  const { data: stats, isLoading: statsLoading } = useFinancialStats();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();

  // 1. Process Cash Flow Chart Data (Last 6 Months)
  const chartData = React.useMemo(() => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const result: any[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const year = d.getFullYear();
      const monthName = `${months[mIdx]} ${year.toString().slice(-2)}`;

      const mStart = new Date(year, mIdx, 1);
      const mEnd = new Date(year, mIdx + 1, 0, 23, 59, 59);

      const incomeVal = payments
        .filter((p) => {
          const pd = new Date(p.created_at);
          return pd >= mStart && pd <= mEnd;
        })
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const expenseVal = expenses
        .filter((e) => {
          const ed = new Date(e.created_at);
          return ed >= mStart && ed <= mEnd;
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

      result.push({
        name: monthName,
        ingresos: incomeVal,
        gastos: expenseVal,
        flujo: incomeVal - expenseVal,
      });
    }
    return result;
  }, [payments, expenses]);

  // 2. Process Expenses by Category Chart Data
  const categoryChartData = React.useMemo(() => {
    const catMap: Record<string, { value: number; color: string; icon: string }> = {};

    expenses.forEach((e) => {
      const catName = e.category?.name || "Otros";
      const catColor = e.category?.color_code || "#1e3a8a";
      const catIcon = e.category?.icon || "🏷️";
      const val = Number(e.amount);

      if (catMap[catName]) {
        catMap[catName].value += val;
      } else {
        catMap[catName] = { value: val, color: catColor, icon: catIcon };
      }
    });

    return Object.entries(catMap)
      .map(([name, obj]) => ({
        name,
        value: obj.value,
        color: obj.color,
        icon: obj.icon,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const totalCategoryExpenses = React.useMemo(
    () => categoryChartData.reduce((sum, item) => sum + item.value, 0),
    [categoryChartData]
  );

  // 3. Filter Upcoming Accounts Payable
  const upcomingAP = React.useMemo(() => {
    return expenses
      .filter((e) => e.status !== "paid" && e.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5);
  }, [expenses]);

  // 4. Filter Recent Transactions
  const recentExpenses = React.useMemo(() => expenses.slice(0, 5), [expenses]);
  const recentIncome = React.useMemo(() => payments.slice(0, 5), [payments]);

  const formatCurrency = (val?: number) => {
    if (val === undefined) return "$0.00";
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  const renderMom = (val?: number, fallbackText = "vs. mes anterior") => {
    if (val === undefined || isNaN(val)) {
      return (
        <span className="text-[11px] text-muted-foreground font-normal">
          Actualizado en tiempo real
        </span>
      );
    }
    const isPositive = val >= 0;
    return (
      <span
        className={`text-[11px] flex items-center font-medium gap-1 ${
          isPositive ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {isPositive ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownLeft className="h-3 w-3" />
        )}
        {Math.abs(val).toFixed(1)}%{" "}
        <span className="text-muted-foreground font-normal">{fallbackText}</span>
      </span>
    );
  };

  const cashFlowConfig = {
    ingresos: { label: "Ingresos", color: "#10b981" },
    gastos: { label: "Gastos", color: "#f43f5e" },
    flujo: { label: "Flujo Neto", color: "#2563eb" },
  };

  const ingresosTotales = stats?.ingresosTotales || 0;
  const gastosTotales = stats?.gastosTotales || 0;
  const maxVolume = Math.max(ingresosTotales + gastosTotales, 1);
  const ingresosPct = Math.min(100, Math.round((ingresosTotales / maxVolume) * 100));
  const gastosPct = Math.min(100, Math.round((gastosTotales / maxVolume) * 100));
  const marginPct =
    ingresosTotales > 0
      ? Math.max(0, Math.min(100, Math.round(((ingresosTotales - gastosTotales) / ingresosTotales) * 100)))
      : 0;

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Finanzas</span>
            <span>›</span>
            <span className="text-foreground font-medium">Resumen General</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Resumen General de Finanzas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control ejecutivo de ingresos, egresos, cuentas por pagar y rentabilidad operativa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            asChild
          >
            <Link to="/finances/cuentas-por-cobrar">
              <Coins className="h-3.5 w-3.5 text-amber-600" /> Cuentas por Cobrar
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            asChild
          >
            <Link to="/finances/gastos">
              <TrendingDown className="h-3.5 w-3.5 text-rose-600" /> Registrar Gasto
            </Link>
          </Button>
          <Button
            size="sm"
            className="h-9 text-xs bg-[#1e3a5f] hover:bg-[#152a45] text-white gap-1.5"
            asChild
          >
            <Link to="/finances/ingresos">
              <TrendingUp className="h-3.5 w-3.5" /> Registrar Cobro
            </Link>
          </Button>
        </div>
      </div>

      {/* Row 1: 5 Compact KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Ingresos Totales */}
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium truncate">
                Ingresos Totales
              </p>
              <p className="text-xl font-bold text-foreground leading-tight truncate">
                {formatCurrency(stats?.ingresosTotales)}
              </p>
            </div>
          </div>
          <div className="mt-2.5">
            <Progress value={ingresosPct} indicatorClassName="bg-emerald-500" className="h-1.5 mb-1" />
            {renderMom(stats?.ingresosMom)}
          </div>
        </Card>

        {/* Card 2: Gastos Totales */}
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium truncate">
                Gastos Totales
              </p>
              <p className="text-xl font-bold text-foreground leading-tight truncate">
                {formatCurrency(stats?.gastosTotales)}
              </p>
            </div>
          </div>
          <div className="mt-2.5">
            <Progress value={gastosPct} indicatorClassName="bg-rose-500" className="h-1.5 mb-1" />
            {renderMom(stats?.gastosMom)}
          </div>
        </Card>

        {/* Card 3: Flujo de Efectivo */}
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium truncate">
                Flujo de Efectivo
              </p>
              <p className="text-xl font-bold text-foreground leading-tight truncate">
                {formatCurrency(stats?.flujoEfectivo)}
              </p>
            </div>
          </div>
          <div className="mt-2.5">
            <Progress value={marginPct} indicatorClassName="bg-blue-500" className="h-1.5 mb-1" />
            {renderMom(stats?.flujoMom)}
          </div>
        </Card>

        {/* Card 4: Cuentas por Pagar */}
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium truncate">
                Cuentas por Pagar
              </p>
              <p className="text-xl font-bold text-foreground leading-tight truncate">
                {formatCurrency(stats?.cuentasPorPagarMonto)}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="text-amber-600 font-medium">
              {stats?.cuentasPorPagarCount || 0} pendientes
            </span>
            <Link
              to="/finances/cuentas-por-pagar"
              className="text-primary hover:underline font-medium"
            >
              Ver todas →
            </Link>
          </div>
        </Card>

        {/* Card 5: Utilidad Estimada */}
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium truncate">
                Utilidad Estimada
              </p>
              <p className="text-xl font-bold text-foreground leading-tight truncate">
                {formatCurrency(stats?.utilidadEstimada)}
              </p>
            </div>
          </div>
          <div className="mt-2.5">
            <Progress value={marginPct} indicatorClassName="bg-indigo-500" className="h-1.5 mb-1" />
            {renderMom(stats?.utilidadMom)}
          </div>
        </Card>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cash Flow AreaChart */}
        <Card className="lg:col-span-7 bg-card shadow-xs border-border/80 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-foreground">
                  Flujo de Efectivo Mensual
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Comparativa histórica de ingresos, gastos y liquidez neta (últimos 6 meses)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ingresos
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Gastos
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-600" /> Flujo Neto
              </span>
            </div>
          </div>

          <div className="h-[240px] w-full">
            <ChartContainer config={cashFlowConfig} className="h-full w-full">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFlujo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(v) => formatCurrency(v as number)}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorIngresos)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="gastos"
                  stroke="#f43f5e"
                  fillOpacity={1}
                  fill="url(#colorGastos)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="flujo"
                  stroke="#2563eb"
                  fillOpacity={1}
                  fill="url(#colorFlujo)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </Card>

        {/* Category Distribution Donut */}
        <Card className="lg:col-span-5 bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Distribución de Gastos por Categoría
                </h3>
              </div>
              <Link
                to="/finances/categorias"
                className="text-[11px] text-primary hover:underline font-medium"
              >
                Categorías →
              </Link>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              Proporción de egresos operativos acumulados por rubro
            </p>
          </div>

          {categoryChartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-muted-foreground text-xs">
              No hay egresos registrados aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center my-auto">
              <div className="sm:col-span-5 h-[180px] relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none px-2">
                  <span className="text-xs font-bold text-foreground leading-tight">
                    {formatCurrency(totalCategoryExpenses)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">egresos</span>
                </div>
              </div>

              <div className="sm:col-span-7 space-y-2 text-xs max-h-[190px] overflow-y-auto pr-1">
                {categoryChartData.slice(0, 6).map((cat, idx) => {
                  const pct =
                    totalCategoryExpenses > 0
                      ? Math.round((cat.value / totalCategoryExpenses) * 100)
                      : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[140px]">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="truncate">{cat.name}</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(cat.value)}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <Progress value={pct} className="h-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Bottom 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Upcoming Accounts Payable */}
        <Card className="bg-card shadow-xs border-border/80 overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-border/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Cuentas por Vencer
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Pagos próximos a proveedores
              </p>
            </div>
            <Button asChild variant="ghost" size="icon" className="h-7 w-7">
              <Link to="/finances/cuentas-por-pagar">
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="p-3.5 flex-1">
            {upcomingAP.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-10">
                Sin cuentas pendientes por vencer.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAP.map((ap) => (
                  <div
                    key={ap.id}
                    className="flex items-center justify-between border-b border-border/40 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 pr-2">
                      <p
                        className="text-xs font-semibold text-foreground truncate"
                        title={ap.supplier?.legal_name}
                      >
                        {ap.supplier?.legal_name || "Proveedor General"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {ap.concept}
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-1 bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-normal py-0"
                      >
                        Vence: {ap.due_date}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">
                        {formatCurrency(ap.amount)}
                      </p>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {ap.status === "pending_payable" ? "Pendiente" : ap.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Income */}
        <Card className="bg-card shadow-xs border-border/80 overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-border/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Ingresos Recientes
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Últimos abonos de proyectos y clientes
              </p>
            </div>
            <Button asChild variant="ghost" size="icon" className="h-7 w-7">
              <Link to="/finances/ingresos">
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="p-3.5 flex-1">
            {recentIncome.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-10">
                Sin abonos registrados recientemente.
              </div>
            ) : (
              <div className="space-y-3">
                {recentIncome.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between border-b border-border/40 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {payment.project?.client?.name || "Cliente"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {payment.project?.name || "Cobro general"}
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal py-0"
                      >
                        {paymentMethodTranslations[payment.method] || payment.method}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-emerald-600">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Expenses */}
        <Card className="bg-card shadow-xs border-border/80 overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-border/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-rose-600" />
                Gastos Recientes
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Últimos egresos y compras operativas
              </p>
            </div>
            <Button asChild variant="ghost" size="icon" className="h-7 w-7">
              <Link to="/finances/gastos">
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="p-3.5 flex-1">
            {recentExpenses.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-10">
                Sin egresos registrados recientemente.
              </div>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between border-b border-border/40 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {exp.concept}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                        <span role="img">{exp.category?.icon || "🏷️"}</span>
                        <span className="truncate">
                          {exp.category?.name || "Operaciones"}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(exp.created_at).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-rose-600">
                        {formatCurrency(exp.amount)}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] mt-0.5 font-normal py-0 ${
                          exp.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {exp.status === "paid" ? "Pagado" : "Pendiente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
