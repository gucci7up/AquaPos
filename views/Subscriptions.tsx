import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';
import { databases, Query, ID } from '@/lib/appwrite';

// ── Appwrite config ──────────────────────────────────────────────────────────
const DB = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COL = import.meta.env.VITE_APPWRITE_COLLECTION_SUBSCRIPTIONS_ID || 'subscriptions';
const COL_CUS = import.meta.env.VITE_APPWRITE_COLLECTION_CUSTOMERS_ID || 'customers';

// ── Static config ────────────────────────────────────────────────────────────
const PLANS = [
    { name: 'Básico', price: 500, color: 'bg-slate-100 text-slate-700' },
    { name: 'Profesional', price: 1200, color: 'bg-blue-100 text-blue-700' },
    { name: 'Empresarial', price: 2500, color: 'bg-primary/10 text-primary' },
    { name: 'Personalizado', price: 0, color: 'bg-purple-100 text-purple-700' },
];

const CYCLES = ['Mensual', 'Bimestral', 'Trimestral', 'Anual'];
const STATUSES = ['Activo', 'Pendiente', 'Vencido', 'Cancelado', 'Pausado'];

const safeNum = (v: any) => Number(v) || 0;
const fmt = (n: number) =>
    n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Helpers ──────────────────────────────────────────────────────────────────
function addMonths(date: Date, months: number) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

