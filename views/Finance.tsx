import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';

// Mock Financial Data
const monthlyData = [
  { month: 'Jan', revenue: 45000, cost: 22000, expense: 8000 },
  { month: 'Feb', revenue: 52000, cost: 26000, expense: 8500 },
  { month: 'Mar', revenue: 48000, cost: 24000, expense: 8200 },
  { month: 'Apr', revenue: 61000, cost: 30000, expense: 9000 },
  { month: 'May', revenue: 55000, cost: 27500, expense: 8800 },
  { month: 'Jun', revenue: 67000, cost: 32000, expense: 9500 },
  { month: 'Jul', revenue: 72000, cost: 34000, expense: 10000 },
];

const productMarginData = [
  { id: 1, name: 'Premium Cotton Tee', category: 'Apparel', cost: 4.50, price: 12.45, sold: 142 },
  { id: 2, name: 'Organic Coffee Beans', category: 'Grocery', cost: 3.20, price: 8.20, sold: 85 },
  { id: 3, name: 'Wireless Headphones', category: 'Electronics', cost: 22.00, price: 45.99, sold: 40 },
  { id: 4, name: 'Yoga Mat', category: 'Fitness', cost: 6.00, price: 15.00, sold: 65 },
  { id: 5, name: 'Ceramic Mug', category: 'Home', cost: 2.10, price: 5.50, sold: 120 },
  { id: 6, name: 'Protein Bar Box', category: 'Snacks', cost: 12.50, price: 24.00, sold: 30 },
];

const expenseBreakdown = [
  { name: 'Rent', value: 3500, color: '#6366f1' },
  { name: 'Payroll', value: 4500, color: '#10b981' },
  { name: 'Utilities', value: 1200, color: '#f59e0b' },
  { name: 'Marketing', value: 800, color: '#ec4899' },
];

