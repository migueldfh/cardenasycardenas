import * as React from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  Briefcase,
  ArrowLeftRight,
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
  ChartLegend,
  ChartLegendContent,
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
} from "recharts";

const paymentMethodTranslations: Record<string, string> = {
  cash: "efectivo",
  transfer: "transferencia",
  card: "tarjeta",
  gateway: "pasarela",
  redistribution: "redistribución",
  atm_withdrawal: "retiro sin tarjeta",
};

export function FinancesDashboard() {
  const { data: stats, isLoading: statsLoading } = useFinancialStats();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  // schedules query is not needed here

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

      // Sum income
      const incomeVal = payments
        .filter((p) => {
          const pd = new Date(p.created_at);
          return pd >= mStart && pd <= mEnd;
        })
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Sum expenses
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
    const catMap: Record<string, { value: number; color: string }> = {};

    expenses.forEach((e) => {
      const catName = e.category?.name || "Otros";
      const catColor = e.category?.color_code || "#6b7280";
      const val = Number(e.amount);

      if (catMap[catName]) {
        catMap[catName].value += val;
      } else {
        catMap[catName] = { value: val, color: catColor };
      }
    });

    return Object.entries(catMap).map(([name, obj]) => ({
      name,
      value: obj.value,
      color: obj.color,
    }));
  }, [expenses]);

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

  const renderMom = (val?: number) => {
    if (val === undefined || isNaN(val)) return null;
    const isPositive = val >= 0;
    return (
      <span className={`text-xs flex items-center font-medium gap-0.5 mt-1 ${isPositive ? "text-green-500" : "text-red-500"}`}>
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
        {Math.abs(val).toFixed(1)}% MoM
      </span>
    );
  };

  const cashFlowConfig = {
    ingresos: { label: "Ingresos", color: "hsl(142.1, 76.2%, 36.3%)" },
    gastos: { label: "Gastos", color: "hsl(0, 84.2%, 60.2%)" },
    flujo: { label: "Flujo Neto", color: "hsl(217.2, 91.2%, 59.8%)" },
  };

  const categoryConfig = React.useMemo(() => {
    const config: any = {};
    categoryChartData.forEach((d) => {
      config[d.name] = { label: d.name, color: d.color };
    });
    return config;
  }, [categoryChartData]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Finanzas</h2>
          <p className="text-muted-foreground mt-1">Cotizaciones, egresos, cobros y rentabilidad.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link to="/finances/gastos">
              <TrendingDown className="h-4 w-4 mr-2 text-red-500" /> Registrar Gasto
            </Link>
          </Button>
          <Button asChild>
            <Link to="/finances/ingresos">
              <TrendingUp className="h-4 w-4 mr-2 text-green-500" /> Registrar Ingreso
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.ingresosTotales)}</div>
            {renderMom(stats?.ingresosMom)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.gastosTotales)}</div>
            {renderMom(stats?.gastosMom)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo de Efectivo</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.flujoEfectivo)}</div>
            {renderMom(stats?.flujoMom)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuentas por Pagar</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.cuentasPorPagarMonto)}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-between mt-1">
              <span>{stats?.cuentasPorPagarCount} pendientes</span>
              {renderMom(stats?.cuentasPorPagarMom)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Estimada</CardTitle>
            <Briefcase className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.utilidadEstimada)}</div>
            {renderMom(stats?.utilidadMom)}
          </CardContent>
        </Card>
      </div>

      {/* Charts section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Flujo de Efectivo Mensual</CardTitle>
            <CardDescription>Comparación histórica de Ingresos, Gastos y Liquidez Neta.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer config={cashFlowConfig} className="h-full w-full">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-ingresos)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-ingresos)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-gastos)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-gastos)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFlujo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-flujo)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-flujo)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(v as number)} />} />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="var(--color-ingresos)"
                  fillOpacity={1}
                  fill="url(#colorIngresos)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="gastos"
                  stroke="var(--color-gastos)"
                  fillOpacity={1}
                  fill="url(#colorGastos)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="flujo"
                  stroke="var(--color-flujo)"
                  fillOpacity={1}
                  fill="url(#colorFlujo)"
                  strokeWidth={2}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Distribución de Gastos</CardTitle>
            <CardDescription>Porcentaje de gastos operativos por categoría.</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex flex-col justify-center">
            {categoryChartData.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm my-10">No hay egresos registrados.</div>
            ) : (
              <ChartContainer config={categoryConfig} className="h-60 w-full">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(v as number)} />} />
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Data Tables */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming accounts payable */}
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cuentas por Vencer</CardTitle>
              <CardDescription>Pagos próximos a proveedores</CardDescription>
            </div>
            <Button asChild variant="ghost" size="icon">
              <Link to="/finances/cuentas-por-pagar"><ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingAP.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-10">Sin cuentas pendientes.</div>
            ) : (
              <div className="space-y-4">
                {upcomingAP.map((ap) => (
                  <div key={ap.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground truncate max-w-[150px]" title={ap.supplier?.legal_name}>
                        {ap.supplier?.legal_name || "Proveedor General"}
                      </p>
                      {ap.supplier?.fiscal_name && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[150px] font-mono" title={ap.supplier.fiscal_name}>
                          {ap.supplier.fiscal_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{ap.concept}</p>
                      <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded-full font-medium">
                        Due: {ap.due_date}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(ap.amount)}</p>
                      <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">
                        {ap.status === "pending_payable" ? "pendiente" : ap.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Income */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ingresos Recientes</CardTitle>
              <CardDescription>Últimos abonos de proyectos</CardDescription>
            </div>
            <Button asChild variant="ghost" size="icon">
              <Link to="/finances/ingresos"><ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentIncome.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-10">Sin abonos registrados.</div>
            ) : (
              <div className="space-y-4">
                {recentIncome.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                        {payment.project?.client?.name || "Cliente"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{payment.project?.name}</p>
                      <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full font-medium capitalize">
                        {paymentMethodTranslations[payment.method] || payment.method}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Gastos Recientes</CardTitle>
              <CardDescription>Egresos y compras operativas</CardDescription>
            </div>
            <Button asChild variant="ghost" size="icon">
              <Link to="/finances/gastos"><ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentExpenses.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-10">Sin egresos registrados.</div>
            ) : (
              <div className="space-y-4">
                {recentExpenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">{exp.concept}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span role="img">{exp.category?.icon || "🏷️"}</span>
                        <span>{exp.category?.name || "Operaciones"}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(exp.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{formatCurrency(exp.amount)}</p>
                      <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">
                        {exp.status === "paid" ? "pagado" : "pendiente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
