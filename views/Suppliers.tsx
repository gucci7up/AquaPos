import React, { useState, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';

// --- MOCK DATA ---

const mockProducts = [
  { id: 1, name: 'Premium Cotton Tee', sku: 'APP-TSH-001', cost: 4.50 },
  { id: 2, name: 'Organic Coffee Beans', sku: 'GRO-BEV-882', cost: 3.20 },
  { id: 3, name: 'Wireless Headphones', sku: 'ELE-AUD-204', cost: 22.00 },
  { id: 4, name: 'Eco Glass Bottle', sku: 'HOM-KIT-441', cost: 1.50 },
  { id: 5, name: 'Yoga Mat', sku: 'FIT-GEA-001', cost: 6.00 },
];

const initialSuppliers = [
  { id: 1, name: 'Global Fabrics Ltd.', contact: 'Sarah Jenkins', email: 'orders@globalfabrics.com', phone: '+1 555 0192', category: 'Apparel', leadTime: '5 days', status: 'Active', address: '123 Textile Ave, NY' },
  { id: 2, name: 'Coffee Growers Co-op', contact: 'Mateo Rivera', email: 'sales@coffeegrowers.la', phone: '+57 300 123 4567', category: 'Grocery', leadTime: '3 days', status: 'Active', address: 'Zona Cafetera, COL' },
  { id: 3, name: 'TechDistro Inc.', contact: 'Support Team', email: 'b2b@techdistro.com', phone: '+1 800 555 9999', category: 'Electronics', leadTime: '7 days', status: 'Active', address: 'Silicon Valley, CA' },
];

const initialOrders = [
  { 
    id: 'PO-2024-001', 
    supplierId: 2, 
    supplierName: 'Coffee Growers Co-op', 
    date: '2024-10-28', 
    expected: '2024-10-31', 
    status: 'Received',
    items: [
        { id: 101, productId: 2, name: 'Organic Coffee Beans', qty: 50, cost: 3.20, total: 160.00 }
    ],
    total: 160.00 
  },
  { 
    id: 'PO-2024-002', 
    supplierId: 1, 
    supplierName: 'Global Fabrics Ltd.', 
    date: '2024-10-30', 
    expected: '2024-11-04', 
    status: 'Ordered',
    items: [
        { id: 102, productId: 1, name: 'Premium Cotton Tee', qty: 100, cost: 4.50, total: 450.00 }
    ],
    total: 450.00 
  },
];

export default function Suppliers() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- STATE ---
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [orders, setOrders] = useState(initialOrders);

  // Modals & Drawers
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null); // For Details Drawer

  // Form State
  const [supplierForm, setSupplierForm] = useState<any>({ name: '', contact: '', email: '', phone: '', category: 'General', leadTime: '', address: '' });
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);

  const [orderForm, setOrderForm] = useState<any>({ supplierId: '', expected: '', items: [] });
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // --- FILTER LOGIC ---
  const filteredSuppliers = useMemo(() => 
    suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.contact.toLowerCase().includes(searchQuery.toLowerCase())), 
  [suppliers, searchQuery]);

  const filteredOrders = useMemo(() => 
    orders.filter(o => o.id.toLowerCase().includes(searchQuery.toLowerCase()) || o.supplierName.toLowerCase().includes(searchQuery.toLowerCase())), 
  [orders, searchQuery]);

  // --- SUPPLIER ACTIONS ---
  const openSupplierModal = (supplier: any = null) => {
      if (supplier) {
          setSupplierForm(supplier);
          setEditingSupplierId(supplier.id);
      } else {
          setSupplierForm({ name: '', contact: '', email: '', phone: '', category: 'General', leadTime: '', address: '' });
          setEditingSupplierId(null);
      }
      setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = () => {
      if (!supplierForm.name) return alert("Name is required");

      if (editingSupplierId) {
          setSuppliers(suppliers.map(s => s.id === editingSupplierId ? { ...s, ...supplierForm } : s));
      } else {
          const newId = Math.max(...suppliers.map(s => s.id)) + 1;
          setSuppliers([...suppliers, { id: newId, status: 'Active', ...supplierForm }]);
      }
      setIsSupplierModalOpen(false);
  };

  const handleDeleteSupplier = (id: number) => {
      if (window.confirm("Delete this supplier?")) {
          setSuppliers(suppliers.filter(s => s.id !== id));
      }
  };

  // --- ORDER ACTIONS ---
  const openOrderModal = (order: any = null) => {
      if (order) {
          if (order.status === 'Received') return alert("Cannot edit received orders.");
          setOrderForm({
              supplierId: order.supplierId,
              expected: order.expected,
              items: [...order.items]
          });
          setEditingOrderId(order.id);
      } else {
          setOrderForm({ 
              supplierId: '', 
              expected: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], 
              items: [] 
          });
          setEditingOrderId(null);
      }
      setIsOrderModalOpen(true);
  };

  const handleSaveOrder = (status: 'Draft' | 'Ordered') => {
      if (!orderForm.supplierId) return alert("Please select a supplier");
      if (orderForm.items.length === 0) return alert("Please add at least one item");

      const supplier = suppliers.find(s => s.id == orderForm.supplierId);
      const total = orderForm.items.reduce((acc: number, item: any) => acc + item.total, 0);

      const orderData = {
          supplierId: parseInt(orderForm.supplierId),
          supplierName: supplier?.name || 'Unknown',
          date: new Date().toISOString().split('T')[0],
          expected: orderForm.expected,
          items: orderForm.items,
          total: total,
          status: status
      };

      if (editingOrderId) {
          setOrders(orders.map(o => o.id === editingOrderId ? { ...o, ...orderData } : o));
      } else {
          const newId = `PO-2024-${Math.floor(Math.random() * 10000)}`;
          setOrders([{ id: newId, ...orderData }, ...orders]);
      }
      setIsOrderModalOpen(false);
  };

  const handleReceiveOrder = (orderId: string) => {
      if (window.confirm("Mark this order as Received? This will update your inventory stock.")) {
          setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'Received' } : o));
          // Here you would technically update inventory state if you had a global store
          alert("Inventory Updated Successfully!");
      }
  };

  const handleDeleteOrder = (id: string) => {
      if (window.confirm("Delete this order?")) {
          setOrders(orders.filter(o => o.id !== id));
      }
  };

  // --- ORDER ITEM LOGIC ---
  const addOrderItem = () => {
      setOrderForm({
          ...orderForm,
          items: [...orderForm.items, { id: Date.now(), productId: '', name: '', qty: 1, cost: 0, total: 0 }]
      });
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
      const newItems = [...orderForm.items];
      const item = newItems[index];

      if (field === 'productId') {
          const product = mockProducts.find(p => p.id == value);
          if (product) {
              item.productId = product.id;
              item.name = product.name;
              item.cost = product.cost;
          }
      } else {
          item[field] = value;
      }

      // Recalculate Row Total
      item.total = item.qty * item.cost;
      
      setOrderForm({ ...orderForm, items: newItems });
  };

  const removeOrderItem = (index: number) => {
      const newItems = orderForm.items.filter((_: any, i: number) => i !== index);
      setOrderForm({ ...orderForm, items: newItems });
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Received': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
          case 'Ordered': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'Draft': return 'bg-slate-100 text-slate-600 border-slate-200';
          default: return 'bg-slate-100 text-slate-600';
      }
  };

  const orderFormTotal = orderForm.items.reduce((acc: number, item: any) => acc + (item.total || 0), 0);

  return (
    <div className="flex flex-col h-full bg-background-light">
      {/* HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 transition-all outline-none" 
                    placeholder={t('suppliers.searchPlaceholder')}
                />
            </div>
        </div>
        <div className="flex items-center gap-4">
          <UserMenu />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{t('suppliers.title')}</h2>
            <p className="text-slate-500 text-sm font-medium">{t('suppliers.subtitle')}</p>
          </div>
          <div className="flex gap-3">
             <div className="bg-white border border-slate-200 rounded-lg p-1 flex shadow-sm">
                <button 
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'orders' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    {t('suppliers.tabOrders')}
                </button>
                <button 
                    onClick={() => setActiveTab('suppliers')}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'suppliers' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    {t('suppliers.tabSuppliers')}
                </button>
             </div>
             <button 
                onClick={() => activeTab === 'suppliers' ? openSupplierModal() : openOrderModal()}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:brightness-110 transition-all flex items-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                {activeTab === 'suppliers' ? t('suppliers.addSupplier') : t('suppliers.createOrder')}
              </button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard icon="pending_actions" title={t('suppliers.stats.pending')} value={orders.filter(o => o.status === 'Ordered' || o.status === 'Draft').length} color="blue" />
            <StatCard icon="inventory_2" title={t('suppliers.stats.received')} value={orders.filter(o => o.status === 'Received').length} color="emerald" />
            <StatCard icon="store" title={t('suppliers.stats.activeSuppliers')} value={suppliers.length} color="slate" />
            <StatCard icon="payments" title={t('suppliers.stats.spending')} value={`$${orders.reduce((acc,o) => acc + o.total, 0).toLocaleString()}`} color="amber" />
        </div>

        {/* MAIN TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
           {activeTab === 'orders' ? (
               <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                       <thead className="bg-slate-50 border-b border-slate-100">
                           <tr>
                               <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">ID</th>
                               <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('suppliers.table.supplier')}</th>
                               <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('suppliers.table.date')}</th>
                               <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('suppliers.table.total')}</th>
                               <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('suppliers.table.status')}</th>
                               <th className="px-6 py-4 text-right"></th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                           {filteredOrders.map(order => (
                               <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                                   <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{order.id}</td>
                                   <td className="px-6 py-4">
                                       <span className="font-bold text-slate-900 block">{order.supplierName}</span>
                                       <span className="text-xs text-slate-400">{order.items.length} Items</span>
                                   </td>
                                   <td className="px-6 py-4">
                                       <span className="text-sm text-slate-700 block">{order.date}</span>
                                       <span className="text-[10px] text-slate-400">Exp: {order.expected}</span>
                                   </td>
                                   <td className="px-6 py-4 text-sm font-bold text-slate-900">${order.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                   <td className="px-6 py-4">
                                       <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                                           {t(`common.status.${order.status}`)}
                                       </span>
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button onClick={() => setViewOrder(order)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="View Details">
                                               <span className="material-symbols-outlined text-lg">visibility</span>
                                           </button>
                                           {order.status !== 'Received' && (
                                               <>
                                                <button onClick={() => openOrderModal(order)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Edit">
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                {order.status === 'Ordered' && (
                                                    <button onClick={() => handleReceiveOrder(order.id)} className="p-1.5 hover:bg-emerald-50 rounded text-emerald-600" title="Receive Stock">
                                                        <span className="material-symbols-outlined text-lg">inventory</span>
                                                    </button>
                                                )}
                                               </>
                                           )}
                                           <button onClick={() => handleDeleteOrder(order.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete">
                                               <span className="material-symbols-outlined text-lg">delete</span>
                                           </button>
                                       </div>
                                   </td>
                               </tr>
                           ))}
                           {filteredOrders.length === 0 && (
                               <tr><td colSpan={6} className="text-center py-12 text-slate-400">No orders found.</td></tr>
                           )}
                       </tbody>
                   </table>
               </div>
           ) : (
               <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                       <thead className="bg-slate-50 border-b border-slate-100">
                           <tr>
                               <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('suppliers.table.name')}</th>
                               <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('suppliers.table.contact')}</th>
                               <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('suppliers.table.category')}</th>
                               <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('suppliers.table.leadTime')}</th>
                               <th className="px-6 py-4 text-right"></th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                           {filteredSuppliers.map(supplier => (
                               <tr key={supplier.id} className="hover:bg-slate-50 transition-colors group">
                                   <td className="px-6 py-4">
                                       <p className="font-bold text-slate-900 text-sm">{supplier.name}</p>
                                       <p className="text-xs text-slate-400">{supplier.address}</p>
                                   </td>
                                   <td className="px-6 py-4">
                                        <p className="text-sm text-slate-700">{supplier.contact}</p>
                                        <p className="text-xs text-slate-400">{supplier.email}</p>
                                   </td>
                                   <td className="px-6 py-4">
                                       <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{supplier.category}</span>
                                   </td>
                                   <td className="px-6 py-4 text-sm text-slate-500 font-medium">{supplier.leadTime}</td>
                                   <td className="px-6 py-4 text-right">
                                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button onClick={() => openSupplierModal(supplier)} className="p-1.5 hover:bg-slate-100 rounded text-blue-600">
                                               <span className="material-symbols-outlined text-lg">edit</span>
                                           </button>
                                           <button onClick={() => handleDeleteSupplier(supplier.id)} className="p-1.5 hover:bg-slate-100 rounded text-red-500">
                                               <span className="material-symbols-outlined text-lg">delete</span>
                                           </button>
                                       </div>
                                   </td>
                               </tr>
                           ))}
                           {filteredSuppliers.length === 0 && (
                               <tr><td colSpan={5} className="text-center py-12 text-slate-400">No suppliers found.</td></tr>
                           )}
                       </tbody>
                   </table>
               </div>
           )}
        </div>
      </div>

      {/* --- ORDER FORM MODAL --- */}
      {isOrderModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div>
                        <h3 className="text-xl font-black text-slate-900">{editingOrderId ? 'Edit Purchase Order' : t('suppliers.createOrder')}</h3>
                        <p className="text-xs text-slate-500">Manage procurement and stock replenishment.</p>
                    </div>
                    <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined">close</span></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Header Inputs */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('suppliers.selectSupplier')}</label>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-primary transition-colors text-sm font-medium"
                                value={orderForm.supplierId}
                                onChange={(e) => setOrderForm({...orderForm, supplierId: e.target.value})}
                            >
                                <option value="">Select Supplier...</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('suppliers.table.expected')}</label>
                            <input 
                                type="date"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-primary transition-colors text-sm font-medium"
                                value={orderForm.expected}
                                onChange={(e) => setOrderForm({...orderForm, expected: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Line Items */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Order Items</h4>
                            <button onClick={addOrderItem} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">add</span> Add Item
                            </button>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3 w-24 text-center">Qty</th>
                                        <th className="px-4 py-3 w-32 text-right">Cost</th>
                                        <th className="px-4 py-3 w-32 text-right">Total</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {orderForm.items.map((item: any, idx: number) => (
                                        <tr key={item.id}>
                                            <td className="p-2">
                                                <select 
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary outline-none"
                                                    value={item.productId}
                                                    onChange={(e) => updateOrderItem(idx, 'productId', e.target.value)}
                                                >
                                                    <option value="">Select Product...</option>
                                                    {mockProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm text-center focus:border-primary outline-none"
                                                    value={item.qty}
                                                    onChange={(e) => updateOrderItem(idx, 'qty', parseInt(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="p-2 text-right">
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm text-right focus:border-primary outline-none"
                                                    value={item.cost}
                                                    onChange={(e) => updateOrderItem(idx, 'cost', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="p-2 text-right font-bold text-slate-700">
                                                ${item.total.toFixed(2)}
                                            </td>
                                            <td className="p-2 text-center">
                                                <button onClick={() => removeOrderItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {orderForm.items.length === 0 && (
                                        <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm italic">No items added yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer Totals & Actions */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grand Total</p>
                        <p className="text-3xl font-black text-slate-900">${orderFormTotal.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => handleSaveOrder('Draft')} className="px-6 py-3 border border-slate-200 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                            Save as Draft
                        </button>
                        <button onClick={() => handleSaveOrder('Ordered')} className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-105 transition-all">
                            Confirm Order
                        </button>
                    </div>
                </div>
            </div>
          </div>
      )}

      {/* --- SUPPLIER FORM MODAL --- */}
      {isSupplierModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900">{editingSupplierId ? 'Edit Supplier' : t('suppliers.addSupplier')}</h3>
                    <button onClick={() => setIsSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                        <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg outline-none focus:border-primary" 
                            value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Contact Person</label>
                        <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg outline-none focus:border-primary" 
                            value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                            <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg outline-none focus:border-primary" 
                                value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                            <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg outline-none focus:border-primary" 
                                value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                        <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg outline-none focus:border-primary"
                            value={supplierForm.category} onChange={e => setSupplierForm({...supplierForm, category: e.target.value})}>
                            <option>Apparel</option><option>Grocery</option><option>Electronics</option><option>General</option>
                        </select>
                    </div>
                    <button onClick={handleSaveSupplier} className="w-full py-3 bg-primary text-white font-bold rounded-xl mt-4 hover:brightness-105 shadow-lg">
                        Save Supplier
                    </button>
                </div>
            </div>
          </div>
      )}

      {/* --- ORDER DETAILS DRAWER --- */}
      {viewOrder && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
              <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                      <div>
                          <h3 className="text-xl font-black text-slate-900">{viewOrder.id}</h3>
                          <p className="text-sm font-medium text-slate-600">{viewOrder.supplierName}</p>
                          <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(viewOrder.status)}`}>
                              {viewOrder.status}
                          </span>
                      </div>
                      <button onClick={() => setViewOrder(null)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Order Items</h4>
                          <div className="space-y-3">
                              {viewOrder.items.map((item: any) => (
                                  <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <div>
                                          <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                          <p className="text-xs text-slate-500">{item.qty} units x ${item.cost.toFixed(2)}</p>
                                      </div>
                                      <p className="text-sm font-bold text-slate-900">${item.total.toFixed(2)}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                          <span className="font-bold text-slate-900">Total</span>
                          <span className="text-2xl font-black text-primary">${viewOrder.total.toFixed(2)}</span>
                      </div>
                  </div>
                  {viewOrder.status === 'Ordered' && (
                      <div className="p-6 border-t border-slate-100 bg-slate-50">
                          <button onClick={() => { handleReceiveOrder(viewOrder.id); setViewOrder(null); }} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:brightness-105 flex justify-center gap-2">
                              <span className="material-symbols-outlined">inventory</span> Receive Stock
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
}

const StatCard = ({ icon, title, value, color }: any) => {
    const colors: any = {
        blue: 'bg-blue-100 text-blue-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        slate: 'bg-slate-100 text-slate-600',
        amber: 'bg-amber-100 text-amber-600'
    };
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`size-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <div>
                <p className="text-sm text-slate-500">{title}</p>
                <p className="text-xl font-bold text-slate-900">{value}</p>
            </div>
        </div>
    );
};
