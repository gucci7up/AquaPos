import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, YAxis } from 'recharts';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';
import { databases, Query } from '@/lib/appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_INVENTORY_ID = import.meta.env.VITE_APPWRITE_COLLECTION_INVENTORY_ID;
const COLLECTION_SALES_ID = import.meta.env.VITE_APPWRITE_COLLECTION_SALES_ID; // Potential next collection

const allTransactions = [
  { id: '#AQ-92831', name: 'Alejandro Morales', initials: 'AM', amount: 1240.55, status: 'Completed', date: 'Today, 14:22' },
  { id: '#AQ-92830', name: 'Lucia Gomez', initials: 'LG', amount: 85.20, status: 'Pending', date: 'Today, 13:45' },
  { id: '#AQ-92829', name: 'Roberto Hernandez', initials: 'RH', amount: 342.11, status: 'Shipped', date: 'Today, 11:20' },
  { id: '#AQ-92828', name: 'Elena Suarez', initials: 'ES', amount: 2100.00, status: 'Completed', date: 'Yesterday, 17:50' },
  { id: '#AQ-92827', name: 'Carlos Ruiz', initials: 'CR', amount: 120.00, status: 'Completed', date: 'Yesterday, 16:30' },
  { id: '#AQ-92826', name: 'Maria Lopez', initials: 'ML', amount: 450.50, status: 'Pending', date: 'Yesterday, 14:15' },
];

