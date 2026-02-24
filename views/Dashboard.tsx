import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';
import { databases, Query } from '@/lib/appwrite';

// ── Appwrite config ──────────────────────────────────────────────────────────
const DB = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COL_INV = import.meta.env.VITE_APPWRITE_COLLECTION_INVENTORY_ID || 'inventory';
const COL_SAL = import.meta.env.VITE_APPWRITE_COLLECTION_SALES_ID || 'sales';
const COL_CUS = import.meta.env.VITE_APPWRITE_COLLECTION_CUSTOMERS_ID || 'customers';
const COL_QUO = import.meta.env.VITE_APPWRITE_COLLECTION_QUOTES_ID || 'quotes';
const COL_PAY = import.meta.env.VITE_APPWRITE_COLLECTION_PAYMENTS_ID || 'payments';

// ── Helpers ──────────────────────────────────────────────────────────────────
const safeNum = (v: any) => Number(v) || 0;
const fmt = (n: number) =>
  n.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Fetch all pages from a collection (up to a safe ceiling) */
async function fetchAll(collectionId: string, queries: string[] = []) {
  const PAGE = 100;
  const all: any[] = [];
  let offset = 0;
  try {
    while (true) {
      const res = await databases.listDocuments(DB, collectionId, [
        ...queries,
        Query.limit(PAGE),
        Query.offset(offset),
      ]);
      all.push(...res.documents);
      if (res.documents.length < PAGE) break;
      offset += PAGE;
      if (offset >= 500) break; // safety ceiling
    }
  } catch { /* silent */ }
  return all;
}

