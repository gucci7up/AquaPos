import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';
import { databases } from '../lib/appwrite';
import { Query } from 'appwrite';

// ─── Appwrite Config ────────────────────────────────────────────────────────
const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COL_SALES = import.meta.env.VITE_APPWRITE_COLLECTION_SALES_ID || 'sales';
const COL_INVENTORY = import.meta.env.VITE_APPWRITE_COLLECTION_INVENTORY_ID || 'inventory';
const COL_CUSTOMERS = import.meta.env.VITE_APPWRITE_COLLECTION_CUSTOMERS_ID || 'customers';
const COL_PAYMENTS = import.meta.env.VITE_APPWRITE_COLLECTION_PAYMENTS_ID || 'payments';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function fetchAll(dbId: string, colId: string, queries: string[] = []) {
  const limit = 100;
  let offset = 0;
  let docs: any[] = [];
  while (true) {
    const res = await databases.listDocuments(dbId, colId, [
      ...queries,
      Query.limit(limit),
      Query.offset(offset),
    ]);
    docs = [...docs, ...res.documents];
    if (docs.length >= res.total || res.documents.length < limit) break;
    offset += limit;
  }
  return docs;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'ai';
  text: string;
  time: string;
}

interface AppData {
  sales: any[];
  inventory: any[];
  customers: any[];
  payments: any[];
}

