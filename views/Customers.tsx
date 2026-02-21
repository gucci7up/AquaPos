import React, { useState, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';

// Mock Data
const initialCustomers = [
  { 
    id: 1, 
    name: 'Alejandro Morales', 
    tier: 'Platinum', 
    email: 'amorales@email.com', 
    phone: '+52 55 1234 5678', 
    ltv: 12450.00, 
    credit: 1200.00, 
    lastActive: '2 hours ago', 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkwmNySevHcJc6SkkeH1_VboCHYuKEPFcQeNvS5xwllY9ySr22Y8azfsRK6ed-FBwoQlyQsYwfc4X06p-zXGIE4554Bf7ZCVtWEnHWCQEzBeyLKg749v_L1sk24tHZLiqAq9Ppm4eG8Tb2HD8GeqHOjudA4BnvogJKX1sNP78bJ9BWJFcpYDiN_4ohOdFYwSp12jvBqR1u0OJ3FAjtD9Ih8nvXU33hRVgzluNMXZ8W2Hyca0fQ0yCVcW6XY7IgPSUkRteI_KYdHh4',
    status: 'Active',
    notes: "Prefered delivery on Friday mornings. Always pays credit balance within 15 days of invoice.",
    creditHistory: [
        { id: 'CR-901', date: '2023-10-25', dueDate: '2023-11-10', amount: 800.00, status: 'Pending' },
        { id: 'CR-885', date: '2023-10-10', dueDate: '2023-10-25', amount: 400.00, status: 'Overdue' }
    ]
  },
  { 
    id: 2, 
    name: 'Lucia Gomez', 
    tier: 'Gold', 
    email: 'l.gomez@empresa.com', 
    phone: '+57 312 456 7890', 
    ltv: 5820.50, 
    credit: 0.00, 
    lastActive: 'Yesterday', 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzzg93D23A-4ItPYt4oMhFZmEpBQmv93eXnQnPGuwvffPNrEWh1iYLufhEzWxS8QCkIPRAvgPUBBEX4SGYcEfu6jU3pZ-wdNVl5GSjqE7JGDeiKTBL3OVtnLvMQiy7dGeSO8X8hRQnfEd4z_SsUxILgkqDOHHKL8VENs0CyrydxVbZkgHP1OTQSMGtKD5BG3x-HAaDRN9YaFmpZ1QThD8AOzIaD52B26huAfzwdNhhlJRFFoYKoStXbpk14E5sOA0cq-tCbXjmVN0',
    status: 'Active',
    notes: "Customer since 2021. Likes seasonal offers.",
    creditHistory: []
  },
  { 
    id: 3, 
    name: 'Roberto Hernandez', 
    tier: 'Silver', 
    email: 'r.hernandez@mail.com', 
    phone: '+56 9 8765 4321', 
    ltv: 2100.25, 
    credit: 2450.00, 
    lastActive: '3 days ago', 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwPSgdl-UtYtgjfJjYeCriW6zOhb0hE5rspaX5sqZllGKhxSxurnBA-77jz1_kKK965lGt55ilfA1WGBpOujkGDu5oeEbjCOm_BCxb_AarZKHwMkcCq1J-jwHIb_IrqiXRhTwnHmFIT5czmIHIlpuVajqRXIyzLWb2UAlTPjM_UiAYU5Oo69XAUVO8ccoHBfbjM-f13joREJN689p5fnHjPcHkh_i05lXcXxxQKwfW3RJzibjWR2tcLnLgdKRbzEjDJ7YqtNhqrEo',
    status: 'Blocked',
    notes: "Late payments frequent. Credit limit reached.",
    creditHistory: [
         { id: 'CR-950', date: '2023-09-01', dueDate: '2023-09-15', amount: 2450.00, status: 'Overdue' }
    ]
  },
  { 
    id: 4, 
    name: 'Elena Suarez', 
    tier: 'Platinum', 
    email: 'elena.suarez@provider.mx', 
    phone: '+52 55 9876 1234', 
    ltv: 15900.00, 
    credit: 0.00, 
    lastActive: '1 week ago', 
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXvImlJJRgSNxH4FPMx7XYt8xqEfzwLOp5zGmJoLmoC2pCw-n-Baox7XL5nF6qK5NT6-r7P3BGDf4NlNm1ywv-WSZEdlfkHIyienJj3HmOTxsA_S_2ijTGGsBK7LDg4dpr6niR43_sIneLazFIYlljUZX7zNqCjgkIR7gLJnTRySiPoChqo2q8kflnzjeDLmVuIHcGvmFjD3tIzJC1dzkBn9h3i5ShnWfKIzH5IND60kCxvg0a1eNdqmN_wFmcQXAAMM80yEWmuug',
    status: 'Active',
    notes: "VIP Client. Apply 10% discount on bulk orders.",
    creditHistory: []
  }
];

export default function Customers() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState(initialCustomers);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'history' | 'notes' | 'analytics'>('history');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', tier: 'Bronze', notes: '', status: 'Active'
  });

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedId) || customers[0], 
  [customers, selectedId]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
    );
  }, [customers, searchQuery]);

  // CRUD Handlers
  const handleOpenModal = (customer: any = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        tier: customer.tier,
        notes: customer.notes,
        status: customer.status
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '', email: '', phone: '', tier: 'Bronze', notes: '', status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingCustomer) {
      setCustomers(customers.map(c => c.id === editingCustomer.id ? { ...c, ...formData } : c));
    } else {
      const newCustomer = {
        ...formData,
        id: Date.now(),
        ltv: 0,
        credit: 0,
        lastActive: 'Just now',
        image: 'https://ui-avatars.com/api/?background=random&name=' + formData.name.replace(' ', '+'),
        creditHistory: []
      };
      setCustomers([newCustomer, ...customers]);
      setSelectedId(newCustomer.id);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (selectedCustomer && confirm(`Delete customer ${selectedCustomer.name}?`)) {
      const remaining = customers.filter(c => c.id !== selectedCustomer.id);
      setCustomers(remaining);
      if (remaining.length > 0) setSelectedId(remaining[0].id);
    }
  };

  return (
    <div className="flex h-full">
      {/* Main List Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400 outline-none" 
                placeholder={t('customers.searchPlaceholder')}
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

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('customers.title')}</h2>
              <p className="text-slate-500 text-sm">{t('customers.subtitle')}</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">file_download</span>
                {t('customers.export')}
              </button>
              <button 
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 transition-all flex items-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                {t('customers.addCustomer')}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('customers.table.customer')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('customers.table.contact')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('customers.table.ltv')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('customers.table.balance')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('customers.table.lastActive')}</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map(customer => (
                        <CustomerRow 
                            key={customer.id}
                            {...customer}
                            ltv={`$${customer.ltv.toLocaleString('en-US', {minimumFractionDigits: 2})}`}
                            creditDisplay={`$${customer.credit.toLocaleString('en-US', {minimumFractionDigits: 2})}`}
                            isActive={selectedId === customer.id}
                            onClick={() => setSelectedId(customer.id)}
                        />
                    ))}
                    {filteredCustomers.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">person_off</span>
                                <p>No customers found.</p>
                            </td>
                        </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Sidebar */}
      {selectedCustomer && (
        <div className="w-[420px] bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto shrink-0 shadow-xl z-20">
            <div className="p-8 pb-4">
            <div className="flex justify-between items-start mb-6">
                <button 
                  onClick={() => setSelectedId(-1)} // Just to unselect visually if needed, but UI keeps one selected
                  className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 lg:hidden"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
                <div className="flex gap-2 ml-auto">
                    <button 
                        onClick={handleDelete}
                        className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Delete Customer"
                    >
                        <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                    <button 
                        onClick={() => handleOpenModal(selectedCustomer)}
                        className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:brightness-95 transition-all"
                    >
                    {t('customers.profile')}
                    </button>
                </div>
            </div>
            <div className="flex flex-col items-center text-center">
                <div className="size-24 rounded-2xl bg-primary/10 border-4 border-white shadow-xl overflow-hidden mb-4 relative">
                  <img alt={selectedCustomer.name} className="w-full h-full object-cover" src={selectedCustomer.image} />
                  {selectedCustomer.status === 'Blocked' && (
                      <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center text-white backdrop-blur-[1px]">
                          <span className="material-symbols-outlined text-3xl">block</span>
                      </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{selectedCustomer.name}</h3>
                <p className="text-sm text-slate-500 mb-1">{selectedCustomer.tier} Member</p>
                <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${selectedCustomer.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {selectedCustomer.status}
                    </span>
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase tracking-wider">Credit Enabled</span>
                </div>
            </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 px-8 py-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t('customers.table.ltv')}</p>
                <p className="text-lg font-bold text-slate-900">${selectedCustomer.ltv.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pending Credit</p>
                <p className={`text-lg font-bold ${selectedCustomer.credit > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    ${selectedCustomer.credit.toLocaleString()}
                </p>
            </div>
            </div>

            <div className="px-8 flex border-b border-slate-100">
                <button onClick={() => setActiveTab('history')} className={`px-4 py-3 text-sm font-bold border-b-2 ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t('customers.history')}</button>
                <button onClick={() => setActiveTab('notes')} className={`px-4 py-3 text-sm font-bold border-b-2 ${activeTab === 'notes' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t('customers.notes')}</button>
            </div>

            <div className="flex-1 p-8 space-y-6 overflow-y-auto">
            
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {selectedCustomer.creditHistory && selectedCustomer.creditHistory.length > 0 ? (
                        selectedCustomer.creditHistory.map((historyItem: any) => (
                            <div key={historyItem.id} className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="shrink-0 size-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                                    <span className="material-symbols-outlined text-slate-400">request_quote</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <p className="text-sm font-bold text-slate-900">Credit Sale #{historyItem.id}</p>
                                        <StatusBadge status={historyItem.status} />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Due Date: <span className="font-bold text-slate-700">{historyItem.dueDate}</span></p>
                                    <p className="text-xs text-slate-500">Amount: ${historyItem.amount.toFixed(2)}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-4">No credit history found.</p>
                    )}
                    
                    {/* Fallback Static Items if history is empty for demo purposes on others */}
                     {!selectedCustomer.creditHistory && (
                        <div className="flex gap-4">
                            <div className="shrink-0 size-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400">shopping_bag</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                <p className="text-sm font-bold text-slate-900">Order #AQ-92831</p>
                                <span className="text-[10px] font-medium text-slate-400 uppercase">Oct 24, 2023</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">3 items • $1,240.55 • Paid</p>
                            </div>
                        </div>
                     )}
                </div>
            )}

            {activeTab === 'notes' && (
                <div className="pt-2">
                    <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Specific Notes</h4>
                    <button className="text-xs text-primary font-bold">Edit</button>
                    </div>
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                        "{selectedCustomer.notes || 'No specific notes added.'}"
                    </p>
                    </div>
                </div>
            )}
            </div>

            <div className="p-8 border-t border-slate-100">
            <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                {t('customers.newOrder')}
            </button>
            </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">{editingCustomer ? t('customers.editCustomer') : t('customers.newCustomer')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('customers.fullName')}</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('customers.email')}</label>
                        <input 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none" 
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('customers.phone')}</label>
                        <input 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none" 
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('customers.tier')}</label>
                        <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                            value={formData.tier}
                            onChange={e => setFormData({...formData, tier: e.target.value})}
                        >
                            <option>Bronze</option>
                            <option>Silver</option>
                            <option>Gold</option>
                            <option>Platinum</option>
                        </select>
                    </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('customers.status')}</label>
                        <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                            value={formData.status}
                            onChange={e => setFormData({...formData, status: e.target.value})}
                        >
                            <option>Active</option>
                            <option>Blocked</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t('customers.internalNotes')}</label>
                    <textarea 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none h-24 resize-none" 
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                    ></textarea>
                </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-bold rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:brightness-105 shadow-lg shadow-primary/20">{t('customers.saveProfile')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
    let classes = 'bg-slate-100 text-slate-600';
    if (status === 'Overdue') classes = 'bg-red-50 text-red-600';
    if (status === 'Pending') classes = 'bg-amber-50 text-amber-600';
    if (status === 'Paid') classes = 'bg-emerald-50 text-emerald-600';

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${classes}`}>
            {status}
        </span>
    );
};

const CustomerRow = ({ name, tier, email, phone, ltv, creditDisplay, credit, lastActive, image, isActive, onClick, status }: any) => (
    <tr 
        onClick={onClick}
        className={`cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${isActive ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
    >
        <td className={`px-6 py-4 ${isActive ? 'border-l-4 border-primary pl-[20px]' : ''}`}>
            <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 uppercase overflow-hidden relative">
                    <img alt={name} className="w-full h-full object-cover" src={image} />
                    {status === 'Blocked' && (
                        <div className="absolute inset-0 bg-red-500/40"></div>
                    )}
                </div>
                <div>
                    <span className="block text-sm font-bold text-slate-900">{name}</span>
                    <span className="text-xs text-slate-500">Tier: {tier}</span>
                </div>
            </div>
        </td>
        <td className="px-6 py-4">
            <div className="text-sm text-slate-700">{email}</div>
            <div className="text-xs text-slate-500">{phone}</div>
        </td>
        <td className="px-6 py-4">
            <span className="text-sm font-bold text-slate-900">{ltv}</span>
        </td>
        <td className="px-6 py-4">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${credit > 1000 ? 'bg-amber-50 text-amber-600' : credit === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                {creditDisplay}
            </span>
        </td>
        <td className="px-6 py-4 text-sm text-slate-500">{lastActive}</td>
        <td className="px-6 py-4 text-right">
            <span className={`material-symbols-outlined ${isActive ? 'text-primary' : 'text-slate-300'}`}>chevron_right</span>
        </td>
    </tr>
);