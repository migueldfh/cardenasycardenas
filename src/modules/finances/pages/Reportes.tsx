import * as React from "react";
import { useProjects, usePayments, useExpenses, usePaymentSchedules } from "../hooks";
import { parseLocalDate, formatLocalDate } from "@/lib/utils";
import { DatePicker } from "@/components/shared/DatePicker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { BarChart3, Trophy, FileQuestion, Calendar, TrendingUp } from "lucide-react";

export function Reportes() {
  const { data: projects = [] } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const { data: schedules = [] } = usePaymentSchedules();

  // Date Range state
  const [dateRangeMode, setDateRangeMode] = React.useState<string>("last_6_months");
  const [customStart, setCustomStart] = React.useState<string>("");
  const [customEnd, setCustomEnd] = React.useState<string>("");


  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);
  };

  // Compute actual start and end dates based on selected range mode
  const { start, end } = React.useMemo(() => {
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (dateRangeMode === "last_3_months") {
      s = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (dateRangeMode === "last_6_months") {
      s = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (dateRangeMode === "last_12_months") {
      s = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (dateRangeMode === "current_year") {
      s = new Date(now.getFullYear(), 0, 1);
      e = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (dateRangeMode === "custom") {
      s = customStart ? parseLocalDate(customStart) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
      e = customEnd ? parseLocalDate(customEnd) : new Date();
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
    }

    return { start: s, end: e };
  }, [dateRangeMode, customStart, customEnd]);

  // Filter projects by range (for quote conversion rate)
  const filteredProjects = React.useMemo(() => {
    return projects.filter((p) => {
      const pd = new Date(p.created_at);
      return pd >= start && pd <= end;
    });
  }, [projects, start, end]);

  // Filter payments by range
  const filteredPayments = React.useMemo(() => {
    return payments.filter((p) => {
      const pd = new Date(p.created_at);
      return pd >= start && pd <= end;
    });
  }, [payments, start, end]);

  // Filter expenses by range
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => {
      const ed = new Date(e.created_at);
      return ed >= start && ed <= end;
    });
  }, [expenses, start, end]);

  // 1. Calculate Quotation Conversion Metrics (Win/Loss Funnel)
  const conversionMetrics = React.useMemo(() => {
    const total = filteredProjects.length;
    if (total === 0) {
      return { total: 0, won: 0, open: 0, winRate: 0, openRate: 0 };
    }

    const won = filteredProjects.filter((p) => p.status === "approved" || p.status === "completed").length;
    const open = total - won;

    return {
      total,
      won,
      open,
      winRate: (won / total) * 100,
      openRate: (open / total) * 100,
    };
  }, [filteredProjects]);

  // Chart data for conversion
  const conversionChartData = React.useMemo(() => {
    return [
      { name: "Ganadas (Aprobadas)", value: conversionMetrics.won, color: "#10b981" },
      { name: "En Negociación / Borradores", value: conversionMetrics.open, color: "#f59e0b" },
    ];
  }, [conversionMetrics]);

  // 2. Monthly cash flow summary grouped dynamically inside range
  const monthlyData = React.useMemo(() => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const result: any[] = [];
    
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const limit = new Date(end.getFullYear(), end.getMonth(), 1);

    if (current > limit) return [];

    let count = 0;
    while (current <= limit && count < 36) {
      const mIdx = current.getMonth();
      const year = current.getFullYear();
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
        utilidad: incomeVal - expenseVal,
      });

      current.setMonth(current.getMonth() + 1);
      count++;
    }
    return result;
  }, [start, end, payments, expenses]);

  // 3. Sales Forecast (Next 3 Months)
  const forecastData = React.useMemo(() => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const result: any[] = [];
    const now = new Date();

    for (let i = 1; i <= 3; i++) {
      const fDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const mIdx = fDate.getMonth();
      const year = fDate.getFullYear();
      const monthName = `${months[mIdx]} ${year.toString().slice(-2)}`;

      const mStart = new Date(year, mIdx, 1);
      const mEnd = new Date(year, mIdx + 1, 0, 23, 59, 59);
      const mStartStr = formatLocalDate(mStart);
      const mEndStr = formatLocalDate(mEnd);

      // Contracted Collections: pending payment schedules due in this month
      const contractedVal = schedules
        .filter((s) => s.status !== "paid" && s.due_date >= mStartStr && s.due_date <= mEndStr && s.project?.status !== "cancelled")
        .reduce((sum, s) => sum + Number(s.expected_amount), 0);

      // Pipeline Forecast: Draft & Pending Approval projects weighted
      // Draft closings at 25% prob, Pending Approval at 60% prob. closed primarily in next months.
      let pipelineVal = 0;
      if (i === 1) {
        const draftSum = projects
          .filter((p) => p.status === "draft")
          .reduce((sum, p) => sum + Number(p.custom_price_total || p.base_price_total || 0), 0);
        const pendingSum = projects
          .filter((p) => p.status === "pending_approval")
          .reduce((sum, p) => sum + Number(p.custom_price_total || p.base_price_total || 0), 0);
        pipelineVal = (draftSum * 0.25) + (pendingSum * 0.60);
      } else if (i === 2) {
        const draftSum = projects
          .filter((p) => p.status === "draft")
          .reduce((sum, p) => sum + Number(p.custom_price_total || p.base_price_total || 0), 0);
        pipelineVal = (draftSum * 0.15);
      }

      result.push({
        name: monthName,
        contratado: contractedVal,
        pipeline: pipelineVal,
        total: contractedVal + pipelineVal,
      });
    }

    return result;
  }, [projects, schedules]);

  const totalForecastedVal = React.useMemo(() => {
    return forecastData.reduce((sum, item) => sum + item.total, 0);
  }, [forecastData]);

  const contractedForecastTotal = React.useMemo(() => {
    return forecastData.reduce((sum, item) => sum + item.contratado, 0);
  }, [forecastData]);

  const pipelineForecastTotal = React.useMemo(() => {
    return forecastData.reduce((sum, item) => sum + item.pipeline, 0);
  }, [forecastData]);

  const conversionConfig = {
    won: { label: "Ganadas", color: "#10b981" },
    open: { label: "Abiertas", color: "#f59e0b" },
  };

  const cashFlowConfig = {
    ingresos: { label: "Ingresos", color: "#10b981" },
    gastos: { label: "Gastos", color: "#ef4444" },
    utilidad: { label: "Utilidad", color: "#3b82f6" },
  };



  const forecastConfig = {
    contratado: { label: "Contratado (Plazos)", color: "#10b981" },
    pipeline: { label: "Pipeline Probable", color: "#3b82f6" },
  };

  // Calculate IVA Trasladado (from payments of projects requiring invoice)
  const totalIvaTrasladado = React.useMemo(() => {
    return filteredPayments.reduce((sum, pay) => {
      const proj = pay.project;
      if (!proj || !proj.requires_invoice) return sum;
      
      const subtotalPrice = Number(proj.custom_price_total);
      const ivaRate = proj.iva_rate ?? 0.16;
      const isrRate = proj.isr_retention_rate ?? 0;
      const ivaRetRate = proj.iva_retention_rate ?? 0;
      
      const totalTaxInclusive = subtotalPrice + (subtotalPrice * ivaRate) - (subtotalPrice * isrRate) - (subtotalPrice * ivaRetRate);
      
      if (totalTaxInclusive <= 0) return sum;
      const paymentIva = Number(pay.amount) * ((subtotalPrice * ivaRate) / totalTaxInclusive);
      return sum + paymentIva;
    }, 0);
  }, [filteredPayments]);

  // Calculate IVA Acreditable (from expenses marked as factura)
  const totalIvaAcreditable = React.useMemo(() => {
    return filteredExpenses
      .filter((e) => e.is_factura)
      .reduce((sum, e) => sum + Number(e.iva_amount || 0), 0);
  }, [filteredExpenses]);

  const ivaBalance = totalIvaTrasladado - totalIvaAcreditable;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reportes de Rendimiento</h2>
          <p className="text-muted-foreground text-sm">Estadísticas detalladas sobre conversión de cotizaciones y balances de utilidad neta y fiscal.</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-3 bg-card border p-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Calendar className="h-4 w-4" /> Rango:
          </div>
          <Select value={dateRangeMode} onValueChange={setDateRangeMode}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
              <SelectItem value="last_6_months">Últimos 6 Meses</SelectItem>
              <SelectItem value="last_12_months">Últimos 12 Meses</SelectItem>
              <SelectItem value="current_year">Año en Curso</SelectItem>
              <SelectItem value="custom">Rango Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {dateRangeMode === "custom" && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <DatePicker
                date={customStart ? parseLocalDate(customStart) : undefined}
                setDate={(d) => setCustomStart(d ? formatLocalDate(d) : "")}
                className="h-8 text-xs w-[140px]"
              />
              <span className="text-muted-foreground text-xs">a</span>
              <DatePicker
                date={customEnd ? parseLocalDate(customEnd) : undefined}
                setDate={(d) => setCustomEnd(d ? formatLocalDate(d) : "")}
                className="h-8 text-xs w-[140px]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI: Win Rate */}
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-green-700 dark:text-green-500 font-semibold">Tasa de Conversión (Win Rate)</CardDescription>
            <Trophy className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-500">
              {conversionMetrics.winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {conversionMetrics.won} cotizaciones ganadas de {conversionMetrics.total} totales
            </p>
          </CardContent>
        </Card>

        {/* KPI: Pending Funnel */}
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-amber-700 dark:text-amber-500 font-semibold">Tasa de Cotizaciones Pendientes</CardDescription>
            <FileQuestion className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-500">
              {conversionMetrics.openRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {conversionMetrics.open} cotizaciones abiertas / en negociación
            </p>
          </CardContent>
        </Card>

        {/* KPI: Total Balance */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription>Flujo de Operación Neto</CardDescription>
            <BarChart3 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(filteredPayments.reduce((sum, item) => sum + Number(item.amount), 0) - filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Balance acumulado neto en el rango</p>
          </CardContent>
        </Card>

        {/* KPI: Fiscal Balance (IVA) */}
        <Card className={ivaBalance >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className={ivaBalance >= 0 ? "text-emerald-700 dark:text-emerald-500 font-semibold" : "text-red-700 dark:text-red-500 font-semibold"}>
              Balance Fiscal (IVA a Cargo / Favor)
            </CardDescription>
            <Calendar className={ivaBalance >= 0 ? "h-5 w-5 text-emerald-500" : "h-5 w-5 text-red-500"} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${ivaBalance >= 0 ? "text-emerald-700 dark:text-emerald-500" : "text-red-700 dark:text-red-500"}`}>
              {formatCurrency(ivaBalance)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span>IVA Trasladado (Cobrado):</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalIvaTrasladado)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA Acreditable (Pagado):</span>
                <span className="font-semibold text-red-600">{formatCurrency(totalIvaAcreditable)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Quote Conversion Chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Conversión de Cotizaciones</CardTitle>
            <CardDescription>Proporción de cotizaciones ganadas vs. pendientes de aprobación en el período.</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col justify-center">
            {conversionMetrics.total === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-10">Sin proyectos registrados.</div>
            ) : (
              <ChartContainer config={conversionConfig} className="h-56 w-full">
                <PieChart>
                  <Pie
                    data={conversionChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={50}
                    paddingAngle={3}
                  >
                    {conversionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Profit Performance Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Historial de Rendimiento</CardTitle>
            <CardDescription>Distribución mensual de Ingresos, Egresos y Utilidad Neta en el rango.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {monthlyData.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-sm">Sin registros para el rango de fechas.</div>
            ) : (
              <ChartContainer config={cashFlowConfig} className="h-full w-full">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(v as number)} />} />
                  <Bar dataKey="ingresos" fill="var(--color-ingresos)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="var(--color-gastos)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="utilidad" fill="var(--color-utilidad)" radius={[4, 4, 0, 0]} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Forecast Section */}
      <div className="grid gap-6 md:grid-cols-7">
        <Card className="col-span-3 bg-blue-500/5 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Pronóstico de Ventas
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-400">
              Proyección de ingresos estimados para los siguientes 3 meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div>
              <span className="text-xs text-muted-foreground block">Pronóstico Total Estimado:</span>
              <span className="text-3xl font-extrabold text-blue-800 dark:text-blue-300">
                {formatCurrency(totalForecastedVal)}
              </span>
            </div>
            <div className="border-t border-blue-200/50 pt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" /> Cobros Pactados (Plazos):
                </span>
                <span className="font-semibold text-foreground">{formatCurrency(contractedForecastTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500" /> Pipeline (Borrador/Pendientes):
                </span>
                <span className="font-semibold text-foreground">{formatCurrency(pipelineForecastTotal)}</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic border-t border-blue-200/30 pt-2 leading-normal">
              * El Pipeline probable se calcula ponderando las cotizaciones en Borrador al 25% y en Aprobación Pendiente al 60% de probabilidad de cierre.
            </p>
          </CardContent>
        </Card>

        {/* Forecast Stacked Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Composición del Pronóstico Mensual</CardTitle>
            <CardDescription>Ingresos asegurados por plazos programados + pipeline probable estimado.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ChartContainer config={forecastConfig} className="h-full w-full">
              <BarChart data={forecastData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(v as number)} />} />
                <Bar dataKey="contratado" stackId="a" fill="var(--color-contratado)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pipeline" stackId="a" fill="var(--color-pipeline)" radius={[4, 4, 0, 0]} />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