// ─── AI Engine: build context-aware response from real data ──────────────────
function buildAiResponse(question: string, data: AppData, lang: string): string {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isEs = lang === 'es';

  // Helper: safe numeric
  const num = (v: any) => Number(v) || 0;

  // ── Computed metrics ─────────────────────────────────────────────────────
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const salesThisMonth = data.sales.filter(s => {
    const d = new Date(s.date || s.$createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const totalRevenue = salesThisMonth.reduce((a, s) => a + num(s.total), 0);
  const totalSalesAll = data.sales.reduce((a, s) => a + num(s.total), 0);

  // Top selling products (by frequency in sales items)
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  data.sales.forEach(sale => {
    try {
      const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
      items.forEach((item: any) => {
        const key = item.id || item.name;
        if (!productSales[key]) productSales[key] = { name: item.name, qty: 0, revenue: 0 };
        productSales[key].qty += num(item.quantity);
        productSales[key].revenue += num(item.price) * num(item.quantity);
      });
    } catch { }
  });
  const topSellers = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Low stock items
  const lowStock = data.inventory
    .filter(p => num(p.stock) <= (num(p.lowStockAlert) || 5) && num(p.stock) >= 0)
    .sort((a, b) => num(a.stock) - num(b.stock));

  // Out of stock
  const outOfStock = data.inventory.filter(p => num(p.stock) === 0);

  // Customers with pending credit (debt)
  const debtCustomers = data.customers
    .filter(c => num(c.credit) > 0)
    .sort((a, b) => num(b.credit) - num(a.credit));
  const totalDebt = debtCustomers.reduce((a, c) => a + num(c.credit), 0);

  // Total abonos (payments)
  const totalAbonos = data.payments.reduce((a, p) => a + num(p.amount), 0);

  // Inventory value
  const inventoryCost = data.inventory.reduce((a, p) => a + num(p.cost) * num(p.stock), 0);
  const inventoryRetail = data.inventory.reduce((a, p) => a + num(p.price) * num(p.stock), 0);

  // Best margin products
  const marginProducts = data.inventory
    .filter(p => num(p.price) > 0 && num(p.cost) > 0)
    .map(p => ({
      name: p.name,
      margin: ((num(p.price) - num(p.cost)) / num(p.price)) * 100,
      price: num(p.price),
      cost: num(p.cost),
    }))
    .sort((a, b) => b.margin - a.margin);

  // ── Match question intent ────────────────────────────────────────────────
  // Sales / Revenue
  if (/venta|sale|revenue|ingreso|facturacion|facturaci/.test(q)) {
    const n = salesThisMonth.length;
    const topName = topSellers[0]?.name || (isEs ? 'N/A' : 'N/A');
    if (isEs) {
      return `📊 **Ventas del mes actual:** RD$${fmt(totalRevenue)} en ${n} transacciones.\n\n🏆 **Producto líder:** ${topName} (RD$${fmt(topSellers[0]?.revenue || 0)}).\n\n📈 **Total histórico en el sistema:** RD$${fmt(totalSalesAll)} en ${data.sales.length} ventas.`;
    }
    return `📊 **This month's sales:** $${fmt(totalRevenue)} across ${n} transactions.\n\n🏆 **Top product:** ${topName} ($${fmt(topSellers[0]?.revenue || 0)}).\n\n📈 **All-time total:** $${fmt(totalSalesAll)} across ${data.sales.length} sales.`;
  }

  // Top products / best sellers
  if (/top|mejor|best|lider|vendido|popular|mas vendido/.test(q)) {
    const list = topSellers.slice(0, 5)
      .map((p, i) => `${i + 1}. **${p.name}** — ${isEs ? 'RD$' : '$'}${fmt(p.revenue)} (${p.qty} ${isEs ? 'uds' : 'units'})`)
      .join('\n');
    return isEs
      ? `🏆 **Top 5 productos más vendidos:**\n\n${list}`
      : `🏆 **Top 5 best-selling products:**\n\n${list}`;
  }

  // Stock / inventory / low stock
  if (/stock|inventario|inventory|bajo|low|agotado|out of stock|existencia/.test(q)) {
    const outList = outOfStock.slice(0, 5).map(p => `• **${p.name}** — ${isEs ? 'Sin stock' : 'No stock'}`).join('\n');
    const lowList = lowStock.slice(0, 5).map(p => `• **${p.name}** — ${p.stock} ${isEs ? 'uds' : 'units'}`).join('\n');
    const total = data.inventory.reduce((a, p) => a + num(p.stock), 0);
    if (isEs) {
      return `📦 **Inventario total:** ${data.inventory.length} productos, ${total.toLocaleString()} unidades.\n\n🔴 **Sin stock (${outOfStock.length}):**\n${outList || 'Ninguno'}\n\n⚠️ **Stock bajo (${lowStock.length}):**\n${lowList || 'Ninguno'}`;
    }
    return `📦 **Total inventory:** ${data.inventory.length} products, ${total.toLocaleString()} units.\n\n🔴 **Out of stock (${outOfStock.length}):**\n${outList || 'None'}\n\n⚠️ **Low stock (${lowStock.length}):**\n${lowList || 'None'}`;
  }

  // Customers / clients
  if (/cliente|customer|credito|credit|deuda|debt|cxc/.test(q)) {
    const topDebtors = debtCustomers.slice(0, 5)
      .map(c => `• **${c.name}** — ${isEs ? 'RD$' : '$'}${fmt(num(c.credit))}`)
      .join('\n');
    if (isEs) {
      return `👥 **Clientes:** ${data.customers.length} registrados.\n\n💳 **Crédito pendiente total:** RD$${fmt(totalDebt)} en ${debtCustomers.length} clientes.\n\n🔴 **Mayores deudas:**\n${topDebtors || 'Sin deudas pendientes'}`;
    }
    return `👥 **Customers:** ${data.customers.length} registered.\n\n💳 **Total pending credit:** $${fmt(totalDebt)} across ${debtCustomers.length} customers.\n\n🔴 **Largest balances:**\n${topDebtors || 'No pending debts'}`;
  }

  // Payments / abonos
  if (/abon|pago|payment|cobr|recauda/.test(q)) {
    const thisMonthPayments = data.payments.filter(p => {
      const d = new Date(p.date || p.$createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const monthPay = thisMonthPayments.reduce((a, p) => a + num(p.amount), 0);
    if (isEs) {
      return `💰 **Abonos recibidos este mes:** RD$${fmt(monthPay)} en ${thisMonthPayments.length} pagos.\n\n📊 **Total histórico de abonos:** RD$${fmt(totalAbonos)} en ${data.payments.length} pagos.\n\n💳 **Crédito pendiente total:** RD$${fmt(totalDebt)}`;
    }
    return `💰 **Payments received this month:** $${fmt(monthPay)} across ${thisMonthPayments.length} payments.\n\n📊 **All-time payments:** $${fmt(totalAbonos)} across ${data.payments.length} payments.\n\n💳 **Total pending credit:** $${fmt(totalDebt)}`;
  }

  // Margin / profit / rentabilidad
  if (/margen|margin|profit|rentab|ganancia|beneficio/.test(q)) {
    const top3 = marginProducts.slice(0, 3)
      .map(p => `• **${p.name}** — ${p.margin.toFixed(1)}% (${isEs ? 'Costo' : 'Cost'}: ${isEs ? 'RD$' : '$'}${fmt(p.cost)}, ${isEs ? 'Precio' : 'Price'}: ${isEs ? 'RD$' : '$'}${fmt(p.price)})`)
      .join('\n');
    const potentialProfit = inventoryRetail - inventoryCost;
    if (isEs) {
      return `📈 **Valor inventario al costo:** RD$${fmt(inventoryCost)}\n📈 **Valor inventario a precio venta:** RD$${fmt(inventoryRetail)}\n💡 **Ganancia potencial:** RD$${fmt(potentialProfit)}\n\n🥇 **Productos con mejor margen:**\n${top3}`;
    }
    return `📈 **Inventory value at cost:** $${fmt(inventoryCost)}\n📈 **Inventory value at retail:** $${fmt(inventoryRetail)}\n💡 **Potential profit:** $${fmt(potentialProfit)}\n\n🥇 **Highest margin products:**\n${top3}`;
  }

  // Inventory value / valoracion
  if (/valor.*invent|invent.*valor|inventory.*value|value.*invent/.test(q)) {
    if (isEs) {
      return `📦 **Valor inventario al costo:** RD$${fmt(inventoryCost)}\n📦 **Valor inventario a precio retail:** RD$${fmt(inventoryRetail)}\n💡 **Ganancia potencial si vendes todo:** RD$${fmt(inventoryRetail - inventoryCost)}`;
    }
    return `📦 **Inventory value at cost:** $${fmt(inventoryCost)}\n📦 **Inventory value at retail:** $${fmt(inventoryRetail)}\n💡 **Potential profit if all sold:** $${fmt(inventoryRetail - inventoryCost)}`;
  }

  // Summary / resumen
  if (/resumen|summary|panorama|overview|general|hola|hello|hi|ayuda|help|que puedes/.test(q)) {
    if (isEs) {
      return `👋 ¡Hola! Soy **AquaAI**, tu asistente de inteligencia de negocio.\n\nEstoy conectado a tu empresa en tiempo real. Aquí tienes el panorama actual:\n\n📊 **Ventas este mes:** RD$${fmt(totalRevenue)}\n📦 **Productos en inventario:** ${data.inventory.length} (${outOfStock.length} sin stock)\n👥 **Clientes registrados:** ${data.customers.length}\n💳 **Crédito pendiente:** RD$${fmt(totalDebt)}\n💰 **Abonos históricos:** RD$${fmt(totalAbonos)}\n\n💡 Puedes preguntarme sobre ventas, inventario, clientes, márgenes, pagos o cualquier dato de tu negocio.`;
    }
    return `👋 Hello! I'm **AquaAI**, your business intelligence assistant.\n\nI'm connected to your business in real time. Here's the current overview:\n\n📊 **Sales this month:** $${fmt(totalRevenue)}\n📦 **Inventory products:** ${data.inventory.length} (${outOfStock.length} out of stock)\n👥 **Registered customers:** ${data.customers.length}\n💳 **Pending credit:** $${fmt(totalDebt)}\n💰 **Total payments received:** $${fmt(totalAbonos)}\n\n💡 Ask me about sales, inventory, customers, margins, payments, or any business data.`;
  }

  // Default
  if (isEs) {
    return `🤔 Entend\u00ed tu pregunta pero no pude encontrar datos espec\u00edficos. Puedes preguntarme sobre:\n\n• **Ventas** (revenue, ingresos, transacciones)\n• **Inventario** (stock, productos, bajo stock)\n• **Clientes** (deudas, crédito, CxC)\n• **Pagos / Abonos**\n• **Márgenes y rentabilidad**\n• **Resumen general**`;
  }
  return `🤔 I understood your question but couldn't find specific data. You can ask me about:\n\n• **Sales** (revenue, transactions)\n• **Inventory** (stock, products, low stock)\n• **Customers** (debt, credit, receivables)\n• **Payments / Abonos**\n• **Margins and profitability**\n• **General summary**`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InsightCard({
  icon, color, title, value, sub, tag, tagColor
}: {
  icon: string; color: string; title: string;
  value: string; sub?: string; tag?: string; tagColor?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 p-4 opacity-10`}>
        <span className={`material-symbols-outlined text-5xl text-${color}-500`}>{icon}</span>
      </div>
      <div className={`size-10 rounded-xl bg-${color}-100 text-${color}-600 flex items-center justify-center mb-3`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="text-xs text-slate-500 font-medium mb-1">{title}</p>
      <p className="text-2xl font-black text-slate-900 leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      {tag && <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-black uppercase ${tagColor || 'bg-slate-100 text-slate-500'}`}>{tag}</span>}
    </div>
  );
}

function AlertRow({
  icon, label, value, level
}: { icon: string; label: string; value: string; level: 'danger' | 'warning' | 'ok' }) {
  const colors = { danger: 'text-red-600 bg-red-50 border-red-100', warning: 'text-amber-600 bg-amber-50 border-amber-100', ok: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  const iconColors = { danger: 'text-red-500', warning: 'text-amber-500', ok: 'text-emerald-500' };
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${colors[level]}`}>
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined text-lg ${iconColors[level]}`}>{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <span className="font-black">{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AquaAI() {
  const { t, language } = useLanguage();
  const isEs = language === 'es';

  // Data
  const [data, setData] = useState<AppData>({ sales: [], inventory: [], customers: [], payments: [] });
  const [loading, setLoading] = useState(true);

  // Chat
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch all data on mount
  useEffect(() => {
    if (!DB_ID) { setLoading(false); return; }
    Promise.all([
      fetchAll(DB_ID, COL_SALES),
      fetchAll(DB_ID, COL_INVENTORY),
      fetchAll(DB_ID, COL_CUSTOMERS),
      fetchAll(DB_ID, COL_PAYMENTS),
    ]).then(([sales, inventory, customers, payments]) => {
      setData({ sales, inventory, customers, payments });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiTyping]);

  // ── Computed Insights from real data ───────────────────────────────────────
  const insights = useMemo(() => {
    const num = (v: any) => Number(v) || 0;
    const now = new Date();
    const m = now.getMonth(), y = now.getFullYear();

    const salesMonth = data.sales.filter(s => {
      const d = new Date(s.date || s.$createdAt);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const revenue = salesMonth.reduce((a, s) => a + num(s.total), 0);
    const allRevenue = data.sales.reduce((a, s) => a + num(s.total), 0);

    // Top sellers
    const ps: Record<string, { name: string; qty: number; revenue: number }> = {};
    data.sales.forEach(sale => {
      try {
        const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
        items.forEach((item: any) => {
          const k = item.id || item.name;
          if (!ps[k]) ps[k] = { name: item.name, qty: 0, revenue: 0 };
          ps[k].qty += num(item.quantity);
          ps[k].revenue += num(item.price) * num(item.quantity);
        });
      } catch { }
    });
    const topSellers = Object.values(ps).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Low stock
    const lowStock = data.inventory
      .filter(p => num(p.stock) > 0 && num(p.stock) <= (num(p.lowStockAlert) || 5))
      .sort((a, b) => num(a.stock) - num(b.stock))
      .slice(0, 5);

    const outOfStock = data.inventory.filter(p => num(p.stock) === 0).slice(0, 5);

    // Credit
    const debtors = data.customers
      .filter(c => num(c.credit) > 0)
      .sort((a, b) => num(b.credit) - num(a.credit))
      .slice(0, 5);
    const totalDebt = data.customers.reduce((a, c) => a + num(c.credit), 0);
    const totalAbonos = data.payments.reduce((a, p) => a + num(p.amount), 0);

    // Inventory value
    const inventoryCost = data.inventory.reduce((a, p) => a + num(p.cost) * num(p.stock), 0);
    const inventoryRetail = data.inventory.reduce((a, p) => a + num(p.price) * num(p.stock), 0);

    // Best margin products
    const bestMargin = data.inventory
      .filter(p => num(p.price) > 0 && num(p.cost) > 0)
      .map(p => ({ name: p.name, margin: ((num(p.price) - num(p.cost)) / num(p.price)) * 100, stock: num(p.stock) }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 3);

    return { revenue, allRevenue, salesMonth, topSellers, lowStock, outOfStock, debtors, totalDebt, totalAbonos, inventoryCost, inventoryRetail, bestMargin };
  }, [data]);

  // ── Chat handler ───────────────────────────────────────────────────────────
  const handleChat = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isAiTyping) return;
    const userMsg = chatInput.trim();
    const now = new Date().toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg, time: now }]);
    setChatInput('');
    setIsAiTyping(true);

    setTimeout(() => {
      const response = loading
        ? (isEs ? 'Todavía estoy cargando los datos del negocio, intenta en un momento.' : 'Still loading business data, please try in a moment.')
        : buildAiResponse(userMsg, data, language);
      const aiTime = new Date().toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
      setChatHistory(prev => [...prev, { role: 'ai', text: response, time: aiTime }]);
      setIsAiTyping(false);
    }, 900);
  };

  const quickQuestions = isEs
    ? ['¿Cuáles son mis productos más vendidos?', '¿Qué productos tienen bajo stock?', '¿Cuánto crédito pendiente hay?', '¿Cuáles son mis márgenes de ganancia?']
    : ['What are my best-selling products?', 'Which products have low stock?', 'How much pending credit is there?', 'What are my profit margins?'];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-none">{t('ai.title')}</h2>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {loading
                ? (isEs ? 'Cargando datos…' : 'Loading data…')
                : (isEs
                  ? `${data.sales.length} ventas · ${data.inventory.length} productos · ${data.customers.length} clientes`
                  : `${data.sales.length} sales · ${data.inventory.length} products · ${data.customers.length} customers`
                )
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
            <span className={`size-1.5 rounded-full bg-primary ${loading ? 'animate-pulse' : ''}`}></span>
            {loading ? (isEs ? 'Conectando…' : 'Connecting…') : (isEs ? 'Conectado' : 'Connected')}
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <UserMenu />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 pb-36 space-y-8">

        {/* KPI Quick Stats */}
        <section>
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            {isEs ? '📊 Métricas en Tiempo Real' : '📊 Real-Time Metrics'}
          </h3>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <InsightCard
                icon="payments" color="emerald"
                title={isEs ? 'Ventas este mes' : 'Sales this month'}
                value={`$${fmt(insights.revenue)}`}
                sub={`${insights.salesMonth.length} ${isEs ? 'transacciones' : 'transactions'}`}
              />
              <InsightCard
                icon="inventory_2" color="blue"
                title={isEs ? 'Productos en stock' : 'Products in stock'}
                value={`${data.inventory.length}`}
                sub={`${insights.outOfStock.length} ${isEs ? 'sin stock' : 'out of stock'}`}
                tag={insights.outOfStock.length > 0 ? (isEs ? 'Alerta' : 'Alert') : undefined}
                tagColor={insights.outOfStock.length > 0 ? 'bg-red-100 text-red-600' : undefined}
              />
              <InsightCard
                icon="credit_card_off" color="red"
                title={isEs ? 'Crédito pendiente' : 'Pending credit'}
                value={`$${fmt(insights.totalDebt)}`}
                sub={`${insights.debtors.length} ${isEs ? 'clientes' : 'customers'}`}
                tag={insights.totalDebt > 0 ? 'CxC' : undefined}
                tagColor="bg-red-100 text-red-600"
              />
              <InsightCard
                icon="savings" color="violet"
                title={isEs ? 'Ganancia potencial inventario' : 'Inventory potential gain'}
                value={`$${fmt(insights.inventoryRetail - insights.inventoryCost)}`}
                sub={`${isEs ? 'Retail' : 'Retail'}: $${fmt(insights.inventoryRetail)}`}
              />
            </div>
          )}
        </section>

        {/* Alerts Grid */}
        {!loading && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stock Alerts */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-red-500">warning</span>
                <h4 className="font-bold text-slate-900 text-sm">{isEs ? 'Alertas de Stock' : 'Stock Alerts'}</h4>
                {(insights.outOfStock.length + insights.lowStock.length) > 0 && (
                  <span className="ml-auto text-xs font-black px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                    {insights.outOfStock.length + insights.lowStock.length}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {insights.outOfStock.length === 0 && insights.lowStock.length === 0 ? (
                  <AlertRow icon="check_circle" label={isEs ? 'Todo el inventario OK' : 'All inventory OK'} value="✓" level="ok" />
                ) : (
                  <>
                    {insights.outOfStock.map(p => (
                      <AlertRow key={p.$id} icon="remove_shopping_cart" label={p.name} value={isEs ? 'Sin stock' : 'No stock'} level="danger" />
                    ))}
                    {insights.lowStock.map(p => (
                      <AlertRow key={p.$id} icon="inventory" label={p.name} value={`${p.stock} ${isEs ? 'uds' : 'units'}`} level="warning" />
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Top Sellers */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-emerald-500">trending_up</span>
                <h4 className="font-bold text-slate-900 text-sm">{isEs ? 'Top Productos' : 'Top Products'}</h4>
              </div>
              <div className="space-y-3">
                {insights.topSellers.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">{isEs ? 'Sin ventas registradas' : 'No sales recorded'}</p>
                ) : (
                  insights.topSellers.map((p, i) => {
                    const maxRev = insights.topSellers[0]?.revenue || 1;
                    const pct = (p.revenue / maxRev) * 100;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700 truncate max-w-[60%]">{i + 1}. {p.name}</span>
                          <span className="font-bold text-slate-900">${fmt(p.revenue)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Credit Risk */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-amber-500">account_balance_wallet</span>
                <h4 className="font-bold text-slate-900 text-sm">{isEs ? 'Clientes con Saldo' : 'Customer Balances'}</h4>
                <span className="ml-auto text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  ${fmt(insights.totalDebt)}
                </span>
              </div>
              <div className="space-y-2">
                {insights.debtors.length === 0 ? (
                  <AlertRow icon="check_circle" label={isEs ? 'Sin crédito pendiente' : 'No pending credit'} value="✓" level="ok" />
                ) : (
                  insights.debtors.map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {c.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{c.name}</span>
                      </div>
                      <span className="text-sm font-bold text-red-600">${fmt(Number(c.credit) || 0)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* Best Margin Products */}
        {!loading && insights.bestMargin.length > 0 && (
          <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
              <h4 className="font-bold">{isEs ? 'Productos con Mayor Margen' : 'Highest Margin Products'}</h4>
              <span className="ml-auto text-xs text-slate-400">{isEs ? 'Potencial de rentabilidad' : 'Profitability potential'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {insights.bestMargin.map((p, i) => (
                <div key={i} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-bold leading-tight">{p.name}</p>
                    <span className="text-primary font-black text-lg leading-none">{p.margin.toFixed(0)}%</span>
                  </div>
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(p.margin, 100)}%` }} />
                  </div>
                  <p className="text-xs text-slate-400">{p.stock} {isEs ? 'en stock' : 'in stock'}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* CHAT PANEL (floating) */}
      <div className="absolute bottom-0 left-0 right-0 z-50">

        {/* Chat history bubble */}
        {chatHistory.length > 0 && (
          <div className="max-w-4xl mx-auto px-6 mb-2">
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-t-2xl max-h-[45vh] overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                      ? 'bg-slate-100 text-slate-800 rounded-br-sm'
                      : 'bg-primary/8 border border-primary/20 text-slate-800 rounded-bl-sm'
                    }`}>
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-1.5 mb-2 text-primary text-[10px] font-black uppercase tracking-wider">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        AquaAI · {msg.time}
                      </div>
                    )}
                    {/* Render markdown-like bold */}
                    <div className="whitespace-pre-line">
                      {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                        part.startsWith('**') && part.endsWith('**')
                          ? <strong key={i}>{part.slice(2, -2)}</strong>
                          : part
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <p className="text-[10px] text-slate-400 mt-1 text-right">{msg.time}</p>
                    )}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex gap-1.5 items-center shadow-sm">
                    <span className="size-2 bg-primary rounded-full animate-bounce"></span>
                    <span className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                    <span className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {/* Quick Questions (only if no chat yet) */}
        {chatHistory.length === 0 && !loading && (
          <div className="max-w-4xl mx-auto px-6 mb-3">
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setChatInput(q); }}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 font-medium hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="bg-gradient-to-t from-[#f6f8f8] via-[#f6f8f8]/95 to-transparent pb-6 px-6 pt-3">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleChat} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-ai-glow to-primary rounded-2xl blur opacity-20 group-hover:opacity-50 transition duration-700"></div>
              <div className="relative flex items-center bg-white rounded-2xl border border-primary/30 shadow-xl p-2 pl-5">
                <span className={`material-symbols-outlined text-primary text-xl mr-3 ${loading ? 'animate-spin' : 'animate-pulse'}`}>
                  {loading ? 'sync' : 'auto_awesome'}
                </span>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat()}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-base outline-none"
                  placeholder={loading
                    ? (isEs ? 'Cargando datos del negocio…' : 'Loading business data…')
                    : (isEs ? 'Pregunta algo sobre tu negocio…' : 'Ask something about your business…')
                  }
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isAiTyping || loading}
                  className="bg-primary text-white size-11 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-40 disabled:scale-100"
                >
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}