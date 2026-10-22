import * as React from "react";
import { useProjects, usePayments, useExpenses, usePaymentSchedules } from "../hooks";
import { parseLocalDate, formatLocalDate } from "@/lib/utils";
import { DatePicker } from "@/components/shared/DatePicker";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { BarChart3, Trophy, FileQuestion, Calendar, TrendingUp, Scale } from "lucide-react";

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

      const contractedVal = schedules
        .filter(
          (s) =>
            s.status !== "paid" &&
            s.due_date >= mStartStr &&
            s.due_date <= mEndStr &&
            s.project?.status !== "cancelled"
        )
        .reduce((sum, s) => sum + Number(s.expected_amount), 0);

      let pipelineVal = 0;
      if (i === 1) {
        const draftSum = projects
          .filter((p) => p.status === "draft")
          .reduce((sum, p) => sum + Number(p.custom_price_total || p.base_price_total || 0), 0);
        const pendingSum = projects
          .filter((p) => p.status === "pending_approval")
          .reduce((sum, p) => sum + Number(p.custom_price_total || p.base_price_total || 0), 0);
        pipelineVal = draftSum * 0.25 + pendingSum * 0.6;
      } else if (i === 2) {
        const draftSum = projects
          .filter((p) => p.status === "draft")
          .reduce((sum, p) => sum + Number(p.custom_price_total || p.base_price_total || 0), 0);
        pipelineVal = draftSum * 0.15;
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
    utilidad: { label: "Utilidad", color: "#1e3a5f" },
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

      const totalTaxInclusive =
        subtotalPrice + subtotalPrice * ivaRate - subtotalPrice * isrRate - subtotalPrice * ivaRetRate;

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
  const periodIncome = filteredPayments.reduce((sum, item) => sum + Number(item.amount), 0);
  const periodExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const netCashFlow = periodIncome - periodExpenses;
  const marginPct = periodIncome > 0 ? Math.max(0, Math.min(100, (netCashFlow / periodIncome) * 100)) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Finanzas</span>
            <span>›</span>
            <span className="text-foreground font-medium">Reportes de Rendimiento</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reportes de Rendimiento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Estadísticas detalladas sobre conversión de cotizaciones y balances de utilidad neta y fiscal.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-2.5 bg-card border border-border/80 p-2.5 rounded-lg shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> Rango:
          </div>
          <Select value={dateRangeMode} onValueChange={setDateRangeMode}>
            <SelectTrigger className="w-[175px] h-8 text-xs bg-muted/20">
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
                className="h-8 text-xs w-[135px]"
              />
              <span className="text-muted-foreground text-xs">a</span>
              <DatePicker
                date={customEnd ? parseLocalDate(customEnd) : undefined}
                setDate={(d) => setCustomEnd(d ? formatLocalDate(d) : "")}
                className="h-8 text-xs w-[135px]"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Trophy className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-emerald-50/60 text-emerald-700 border-emerald-200">
              Win Rate
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Tasa de Conversión</p>
            <h3 className="text-xl font-bold text-emerald-600 leading-tight mt-0.5">
              {conversionMetrics.winRate.toFixed(1)}%
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={conversionMetrics.winRate} indicatorClassName="bg-emerald-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">
              {conversionMetrics.won} ganadas de {conversionMetrics.total} cotizaciones
            </p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <FileQuestion className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-amber-50/60 text-amber-700 border-amber-200">
              Embudo
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Cotizaciones Abiertas</p>
            <h3 className="text-xl font-bold text-amber-600 leading-tight mt-0.5">
              {conversionMetrics.openRate.toFixed(1)}%
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={conversionMetrics.openRate} indicatorClassName="bg-amber-500" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">
              {conversionMetrics.open} cotizaciones en negociación
            </p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BarChart3 className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-medium bg-blue-50/60 text-blue-700 border-blue-200">
              {marginPct.toFixed(0)}% margen
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Flujo de Operación Neto</p>
            <h3 className="text-xl font-bold text-foreground leading-tight mt-0.5">
              {formatCurrency(netCashFlow)}
            </h3>
          </div>
          <div className="mt-3 space-y-1">
            <Progress value={marginPct} indicatorClassName="bg-blue-600" className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">Balance acumulado neto en el rango</p>
          </div>
        </Card>

        <Card className="bg-card shadow-xs border-border/80 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                ivaBalance >= 0 ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <Scale className="h-4 w-4" />
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-medium ${
                ivaBalance >= 0
                  ? "bg-indigo-50/60 text-indigo-700 border-indigo-200"
                  : "bg-emerald-50/60 text-emerald-700 border-emerald-200"
              }`}
            >
              {ivaBalance >= 0 ? "IVA a Cargo" : "IVA a Favor"}
            </Badge>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground font-medium">Balance Fiscal (IVA)</p>
            <h3 className="text-xl font-bold text-foreground leading-tight mt-0.5">
              {formatCurrency(ivaBalance)}
            </h3>
          </div>
          <div className="mt-2 pt-2 border-t border-border/50 text-[10px] text-muted-foreground space-y-0.5">
            <div className="flex justify-between">
              <span>Trasladado (Cobrado):</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(totalIvaTrasladado)}</span>
            </div>
            <div className="flex justify-between">
              <span>Acreditable (Pagado):</span>
              <span className="font-semibold text-rose-600">{formatCurrency(totalIvaAcreditable)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Quote Conversion Chart */}
        <Card className="lg:col-span-3 bg-card shadow-xs border-border/80 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Conversión de Cotizaciones</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Proporción de cotizaciones ganadas vs. pendientes de aprobación en el período.
            </p>
          </div>
          <div className="h-64 flex flex-col justify-center mt-4">
            {conversionMetrics.total === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-10">
                Sin proyectos registrados en este rango.
              </div>
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
                    innerRadius={52}
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
          </div>
        </Card>

        {/* Profit Performance Chart */}
        <Card className="lg:col-span-4 bg-card shadow-xs border-border/80 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Historial de Rendimiento Mensual</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Distribución mensual de Ingresos, Egresos y Utilidad Neta en el rango.
            </p>
          </div>
          <div className="h-64 mt-4">
            {monthlyData.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-xs">
                Sin registros para el rango de fechas.
              </div>
            ) : (
              <ChartContainer config={cashFlowConfig} className="h-full w-full">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
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
          </div>
        </Card>
      </div>

      {/* Sales Forecast Section */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-3 bg-card shadow-xs border-border/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Pronóstico de Ventas</h3>
                  <p className="text-[11px] text-muted-foreground">Proyección a 3 meses</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-blue-50/60 text-blue-700 border-blue-200 text-[10px]">
                Trimestral
              </Badge>
            </div>

            <div className="mt-5 p-3.5 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground font-medium block">
                Pronóstico Total Estimado:
              </span>
              <span className="text-2xl font-bold text-[#1e3a5f] mt-0.5 block">
                {formatCurrency(totalForecastedVal)}
              </span>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-md border border-border/50 bg-background">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Cobros Pactados (Plazos)
                </span>
                <span className="font-bold text-foreground">{formatCurrency(contractedForecastTotal)}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md border border-border/50 bg-background">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  Pipeline (Borrador / Pendientes)
                </span>
                <span className="font-bold text-foreground">{formatCurrency(pipelineForecastTotal)}</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground italic border-t border-border/50 pt-3 mt-4 leading-relaxed">
            * El Pipeline probable se calcula ponderando las cotizaciones en Borrador al 25% y en Aprobación Pendiente
            al 60% de probabilidad de cierre.
          </p>
        </Card>

        {/* Forecast Stacked Chart */}
        <Card className="lg:col-span-4 bg-card shadow-xs border-border/80 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Composición del Pronóstico Mensual</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Ingresos asegurados por plazos programados + pipeline probable estimado.
            </p>
          </div>
          <div className="h-64 mt-4">
            <ChartContainer config={forecastConfig} className="h-full w-full">
              <BarChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(v as number)} />} />
                <Bar dataKey="contratado" stackId="a" fill="var(--color-contratado)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pipeline" stackId="a" fill="var(--color-pipeline)" radius={[4, 4, 0, 0]} />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