// ── Day/Month labels ─────────────────────────────────────────────────────────
const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t, language } = useLanguage();
  const isEs = language === 'es';
  const navigate = useNavigate();

  // ── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearch] = useState('');
  const [activeMenu, setMenu] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');
  const [mounted, setMounted] = useState(false);

  // Raw data
  const [sales, setSales] = useState<any[]>([]);
  const [inventory, setInv] = useState<any[]>([]);
  const [customers, setCus] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [payments, setPay] = useState<any[]>([]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!DB) { setLoading(false); return; }
    setLoading(true);
    try {
      const [sal, inv, cus, quo, pay] = await Promise.allSettled([
        fetchAll(COL_SAL, [Query.orderDesc('$createdAt')]),
        fetchAll(COL_INV),
        fetchAll(COL_CUS),
        fetchAll(COL_QUO),
        fetchAll(COL_PAY, [Query.orderDesc('$createdAt')]),
      ]);
      setSales(sal.status === 'fulfilled' ? sal.value : []);
      setInv(inv.status === 'fulfilled' ? inv.value : []);
      setCus(cus.status === 'fulfilled' ? cus.value : []);
      setQuotes(quo.status === 'fulfilled' ? quo.value : []);
      setPay(pay.status === 'fulfilled' ? pay.value : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    setMounted(true);
  }, [load]);

  // ── Computed KPIs ────────────────────────────────────────────────────────
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const kpi = useMemo(() => {
    const salesMonth = sales.filter(s => {
      const d = new Date(s.date || s.$createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const totalRevenue = salesMonth.reduce((a, s) => a + safeNum(s.total), 0);
    const allRevenue = sales.reduce((a, s) => a + safeNum(s.total), 0);
    const totalAbonos = payments.filter(p => {
      const d = new Date(p.date || p.$createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((a, p) => a + safeNum(p.amount), 0);

    // Low stock: items with stock < 10
    const lowStock = inventory.filter(i => safeNum(i.stock) < 10 && i.stock !== undefined);

    // Open quotes
    const openQuotes = quotes.filter(q => q.status === 'open' || q.status === 'pending' || !q.status);

    // Customers with credit
    const creditBalance = customers.reduce((a, c) => a + safeNum(c.creditBalance || c.credit_balance), 0);

    // Estimated margin 35% (until cost tracking)
    const buildCostMap = () => {
      const map: Record<string, number> = {};
      inventory.forEach(p => { map[p.$id] = safeNum(p.cost); });
      return map;
    };
    const costMap = buildCostMap();
    const totalCOGS = salesMonth.reduce((acc, s) => {
      let items: any[] = [];
      try { items = typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []); } catch { }
      return acc + items.reduce((st: number, item: any) =>
        st + (safeNum(costMap[item.id] || item.cost) * safeNum(item.quantity || item.qty || 1)), 0);
    }, 0);
    const grossProfit = totalRevenue - (totalCOGS > 0 ? totalCOGS : totalRevenue * 0.35);

    return {
      revenue: totalRevenue,
      allRevenue,
      profit: grossProfit,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.slice(0, 3),
      openQuotes: openQuotes.length,
      txCount: salesMonth.length,
      creditBalance,
      totalAbonos,
    };
  }, [sales, inventory, customers, quotes, payments, thisMonth, thisYear]);

  // ── Chart Data ───────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const dayLabels = isEs ? DAYS_ES : DAYS_EN;
    const dataMap: Record<string, { revenue: number; prev: number }> = {};
    DAY_KEYS.forEach(d => { dataMap[d] = { revenue: 0, prev: 0 }; });

    // Current week
    sales.forEach(tx => {
      const d = new Date(tx.date || tx.$createdAt);
      const dayKey = DAY_KEYS[(d.getDay() + 6) % 7];
      if (dayKey in dataMap) {
        dataMap[dayKey].revenue += safeNum(tx.total);
      }
    });

    return DAY_KEYS.map((d, i) => ({
      name: dayLabels[i],
      revenue: dataMap[d].revenue,
      prev: dataMap[d].prev,
    }));
  }, [sales, isEs]);

  // ── Recent Sales ─────────────────────────────────────────────────────────
  const recentSales = useMemo(() => {
    const filtered = searchQuery
      ? sales.filter(tx => {
        const q = searchQuery.toLowerCase();
        return (
          (tx.$id || '').toLowerCase().includes(q) ||
          (tx.customerName || tx.name || '').toLowerCase().includes(q) ||
          (tx.status || '').toLowerCase().includes(q)
        );
      })
      : sales;
    return filtered.slice(0, 10);
  }, [sales, searchQuery]);

  // ── AI Insights ──────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list: { icon: string; color: string; text: string }[] = [];

    if (kpi.lowStockCount > 0) {
      list.push({
        icon: 'warning',
        color: 'amber',
        text: isEs
          ? `${kpi.lowStockCount} producto(s) con stock bajo. ${kpi.lowStockItems.map(i => i.name).join(', ')}.`
          : `${kpi.lowStockCount} product(s) running low. ${kpi.lowStockItems.map((i: any) => i.name).join(', ')}.`,
      });
    }

    if (kpi.openQuotes > 0) {
      list.push({
        icon: 'description',
        color: 'blue',
        text: isEs
          ? `Tienes ${kpi.openQuotes} cotización(es) pendientes de aprobación.`
          : `You have ${kpi.openQuotes} quote(s) awaiting approval.`,
      });
    }

    if (kpi.creditBalance > 0) {
      list.push({
        icon: 'account_balance_wallet',
        color: 'purple',
        text: isEs
          ? `Cuentas por cobrar: RD$${fmt(kpi.creditBalance)} en crédito pendiente.`
          : `Accounts receivable: $${fmt(kpi.creditBalance)} in pending credit.`,
      });
    }

    if (kpi.revenue > 0 && kpi.totalAbonos > 0) {
      list.push({
        icon: 'payments',
        color: 'emerald',
        text: isEs
          ? `Se recibieron RD$${fmt(kpi.totalAbonos)} en abonos este mes.`
          : `$${fmt(kpi.totalAbonos)} collected in payments this month.`,
      });
    }

    if (list.length === 0) {
      list.push({
        icon: 'auto_awesome',
        color: 'slate',
        text: isEs
          ? 'Realiza más ventas para generar insights inteligentes.'
          : 'Record more sales to generate smart business insights.',
      });
    }

    return list;
  }, [kpi, isEs]);

  // ── Close menu on outside click ───────────────────────────────────────────
  useEffect(() => {
    if (!activeMenu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [activeMenu]);

  const statusColor = (status: string) => {
    if (!status) return 'bg-slate-100 text-slate-600';
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'paid' || s === 'pagado') return 'bg-emerald-100 text-emerald-700';
    if (s === 'pending' || s === 'pendiente') return 'bg-amber-100 text-amber-700';
    if (s === 'credit' || s === 'credito' || s === 'crédito') return 'bg-purple-100 text-purple-700';
    if (s === 'cancelled' || s === 'cancelado') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-5xl text-primary animate-spin">sync</span>
          <p className="text-slate-500 font-medium">
            {isEs ? 'Cargando dashboard…' : 'Loading dashboard…'}
          </p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header ── */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              value={searchQuery}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400 outline-none"
              placeholder={isEs ? 'Buscar ventas, productos o clientes…' : 'Search sales, products or clients…'}
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={load}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            title={isEs ? 'Actualizar' : 'Refresh'}
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
          <div className="h-8 w-[1px] bg-slate-200" />
          <UserMenu />
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">

        {/* Welcome row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {t('dashboard.welcomeTitle') || (isEs ? 'Resumen del Negocio' : 'Business Overview')}
            </h2>
            <p className="text-slate-500">
              {isEs ? 'Bienvenido, esto es lo que pasa hoy.' : "Welcome back — here's what's happening today."}
            </p>
          </div>
          <button
            onClick={() => navigate('/pos')}
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 transition-all flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            {isEs ? '+ Nueva Orden' : '+ New Order'}
          </button>
        </div>

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KPICard
            icon="payments"
            color="primary"
            label={isEs ? 'Ventas del Mes' : 'Monthly Sales'}
            value={`${isEs ? 'RD$' : '$'}${fmt(kpi.revenue)}`}
            sub={isEs ? `${kpi.txCount} transacciones` : `${kpi.txCount} transactions`}
            trend={kpi.revenue > 0 ? '+' : ''}
            trendUp={kpi.revenue > 0}
          />
          <KPICard
            icon="trending_up"
            color="emerald"
            label={isEs ? 'Ganancia Estimada' : 'Estimated Profit'}
            value={`${isEs ? 'RD$' : '$'}${fmt(Math.max(kpi.profit, 0))}`}
            sub={kpi.revenue > 0 ? `${(Math.max(kpi.profit, 0) / kpi.revenue * 100).toFixed(1)}% ${isEs ? 'margen' : 'margin'}` : '—'}
            trend={kpi.profit > 0 ? '+' : ''}
            trendUp={kpi.profit > 0}
          />
          <KPICard
            icon="warning"
            color="amber"
            label={isEs ? 'Stock Bajo' : 'Low Stock'}
            value={`${kpi.lowStockCount} ${isEs ? 'Items' : 'Items'}`}
            sub={kpi.lowStockCount > 0 ? (isEs ? 'Requiere atención' : 'Needs attention') : (isEs ? 'Inventario estable' : 'Inventory stable')}
            tag={kpi.lowStockCount > 0 ? 'Priority' : 'Stable'}
            tagColor={kpi.lowStockCount > 0 ? 'amber' : 'emerald'}
          />
          <KPICard
            icon="description"
            color="blue"
            label={isEs ? 'Cotizaciones Abiertas' : 'Open Quotes'}
            value={`${kpi.openQuotes} ${isEs ? 'Abiertas' : 'Open'}`}
            sub={isEs ? 'Pendientes de aprobar' : 'Awaiting approval'}
            tag="Stable"
            tagColor="slate"
          />
        </div>

        {/* ── Chart + Insights ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Area chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  {t('dashboard.revenueTrends') || (isEs ? 'Tendencia de Ingresos' : 'Revenue Trends')}
                </h4>
                <p className="text-sm text-slate-500">
                  {isEs ? 'Rendimiento semanal' : 'Weekly performance'}
                </p>
              </div>
              <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setChartPeriod('week')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${chartPeriod === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {isEs ? 'Semana' : 'Week'}
                </button>
                <button
                  onClick={() => setChartPeriod('month')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${chartPeriod === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {isEs ? 'Mes' : 'Month'}
                </button>
              </div>
            </div>

            {mounted && (
              <ResponsiveContainer width="100%" height={256}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#13daec" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#13daec" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={v => `$${fmt(Number(v))}`}
                    domain={[0, (dataMax: number) => Math.max(isFinite(dataMax) ? dataMax * 1.25 : 0, 100)]}
                    allowDataOverflow={false}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: '700' }}
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    formatter={(value: any) => [`${isEs ? 'RD$' : '$'}${fmt(Number(value))}`, isEs ? 'Ingresos' : 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#13daec"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#gradRevenue)"
                    animationDuration={800}
                    dot={false}
                    activeDot={{ r: 5, fill: '#13daec', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* AquaAI Insights panel */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-sm p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
              <h4 className="text-white font-bold text-sm tracking-wide">
                {isEs ? 'Insights AquaAI' : 'AquaAI Insights'}
              </h4>
            </div>

            <div className="flex-1 space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                  <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${ins.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                      ins.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                        ins.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                          ins.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-slate-600 text-slate-400'
                    }`}>
                    <span className="material-symbols-outlined text-sm">{ins.icon}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{ins.text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/ai')}
              className="mt-5 w-full py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:brightness-105 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">smart_toy</span>
              {isEs ? 'Abrir AquaAI' : 'Open AquaAI'}
            </button>
          </div>
        </div>

        {/* ── Quick Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            label={isEs ? 'Total Histórico' : 'All-Time Revenue'}
            value={`${isEs ? 'RD$' : '$'}${fmt(kpi.allRevenue)}`}
            icon="bar_chart"
            color="primary"
          />
          <StatCard
            label={isEs ? 'Cuentas por Cobrar' : 'Accounts Receivable'}
            value={`${isEs ? 'RD$' : '$'}${fmt(kpi.creditBalance)}`}
            icon="account_balance"
            color="purple"
          />
          <StatCard
            label={isEs ? 'Abonos del Mes' : 'Monthly Collections'}
            value={`${isEs ? 'RD$' : '$'}${fmt(kpi.totalAbonos)}`}
            icon="payments"
            color="emerald"
          />
        </div>

        {/* ── Recent Transactions ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {isEs ? 'Transacciones Recientes' : 'Recent Transactions'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEs ? 'Últimas ventas registradas en el sistema' : 'Latest sales recorded in the system'}
              </p>
            </div>
            <button
              onClick={() => navigate('/sales')}
              className="text-sm font-bold text-primary hover:underline"
            >
              {isEs ? 'Ver Todo' : 'View All'}
            </button>
          </div>

          {recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {isEs ? 'Cliente' : 'Customer'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {isEs ? 'Total' : 'Amount'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {isEs ? 'Fecha' : 'Date'}
                    </th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map(tx => {
                    const id = tx.$id || '—';
                    const name = tx.customerName || tx.name || tx.client || (isEs ? 'Cliente' : 'Walk-in');
                    const initials = name.split(' ').map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2) || '??';
                    const amount = safeNum(tx.total ?? tx.amount);
                    const status = tx.status || 'completed';
                    const rawDate = tx.date || tx.$createdAt;
                    const dateStr = rawDate ? new Date(rawDate).toLocaleDateString(isEs ? 'es-DO' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                    const shortId = id.length > 8 ? `#${id.slice(0, 8)}` : `#${id}`;

                    return (
                      <tr key={id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-bold text-slate-500">{shortId}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <span className="text-sm font-semibold text-slate-800 truncate max-w-[140px]">{name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-slate-900">
                            {isEs ? 'RD$' : '$'}{amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusColor(status)}`}>
                            {t(`common.status.${status}`) || status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{dateStr}</td>
                        <td className="px-6 py-4">
                          <div className="relative" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setMenu(activeMenu === id ? null : id)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">more_vert</span>
                            </button>
                            {activeMenu === id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 w-44 z-50 py-1">
                                <button
                                  onClick={() => { navigate('/sales'); setMenu(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">visibility</span>
                                  {isEs ? 'Ver detalles' : 'View details'}
                                </button>
                                <button
                                  onClick={() => { navigate('/sales'); setMenu(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">print</span>
                                  {isEs ? 'Imprimir recibo' : 'Print receipt'}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">receipt_long</span>
              <p className="text-slate-500 font-medium">
                {searchQuery
                  ? (isEs ? `Sin resultados para "${searchQuery}"` : `No results for "${searchQuery}"`)
                  : (isEs ? 'No hay ventas registradas aún.' : 'No sales recorded yet.')}
              </p>
              <button
                onClick={() => navigate('/pos')}
                className="mt-4 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:brightness-105"
              >
                {isEs ? 'Ir al Punto de Venta' : 'Go to POS'}
              </button>
            </div>
          )}
        </div>

        {/* ── Bottom Quick Actions ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: 'inventory_2', label: isEs ? 'Inventario' : 'Inventory', path: '/inventory', color: 'bg-blue-50 text-blue-600' },
            { icon: 'people', label: isEs ? 'Clientes' : 'Customers', path: '/customers', color: 'bg-purple-50 text-purple-600' },
            { icon: 'description', label: isEs ? 'Cotizaciones' : 'Quotes', path: '/quotes', color: 'bg-amber-50 text-amber-600' },
            { icon: 'bar_chart', label: isEs ? 'Finanzas' : 'Finance', path: '/finance', color: 'bg-emerald-50 text-emerald-600' },
          ].map(q => (
            <button
              key={q.path}
              onClick={() => navigate(q.path)}
              className="flex flex-col items-center gap-2 p-5 bg-white rounded-xl border border-slate-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className={`size-12 rounded-xl flex items-center justify-center ${q.color} group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined">{q.icon}</span>
              </div>
              <span className="text-sm font-bold text-slate-700">{q.label}</span>
            </button>
          ))}
        </div>

      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({ icon, color, label, value, sub, trend, trendUp, tag, tagColor }: any) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    slate: 'bg-slate-100 text-slate-500',
  };
  const tagColorMap: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`size-11 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.slate}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {tag ? (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${tagColorMap[tagColor] || tagColorMap.slate}`}>{tag}</span>
        ) : trend ? (
          <span className={`text-xs font-bold flex items-center gap-0.5 ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
            <span className="material-symbols-outlined text-sm">{trendUp ? 'trending_up' : 'trending_down'}</span>
            {trend}
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary',
    emerald: 'text-emerald-600',
    purple: 'text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`size-11 rounded-xl bg-slate-50 flex items-center justify-center ${colorMap[color] || 'text-slate-500'}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
