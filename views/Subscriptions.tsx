import React, { useState, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';

// Mock Data for Subscriptions
const initialSubscriptions = [
  { id: 'SUB-1001', customer: 'Cafeteria La Luna', plan: 'Professional', price: 29.00, cycle: 'Monthly', status: 'Active', nextBilling: '2024-11-24', paymentMethod: 'Visa •••• 4242' },
  { id: 'SUB-1002', customer: 'Rancho Soltero', plan: 'Enterprise', price: 79.00, cycle: 'Monthly', status: 'Active', nextBilling: '2024-11-20', paymentMethod: 'Mastercard •••• 8821' },
  { id: 'SUB-1003', customer: 'Boutique Bella', plan: 'Entrepreneur', price: 0.00, cycle: 'Monthly', status: 'Active', nextBilling: '2024-12-01', paymentMethod: 'N/A' },
  { id: 'SUB-1004', customer: 'Tech Store MX', plan: 'Professional', price: 24.00, cycle: 'Yearly', status: 'Past Due', nextBilling: '2024-10-30', paymentMethod: 'Visa •••• 1102' },
  { id: 'SUB-1005', customer: 'Gym Fitness Pro', plan: 'Growth', price: 49.00, cycle: 'Monthly', status: 'Canceled', nextBilling: '-', paymentMethod: 'Amex •••• 0005' },
];

const availablePlans = ['Entrepreneur', 'Professional', 'Growth', 'Enterprise'];

export default function Subscriptions() {
  const { t } = useLanguage();
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [formData, setFormData] = useState({ plan: '', cycle: 'Monthly', status: '' });

  // Metrics
  const metrics = useMemo(() => {
      const active = subscriptions.filter(s => s.status === 'Active');
      const mrr = active.reduce((acc, curr) => acc + (curr.cycle === 'Monthly' ? curr.price : curr.price / 12), 0);
      return {
          total: subscriptions.length,
          active: active.length,
          mrr: mrr,
          churn: subscriptions.filter(s => s.status === 'Canceled').length
      };
  }, [subscriptions]);

  // Filtering
  const filteredSubs = useMemo(() => {
      return subscriptions.filter(sub => {
          const matchesSearch = sub.customer.toLowerCase().includes(searchQuery.toLowerCase()) || sub.id.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStatus = filterStatus === 'All' || sub.status === filterStatus;
          return matchesSearch && matchesStatus;
      });
  }, [subscriptions, searchQuery, filterStatus]);

  // Handlers
  const handleEditClick = (sub: any) => {
      setEditingSub(sub);
      setFormData({ plan: sub.plan, cycle: sub.cycle, status: sub.status });
      setIsModalOpen(true);
  };

  const handleSave = () => {
      if (!editingSub) return;
      
      setSubscriptions(prev => prev.map(s => {
          if (s.id === editingSub.id) {
              // Mock price update logic based on plan change
              let newPrice = s.price;
              if (formData.plan !== s.plan) {
                  switch(formData.plan) {
                      case 'Entrepreneur': newPrice = 0; break;
                      case 'Professional': newPrice = 29; break;
                      case 'Growth': newPrice = 49; break;
                      case 'Enterprise': newPrice = 99; break;
                  }
                  if (formData.cycle === 'Yearly') newPrice = newPrice * 0.8; // Discount
              }

              return { ...s, ...formData, price: newPrice };
          }
          return s;
      }));
      setIsModalOpen(false);
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
          case 'Past Due': return 'bg-red-100 text-red-700 border-red-200';
          case 'Canceled': return 'bg-slate-100 text-slate-500 border-slate-200';
          default: return 'bg-gray-100 text-gray-600';
      }
  };

  return (
    <div className="flex flex-col h-full bg-background-light">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1">
            <h2 className="text-lg font-bold text-slate-900">{t('subscriptions.title')}</h2>
        </div>
        <div className="flex items-center gap-4">
          <UserMenu />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard title="MRR (Monthly Revenue)" value={`$${metrics.mrr.toFixed(2)}`} icon="payments" color="emerald" />
              <MetricCard title="Active Subscribers" value={metrics.active} icon="people" color="blue" />
              <MetricCard title="Total Accounts" value={metrics.total} icon="dns" color="slate" />
              <MetricCard title="Churn Rate" value={`${((metrics.churn / metrics.total) * 100 || 0).toFixed(1)}%`} icon="trending_down" color="red" />
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="relative w-full max-w-sm">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary"
                    placeholder={t('subscriptions.searchPlaceholder')}
                />
              </div>
              <div className="flex gap-2">
                  {['All', 'Active', 'Past Due', 'Canceled'].map(status => (
                      <button 
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === status ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                          {status}
                      </button>
                  ))}
              </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('subscriptions.customer')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('subscriptions.plan')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('subscriptions.amount')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('subscriptions.status')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('subscriptions.billing')}</th>
                          <th className="px-6 py-4 text-right"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredSubs.map(sub => (
                          <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                  <p className="font-bold text-slate-900 text-sm">{sub.customer}</p>
                                  <p className="text-xs text-slate-400 font-mono">{sub.id}</p>
                              </td>
                              <td className="px-6 py-4">
                                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold uppercase">{sub.plan}</span>
                              </td>
                              <td className="px-6 py-4">
                                  <p className="font-bold text-slate-900 text-sm">${sub.price.toFixed(2)} <span className="text-slate-400 font-normal text-xs">/ {sub.cycle === 'Monthly' ? 'mo' : 'yr'}</span></p>
                                  <p className="text-[10px] text-slate-400">{sub.paymentMethod}</p>
                              </td>
                              <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(sub.status)}`}>
                                      {sub.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                  {sub.nextBilling}
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button onClick={() => handleEditClick(sub)} className="text-slate-400 hover:text-primary transition-colors">
                                      <span className="material-symbols-outlined">edit_document</span>
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-xl font-black text-slate-900">{t('subscriptions.manageSub')}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                          <p className="text-xs font-bold text-slate-400 uppercase">Customer</p>
                          <p className="text-lg font-bold text-slate-900">{editingSub?.customer}</p>
                      </div>
                      
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">{t('subscriptions.plan')}</label>
                          <select 
                              className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-primary"
                              value={formData.plan}
                              onChange={(e) => setFormData({...formData, plan: e.target.value})}
                          >
                              {availablePlans.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">{t('subscriptions.cycle')}</label>
                              <select 
                                  className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-primary"
                                  value={formData.cycle}
                                  onChange={(e) => setFormData({...formData, cycle: e.target.value})}
                              >
                                  <option value="Monthly">Monthly</option>
                                  <option value="Yearly">Yearly</option>
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">{t('subscriptions.status')}</label>
                              <select 
                                  className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-primary"
                                  value={formData.status}
                                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                              >
                                  <option value="Active">Active</option>
                                  <option value="Past Due">Past Due</option>
                                  <option value="Canceled">Canceled</option>
                              </select>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-bold rounded-lg hover:bg-slate-50">
                          {t('settings.cancel')}
                      </button>
                      <button onClick={handleSave} className="px-6 py-2 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:brightness-105">
                          {t('settings.save')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

const MetricCard = ({ title, value, icon, color }: any) => {
    const colors: any = {
        emerald: 'bg-emerald-100 text-emerald-600',
        blue: 'bg-blue-100 text-blue-600',
        red: 'bg-red-100 text-red-600',
        slate: 'bg-slate-100 text-slate-600',
    };
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`size-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <div>
                <p className="text-sm text-slate-500">{title}</p>
                <p className="text-2xl font-black text-slate-900">{value}</p>
            </div>
        </div>
    );
};
