import React, { useState, useEffect, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';
import { databases, Query } from '@/lib/appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_SALES_ID = import.meta.env.VITE_APPWRITE_COLLECTION_SALES_ID || 'sales';
const COLLECTION_INVENTORY_ID = import.meta.env.VITE_APPWRITE_COLLECTION_INVENTORY_ID || 'inventory';
const COLLECTION_PAYMENTS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_PAYMENTS_ID || 'payments';
const COLLECTION_CUSTOMERS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CUSTOMERS_ID || 'customers';

// Month labels per language
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });


// ─── Component ───────────────────────────────────────────────────────────────
export default function Finance() {
    const { t, language } = useLanguage();

    const MONTH_LABELS = language === 'en' ? MONTHS_EN : MONTHS_ES;

    // ── raw data ──────────────────────────────────────────────────────────────
    const [sales, setSales] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [period, setPeriod] = useState<'month' | 'year'>('month');

    // ── data fetching ─────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            if (!DATABASE_ID) { setLoading(false); return; }
            setLoading(true);
            try {
                const [sRes, iRes, pRes, cRes] = await Promise.all([
                    databases.listDocuments(DATABASE_ID, COLLECTION_SALES_ID, [Query.orderDesc('$createdAt'), Query.limit(500)]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_INVENTORY_ID, [Query.limit(500)]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS_ID, [Query.orderDesc('$createdAt'), Query.limit(500)]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_CUSTOMERS_ID, [Query.limit(500)]),
                ]);
                setSales(sRes.documents);
                setInventory(iRes.documents);
                setPayments(pRes.documents);
                setCustomers(cRes.documents);
            } catch (err) {
                console.error('Finance data error:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // ── KPI calculations ──────────────────────────────────────────────────────
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            const d = new Date(s.date || s.$createdAt);
            if (period === 'month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            return d.getFullYear() === currentYear;
        });
    }, [sales, period, currentMonth, currentYear]);

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const d = new Date(p.date || p.$createdAt);
            if (period === 'month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            return d.getFullYear() === currentYear;
        });
    }, [payments, period, currentMonth, currentYear]);

    const totalRevenue = useMemo(() => filteredSales.reduce((s, d) => s + (d.total || 0), 0), [filteredSales]);
    const totalAbonos = useMemo(() => filteredPayments.reduce((s, d) => s + (d.amount || 0), 0), [filteredPayments]);
    const creditBalance = useMemo(() => customers.reduce((s, c) => s + (c.credit || 0), 0), [customers]);

    // COGS: sum of (costPrice * quantity) for each sale item
    const totalCOGS = useMemo(() => {
        // Build a cost map from inventory
        const costMap: Record<string, number> = {};
        inventory.forEach(p => { costMap[p.$id] = parseFloat(p.cost) || 0; });

        return filteredSales.reduce((total, sale) => {
            let items: any[] = [];
            try { items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []); } catch { items = []; }
            return total + items.reduce((st: number, item: any) => {
                const cost = costMap[item.id] || 0;
                return st + cost * (item.quantity || 1);
            }, 0);
        }, 0);
    }, [filteredSales, inventory]);

    const grossProfit = totalRevenue - totalCOGS;
    // Net Profit = Gross Profit (no expenses collection yet, show note)
    const netProfit = grossProfit;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // ── Inventory Valuation ───────────────────────────────────────────────────
    const inventoryVal = useMemo(() => {
        return inventory.reduce((acc, p) => {
            const stock = parseInt(p.stock) || 0;
            const cost = parseFloat(p.cost) || 0;
            const price = parseFloat(p.price) || 0;
            acc.cost += cost * stock;
            acc.retail += price * stock;
            return acc;
        }, { cost: 0, retail: 0 });
    }, [inventory]);

    // ── Monthly chart ─────────────────────────────────────────────────────────
    const chartData = useMemo(() => {
        const months = period === 'year' ? 12 : 1;
        return Array.from({ length: months }, (_, i) => {
            const monthIdx = period === 'year' ? i : currentMonth;
            const label = MONTH_LABELS[monthIdx];

            const revMonth = sales
                .filter(s => { const d = new Date(s.date || s.$createdAt); return d.getMonth() === monthIdx && d.getFullYear() === currentYear; })
                .reduce((s, d) => s + (d.total || 0), 0);

            const costMap2: Record<string, number> = {};
            inventory.forEach(p => { costMap2[p.$id] = p.cost || 0; });
            const cogsMonth = sales
                .filter(s => { const d = new Date(s.date || s.$createdAt); return d.getMonth() === monthIdx && d.getFullYear() === currentYear; })
                .reduce((tot, sale) => {
                    let items: any[] = [];
                    try { items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []); } catch { items = []; }
                    return tot + items.reduce((st: number, item: any) => st + (costMap2[item.id] || 0) * (item.quantity || 1), 0);
                }, 0);

            const abonosMonth = payments
                .filter(p => { const d = new Date(p.date || p.$createdAt); return d.getMonth() === monthIdx && d.getFullYear() === currentYear; })
                .reduce((s, d) => s + (d.amount || 0), 0);

            return {
                month: label || `M${i + 1}`,
                revenue: Number(revMonth) || 0,
                cogs: Number(cogsMonth) || 0,
                ganancia: Number(revMonth - cogsMonth) || 0,
                abonos: Number(abonosMonth) || 0,
            };
        });
    }, [sales, inventory, payments, period, currentMonth, currentYear, MONTH_LABELS]);

    // ── Product margin table ──────────────────────────────────────────────────
    const productMargins = useMemo(() => {
        return inventory.map(p => {
            const cost = parseFloat(p.cost) || 0;
            const price = parseFloat(p.price) || 0;
            const margin = price - cost;
            const marginPct = price > 0 ? (margin / price) * 100 : 0;
            const roi = cost > 0 ? (margin / cost) * 100 : 0;
            return { id: p.$id, name: p.name, category: p.category || '—', cost, price, margin, marginPct, roi, stock: parseInt(p.stock) || 0 };
        }).sort((a, b) => b.marginPct - a.marginPct);
    }, [inventory]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-lg font-bold text-slate-900">{t('finance.title')}</h2>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setPeriod('month')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${period === 'month' ? 'bg-white text-primary shadow' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('finance.period.month')}
                        </button>
                        <button
                            onClick={() => setPeriod('year')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${period === 'year' ? 'bg-white text-primary shadow' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('finance.period.year')}
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3 pl-2">
                    <UserMenu />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        {/* ── KPI Cards ──────────────────────────────────────────────── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                            <KpiCard
                                icon="payments" color="emerald"
                                title={t('finance.kpi.revenue')}
                                value={`$${fmt(totalRevenue)}`}
                                sub={`${filteredSales.length} ${t('finance.kpi.sales')}`}
                            />
                            <KpiCard
                                icon="shopping_cart" color="amber"
                                title={t('finance.kpi.cogs')}
                                value={`$${fmt(totalCOGS)}`}
                                sub={totalRevenue > 0 ? `${((totalCOGS / totalRevenue) * 100).toFixed(1)}% ${t('finance.kpi.ofRevenue')}` : '—'}
                            />
                            <KpiCard
                                icon="account_balance" color="blue"
                                title={t('finance.kpi.grossProfit')}
                                value={`$${fmt(grossProfit)}`}
                                sub={`${t('finance.kpi.margin')} ${grossMargin.toFixed(1)}%`}
                                positive={grossProfit >= 0}
                            />
                            <KpiCard
                                icon="trending_up" color="violet"
                                title={t('finance.kpi.netProfit')}
                                value={`$${fmt(netProfit)}`}
                                sub={t('finance.kpi.netProfitSub')}
                                positive={netProfit >= 0}
                            />
                            <KpiCard
                                icon="inventory" color="slate"
                                title={t('finance.kpi.inventoryValue')}
                                value={`$${fmt(inventoryVal.cost)}`}
                                sub={`${t('finance.kpi.retail')}: $${fmt(inventoryVal.retail)}`}
                            />
                            <KpiCard
                                icon="credit_card_off" color="red"
                                title={t('finance.kpi.pendingCredit')}
                                value={`$${fmt(creditBalance)}`}
                                sub={`${customers.filter(c => c.credit > 0).length} ${t('finance.kpi.customersWithDebt')}`}
                                positive={creditBalance === 0}
                            />
                            <KpiCard
                                icon="price_check" color="teal"
                                title={t('finance.kpi.abonos')}
                                value={`$${fmt(totalAbonos)}`}
                                sub={`${filteredPayments.length} ${t('finance.kpi.payments')}`}
                                positive={true}
                            />
                            <KpiCard
                                icon="savings" color="purple"
                                title={t('finance.kpi.inventoryPotential')}
                                value={`$${fmt(inventoryVal.retail - inventoryVal.cost)}`}
                                sub={t('finance.kpi.inventoryPotentialSub')}
                                positive={true}
                            />
                        </div>

                        {/* ── Charts Row ─────────────────────────────────────────────── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Profitability Area Chart */}
                            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{t('finance.charts.revenueVsCost')}</h3>
                                        <p className="text-sm text-slate-500">{t('finance.charts.revenueVsCostSub', { period: period === 'month' ? t('finance.period.month') : t('finance.period.year') })}</p>
                                    </div>
                                </div>
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height={288}>
                                        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="gCogs" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="gGan" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                domain={[0, (dataMax: number) => Math.max(isFinite(dataMax) ? dataMax * 1.2 : 0, 100)]}
                                                allowDataOverflow={false}
                                            />
                                            <CartesianGrid vertical={false} stroke="#f1f5f9" />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend />
                                            <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#gRev)" strokeWidth={2.5} name={t('finance.kpi.revenue')} />
                                            <Area type="monotone" dataKey="cogs" stroke="#f59e0b" fill="url(#gCogs)" strokeWidth={2.5} name={t('finance.kpi.cogs')} />
                                            <Area type="monotone" dataKey="ganancia" stroke="#6366f1" fill="url(#gGan)" strokeWidth={2.5} name={t('finance.pnl.grossProfit')} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Mini P&L + Inventory Card */}
                            <div className="space-y-5">

                                {/* P&L Summary */}
                                <div className="bg-slate-900 rounded-xl shadow-xl p-6 text-white">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t('finance.pnl.title')}</h3>
                                    <div className="space-y-3 text-sm">
                                        <PnLRow label={t('finance.kpi.revenue')} value={totalRevenue} positive />
                                        <PnLRow label={`- ${t('finance.kpi.cogs')}`} value={-totalCOGS} />
                                        <div className="h-px bg-slate-700 my-2" />
                                        <PnLRow label={t('finance.pnl.grossProfit')} value={grossProfit} positive bold />
                                        <PnLRow label={`+ ${t('finance.kpi.abonos')}`} value={totalAbonos} positive />
                                        <PnLRow label={`- ${t('finance.kpi.pendingCredit')}`} value={-creditBalance} />
                                        <div className="h-px bg-slate-700 my-2" />
                                        <PnLRow label={t('finance.pnl.netIncome')} value={netProfit} positive={netProfit >= 0} bold large />
                                    </div>
                                </div>

                                {/* Inventory Value */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-lg">inventory</span>
                                        {t('finance.inventoryValuation.title')}
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">{t('finance.inventoryValuation.atCost')}</span>
                                            <span className="font-bold text-slate-800">${fmt(inventoryVal.cost)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">{t('finance.inventoryValuation.atRetail')}</span>
                                            <span className="font-bold text-primary">${fmt(inventoryVal.retail)}</span>
                                        </div>
                                        <div className="h-px bg-slate-100 my-1" />
                                        <div className="flex justify-between text-sm font-bold">
                                            <span className="text-slate-500">{t('finance.inventoryValuation.potentialProfit')}</span>
                                            <span className="text-emerald-600">+${fmt(inventoryVal.retail - inventoryVal.cost)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Abonos Bar Chart */}
                        {period === 'year' && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-1">{t('finance.charts.abonos')}</h3>
                                <p className="text-sm text-slate-500 mb-6">{t('finance.charts.abonosSub')}</p>
                                <div className="h-56 w-full">
                                    <ResponsiveContainer width="100%" height={224}>
                                        <BarChart data={chartData}>
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                domain={[0, (dataMax: number) => Math.max(isFinite(dataMax) ? dataMax * 1.2 : 0, 100)]}
                                                allowDataOverflow={false}
                                            />
                                            <CartesianGrid vertical={false} stroke="#f1f5f9" />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="abonos" fill="#10b981" radius={[6, 6, 0, 0]} name={t('finance.kpi.abonos')} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Product Margin Table */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{t('finance.table.title')}</h3>
                                    <p className="text-sm text-slate-500">{t('finance.table.subtitle')}</p>
                                </div>
                                <span className="text-xs font-bold text-slate-400">{inventory.length} {t('finance.table.products')}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            {[t('finance.table.product'), t('finance.table.category'), t('inventory.table.cost'), t('inventory.table.price'), t('finance.table.margin'), t('finance.table.marginPercent'), t('finance.table.roi'), t('inventory.table.stock')].map(h => (
                                                <th key={h} className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right first:text-left">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {productMargins.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-10 text-center text-slate-400 text-sm">
                                                    {t('finance.table.noProducts')}
                                                </td>
                                            </tr>
                                        )}
                                        {productMargins.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-3 text-sm font-bold text-slate-900 max-w-[200px] truncate">{item.name}</td>
                                                <td className="px-5 py-3 text-right text-xs text-slate-500">{item.category}</td>
                                                <td className="px-5 py-3 text-right text-sm text-slate-600">${fmt(item.cost)}</td>
                                                <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">${fmt(item.price)}</td>
                                                <td className="px-5 py-3 text-right text-sm font-bold text-emerald-600">+${fmt(item.margin)}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${item.marginPct > 50 ? 'bg-emerald-100 text-emerald-700' :
                                                        item.marginPct > 20 ? 'bg-blue-100 text-blue-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>{item.marginPct.toFixed(1)}%</span>
                                                </td>
                                                <td className="px-5 py-3 text-right text-sm text-slate-500 font-medium">{item.roi.toFixed(0)}%</td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${item.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {item.stock}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </>
                )}
            </div>
        </>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
    emerald: 'text-emerald-600 bg-emerald-100',
    amber: 'text-amber-600   bg-amber-100',
    blue: 'text-blue-600    bg-blue-100',
    violet: 'text-violet-600  bg-violet-100',
    slate: 'text-slate-600   bg-slate-100',
    red: 'text-red-600     bg-red-100',
    teal: 'text-teal-600    bg-teal-100',
    purple: 'text-purple-600  bg-purple-100',
};

function KpiCard({ icon, color, title, value, sub, positive }: {
    icon: string; color: string; title: string; value: string; sub?: string; positive?: boolean;
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`size-10 rounded-lg flex items-center justify-center ${COLOR_MAP[color] || COLOR_MAP.slate}`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                {positive !== undefined && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        <span className="material-symbols-outlined text-xs align-middle">{positive ? 'arrow_upward' : 'arrow_downward'}</span>
                    </span>
                )}
            </div>
            <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-xl font-black text-slate-900">{value}</h3>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
    );
}

function PnLRow({ label, value, positive, bold, large }: {
    label: string; value: number; positive?: boolean; bold?: boolean; large?: boolean;
}) {
    const absVal = Math.abs(value);
    const sign = value < 0 ? '- ' : '';
    return (
        <div className={`flex justify-between ${bold ? 'font-bold' : ''} ${large ? 'text-base' : 'text-sm'}`}>
            <span className="text-slate-300">{label}</span>
            <span className={positive ?? (value >= 0) ? 'text-emerald-400' : 'text-red-400'}>
                {sign}${absVal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
            </span>
        </div>
    );
}