export default function Finance() {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState('YTD');

  // Calculations
  const totalRevenue = useMemo(() => monthlyData.reduce((acc, curr) => acc + curr.revenue, 0), []);
  const totalCost = useMemo(() => monthlyData.reduce((acc, curr) => acc + curr.cost, 0), []);
  const totalExpenses = useMemo(() => monthlyData.reduce((acc, curr) => acc + curr.expense, 0), []);
  const grossProfit = totalRevenue - totalCost;
  const netProfit = grossProfit - totalExpenses;
  
  // Inventory Valuation (Mock based on product data)
  const inventoryValuation = useMemo(() => {
    let costVal = 0;
    let retailVal = 0;
    // Assuming some stock level logic for the demo math
    productMarginData.forEach(p => {
        const mockStock = Math.floor(Math.random() * 100) + 20;
        costVal += p.cost * mockStock;
        retailVal += p.price * mockStock;
    });
    return { costVal, retailVal };
  }, []);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-lg font-bold text-slate-900">{t('finance.title')}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-2">
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
        
        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FinancialCard 
                title={t('finance.kpi.revenue')} 
                value={`$${totalRevenue.toLocaleString()}`} 
                sub={`+12% vs last year`} 
                color="blue" 
                icon="payments"
            />
            <FinancialCard 
                title={t('finance.kpi.cogs')} 
                value={`$${totalCost.toLocaleString()}`} 
                sub={`${((totalCost/totalRevenue)*100).toFixed(1)}% of Revenue`} 
                color="amber" 
                icon="shopping_cart"
            />
             <FinancialCard 
                title={t('finance.kpi.expenses')} 
                value={`$${totalExpenses.toLocaleString()}`} 
                sub={`Fixed & Variable`} 
                color="slate" 
                icon="receipt_long"
            />
            <FinancialCard 
                title={t('finance.kpi.netProfit')} 
                value={`$${netProfit.toLocaleString()}`} 
                sub={`${((netProfit/totalRevenue)*100).toFixed(1)}% Net Margin`} 
                color="emerald" 
                icon="account_balance_wallet"
                isPositive={true}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Profitability Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{t('finance.charts.revenueVsCost')}</h3>
                        <p className="text-sm text-slate-500">Monthly breakdown of income vs direct costs</p>
                    </div>
                    <select className="bg-slate-50 border border-slate-200 text-sm rounded-lg p-2 font-bold text-slate-600 outline-none">
                        <option>Year to Date</option>
                        <option>Last 12 Months</option>
                    </select>
                </div>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <CartesianGrid vertical={false} stroke="#f1f5f9" />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} name="Revenue" />
                            <Area type="monotone" dataKey="cost" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCost)" strokeWidth={3} name="Cost" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* P&L Summary & Inventory Value */}
            <div className="space-y-6">
                
                {/* Inventory Valuation Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <span className="material-symbols-outlined text-6xl text-primary">inventory</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-6">{t('finance.inventoryValuation.title')}</h3>
                    
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('finance.inventoryValuation.atCost')}</p>
                            <p className="text-2xl font-black text-slate-800">${inventoryValuation.costVal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        </div>
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{t('finance.inventoryValuation.atRetail')}</p>
                            <p className="text-2xl font-black text-primary">${inventoryValuation.retailVal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                             <span className="text-sm font-medium text-slate-500">{t('finance.inventoryValuation.potentialProfit')}</span>
                             <span className="text-sm font-bold text-emerald-600">+${(inventoryValuation.retailVal - inventoryValuation.costVal).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Mini P&L */}
                 <div className="bg-slate-900 rounded-xl shadow-lg p-6 text-white">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">{t('finance.pnl.title')}</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-300">{t('finance.kpi.revenue')}</span>
                            <span className="font-bold">${totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-300">{t('finance.kpi.cogs')}</span>
                            <span className="text-red-300">- ${totalCost.toLocaleString()}</span>
                        </div>
                        <div className="h-px bg-slate-700 my-1"></div>
                        <div className="flex justify-between font-bold">
                            <span className="text-slate-100">{t('finance.pnl.grossProfit')}</span>
                            <span className="text-emerald-400">${grossProfit.toLocaleString()}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-slate-300">{t('finance.kpi.expenses')}</span>
                            <span className="text-red-300">- ${totalExpenses.toLocaleString()}</span>
                        </div>
                         <div className="h-px bg-slate-700 my-1"></div>
                         <div className="flex justify-between font-black text-lg">
                            <span className="text-white">{t('finance.pnl.netIncome')}</span>
                            <span className="text-primary">${netProfit.toLocaleString()}</span>
                        </div>
                    </div>
                 </div>
            </div>
        </div>

        {/* Cost vs Price Analysis Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                     <h3 className="text-lg font-bold text-slate-900">{t('finance.table.title')}</h3>
                     <p className="text-sm text-slate-500">Margin breakdown per unit</p>
                </div>
                <button className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
                    <span className="material-symbols-outlined text-sm">download</span> Export
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('finance.table.product')}</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t('finance.table.unitCost')}</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t('finance.table.unitPrice')}</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t('finance.table.margin')}</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t('finance.table.marginPercent')}</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t('finance.table.roi')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {productMarginData.map((item) => {
                            const margin = item.price - item.cost;
                            const marginPercent = (margin / item.price) * 100;
                            const roi = ((item.price - item.cost) / item.cost) * 100;

                            return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                                        <p className="text-xs text-slate-500">{item.category}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                                        ${item.cost.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                                        ${item.price.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                        +${margin.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${marginPercent > 50 ? 'bg-emerald-100 text-emerald-700' : marginPercent > 20 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {marginPercent.toFixed(1)}%
                                        </span>
                                    </td>
                                     <td className="px-6 py-4 text-right font-bold text-slate-500 text-sm">
                                        {roi.toFixed(0)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </>
  );
}

const FinancialCard = ({ title, value, sub, color, icon, isPositive }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-100',
        amber: 'text-amber-600 bg-amber-100',
        emerald: 'text-emerald-600 bg-emerald-100',
        slate: 'text-slate-600 bg-slate-100'
    };
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`size-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                {isPositive && (
                    <span className="flex items-center text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                        <span className="material-symbols-outlined text-sm">trending_up</span> 8.4%
                    </span>
                )}
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-2xl font-black text-slate-900">{value}</h3>
            <p className="text-xs text-slate-400 mt-2 font-medium">{sub}</p>
        </div>
    );
};
