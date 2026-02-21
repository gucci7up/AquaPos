import React, { useState, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';

// Mock Transaction Data
const allTransactions = [
  { id: '#TR-55095', name: 'Mariana Castro', initials: 'MC', method: 'Cash', methodIcon: 'payments', amount: 452.10, date: 'Nov 01, 2024 • 16:45', timestamp: 1730479500000, color: 'slate' },
  { id: '#TR-55094', name: 'Jorge Rodriguez', initials: 'JR', method: 'Stripe', methodIcon: 'credit_card', amount: 1200.00, date: 'Nov 01, 2024 • 15:20', timestamp: 1730474400000, color: 'blue' },
  { id: '#TR-55093', name: 'Ana Valenzuela', initials: 'AV', method: 'QR Pay', methodIcon: 'qr_code_2', amount: 88.45, date: 'Nov 01, 2024 • 14:12', timestamp: 1730470320000, color: 'purple' },
  { id: '#TR-55092', name: 'Guest #4812', initials: 'GH', method: 'Cash', methodIcon: 'payments', amount: 12.50, date: 'Nov 01, 2024 • 13:58', timestamp: 1730469480000, color: 'slate' },
  { id: '#TR-55091', name: 'Carlos Ruiz', initials: 'CR', method: 'Card', methodIcon: 'credit_card', amount: 320.00, date: 'Oct 31, 2024 • 18:30', timestamp: 1730400600000, color: 'blue' },
  { id: '#TR-55090', name: 'Sofia Lopez', initials: 'SL', method: 'Cash', methodIcon: 'payments', amount: 65.00, date: 'Oct 31, 2024 • 11:15', timestamp: 1730374500000, color: 'slate' },
  { id: '#TR-55089', name: 'Hotel Grand Central', initials: 'HG', method: 'Transfer', methodIcon: 'account_balance', amount: 2450.00, date: 'Oct 30, 2024 • 09:45', timestamp: 1730281500000, color: 'purple' },
  { id: '#TR-55088', name: 'Luisa Fernanda', initials: 'LF', method: 'Card', methodIcon: 'credit_card', amount: 145.20, date: 'Oct 30, 2024 • 14:20', timestamp: 1730298000000, color: 'blue' },
];

export default function Sales() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'Today' | 'Week'>('Today');

  // Filter Logic
  const filteredData = useMemo(() => {
    let data = allTransactions;

    // Filter by Date (Mock logic using timestamp cutoff)
    const todayStart = 1730438400000; // Approx start of Nov 1st 2024 for demo
    if (dateRange === 'Today') {
      data = data.filter(t => t.timestamp >= todayStart);
    }

    // Filter by Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      data = data.filter(t => 
        t.name.toLowerCase().includes(lowerQuery) || 
        t.id.toLowerCase().includes(lowerQuery)
      );
    }

    return data;
  }, [searchQuery, dateRange]);

  // Statistics Calculations
  const totalRevenue = filteredData.reduce((sum, t) => sum + t.amount, 0);
  const transactionCount = filteredData.length;
  const averageOrderValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

  // Goals Configuration
  const salesGoal = dateRange === 'Today' ? 5000 : 25000; // Dynamic goal based on period
  const goalProgress = Math.min((totalRevenue / salesGoal) * 100, 100);

  const handleExport = () => {
    const headers = ['Transaction ID,Customer,Method,Amount,Date'];
    const csvContent = filteredData.map(t => `${t.id},"${t.name}",${t.method},${t.amount},"${t.date}"`).join('\n');
    const blob = new Blob([headers + '\n' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_report_${dateRange.toLowerCase()}_${Date.now()}.csv`;
    link.click();
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400 outline-none" 
              placeholder={t('sales.searchPlaceholder')}
              type="text" 
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-2">
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t('sales.title')}</h2>
            <p className="text-slate-500">{t('sales.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t('sales.dateRange')}</span>
              <button 
                onClick={() => setDateRange(prev => prev === 'Today' ? 'Week' : 'Today')}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 min-w-[180px]"
              >
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                {dateRange === 'Today' ? t('sales.today') : t('sales.last7Days')}
              </button>
            </div>
            <div className="flex flex-col gap-1.5 self-end">
              <button 
                onClick={handleExport}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">file_download</span>
                {t('sales.export')}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('sales.table.id')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('sales.table.customer')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">{t('sales.table.method')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('sales.table.total')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('sales.table.date')}</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map(tx => (
                      <SalesRow 
                        key={tx.id}
                        id={tx.id} 
                        name={tx.name} 
                        initials={tx.initials} 
                        method={tx.method} 
                        methodIcon={tx.methodIcon} 
                        amount={`$${tx.amount.toFixed(2)}`} 
                        time={tx.date}
                        color={tx.color}
                      />
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">search_off</span>
                          <p>No transactions found matching filters</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('sales.avgOrder')}</h4>
                  <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span> +3.2%
                  </span>
                </div>
                <div className="flex items-end gap-3">
                  <h3 className="text-3xl font-bold text-slate-900">${averageOrderValue.toFixed(2)}</h3>
                  <p className="text-xs text-slate-500 mb-1.5">based on {transactionCount} orders</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('sales.volume')}</h4>
                  <span className="text-slate-500 text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">receipt_long</span>
                  </span>
                </div>
                <div className="flex items-end gap-3">
                  <h3 className="text-3xl font-bold text-slate-900">{transactionCount}</h3>
                  <p className="text-xs text-slate-500 mb-1.5">completed transactions</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">{dateRange === 'Today' ? t('sales.salesGoal') : t('sales.salesGoal')}</h4>
              <div className="relative pt-1">
                <div className="flex mb-4 items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold inline-block py-1 px-2 uppercase rounded-full ${goalProgress >= 100 ? 'text-emerald-600 bg-emerald-100' : 'text-primary bg-primary/10'}`}>
                      {goalProgress >= 100 ? t('sales.goalMet') : t('sales.onTrack')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold inline-block text-slate-700">{goalProgress.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-100">
                  <div className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${goalProgress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${goalProgress}%` }}></div>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">${totalRevenue.toFixed(2)} earned</span>
                  <span className="text-slate-400">Goal: ${salesGoal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary to-cyan-600 p-0.5 rounded-xl shadow-lg shadow-primary/10">
              <div className="bg-white h-full w-full rounded-[0.6rem] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{t('sales.aiAnalysis')}</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Predicting a 15% surge in <span className="text-slate-900 font-bold">Beverage</span> sales this weekend based on historical event data in your area.
                </p>
                <button className="text-[10px] font-bold text-primary hover:underline">Get Prep List →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const SalesRow = ({ id, name, initials, method, methodIcon, amount, time, color = 'slate' }: any) => {
    const badgeColors: any = {
        slate: 'bg-slate-100 text-slate-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600'
    };
    
    return (
        <tr className="hover:bg-slate-50 transition-colors">
            <td className="px-6 py-4 text-sm font-bold text-slate-700">{id}</td>
            <td className="px-6 py-4">
            <div className="flex items-center gap-3">
                <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${color === 'blue' ? 'bg-blue-100 text-blue-600' : color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-primary/10 text-primary'}`}>{initials}</div>
                <span className="text-sm font-medium text-slate-900">{name}</span>
            </div>
            </td>
            <td className="px-6 py-4 text-center">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${badgeColors[color]}`}>
                <span className="material-symbols-outlined text-sm">{methodIcon}</span> {method}
            </span>
            </td>
            <td className="px-6 py-4 text-sm font-bold text-slate-900">{amount}</td>
            <td className="px-6 py-4 text-sm text-slate-500">{time}</td>
            <td className="px-6 py-4 text-right">
            <button className="material-symbols-outlined text-slate-400 hover:text-slate-600">visibility</button>
            </td>
        </tr>
    );
}