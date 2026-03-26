// [IMPORT] React & Hooks
import { useState, useEffect, useCallback } from "react";
import React from "react";

// [IMPORT] Recharts
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ? [INTERFACES]
interface SalesReport {
  id: number;
  date: string;
  totalSales: number;
  totalProfit: number;
  totalTransactions: number;
  createdAt: string;
  updatedAt: string;
}

interface SummaryStats {
  totalSales: number;
  totalProfit: number;
  totalTransactions: number;
  avgSalesPerDay: number;
  profitMargin: number;
  bestDay: SalesReport | null;
  worstDay: SalesReport | null;
}

type PeriodOption = "daily" | "weekly" | "monthly" | "yearly";

// ? [CONSTANTS]
const PERIOD_LABELS: Record<PeriodOption, string> = {
  daily:   "Daily",
  weekly:  "Weekly",
  monthly: "Monthly",
  yearly:  "Yearly",
};

// [CONSTANTS] Chart colors using CSS var fallbacks
const CHART_COLORS = {
  sales:        "#3b82f6",
  profit:       "#10b981",
  loss:         "#ef4444",
  transactions: "#f59e0b",
  neutral:      "#6b7280",
};

// ? [HELPERS]
const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const formatShortCurrency = (amount: number) => {
  if (Math.abs(amount) >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000)     return `₱${(amount / 1_000).toFixed(1)}K`;
  return `₱${amount.toFixed(0)}`;
};

const formatDateLabel = (iso: string, period: PeriodOption): string => {
  const d = new Date(iso);
  switch (period) {
    case "daily":   return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    case "weekly":  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    case "monthly": return d.toLocaleDateString("en-PH", { month: "short", year: "2-digit" });
    case "yearly":  return d.toLocaleDateString("en-PH", { year: "numeric" });
  }
};

