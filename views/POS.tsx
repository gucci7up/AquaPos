import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { databases, functions, ID, Query } from '@/lib/appwrite';
import { PrintTemplates } from '../components/PrintTemplates';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_INVENTORY_ID = import.meta.env.VITE_APPWRITE_COLLECTION_INVENTORY_ID || 'inventory';
const COLLECTION_CATEGORIES_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CATEGORIES_ID || 'categories';
const COLLECTION_SETTINGS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_SETTINGS_ID || 'settings';
const COLLECTION_SALES_ID = import.meta.env.VITE_APPWRITE_COLLECTION_SALES_ID || 'sales';
const COLLECTION_QUOTES_ID = import.meta.env.VITE_APPWRITE_COLLECTION_QUOTES_ID || 'quotes';
const FUNCTION_PROCESS_SALE_ID = import.meta.env.VITE_APPWRITE_FUNCTION_PROCESS_SALE_ID;

// Extended Product Data (Removed fixed mock data, using it as fallback for icon layout)
const mockProductsFallback: any[] = [];

const COLLECTION_CUSTOMERS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CUSTOMERS_ID || 'customers';

export default function POS() {
  const { t } = useLanguage();

  // helper to get category display name
  const getCategoryDisplay = (cat: string) => {
    const key = `data.categories.${cat}`;
    const translation = t(key);
    return translation === key ? cat : translation;
  };

  const [products, setProducts] = useState(mockProductsFallback);
  const [categories, setCategories] = useState(['All', 'General']);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [activeCategoryKey, setActiveCategoryKey] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Settings state
  const [taxRate, setTaxRate] = useState(18); // Default to 18% (common in DR)
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Printing state
  const [processedSaleData, setProcessedSaleData] = useState<any>(null);
  const [printType, setPrintType] = useState<'ticket' | 'invoice' | 'quote' | null>(null);
  const [businessSettings, setBusinessSettings] = useState<any>(null);

  // Fetch products from Appwrite
  useEffect(() => {
    const fetchProducts = async () => {
      if (!DATABASE_ID || !COLLECTION_INVENTORY_ID) {
        setLoading(false);
        return;
      }
      try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_INVENTORY_ID);
        console.log('POS Fetched Products Raw:', response.documents.length);
        const mapped = response.documents.map((doc: any) => ({
          id: doc.$id,
          name: doc.name,
          category: doc.category,
          stock: doc.stock,
          price: doc.price,
          image: doc.image || 'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?q=80&w=1000&auto=format&fit=crop', // Default placeholder
          lowStock: (doc.stock || 0) <= 5
        }));
        console.log('POS Mapped Products:', mapped.length);
        setProducts(mapped);
      } catch (error) {
        console.error('Error fetching products for POS:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
    fetchCategories();
    fetchBusinessSettings();
  }, []);

  const fetchBusinessSettings = async () => {
    if (!DATABASE_ID || !COLLECTION_SETTINGS_ID) return;
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_SETTINGS_ID, [
        Query.limit(1)
      ]);
      if (response.documents.length > 0) {
        const settings = response.documents[0];
        console.log('POS Settings Loaded:', settings);
        setTaxRate(settings.taxRate ?? 18);
        setBusinessSettings(settings);
        // Basic currency symbol logic
        if (settings.currency?.includes('USD')) setCurrencySymbol('$');
        else if (settings.currency?.includes('DOP')) setCurrencySymbol('RD$');
        else setCurrencySymbol('$');
      } else {
        console.log('POS No settings found in collection');
      }
    } catch (error) {
      console.error('Error fetching business settings for POS:', error);
    }
  };

  const generateQuote = async () => {
    if (cart.length === 0) return;
    if (!DATABASE_ID || !COLLECTION_QUOTES_ID) {
      alert('Error: Colección de cotizaciones no configurada.');
      return;
    }

    setPaymentStep('process');
    try {
      const quoteData = {
        customerId: activeCustomer?.$id || activeCustomer?.id || null,
        customerName: activeCustomer?.name || 'Cliente General',
        items: JSON.stringify(cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price }))),
        subtotal: subtotal,
        tax: 0,
        taxRate: 0,
        total: subtotal,
        status: 'Draft',
        date: new Date().toISOString(),
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      };

      console.log('POS Creating quote document:', quoteData);
      const doc = await databases.createDocument(DATABASE_ID, COLLECTION_QUOTES_ID, ID.unique(), quoteData);

      setProcessedSaleData({
        ...quoteData,
        items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
        id: doc.$id
      });
      setPrintType('quote');
      setPaymentStep('success'); // Use success step to show print options
    } catch (error: any) {
      console.error('Error generating quote:', error);
      alert('Error al generar cotización: ' + (error.message || 'Error desconocido'));
      setPaymentStep('select');
    }
  };

  const fetchCategories = async () => {
    if (!DATABASE_ID || !COLLECTION_CATEGORIES_ID) return;
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_CATEGORIES_ID);
      const collectionCats = response.documents.map(doc => doc.name);

      // Only use database categories, ensuring 'All' is at the start for filtering
      const finalCats = ['All', ...collectionCats];
      if (finalCats.length === 1) finalCats.push('General'); // If empty, show All + General
      setCategories(finalCats);
    } catch (error: any) {
      console.error('Error fetching categories for POS:', error);
      // Fallback to minimal state if collection missing
      if (categories.length === 0) setCategories(['All', 'General']);
    }
  };

  // Customer State
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Fetch customers from Appwrite
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!DATABASE_ID || !COLLECTION_CUSTOMERS_ID) return;
      try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_CUSTOMERS_ID);
        setCustomers(response.documents.map(doc => ({
          ...doc,
          id: doc.$id
        })));
      } catch (error) {
        console.error('Error fetching customers for POS:', error);
      }
    };
    fetchCustomers();
  }, []);
  const [customerViewMode, setCustomerViewMode] = useState<'search' | 'create'>('search');
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', email: '', phone: '' });

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'process' | 'success'>('select');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Credit' | null>(null);
  const [amountTendered, setAmountTendered] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);

  // Credit Specific State
  const [creditInitialPayment, setCreditInitialPayment] = useState('');
  const [creditDueDate, setCreditDueDate] = useState('');

  // Filter Logic
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = activeCategoryKey === 'All' || product.category === activeCategoryKey;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategoryKey, searchQuery]);

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Cart Handlers
  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.reduce((acc, p) => {
      if (p.id === id) {
        if (p.quantity > 1) return [...acc, { ...p, quantity: p.quantity - 1 }];
        return acc;
      }
      return [...acc, p];
    }, [] as any[]));
  };

  const clearCart = () => {
    setCart([]);
    setActiveCustomer(null);
    setIsMobileCartOpen(false);
  };

  // Customer Handlers
  const handleCustomerSelect = (customer: any) => {
    setActiveCustomer(customer);
    setIsCustomerModalOpen(false);
    setCustomerSearch('');
  };

  const handlePrint = (type: 'ticket' | 'invoice' | 'quote') => {
    setPrintType(type);
    // Give state a moment to update and render the print container
    setTimeout(() => {
      const printContainer = document.getElementById('print-container');
      const printContents = printContainer?.innerHTML;

      console.log('POS Printing - Container innerHTML length:', printContents?.length || 0);

      if (!printContents || printContents.trim() === "") {
        console.error('POS Printing - Empty print container');
        return;
      }

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>AquaPos Print</title>
              <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
              <style>
                @page { margin: 0; }
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
    }, 300);
  };

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Payment Handlers
  const processSaleBackend = async (method: string) => {
    setPaymentStep('process');

    if (!DATABASE_ID || !COLLECTION_SALES_ID || !COLLECTION_INVENTORY_ID) {
      console.error('POS Error: Missing IDs', { DATABASE_ID, COLLECTION_SALES_ID, COLLECTION_INVENTORY_ID });
      alert('Error: La configuración de la base de datos no está completa.');
      setPaymentStep('select');
      return;
    }

    try {
      // 1. Create Sale Document Client-Side
      const saleData = {
        customerId: activeCustomer?.$id || activeCustomer?.id || null,
        customerName: activeCustomer?.name || 'Guest',
        items: JSON.stringify(cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price }))),
        subtotal: subtotal,
        tax: tax,
        taxRate: taxRate,
        total: total,
        paymentMethod: method,
        date: new Date().toISOString()
      };

      console.log('POS Creating sale document:', saleData);
      const doc = await databases.createDocument(DATABASE_ID, COLLECTION_SALES_ID, ID.unique(), saleData);

      setProcessedSaleData({
        ...saleData,
        items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
        id: doc.$id
      });
      setPrintType('ticket');

      // 1.5 Update Customer LTV and Credit (if applicable)
      if (activeCustomer && COLLECTION_CUSTOMERS_ID) {
        try {
          console.log('POS Updating customer stats...', activeCustomer.id);
          const customerDoc = await databases.getDocument(DATABASE_ID, COLLECTION_CUSTOMERS_ID, activeCustomer.id);
          const currentLtv = parseFloat(customerDoc.ltv) || 0;
          const currentCredit = parseFloat(customerDoc.credit) || 0;

          const updateData: any = {
            ltv: currentLtv + total
          };

          if (method === 'Credit') {
            updateData.credit = currentCredit + total;
            console.log(`POS Incrementing customer credit by ${total}`);
          }

          await databases.updateDocument(DATABASE_ID, COLLECTION_CUSTOMERS_ID, activeCustomer.id, updateData);
          console.log('POS Customer stats updated successfully');
        } catch (customerUpdateError) {
          console.error('POS Error updating customer stats:', customerUpdateError);
        }
      }

      // 2. Update Inventory Stock (Sequential for safety)
      console.log('POS Updating inventory stock...');
      for (const item of cart) {
        try {
          // Fetch latest stock to be safe
          const product = await databases.getDocument(DATABASE_ID, COLLECTION_INVENTORY_ID, item.id);
          const currentStock = parseInt(product.stock) || 0;
          const newStock = Math.max(0, currentStock - item.quantity);

          await databases.updateDocument(DATABASE_ID, COLLECTION_INVENTORY_ID, item.id, {
            stock: newStock
          });
          console.log(`POS Updated stock for ${item.name}: ${newStock}`);
        } catch (stockError) {
          console.error(`POS Error updating stock for item ${item.id}:`, stockError);
          // We continue with other items even if one fails
        }
      }

      setPaymentStep('success');
      // Automatically trigger printing after success
      handlePrint('ticket');
    } catch (error: any) {
      console.error('Error processing sale client-side:', error);
      alert('Error al procesar la venta: ' + (error.message || 'Error desconocido'));
      setPaymentStep('select');
    }
  };

  const openPaymentModal = () => {
    if (cart.length === 0) return;
    setPaymentStep('select');
    setPaymentMethod(null);
    setAmountTendered('');
    setCreditInitialPayment('');
    setChangeAmount(0);
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 15);
    setCreditDueDate(defaultDate.toISOString().split('T')[0]);
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    if (paymentStep === 'success') {
      clearCart();
    }
  };

  const selectMethod = (method: 'Cash' | 'Card' | 'Credit') => {
    if (method === 'Credit' && !activeCustomer) {
      // Validation handled in UI now
      return;
    }
    setPaymentMethod(method);
    if (method === 'Card') {
      processSaleBackend('Card');
    }
  };

  const handleCashPayment = () => {
    const tendered = parseFloat(amountTendered) || 0;
    if (tendered >= total) {
      setChangeAmount(tendered - total);
      processSaleBackend('Cash');
    } else {
      alert("Amount tendered is less than total.");
    }
  };

  const handleCreditPayment = () => {
    processSaleBackend('Credit');
  };

  // Quick Cash Buttons
  const setExactCash = () => setAmountTendered(total.toFixed(2));
  const addCash = (amount: number) => {
    const current = parseFloat(amountTendered) || 0;
    setAmountTendered((current + amount).toString());
  };

  // Reusable Cart UI
  const CartContent = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {cart.map(item => (
          <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
            <div className="size-14 bg-white rounded-lg flex-shrink-0 overflow-hidden border border-slate-100">
              <img alt={item.name} className="w-full h-full object-cover" src={item.image} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
              <p className="text-xs text-slate-500">{currencySymbol}{item.price.toFixed(2)} / unit</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1">
                <button onClick={() => removeFromCart(item.id)} className="size-7 flex items-center justify-center text-slate-500 hover:text-primary active:scale-90 transition-transform">
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <span className="w-6 text-center text-sm font-black">{item.quantity}</span>
                <button onClick={() => addToCart(item)} className="size-7 flex items-center justify-center text-slate-500 hover:text-primary active:scale-90 transition-transform">
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
              <div className="w-16 text-right font-black text-slate-900">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</div>
            </div>
          </div>
        ))}
        {cart.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4 text-slate-200">shopping_bag</span>
            <p className="text-sm font-bold">Your bag is empty</p>
            <p className="text-xs">Start adding products to sell.</p>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0">
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-medium">{t('pos.subtotal')}</span>
            <span className="text-slate-900 font-bold">{currencySymbol}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-medium">{t('pos.tax')} ({taxRate}%)</span>
            <span className="text-slate-900 font-bold">{currencySymbol}{tax.toFixed(2)}</span>
          </div>
          {activeCustomer && (
            <div className="flex justify-between text-sm">
              <span className="text-primary font-bold">{t('pos.discount')} ({activeCustomer.type})</span>
              <span className="text-primary font-bold">-{currencySymbol}0.00</span>
            </div>
          )}
          <div className="pt-4 mt-4 border-t border-slate-200 flex justify-between items-end">
            <span className="text-lg font-black text-slate-900">{t('pos.total')}</span>
            <span className="text-3xl font-black text-primary">{currencySymbol}{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={generateQuote}
            disabled={cart.length === 0}
            className="flex-1 py-4 bg-slate-100 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">request_quote</span>
            {t('pos.quote')}
          </button>
          <button
            onClick={openPaymentModal}
            disabled={cart.length === 0}
            className="flex-[2] py-4 bg-primary text-white text-lg font-black rounded-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-2xl">shopping_cart_checkout</span>
            {t('pos.checkout')}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="flex h-full bg-background-light overflow-hidden relative">
        {/* Product Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4 shrink-0 justify-between">
            <div className="flex-1 max-w-xl relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                placeholder="Search products..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-2">
              {activeCustomer ? (
                <button
                  onClick={() => setActiveCustomer(null)}
                  className="flex items-center justify-center h-10 px-4 gap-2 bg-primary/10 text-primary rounded-full font-bold transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  <span className="text-sm hidden sm:inline">{activeCustomer.name}</span>
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="flex items-center justify-center size-10 bg-slate-100 text-slate-600 hover:bg-primary hover:text-white rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">person_add</span>
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
            <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar whitespace-nowrap shrink-0">
              {['All', ...categories].map(catKey => (
                <button
                  key={catKey}
                  onClick={() => setActiveCategoryKey(catKey)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${activeCategoryKey === catKey
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {getCategoryDisplay(catKey)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pt-2 pb-24 lg:pb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
                {loading ? (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                    <div className="size-12 border-4 border-slate-100 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Cargando productos...</p>
                  </div>
                ) : filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group bg-white border border-slate-200 rounded-xl p-2 flex flex-col text-left hover:border-primary hover:shadow-xl hover:shadow-primary/5 transition-all active:scale-95 relative overflow-hidden"
                  >
                    <div className="aspect-[3/4] w-full bg-slate-50 rounded-lg mb-2 overflow-hidden relative">
                      {product.lowStock && (
                        <span className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">Low</span>
                      )}
                      <img alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={product.image} />
                      <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white rounded-full p-1.5 shadow-md text-primary">
                          <span className="material-symbols-outlined text-lg block">add_shopping_cart</span>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{product.name}</h3>
                    <div className="mt-1 text-sm font-black text-slate-900">{currencySymbol}{product.price.toFixed(2)}</div>
                  </button>
                ))}
                {!loading && filteredProducts.length === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-400">
                    <span className="material-symbols-outlined text-6xl mb-4">inventory_2</span>
                    <p className="font-bold">No se encontraron productos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Cart */}
        <div className="hidden lg:flex w-96 xl:w-[420px] bg-white border-l border-slate-200 flex-col shadow-2xl z-20">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-black text-slate-900">{t('pos.currentTicket')}</h2>
            <button onClick={clearCart} className="text-slate-400 hover:text-red-500"><span className="material-symbols-outlined">delete_sweep</span></button>
          </div>
          <CartContent />
        </div>

        {/* Mobile Sticky Cart Trigger */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-[90px] left-4 right-4 z-30">
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-xl shadow-slate-900/20 border-t-4 border-primary flex items-center justify-between animate-in slide-in-from-bottom-5"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">{itemCount} items</div>
                <span className="text-sm font-medium opacity-80">View Cart</span>
              </div>
              <span className="text-xl font-bold">{currencySymbol}{total.toFixed(2)}</span>
            </button>
          </div>
        )}

        {/* Mobile Cart Sheet (Drawer) */}
        {isMobileCartOpen && (
          <div className="lg:hidden fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-white rounded-t-3xl h-[85vh] flex flex-col animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
              <div className="p-2 flex justify-center" onClick={() => setIsMobileCartOpen(false)}>
                <div className="w-12 h-1.5 bg-slate-300 rounded-full my-2"></div>
              </div>
              <div className="px-6 py-2 flex justify-between items-center border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-900">Your Bag</h2>
                <button onClick={() => setIsMobileCartOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-500">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <CartContent />
            </div>
          </div>
        )}

        {/* Customer Modal (Shared) */}
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900">{t('pos.selectCustomer')}</h3>
                <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6">
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm mb-4"
                  placeholder="Search customer..."
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button key={c.id} onClick={() => handleCustomerSelect(c)} className="w-full text-left p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200">
                      <p className="font-bold">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Improved Payment Modal */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border-t-4 border-primary">

              {/* Payment Header */}
              <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">{t('pos.total')}</h3>
                <h2 className="text-5xl font-black text-white tracking-tight">{currencySymbol}{total.toFixed(2)}</h2>
                <button onClick={closePaymentModal} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 flex-1 flex flex-col overflow-y-auto max-h-[60vh]">

                {/* STEP 1: SELECT METHOD */}
                {paymentStep === 'select' && !paymentMethod && (
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-500 text-center mb-2">{t('pos.payMethod')}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => selectMethod('Cash')} className="flex flex-col items-center justify-center p-6 bg-emerald-50 border-2 border-emerald-100 rounded-2xl hover:border-emerald-500 hover:shadow-lg transition-all group">
                        <span className="material-symbols-outlined text-4xl text-emerald-600 mb-2 group-hover:scale-110 transition-transform">payments</span>
                        <span className="font-bold text-emerald-900">{t('pos.payCash')}</span>
                      </button>
                      <button onClick={() => selectMethod('Card')} className="flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-blue-100 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all group">
                        <span className="material-symbols-outlined text-4xl text-blue-600 mb-2 group-hover:scale-110 transition-transform">credit_card</span>
                        <span className="font-bold text-blue-900">{t('pos.payCard')}</span>
                      </button>
                    </div>
                    <button
                      onClick={() => selectMethod('Credit')}
                      disabled={!activeCustomer}
                      className={`w-full flex items-center justify-center gap-3 p-4 border-2 rounded-2xl transition-all ${!activeCustomer
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-purple-50 border-purple-100 text-purple-900 hover:border-purple-500 hover:shadow-lg'
                        }`}
                    >
                      <span className="material-symbols-outlined text-2xl">receipt_long</span>
                      <span className="font-bold">{t('pos.payCredit')}</span>
                      {!activeCustomer && <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-500 ml-auto">Customer Required</span>}
                    </button>
                  </div>
                )}

                {/* STEP 2: CASH LOGIC */}
                {paymentMethod === 'Cash' && paymentStep === 'select' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => setPaymentMethod(null)}>
                      <span className="material-symbols-outlined text-slate-400">arrow_back</span>
                      <span className="text-sm font-bold text-slate-500">Back to methods</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">{t('pos.amountTendered')}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">{currencySymbol}</span>
                        <input
                          type="number"
                          autoFocus
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-4 pl-10 pr-4 text-2xl font-bold text-slate-900 focus:border-emerald-500 outline-none transition-colors"
                          value={amountTendered}
                          onChange={(e) => setAmountTendered(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[10, 20, 50, 100].map(val => (
                        <button key={val} onClick={() => addCash(val)} className="py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 text-slate-700">
                          +{currencySymbol}{val}
                        </button>
                      ))}
                      <button onClick={setExactCash} className="col-span-4 py-3 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-200">
                        Exact Amount ({currencySymbol}{total.toFixed(2)})
                      </button>
                    </div>

                    {parseFloat(amountTendered) >= total && (
                      <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center animate-in zoom-in-95">
                        <span className="font-bold text-slate-400">Change Due:</span>
                        <span className="text-2xl font-black">{currencySymbol}{(parseFloat(amountTendered) - total).toFixed(2)}</span>
                      </div>
                    )}

                    <button
                      onClick={handleCashPayment}
                      disabled={!amountTendered || parseFloat(amountTendered) < total}
                      className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:brightness-105 disabled:opacity-50 disabled:shadow-none transition-all flex justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">check_circle</span>
                      {t('pos.completePayment')}
                    </button>
                  </div>
                )}

                {/* STEP 2: CREDIT LOGIC */}
                {paymentMethod === 'Credit' && paymentStep === 'select' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => setPaymentMethod(null)}>
                      <span className="material-symbols-outlined text-slate-400">arrow_back</span>
                      <span className="text-sm font-bold text-slate-500">Back to methods</span>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center gap-3">
                      <div className="size-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                        {activeCustomer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-purple-900">{activeCustomer.name}</p>
                        <p className="text-xs text-purple-600">Assigning credit to account</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('pos.initialDeposit')}</label>
                        <input
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-purple-500"
                          value={creditInitialPayment}
                          onChange={(e) => setCreditInitialPayment(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('pos.dueDate')}</label>
                        <input
                          type="date"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-purple-500"
                          value={creditDueDate}
                          onChange={(e) => setCreditDueDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-4 border-t border-slate-100">
                      <span className="font-bold text-slate-500">{t('pos.balanceRemaining')}</span>
                      <span className="text-xl font-black text-purple-600">${(total - (parseFloat(creditInitialPayment) || 0)).toFixed(2)}</span>
                    </div>

                    <button
                      onClick={handleCreditPayment}
                      className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 hover:brightness-105 transition-all flex justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">save</span>
                      {t('pos.confirmCredit')}
                    </button>
                  </div>
                )}

                {/* PROCESSING STATE */}
                {paymentStep === 'process' && (
                  <div className="flex-1 flex flex-col items-center justify-center py-12">
                    <div className="size-20 border-4 border-slate-100 border-t-primary rounded-full animate-spin mb-6"></div>
                    <h4 className="text-xl font-bold text-slate-900">{t('pos.processing')}</h4>
                    <p className="text-slate-500 text-sm">Please wait...</p>
                  </div>
                )}

                {/* SUCCESS STATE */}
                {paymentStep === 'success' && (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95">
                    <div className="size-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
                      <span className="material-symbols-outlined text-6xl">check</span>
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 mb-2">{t('pos.success')}</h4>
                    <p className="text-slate-500 text-sm mb-4">Imprimiendo ticket...</p>

                    <div className="flex flex-col gap-2 w-full mb-8">
                      <button
                        onClick={() => handlePrint('ticket')}
                        className="text-primary font-bold text-sm hover:underline flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">print</span>
                        Re-imprimir Ticket (80mm)
                      </button>
                      <button
                        onClick={() => handlePrint('invoice')}
                        className="text-slate-400 font-bold text-xs hover:underline"
                      >
                        Ver Factura A4
                      </button>
                    </div>

                    {changeAmount > 0 && (
                      <div className="bg-slate-50 rounded-xl p-4 mb-8 w-full">
                        <p className="text-xs font-bold text-slate-400 uppercase">Change Due</p>
                        <p className="text-3xl font-black text-slate-900">${changeAmount.toFixed(2)}</p>
                      </div>
                    )}

                    <button onClick={closePaymentModal} className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg">
                      {t('pos.newOrder')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Print Container */}
      <div id="print-container" className="hidden">
        {processedSaleData && (
          <PrintTemplates
            type={printType || 'ticket'}
            data={processedSaleData}
            businessSettings={businessSettings || {}}
          />
        )}
      </div>
    </>
  );
}