// Mock Overdue Data (This would ideally come from Customers context)
const overduePayments = 2;

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'current' | 'last'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState({ lowStockCount: 0 });
  const [notifications, setNotifications] = useState(0);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    if (!DATABASE_ID) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 1. Fetch Low Stock from Inventory
      if (COLLECTION_INVENTORY_ID) {
        try {
          const lowStockResponse = await databases.listDocuments(DATABASE_ID, COLLECTION_INVENTORY_ID, [
            Query.lessThan('stock', 10),
            Query.limit(1)
          ]);
          setInventoryStats({ lowStockCount: lowStockResponse.total });
        } catch (invErr) {
          console.warn('Could not fetch stock alerts (attribute "stock" might be missing):', invErr);
          setInventoryStats({ lowStockCount: 0 });
        }
      }

      // 2. Fetch Recent Transactions
      if (COLLECTION_SALES_ID) {
        try {
          const salesResponse = await databases.listDocuments(DATABASE_ID, COLLECTION_SALES_ID, [
            Query.orderDesc('$createdAt'),
            Query.limit(10)
          ]);
          setTransactions(salesResponse.documents);
        } catch (salesErr) {
          console.warn('Could not fetch sales:', salesErr);
          setTransactions(allTransactions);
        }
      } else {
        // Fallback mock data if sales collection not yet defined
        setTransactions(allTransactions);
      }

    } catch (error) {
      console.error('General Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Chart Data with translations
  const chartData = useMemo(() => {
    const rawData = period === 'current' ? [
      { name: 'Mon', value: 2400, prev: 2000 },
      { name: 'Tue', value: 1398, prev: 2200 },
      { name: 'Wed', value: 9800, prev: 2300 },
      { name: 'Thu', value: 3908, prev: 2800 },
      { name: 'Fri', value: 4800, prev: 3100 },
      { name: 'Sat', value: 3800, prev: 2500 },
      { name: 'Sun', value: 4300, prev: 3100 },
    ] : [
      { name: 'Mon', value: 2000, prev: 1800 },
      { name: 'Tue', value: 2200, prev: 1900 },
      { name: 'Wed', value: 2300, prev: 2100 },
      { name: 'Thu', value: 2800, prev: 2400 },
      { name: 'Fri', value: 3100, prev: 2800 },
      { name: 'Sat', value: 2500, prev: 2200 },
      { name: 'Sun', value: 3100, prev: 2900 },
    ];

    return rawData.map(d => ({
      ...d,
      name: t(`common.days.${d.name}`) // Translate day name
    }));
  }, [period, t]);

  const stats = period === 'current' ? {
    sales: "$128,430.00", salesTrend: "+12.5%", salesUp: true,
    profit: "$42,150.55", profitTrend: "+8.2%", profitUp: true,
    stock: "14 Items", stockStatus: "Priority", stockColor: "amber"
  } : {
    sales: "$110,200.00", salesTrend: "-5.4%", salesUp: false,
    profit: "$38,900.00", profitTrend: "-2.1%", profitUp: false,
    stock: "8 Items", stockStatus: "Stable", stockColor: "slate"
  };

  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    const lowerQuery = searchQuery.toLowerCase();
    return transactions.filter(t =>
      (t.name || '').toLowerCase().includes(lowerQuery) ||
      (t.$id || t.id || '').toLowerCase().includes(lowerQuery) ||
      (t.status || '').toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, transactions]);

  const togglePeriod = () => {
    setPeriod(prev => prev === 'current' ? 'last' : 'current');
  };

  const clearNotifications = () => {
    setNotifications(0);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400 outline-none"
              placeholder={t('dashboard.searchPlaceholder')}
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={clearNotifications}
            className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined">notifications</span>
            {notifications > 0 && (
              <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
            )}
          </button>
          <div className="h-8 w-[1px] bg-slate-200 flex-shrink-0"></div>
          <UserMenu />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.welcomeTitle')}</h2>
            <p className="text-slate-500">{t('dashboard.welcomeSubtitle')} {period === 'current' ? t('dashboard.today') : t('dashboard.lastWeek')}.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={togglePeriod}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">calendar_today</span>
              {t('dashboard.dateRange')}
            </button>
            <button
              onClick={() => navigate('/pos')}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 transition-all flex items-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              {t('dashboard.newOrder')}
            </button>
          </div>
        </div>

        {/* Alerts Section (New) */}
        {overduePayments > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                <span className="material-symbols-outlined">notification_important</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{t('dashboard.overdueAlert')}</h4>
                <p className="text-xs text-red-600">{overduePayments} {t('dashboard.overdueDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/customers')}
              className="px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50"
            >
              {t('dashboard.viewCustomers')}
            </button>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard title={t('dashboard.totalSales')} value={stats.sales} icon="payments" trend={stats.salesTrend} trendUp={stats.salesUp} color="primary" />
          <KPICard title={t('dashboard.netProfit')} value={stats.profit} icon="account_balance_wallet" trend={stats.profitTrend} trendUp={stats.profitUp} color="blue" />
          <KPICard title={t('dashboard.lowStock')} value={`${inventoryStats.lowStockCount} Items`} icon="warning" tag={inventoryStats.lowStockCount > 0 ? "Priority" : "Stable"} tagColor={inventoryStats.lowStockCount > 0 ? "amber" : "slate"} color="amber" />
          <KPICard title={t('dashboard.activeQuotes')} value="28 Open" icon="description" tag="Stable" tagColor="slate" color="purple" />
        </div>

        {/* Charts & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{t('dashboard.revenueTrends')}</h4>
                <p className="text-sm text-slate-500">{t('dashboard.revenueSubtitle')}</p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className={`size-2 rounded-full ${period === 'current' ? 'bg-primary' : 'bg-slate-200'}`}></span> {t('dashboard.today')}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className={`size-2 rounded-full ${period === 'last' ? 'bg-primary' : 'bg-slate-200'}`}></span> {t('dashboard.lastWeek')}
                </span>
              </div>
            </div>
            <div className="h-64 w-full min-h-[256px]">
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#13daec" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#13daec" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    formatter={(value: any) => [`$${value}`, 'Revenue']}
                  />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} prefix="$" />
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#13daec"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    animationDuration={1000}
                  />
                  <Area
                    type="monotone"
                    dataKey="prev"
                    stroke="#e2e8f0"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    fill="none"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights Widget */}
          <div className="bg-gradient-to-br from-primary to-cyan-600 p-1 rounded-xl shadow-lg shadow-primary/10">
            <div className="bg-white h-full w-full rounded-[0.6rem] p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">auto_awesome</span>
                </div>
                <h4 className="font-bold text-slate-900">{t('dashboard.aiInsights')}</h4>
              </div>
              <div className="space-y-6 flex-1">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm font-semibold text-slate-800 mb-1">{t('dashboard.inventoryWarning')}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    "Organic Coffee Beans" sales increased by 22% this week. Current stock will only last 3 more days.
                  </p>
                  <button
                    onClick={() => navigate('/inventory')}
                    className="mt-3 text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    {t('dashboard.restock')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-sm font-semibold text-slate-800 mb-1">{t('dashboard.peakHours')}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Fridays 2 PM - 5 PM are your busiest. Consider adding a staff member to the POS.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/ai')}
                className="mt-6 w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                {t('dashboard.viewReport')}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-900">{t('dashboard.recentTx')}</h4>
              <p className="text-sm text-slate-500">Real-time update of store activity</p>
            </div>
            <button
              onClick={() => navigate('/sales')}
              className="text-sm font-bold text-primary hover:underline"
            >
              {t('dashboard.viewAll')}
            </button>
          </div>
          <div className="overflow-x-visible"> {/* overflow-x-visible needed for dropdown to not be clipped, or standard overflow-auto if enough height */}
            {filteredTransactions.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      id={tx.id}
                      name={tx.name}
                      initials={tx.initials}
                      amount={`$${tx.amount.toFixed(2)}`}
                      status={t(`common.status.${tx.status}`)}
                      rawStatus={tx.status}
                      date={tx.date}
                      isMenuOpen={activeMenuId === tx.id}
                      onToggleMenu={() => setActiveMenuId(activeMenuId === tx.id ? null : tx.id)}
                      labels={{
                        view: t('dashboard.actions.viewDetails'),
                        print: t('dashboard.actions.printReceipt'),
                        email: t('dashboard.actions.sendEmail'),
                        refund: t('dashboard.actions.refund')
                      }}
                      onNavigate={() => navigate('/sales')}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">search_off</span>
                <p>No transactions found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const KPICard = ({ title, value, icon, trend, trendUp, tag, tagColor, color }: any) => {
  const colorClasses: any = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    slate: 'bg-slate-50 text-slate-500'
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.primary}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {trend && (
          <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${trendUp ? 'text-emerald-500 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
            <span className="material-symbols-outlined text-[14px]">{trendUp ? 'trending_up' : 'trending_down'}</span>
            {trend}
          </span>
        )}
        {tag && (
          <span className={`px-2 py-1 rounded text-xs font-bold ${tagColor === 'amber' ? 'text-amber-500 bg-amber-50' : 'text-slate-500 bg-slate-50'}`}>
            {tag}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
  );
};

const TransactionRow = ({ id, name, initials, amount, status, rawStatus, date, isMenuOpen, onToggleMenu, labels, onNavigate }: any) => {
  const statusStyles: any = {
    Completed: 'bg-primary/10 text-primary',
    Pending: 'bg-amber-50 text-amber-600',
    Shipped: 'bg-blue-50 text-blue-600',
  };
  const statusColor = rawStatus === 'Completed' ? 'primary' : rawStatus === 'Pending' ? 'amber-500' : 'blue-500';

  return (
    <tr className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={onNavigate}>
      <td className="px-6 py-4 text-sm font-bold text-slate-700">{id}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 uppercase">{initials}</div>
          <span className="text-sm font-medium text-slate-900">{name}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm font-bold text-slate-900">{amount}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusStyles[rawStatus]}`}>
          <span className={`size-1.5 rounded-full bg-${statusColor}`}></span> {status}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-slate-500">{date}</td>
      <td className="px-6 py-4 text-right relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu();
          }}
          className={`p-1.5 rounded-lg transition-colors ${isMenuOpen ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
        >
          <span className="material-symbols-outlined">more_vert</span>
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-8 top-8 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="py-1">
              <button onClick={() => alert('View Details clicked')} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-slate-400">visibility</span>
                {labels.view}
              </button>
              <button onClick={() => alert('Print Receipt clicked')} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-slate-400">print</span>
                {labels.print}
              </button>
              <button onClick={() => alert('Email Receipt clicked')} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-slate-400">mail</span>
                {labels.email}
              </button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button onClick={() => alert('Refund clicked')} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">undo</span>
                {labels.refund}
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
};