function nextBillingDate(startDate: string, cycle: string): string {
    const today = new Date();
    let next = new Date(startDate);
    const monthsMap: Record<string, number> = {
        Mensual: 1, Bimestral: 2, Trimestral: 3, Anual: 12,
    };
    const months = monthsMap[cycle] || 1;
    while (next <= today) next = addMonths(next, months);
    return next.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Subscriptions() {
    const { t } = useLanguage();

    // Data
    const [subs, setSubs] = useState<any[]>([]);
    const [customers, setCus] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // UI state
    const [search, setSearch] = useState('');
    const [filterStatus, setFilter] = useState('Todos');
    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    // Form
    const blank = {
        customerId: '',
        customerName: '',
        plan: 'Básico',
        price: 500,
        cycle: 'Mensual',
        status: 'Activo',
        startDate: new Date().toISOString().split('T')[0],
        notes: '',
    };
    const [form, setForm] = useState<any>(blank);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        if (!DB) { setLoading(false); return; }
        setLoading(true);
        try {
            const [subsRes, cusRes] = await Promise.allSettled([
                databases.listDocuments(DB, COL, [Query.orderDesc('$createdAt'), Query.limit(200)]),
                databases.listDocuments(DB, COL_CUS, [Query.limit(100)]),
            ]);
            setSubs(subsRes.status === 'fulfilled' ? subsRes.value.documents : []);
            setCus(cusRes.status === 'fulfilled' ? cusRes.value.documents : []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Metrics ────────────────────────────────────────────────────────────────
    const metrics = useMemo(() => {
        const active = subs.filter(s => s.status === 'Activo');
        const vencido = subs.filter(s => s.status === 'Vencido');
        const cycleToMonths: Record<string, number> = { Mensual: 1, Bimestral: 2, Trimestral: 3, Anual: 12 };
        const mrr = active.reduce((acc, s) => {
            const months = cycleToMonths[s.cycle] || 1;
            return acc + safeNum(s.price) / months;
        }, 0);
        return {
            total: subs.length,
            active: active.length,
            vencido: vencido.length,
            mrr,
            arr: mrr * 12,
        };
    }, [subs]);

    // ── Filtering ──────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return subs.filter(s => {
            const name = (s.customerName || '').toLowerCase();
            const id = (s.$id || '').toLowerCase();
            const q = search.toLowerCase();
            const matchSearch = name.includes(q) || id.includes(q);
            const matchStatus = filterStatus === 'Todos' || s.status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [subs, search, filterStatus]);

    // ── Plan price auto-fill ───────────────────────────────────────────────────
    const onPlanChange = (planName: string) => {
        const found = PLANS.find(p => p.name === planName);
        setForm((f: any) => ({ ...f, plan: planName, price: found?.price ?? f.price }));
    };

    const onCustomerChange = (id: string) => {
        const cus = customers.find(c => c.$id === id);
        setForm((f: any) => ({
            ...f,
            customerId: id,
            customerName: cus ? (cus.name || cus.customerName || '') : '',
        }));
    };

    // ── CRUD ───────────────────────────────────────────────────────────────────
    const openNew = () => {
        setEditing(null);
        setForm(blank);
        setIsOpen(true);
    };

    const openEdit = (sub: any) => {
        setEditing(sub);
        setForm({
            customerId: sub.customerId || '',
            customerName: sub.customerName || '',
            plan: sub.plan || 'Básico',
            price: safeNum(sub.price),
            cycle: sub.cycle || 'Mensual',
            status: sub.status || 'Activo',
            startDate: sub.startDate || new Date().toISOString().split('T')[0],
            notes: sub.notes || '',
        });
        setIsOpen(true);
    };

    const handleSave = async () => {
        if (!DB) return;
        if (!form.customerName.trim()) { alert('Ingresa el nombre del cliente'); return; }
        setSaving(true);
        try {
            const payload = {
                customerId: form.customerId || '',
                customerName: form.customerName || '',
                plan: form.plan,
                price: safeNum(form.price),
                cycle: form.cycle,
                status: form.status,
                startDate: form.startDate,
                notes: form.notes || '',
            };
            if (editing) {
                await databases.updateDocument(DB, COL, editing.$id, payload);
            } else {
                await databases.createDocument(DB, COL, ID.unique(), payload);
            }
            await load();
            setIsOpen(false);
        } catch (e: any) {
            alert('Error al guardar: ' + (e.message || 'Error desconocido'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta suscripción?')) return;
        try {
            await databases.deleteDocument(DB, COL, id);
            setSubs(prev => prev.filter(s => s.$id !== id));
        } catch (e: any) {
            alert('Error: ' + (e.message || 'Error desconocido'));
        }
    };

    const handleStatusToggle = async (sub: any, newStatus: string) => {
        try {
            await databases.updateDocument(DB, COL, sub.$id, { status: newStatus });
            setSubs(prev => prev.map(s => s.$id === sub.$id ? { ...s, status: newStatus } : s));
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    // ── Status styling ─────────────────────────────────────────────────────────
    const statusColor = (s: string) => {
        if (s === 'Activo') return 'bg-emerald-100 text-emerald-700';
        if (s === 'Pendiente') return 'bg-amber-100 text-amber-700';
        if (s === 'Vencido') return 'bg-red-100 text-red-700';
        if (s === 'Pausado') return 'bg-amber-100 text-amber-700';
        if (s === 'Cancelado') return 'bg-slate-100 text-slate-500';
        return 'bg-slate-100 text-slate-600';
    };

    const planColor = (p: string) => {
        return PLANS.find(pl => pl.name === p)?.color || 'bg-slate-100 text-slate-600';
    };

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-5xl text-primary animate-spin">sync</span>
                    <p className="text-slate-500 font-medium">Cargando suscripciones…</p>
                </div>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-slate-50">

            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-lg">repeat</span>
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900 leading-none">Suscripciones</h2>
                        <p className="text-xs text-slate-400">Gestión de servicios recurrentes</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={load}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                    </button>
                    <button
                        onClick={openNew}
                        className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Nueva Suscripción
                    </button>
                    <div className="h-8 w-px bg-slate-200" />
                    <UserMenu />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <KPICard icon="payments" color="primary" label="MRR" value={`RD$${fmt(metrics.mrr)}`} />
                    <KPICard icon="trending_up" color="emerald" label="ARR Proyectado" value={`RD$${fmt(metrics.arr)}`} />
                    <KPICard icon="check_circle" color="blue" label="Suscriptores Activos" value={String(metrics.active)} />
                    <KPICard icon="warning" color="amber" label="Vencidas" value={String(metrics.vencido)} />
                    <KPICard icon="dns" color="slate" label="Total" value={String(metrics.total)} />
                </div>

                {/* ── Controls ── */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 w-72"
                            placeholder="Buscar cliente o suscripción…"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {['Todos', ...STATUSES].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {filtered.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Plan</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Monto</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Ciclo</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Próx. Cobro</th>
                                        <th className="px-6 py-3 text-right" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map(sub => {
                                        const initials = (sub.customerName || 'NN').split(' ').map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2);
                                        const nextBilling = sub.startDate ? nextBillingDate(sub.startDate, sub.cycle) : '—';

                                        return (
                                            <tr key={sub.$id} className="hover:bg-slate-50/60 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-sm">{sub.customerName || 'Sin nombre'}</p>
                                                            <p className="text-xs text-slate-400 font-mono">#{sub.$id.slice(0, 8)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${planColor(sub.plan)}`}>
                                                        {sub.plan}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-slate-900 text-sm">RD${fmt(safeNum(sub.price))}</p>
                                                    <p className="text-xs text-slate-400">{sub.cycle}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{sub.cycle}</td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={sub.status}
                                                        onChange={e => handleStatusToggle(sub, e.target.value)}
                                                        className={`px-2.5 py-1 rounded-full text-xs font-bold border-0 outline-none cursor-pointer ${statusColor(sub.status)}`}
                                                    >
                                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{nextBilling}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEdit(sub)}
                                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
                                                            title="Editar"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(sub.$id)}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-16 text-center">
                            <span className="material-symbols-outlined text-6xl text-slate-200 block mb-3">repeat</span>
                            <p className="font-bold text-slate-600 mb-1">
                                {search ? `Sin resultados para "${search}"` : 'No hay suscripciones registradas'}
                            </p>
                            <p className="text-sm text-slate-400 mb-5">
                                {search ? 'Intenta otra búsqueda' : 'Crea la primera suscripción para un cliente'}
                            </p>
                            {!search && (
                                <button
                                    onClick={openNew}
                                    className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:brightness-105 transition-all"
                                >
                                    + Nueva Suscripción
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* ── Modal ── */}
            {isOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

                        {/* Modal header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary">repeat</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900">
                                    {editing ? 'Editar Suscripción' : 'Nueva Suscripción'}
                                </h3>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="p-6 space-y-5 overflow-y-auto flex-1">

                            {/* Cliente */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente *</label>
                                {customers.length > 0 ? (
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                        value={form.customerId}
                                        onChange={e => onCustomerChange(e.target.value)}
                                    >
                                        <option value="">— Seleccionar cliente —</option>
                                        {customers.map((c: any) => (
                                            <option key={c.$id} value={c.$id}>{c.name || c.customerName || c.$id}</option>
                                        ))}
                                    </select>
                                ) : null}
                                <input
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                    placeholder="Nombre del cliente (o escribe manualmente)"
                                    value={form.customerName}
                                    onChange={e => setForm((f: any) => ({ ...f, customerName: e.target.value }))}
                                />
                            </div>

                            {/* Plan + Precio */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                        value={form.plan}
                                        onChange={e => onPlanChange(e.target.value)}
                                    >
                                        {PLANS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio (RD$)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="50"
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                        value={form.price}
                                        onChange={e => setForm((f: any) => ({ ...f, price: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>

                            {/* Ciclo + Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ciclo de cobro</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                        value={form.cycle}
                                        onChange={e => setForm((f: any) => ({ ...f, cycle: e.target.value }))}
                                    >
                                        {CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                        value={form.status}
                                        onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}
                                    >
                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Fecha inicio */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha de inicio</label>
                                <input
                                    type="date"
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                    value={form.startDate}
                                    onChange={e => setForm((f: any) => ({ ...f, startDate: e.target.value }))}
                                />
                            </div>

                            {/* Notas */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notas (opcional)</label>
                                <textarea
                                    rows={2}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                    placeholder="Descripción del servicio, condiciones especiales…"
                                    value={form.notes}
                                    onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                                />
                            </div>

                            {/* Preview */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Resumen</p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">{form.plan} · {form.cycle}</span>
                                    <span className="font-black text-slate-900">RD${fmt(safeNum(form.price))}</span>
                                </div>
                                {form.startDate && (
                                    <p className="text-xs text-slate-400 mt-1">
                                        Próximo cobro: {nextBillingDate(form.startDate, form.cycle)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Modal footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2.5 border border-slate-200 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-105 transition-all text-sm flex items-center gap-2 disabled:opacity-60"
                            >
                                {saving && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                                {editing ? 'Guardar Cambios' : 'Crear Suscripción'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
    const colorMap: Record<string, string> = {
        primary: 'bg-primary/10 text-primary',
        emerald: 'bg-emerald-100 text-emerald-600',
        blue: 'bg-blue-100 text-blue-600',
        amber: 'bg-amber-100 text-amber-600',
        slate: 'bg-slate-100 text-slate-500',
    };
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color] || colorMap.slate}`}>
                <span className="material-symbols-outlined text-lg">{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium truncate">{label}</p>
                <p className="text-lg font-black text-slate-900 leading-tight">{value}</p>
            </div>
        </div>
    );
}
