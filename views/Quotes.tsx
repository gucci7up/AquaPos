import React, { useState, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';
import { databases, Query, ID } from '@/lib/appwrite';
import { PrintTemplates } from '../components/PrintTemplates';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_QUOTES_ID;
const COLLECTION_SETTINGS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_SETTINGS_ID;

// Mock Data removed
const initialQuotes: any[] = [];

export default function Quotes() {
  const { t } = useLanguage();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessSettings, setBusinessSettings] = useState<any>(null);

  // Printing state
  const [activeQuoteForPrint, setActiveQuoteForPrint] = useState<any>(null);

  React.useEffect(() => {
    fetchQuotes();
    fetchBusinessSettings();
  }, []);

  const fetchQuotes = async () => {
    if (!DATABASE_ID || !COLLECTION_ID) return;
    try {
      setLoading(true);
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
        Query.orderDesc('$createdAt')
      ]);
      setQuotes(response.documents.map(doc => ({
        ...doc,
        id: doc.$id,
        items: typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items
      })));
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessSettings = async () => {
    if (!DATABASE_ID || !COLLECTION_SETTINGS_ID) return;
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_SETTINGS_ID, [Query.limit(1)]);
      if (response.documents.length > 0) setBusinessSettings(response.documents[0]);
    } catch (error) {
      console.error('Error fetching settings for Quotes:', error);
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer: '',
    taxId: '',
    expiry: '',
    items: [] as any[]
  });

  // Filter Logic
  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      const customerName = quote.customerName || quote.customer || 'Guest';
      const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'All' || quote.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchQuery, filterStatus]);

  // Stats Logic
  const stats = useMemo(() => ({
    draft: quotes.filter(q => q.status === 'Draft').length,
    sent: quotes.filter(q => q.status === 'Sent').length,
    expired: quotes.filter(q => q.status === 'Expired').length,
    converted: quotes.filter(q => q.status === 'Converted').length,
  }), [quotes]);

  // Calculations helper
  const calculateTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  };

  // CRUD Handlers
  const handleOpenModal = (quote: any = null) => {
    if (quote) {
      setEditingQuoteId(quote.id);
      setFormData({
        customer: quote.customer,
        taxId: quote.taxId,
        expiry: quote.expiry,
        items: [...quote.items]
      });
    } else {
      setEditingQuoteId(null);
      setFormData({
        customer: '',
        taxId: '',
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days
        items: [{ id: Date.now(), desc: '', qty: 1, price: 0 }]
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveQuote = async () => {
    if (!DATABASE_ID || !COLLECTION_ID) {
      alert('Error: Configuración de Appwrite incompleta (ID de Colección de Cotizaciones faltante)');
      return;
    }

    // items must be stringified for Appwrite
    const itemsJson = JSON.stringify(formData.items);
    const subtotal = calculateTotal(formData.items);
    const total = subtotal; // Sin impuestos en cotizaciones

    const quoteData = {
      customerName: formData.customer || 'Cliente General',
      customer: formData.customer || 'Cliente General', // Usar ambos por compatibilidad
      taxId: formData.taxId,
      expiry: formData.expiry,
      items: itemsJson,
      subtotal: subtotal,
      tax: 0,
      taxRate: 0,
      total: total,
      status: editingQuoteId ? quotes.find(q => q.id === editingQuoteId)?.status : 'Draft'
    };

    console.log('Quotes - Saving document:', quoteData);

    try {
      if (editingQuoteId) {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, editingQuoteId, quoteData);
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
          ...quoteData,
          date: new Date().toISOString()
        });
      }
      fetchQuotes();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving quote:', error);
      alert('Error al guardar la cotización: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!DATABASE_ID || !COLLECTION_ID) return;
    if (confirm('Are you sure you want to delete this quote?')) {
      try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);
        fetchQuotes();
      } catch (error) {
        console.error('Error deleting quote:', error);
        alert('Error al eliminar la cotización');
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!DATABASE_ID || !COLLECTION_ID) return;
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID, id, { status: newStatus });
      fetchQuotes();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handlePrint = (quote: any) => {
    setActiveQuoteForPrint({
      ...quote,
      // Ensure items is an object for PrintTemplates
      items: typeof quote.items === 'string' ? JSON.parse(quote.items) : quote.items
    });

    setTimeout(() => {
      const printContents = document.getElementById('print-container')?.innerHTML;
      if (!printContents) return;

      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Quote - ${quote.id}</title>
              <style>
                @page { size: A4; margin: 0; }
                body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
              </style>
            </head>
            <body>
              ${printContents}
              <script>
                window.onload = () => {
                  window.print();
                  window.onafterprint = () => window.close();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }, 100);
  };

  // Modal Form Handlers
  const handleItemChange = (id: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), desc: '', qty: 1, price: 0 }]
    }));
  };

  const removeItem = (id: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const modalSubtotal = calculateTotal(formData.items);
  const modalTotal = modalSubtotal; // Sin impuestos en cotizaciones

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
              placeholder={t('quotes.searchPlaceholder')}
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

      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background-light">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t('quotes.title')}</h2>
            <p className="text-slate-500">{t('quotes.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <div className="relative group">
              <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">filter_list</span>
                {t('quotes.filter')}: {filterStatus}
              </button>
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 hidden group-hover:block z-20 p-1">
                {['All', 'Draft', 'Sent', 'Expired', 'Converted'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 rounded-lg font-medium text-slate-700"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 transition-all flex items-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              {t('quotes.createQuote')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatusCard title={t('quotes.draft')} count={stats.draft} icon="draft" color="slate" />
          <StatusCard title={t('quotes.sent')} count={stats.sent} icon="send" color="blue" />
          <StatusCard title={t('quotes.expired')} count={stats.expired} icon="timer_off" color="red" />
          <StatusCard title={t('quotes.converted')} count={stats.converted} icon="check_circle" color="emerald" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('quotes.table.id')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('quotes.table.customer')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('quotes.table.amount')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('quotes.table.status')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('quotes.table.expiry')}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t('quotes.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map(quote => {
                  const totalAmt = quote.total || calculateTotal(quote.items);
                  return (
                    <QuoteRow
                      key={quote.id}
                      id={quote.id}
                      created={new Date(quote.date || quote.$createdAt).toLocaleDateString()}
                      customer={quote.customerName || quote.customer}
                      taxId={quote.taxId}
                      amount={`$${totalAmt.toFixed(2)}`}
                      status={quote.status}
                      expiry={new Date(quote.expiry).toLocaleDateString()}
                      onEdit={() => handleOpenModal(quote)}
                      onDelete={() => handleDelete(quote.id)}
                      onConvert={() => handleStatusChange(quote.id, 'Converted')}
                      onRenew={() => handleStatusChange(quote.id, 'Sent')}
                      onPrint={() => handlePrint(quote)}
                    />
                  );
                })}
                {filteredQuotes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">find_in_page</span>
                      <p>No quotes found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hidden Print Container */}
        <div id="print-container" className="hidden">
          {activeQuoteForPrint && (
            <PrintTemplates
              type="quote"
              data={activeQuoteForPrint}
              businessSettings={businessSettings}
            />
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900">{editingQuoteId ? `${t('quotes.editQuote')} ${editingQuoteId}` : t('quotes.newQuote')}</h3>
                <p className="text-xs text-slate-500">Configure customer details and line items.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('quotes.customerName')}</label>
                  <input
                    value={formData.customer}
                    onChange={e => setFormData({ ...formData, customer: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                    placeholder="Enter customer name..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('quotes.taxId')}</label>
                  <input
                    value={formData.taxId}
                    onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                    placeholder="XXX.XXX.XXX-X"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('quotes.table.expiry')}</label>
                  <input
                    type="date"
                    value={formData.expiry}
                    onChange={e => setFormData({ ...formData, expiry: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-slate-900">{t('quotes.lineItems')}</h4>
                  <button onClick={addItem} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                    <span className="material-symbols-outlined text-sm">add</span> {t('quotes.addItem')}
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 w-24 text-center">Qty</th>
                        <th className="px-4 py-3 w-32">Price ($)</th>
                        <th className="px-4 py-3 w-32 text-right">Total</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="p-2">
                            <input
                              value={item.desc}
                              onChange={e => handleItemChange(item.id, 'desc', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-200 rounded text-sm focus:border-primary outline-none"
                              placeholder="Product description"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={e => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 0)}
                              className="w-full p-2 bg-white border border-slate-200 rounded text-sm text-center focus:border-primary outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={e => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full p-2 bg-white border border-slate-200 rounded text-sm focus:border-primary outline-none"
                            />
                          </td>
                          <td className="p-2 text-right text-sm font-medium">
                            ${(item.qty * item.price).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            {formData.items.length > 1 && (
                              <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500">
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer / Totals */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-end">
              <div className="text-xs text-slate-400 max-w-sm">
                <p>{t('quotes.terms')}</p>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right space-y-1">
                  <div className="flex justify-between gap-8 text-sm">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-medium text-slate-900">${modalSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-xl font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total:</span>
                    <span className="text-primary">${modalTotal.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={handleSaveQuote}
                  className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                  {t('quotes.saveQuote')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const StatusCard = ({ title, count, icon, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600'
  };
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`size-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-xl font-bold">{count}</p>
      </div>
    </div>
  );
};

const QuoteRow = ({ id, created, customer, taxId, amount, status, expiry, onEdit, onDelete, onConvert, onRenew, onPrint }: any) => {
  const statusBadges: any = {
    Sent: 'bg-blue-50 text-blue-600',
    Draft: 'bg-slate-100 text-slate-600',
    Expired: 'bg-red-50 text-red-600',
    Converted: 'bg-emerald-50 text-emerald-600'
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4">
        <span className="text-sm font-bold text-slate-700">{id}</span>
        <p className="text-[10px] text-slate-400 font-medium">Created: {created}</p>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{customer.substring(0, 2).toUpperCase()}</div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{customer}</p>
            <p className="text-xs text-slate-400">tax-id: {taxId}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm font-bold text-slate-900">{amount}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusBadges[status]}`}>
          <span className={`size-1.5 rounded-full bg-current`}></span> {status}
        </span>
      </td>
      <td className={`px-6 py-4 text-sm ${status === 'Expired' ? 'text-red-400 font-medium' : 'text-slate-500'}`}>{expiry}</td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {status === 'Sent' && <button onClick={onConvert} className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:brightness-105 transition-all shadow-sm">Convert</button>}
          {status === 'Draft' && <button onClick={() => onRenew()} className="px-3 py-1.5 border border-primary text-primary text-xs font-bold rounded-lg hover:bg-primary/5">Send</button>}
          {status === 'Expired' && <button onClick={onRenew} className="px-3 py-1.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50">Renew</button>}
          <button onClick={onPrint} className="p-1.5 text-slate-400 hover:text-primary" title="Print PDF">
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
          </button>
          <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-slate-600" title="Edit">
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
          <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500" title="Delete">
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
};