// [HELPER] Group reports by period
const groupByPeriod = (reports: SalesReport[], period: PeriodOption): SalesReport[] => {
  if (period === "daily") return reports;

  const grouped: Record<string, SalesReport> = {};

  reports.forEach((r) => {
    const d = new Date(r.date);
    let key: string;

    if (period === "weekly") {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else if (period === "monthly") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    } else {
      key = `${d.getFullYear()}-01-01`;
    }

    if (!grouped[key]) {
      grouped[key] = { ...r, date: key };
    } else {
      grouped[key].totalSales        += r.totalSales;
      grouped[key].totalProfit       += r.totalProfit;
      grouped[key].totalTransactions += r.totalTransactions;
    }
  });

  return Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// [HELPER] Compute summary stats from raw reports
const computeStats = (reports: SalesReport[]): SummaryStats => {
  if (!reports.length) return {
    totalSales: 0, totalProfit: 0, totalTransactions: 0,
    avgSalesPerDay: 0, profitMargin: 0, bestDay: null, worstDay: null,
  };

  const totalSales        = reports.reduce((s, r) => s + r.totalSales, 0);
  const totalProfit       = reports.reduce((s, r) => s + r.totalProfit, 0);
  const totalTransactions = reports.reduce((s, r) => s + r.totalTransactions, 0);
  const avgSalesPerDay    = totalSales / reports.length;
  const profitMargin      = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const bestDay           = reports.reduce((best, r) => r.totalSales > (best?.totalSales ?? -Infinity) ? r : best, reports[0]);
  const worstDay          = reports.reduce((worst, r) => r.totalSales < (worst?.totalSales ?? Infinity) ? r : worst, reports[0]);

  return { totalSales, totalProfit, totalTransactions, avgSalesPerDay, profitMargin, bestDay, worstDay };
};

// ? [SUB-COMPONENTS]

// [COMPONENT] Stat card
const StatCard = ({
  label, value, sub, color = "text-[var(--color-text-900)]",
}: { label: string; value: string; sub?: string; color?: string }) => (
  <div className="bg-white border border-[var(--color-bg-200)] rounded-lg p-4 shadow-sm">
    <p className="text-xs font-roboto text-[var(--color-text-500)] uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-xl font-bold font-figtree ${color}`}>{value}</p>
    {sub && <p className="text-xs font-roboto text-[var(--color-text-400)] mt-1">{sub}</p>}
  </div>
);

// [COMPONENT] Custom tooltip for charts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--color-bg-300)] rounded-lg shadow-lg p-3 text-xs font-roboto">
      <p className="font-semibold text-[var(--color-text-800)] mb-1">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name === "Transactions" ? p.value : formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

// [COMPONENT] Top 5 Best Sales Days — mobile card
const Top5DayCard = ({ report, rank }: { report: SalesReport; rank: number }) => (
  <div className="bg-white border border-[var(--color-bg-200)] rounded-xl shadow-sm p-4 hover:shadow-md transition-all">
    <div className="flex justify-between items-start">
      <div>
        <div className={`text-xs font-bold font-roboto mb-1 ${rank === 1 ? "text-amber-500" : "text-[var(--color-text-400)]"}`}>
          #{rank}
        </div>
        <div className="font-semibold text-[var(--color-text-900)] font-figtree">
          {new Date(report.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-blue-600">{formatCurrency(report.totalSales)}</div>
        <div className="text-xs text-[var(--color-text-500)]">Sales</div>
      </div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3 text-sm border-t border-[var(--color-bg-200)] pt-3">
      <div>
        <div className="text-xs text-[var(--color-text-500)]">Profit</div>
        <div className={`font-semibold ${report.totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
          {formatCurrency(report.totalProfit)}
        </div>
      </div>
      <div>
        <div className="text-xs text-[var(--color-text-500)]">Transactions</div>
        <div className="font-semibold text-[var(--color-text-900)]">{report.totalTransactions}</div>
      </div>
    </div>
  </div>
);

// [COMPONENT] Top 5 Best Sales Days — desktop table
const Top5DaysTable = ({ top5Days }: { top5Days: SalesReport[] }) => (
  <table className="min-w-full table-auto border-collapse">
    <thead className="bg-[var(--color-primary-600)] text-white font-figtree">
      <tr>
        <th className="py-2 px-4 text-left text-xs font-bold border-r border-[var(--color-primary-500)]">Date</th>
        <th className="py-2 px-4 text-left text-xs font-bold border-r border-[var(--color-primary-500)]">Sales</th>
        <th className="py-2 px-4 text-left text-xs font-bold border-r border-[var(--color-primary-500)]">Profit</th>
        <th className="py-2 px-4 text-left text-xs font-bold">Transactions</th>
      </tr>
    </thead>
    <tbody className="font-roboto">
      {top5Days.map((r, idx) => (
        <tr
          key={r.id}
          className="border-t border-[var(--color-bg-100)] hover:bg-[var(--color-bg-50)] transition-colors"
        >
          <td className="py-2 px-4 text-sm text-[var(--color-text-700)] border-r border-[var(--color-bg-200)]">
            <span className="inline-flex items-center gap-2">
              <span className={`text-xs font-bold ${idx === 0 ? "text-amber-500" : "text-[var(--color-text-400)]"}`}>
                #{idx + 1}
              </span>
              {new Date(r.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </td>
          <td className="py-2 px-4 text-sm font-semibold text-blue-600 border-r border-[var(--color-bg-200)]">
            {formatCurrency(r.totalSales)}
          </td>
          <td className={`py-2 px-4 text-sm font-semibold border-r border-[var(--color-bg-200)] ${r.totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
            {formatCurrency(r.totalProfit)}
          </td>
          <td className="py-2 px-4 text-sm text-[var(--color-text-700)]">
            {r.totalTransactions}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

// [COMPONENT] Full Report — mobile card row
const ReportRowCard = ({ report, index, total }: { report: SalesReport; index: number; total: number }) => {
  const margin = report.totalSales > 0 ? (report.totalProfit / report.totalSales) * 100 : 0;
  return (
    <div className="bg-white border border-[var(--color-bg-200)] rounded-xl shadow-sm p-4 hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-mono text-xs text-[var(--color-text-400)]">#{total - index}</div>
          <div className="font-semibold text-[var(--color-text-900)] font-figtree mt-1">
            {new Date(report.date).toLocaleDateString("en-PH", { dateStyle: "medium" })}
          </div>
        </div>
        <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
          margin >= 20 ? "bg-green-100 text-green-700"
          : margin >= 0 ? "bg-blue-100 text-blue-700"
          : "bg-red-100 text-red-600"
        }`}>
          {margin.toFixed(1)}%
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm border-t border-[var(--color-bg-200)] pt-3">
        <div>
          <div className="text-xs text-[var(--color-text-500)]">Total Sales</div>
          <div className="font-semibold text-blue-600">{formatCurrency(report.totalSales)}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--color-text-500)]">Total Profit</div>
          <div className={`font-semibold ${report.totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
            {formatCurrency(report.totalProfit)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--color-text-500)]">Transactions</div>
          <div className="font-semibold text-[var(--color-text-900)]">{report.totalTransactions}</div>
        </div>
      </div>
    </div>
  );
};

// [COMPONENT] Full Report — desktop table
const ReportTable = ({ reports }: { reports: SalesReport[] }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full table-auto border-collapse">
      <thead className="bg-[var(--color-primary-600)] text-white font-figtree">
        <tr>
          <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-500)] w-10">#</th>
          <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-500)] w-36">Date</th>
          <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-500)] w-36">Total Sales</th>
          <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-500)] w-36">Total Profit</th>
          <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-500)] w-28">Margin</th>
          <th className="py-2 px-4 text-left font-bold">Transactions</th>
        </tr>
      </thead>
      <tbody className="font-roboto">
        {[...reports].reverse().map((r, idx) => {
          const margin = r.totalSales > 0 ? (r.totalProfit / r.totalSales) * 100 : 0;
          return (
            <tr
              key={r.id}
              className="border-t border-[var(--color-bg-100)] hover:bg-[var(--color-bg-50)] transition-colors"
            >
              <td className="text-sm py-2 px-4 text-[var(--color-text-400)] border-r border-[var(--color-bg-200)] font-mono">
                {reports.length - idx}
              </td>
              <td className="text-sm py-2 px-4 text-[var(--color-text-700)] border-r border-[var(--color-bg-200)] whitespace-nowrap">
                {new Date(r.date).toLocaleDateString("en-PH", { dateStyle: "medium" })}
              </td>
              <td className="text-sm py-2 px-4 font-semibold text-blue-600 border-r border-[var(--color-bg-200)]">
                {formatCurrency(r.totalSales)}
              </td>
              <td className={`text-sm py-2 px-4 font-semibold border-r border-[var(--color-bg-200)] ${r.totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                {formatCurrency(r.totalProfit)}
              </td>
              <td className="text-sm py-2 px-4 border-r border-[var(--color-bg-200)]">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  margin >= 20 ? "bg-green-100 text-green-700"
                  : margin >= 0  ? "bg-blue-100 text-blue-700"
                  : "bg-red-100 text-red-600"
                }`}>
                  {margin.toFixed(1)}%
                </span>
              </td>
              <td className="text-sm py-2 px-4 text-[var(--color-text-700)]">
                {r.totalTransactions}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const CashierSalesReport = () => {
  // [STATES] Core data
  const [reports, setReports] = useState<SalesReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // [STATES] Filters
  const [period, setPeriod]     = useState<PeriodOption>("daily");
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo]     = useState(today);

  const token   = () => localStorage.getItem("token");
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  // * [FETCH] Fetch daily reports
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      const from = dateFrom || "2025-01-01";
      const to   = dateTo   || new Date().toISOString().split("T")[0];

      params.append("from", from);
      params.append("to",   to);

      const res = await fetch(`${apiBase}/api/reports/sales/daily?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });

      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to fetch sales reports");

      setReports(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [apiBase, dateFrom, dateTo]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // [DERIVED] Grouped chart data based on selected period
  const chartData = groupByPeriod(reports, period).map((r) => ({
    label:        formatDateLabel(r.date, period),
    Sales:        r.totalSales,
    Profit:       r.totalProfit,
    Loss:         r.totalProfit < 0 ? Math.abs(r.totalProfit) : 0,
    Transactions: r.totalTransactions,
    date:         r.date,
  }));

  // [DERIVED] Summary stats from raw daily data
  const stats = computeStats(reports);

  // [DERIVED] Profit vs Loss split for pie chart
  const profitableDays   = reports.filter((r) => r.totalProfit >= 0).length;
  const lossDays         = reports.filter((r) => r.totalProfit < 0).length;
  const totalGrossProfit = reports.filter((r) => r.totalProfit >= 0).reduce((s, r) => s + r.totalProfit, 0);
  const totalGrossLoss   = reports.filter((r) => r.totalProfit < 0).reduce((s, r) => s + Math.abs(r.totalProfit), 0);

  const pieData = [
    { name: "Profit Days", value: profitableDays },
    { name: "Loss Days",   value: lossDays        },
  ].filter((d) => d.value > 0);

  // [DERIVED] Top 5 best sales days
  const top5Days = [...reports]
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);

  return (
    <div className="py-10 px-4 space-y-6">

      {/* [SECTION] Header */}
      <div className="flex flex-col items-center">
        <h1 className="font-bold text-2xl">Sales Report</h1>
        <p className="text-sm font-roboto text-[var(--color-text-500)] mt-1">
          Overview of your sales, profit, and transaction trends
        </p>
      </div>

      {/* [SECTION] Date Range & Period Filter */}
      <div className="flex flex-wrap items-end gap-3">

        {/* [INPUT] Date From */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-roboto text-[var(--color-text-600)] uppercase tracking-wider">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-[var(--color-bg-50)] font-roboto rounded-sm py-2 px-3 border border-[var(--color-bg-300)] outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] text-sm"
          />
        </div>

        {/* [INPUT] Date To */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-roboto text-[var(--color-text-600)] uppercase tracking-wider">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-[var(--color-bg-50)] font-roboto rounded-sm py-2 px-3 border border-[var(--color-bg-300)] outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] text-sm"
          />
        </div>

        {/* [BUTTON] Clear dates */}
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="py-2 px-3 rounded-sm border border-[var(--color-bg-300)] text-sm font-roboto text-[var(--color-text-600)] hover:bg-[var(--color-bg-200)] transition-colors"
          >
            Clear
          </button>
        )}

        {/* [UI] Spacer */}
        <div className="flex-1" />

        {/* [SECTION] Period pills */}
        <div className="flex items-center gap-1">
          {(Object.keys(PERIOD_LABELS) as PeriodOption[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-sm text-xs font-roboto font-medium transition-colors border ${
                period === p
                  ? "bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]"
                  : "bg-[var(--color-bg-50)] text-[var(--color-text-700)] border-[var(--color-bg-300)] hover:bg-[var(--color-bg-200)]"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* [SECTION] Loading / Error / Empty states */}
      {loading && <p className="text-center font-roboto text-[var(--color-text-500)] py-10">Loading reports...</p>}
      {error   && <p className="text-center font-roboto text-red-500 py-10">{error}</p>}

      {!loading && !error && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-2 text-center">
          <img src="/no-data-icon.svg" alt="No data" className="size-16" />
          <p className="font-roboto font-semibold text-lg text-[var(--color-text-800)]">No report data found</p>
          <p className="font-roboto text-sm text-[var(--color-text-500)]">
            Try adjusting the date range or complete some transactions first.
          </p>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <>
          {/* [SECTION] Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Total Sales"
              value={formatCurrency(stats.totalSales)}
              color="text-blue-600"
            />
            <StatCard
              label="Total Profit"
              value={formatCurrency(stats.totalProfit)}
              color={stats.totalProfit >= 0 ? "text-green-600" : "text-red-500"}
              sub={stats.totalProfit < 0 ? "Net loss" : "Net gain"}
            />
            <StatCard
              label="Profit Margin"
              value={`${stats.profitMargin.toFixed(1)}%`}
              color={stats.profitMargin >= 0 ? "text-green-600" : "text-red-500"}
            />
            <StatCard
              label="Transactions"
              value={stats.totalTransactions.toLocaleString()}
              color="text-amber-600"
            />
            <StatCard
              label="Avg Sales / Day"
              value={formatCurrency(stats.avgSalesPerDay)}
              color="text-[var(--color-primary-600)]"
            />
            <StatCard
              label="Days Reported"
              value={reports.length.toString()}
              sub={`${profitableDays} profitable · ${lossDays} loss`}
            />
          </div>

          {/* [SECTION] Sales & Profit Line Chart */}
          <div className="bg-white border border-[var(--color-bg-200)] rounded-lg p-4 shadow-sm">
            <h2 className="font-bold font-figtree text-[var(--color-text-900)] mb-4">
              Sales & Profit Trend
              <span className="ml-2 text-xs font-roboto font-normal text-[var(--color-text-400)]">
                ({PERIOD_LABELS[period]})
              </span>
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bg-200)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontFamily: "Roboto, sans-serif", fill: "var(--color-text-500)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatShortCurrency}
                  tick={{ fontSize: 11, fontFamily: "Roboto, sans-serif", fill: "var(--color-text-500)" }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Roboto, sans-serif" }} />
                <Line
                  type="monotone"
                  dataKey="Sales"
                  stroke={CHART_COLORS.sales}
                  strokeWidth={2}
                  dot={chartData.length <= 30}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Profit"
                  stroke={CHART_COLORS.profit}
                  strokeWidth={2}
                  dot={chartData.length <= 30}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* [SECTION] Bar Chart + Pie Chart row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* [CHART] Transactions Bar Chart */}
            <div className="lg:col-span-2 bg-white border border-[var(--color-bg-200)] rounded-lg p-4 shadow-sm">
              <h2 className="font-bold font-figtree text-[var(--color-text-900)] mb-4">
                Transaction Volume
                <span className="ml-2 text-xs font-roboto font-normal text-[var(--color-text-400)]">
                  ({PERIOD_LABELS[period]})
                </span>
              </h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bg-200)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fontFamily: "Roboto, sans-serif", fill: "var(--color-text-500)" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fontFamily: "Roboto, sans-serif", fill: "var(--color-text-500)" }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="Transactions"
                    fill={CHART_COLORS.transactions}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* [CHART] Profit vs Loss Pie Chart */}
            <div className="bg-white border border-[var(--color-bg-200)] rounded-lg p-4 shadow-sm flex flex-col">
              <h2 className="font-bold font-figtree text-[var(--color-text-900)] mb-4">
                Profitable vs Loss Days
              </h2>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? CHART_COLORS.profit : CHART_COLORS.loss}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} days`, name]}
                      contentStyle={{ fontSize: 12, fontFamily: "Roboto, sans-serif" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Roboto, sans-serif" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* [UI] Gross totals below pie */}
              <div className="mt-2 space-y-1 border-t border-[var(--color-bg-200)] pt-3">
                <div className="flex justify-between text-xs font-roboto">
                  <span className="text-green-600 font-medium">Gross Profit</span>
                  <span className="font-semibold text-[var(--color-text-800)]">{formatCurrency(totalGrossProfit)}</span>
                </div>
                <div className="flex justify-between text-xs font-roboto">
                  <span className="text-red-500 font-medium">Gross Loss</span>
                  <span className="font-semibold text-[var(--color-text-800)]">{formatCurrency(totalGrossLoss)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* [SECTION] Sales Breakdown Bar Chart (Sales vs Profit stacked) */}
          <div className="bg-white border border-[var(--color-bg-200)] rounded-lg p-4 shadow-sm">
            <h2 className="font-bold font-figtree text-[var(--color-text-900)] mb-4">
              Sales vs Profit Breakdown
              <span className="ml-2 text-xs font-roboto font-normal text-[var(--color-text-400)]">
                ({PERIOD_LABELS[period]})
              </span>
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bg-200)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontFamily: "Roboto, sans-serif", fill: "var(--color-text-500)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatShortCurrency}
                  tick={{ fontSize: 11, fontFamily: "Roboto, sans-serif", fill: "var(--color-text-500)" }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Roboto, sans-serif" }} />
                <Bar
                  dataKey="Sales"
                  fill={CHART_COLORS.sales}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="Profit"
                  fill={CHART_COLORS.profit}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* [SECTION] Bottom row: Best/Worst Day cards + Top 5 table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* [UI] Best & Worst day cards */}
            <div className="space-y-3">
              {/* [UI] Best day */}
              {stats.bestDay && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs font-roboto font-semibold text-green-700 uppercase tracking-wider mb-1">
                    Best Sales Day
                  </p>
                  <p className="font-bold font-figtree text-green-800 text-lg">
                    {formatCurrency(stats.bestDay.totalSales)}
                  </p>
                  <p className="text-xs font-roboto text-green-600 mt-0.5">
                    {new Date(stats.bestDay.date).toLocaleDateString("en-PH", { dateStyle: "long" })}
                  </p>
                  <div className="mt-2 flex gap-4 text-xs font-roboto text-green-700">
                    <span>Profit: {formatCurrency(stats.bestDay.totalProfit)}</span>
                    <span>Txns: {stats.bestDay.totalTransactions}</span>
                  </div>
                </div>
              )}

              {/* [UI] Worst day */}
              {stats.worstDay && stats.worstDay.id !== stats.bestDay?.id && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-xs font-roboto font-semibold text-red-700 uppercase tracking-wider mb-1">
                    📉 Lowest Sales Day
                  </p>
                  <p className="font-bold font-figtree text-red-800 text-lg">
                    {formatCurrency(stats.worstDay.totalSales)}
                  </p>
                  <p className="text-xs font-roboto text-red-500 mt-0.5">
                    {new Date(stats.worstDay.date).toLocaleDateString("en-PH", { dateStyle: "long" })}
                  </p>
                  <div className="mt-2 flex gap-4 text-xs font-roboto text-red-600">
                    <span>Profit: {formatCurrency(stats.worstDay.totalProfit)}</span>
                    <span>Txns: {stats.worstDay.totalTransactions}</span>
                  </div>
                </div>
              )}
            </div>

            {/* [SECTION] Top 5 Best Sales Days */}
            <div className="lg:col-span-2 bg-white border border-[var(--color-bg-200)] rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-bg-200)]">
                <h2 className="font-bold font-figtree text-[var(--color-text-900)]">Top 5 Best Sales Days</h2>
              </div>

              {/* [MOBILE] Card layout */}
              <div className="sm:hidden space-y-4 p-4">
                {top5Days.map((r, idx) => (
                  <Top5DayCard key={r.id} report={r} rank={idx + 1} />
                ))}
              </div>

              {/* [DESKTOP] Table layout */}
              <div className="hidden sm:block">
                <Top5DaysTable top5Days={top5Days} />
              </div>
            </div>
          </div>

          {/* [SECTION] Full Report Data */}
          <div className="bg-white border border-[var(--color-bg-200)] rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-bg-200)] flex items-center justify-between">
              <h2 className="font-bold font-figtree text-[var(--color-text-900)]">
                Full Report Data
                <span className="ml-2 text-xs font-roboto font-normal text-[var(--color-text-400)]">
                  {reports.length} entries
                </span>
              </h2>
            </div>

            {/* [MOBILE] Card layout */}
            <div className="sm:hidden space-y-4 p-4">
              {[...reports].reverse().map((r, idx) => (
                <ReportRowCard key={r.id} report={r} index={idx} total={reports.length} />
              ))}
            </div>

            {/* [DESKTOP] Table layout */}
            <div className="hidden sm:block">
              <ReportTable reports={reports} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CashierSalesReport;