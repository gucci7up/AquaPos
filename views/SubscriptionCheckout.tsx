import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { databases, ID } from '@/lib/appwrite';

// ── Appwrite config ──────────────────────────────────────────────────────────
const DB = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COL = import.meta.env.VITE_APPWRITE_COLLECTION_SUBSCRIPTIONS_ID || 'subscriptions';

// ── Plan catalogue ────────────────────────────────────────────────────────────
const PLAN_DETAILS: Record<string, {
    name: string; price: number; currency: string;
    cycle: string; features: string[];
}> = {
    basico: {
        name: 'Básico', price: 0, currency: 'USD',
        cycle: 'Mensual',
        features: ['1 usuario', 'POS básico', 'Inventario hasta 50 productos', 'Soporte por email'],
    },
    profesional: {
        name: 'Profesional', price: 29, currency: 'USD',
        cycle: 'Mensual',
        features: ['5 usuarios', 'POS completo', 'Inventario ilimitado', 'Reportes avanzados', 'Soporte prioritario'],
    },
    crecimiento: {
        name: 'Crecimiento', price: 79, currency: 'USD',
        cycle: 'Mensual',
        features: ['15 usuarios', 'Multi-sucursal', 'AquaAI incluido', 'API access', 'Soporte 24/7'],
    },
    corporativo: {
        name: 'Corporativo', price: 0, currency: 'USD',
        cycle: 'Mensual',
        features: ['Usuarios ilimitados', 'Infraestructura dedicada', 'SLA garantizado', 'Onboarding personalizado'],
    },
};

// ── Payment methods ───────────────────────────────────────────────────────────
// These values come from the business settings. You can centralise them later.
const PAYMENT_METHODS = [
    {
        id: 'paypal',
        name: 'PayPal',
        icon: 'account_balance_wallet',
        color: 'border-blue-300 bg-blue-50',
        activeColor: 'border-blue-500 bg-blue-50 ring-2 ring-blue-300',
        badge: 'bg-blue-100 text-blue-700',
        instructions: (plan: any) =>
            `Envía $${plan.price} USD al correo PayPal: pagos@aquapos.com\nEscribe en la nota: "Suscripción ${plan.name}"`,
        link: `https://paypal.me/aquapos`,
        linkLabel: 'Pagar con PayPal',
    },
    {
        id: 'binance',
        name: 'Binance Pay',
        icon: 'currency_bitcoin',
        color: 'border-amber-300 bg-amber-50',
        activeColor: 'border-amber-500 bg-amber-50 ring-2 ring-amber-300',
        badge: 'bg-amber-100 text-amber-700',
        instructions: (plan: any) =>
            `Envía $${plan.price} USDT (BEP-20 o TRC-20) a la siguiente dirección:\n0xAqua1234AquaPos5678ExampleWallet\nGuarda el txHash como comprobante.`,
        link: null,
        linkLabel: null,
    },
    {
        id: 'card',
        name: 'Tarjeta · Link de Pago',
        icon: 'credit_card',
        color: 'border-emerald-300 bg-emerald-50',
        activeColor: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300',
        badge: 'bg-emerald-100 text-emerald-700',
        instructions: (_plan: any) =>
            `Haz clic en el botón de abajo para ir a la pasarela de pago segura.\nAceptamos Visa, Mastercard y AMEX.`,
        link: `https://pay.aquapos.com/checkout`,
        linkLabel: 'Ir a la pasarela de pago',
    },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function SubscriptionCheckout() {
    const { planSlug } = useParams<{ planSlug: string }>();
    const navigate = useNavigate();

    const planKey = (planSlug || '').toLowerCase();
    const plan = PLAN_DETAILS[planKey];

    const [step, setStep] = useState<'form' | 'payment' | 'done'>('form');
    const [saving, setSaving] = useState(false);

    // Form
    const [form, setForm] = useState({
        fullName: '', email: '', phone: '', business: '',
    });
    const [formError, setFormError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');

    // ── Validate & next ──────────────────────────────────────────────────────────
    const handleFormNext = () => {
        if (!form.fullName.trim() || !form.email.trim()) {
            setFormError('Por favor completa nombre y correo electrónico.');
            return;
        }
        setFormError('');
        setStep('payment');
    };

    // ── Submit to Appwrite ────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!paymentMethod) return;
        setSaving(true);
        try {
            if (DB) {
                await databases.createDocument(DB, COL, ID.unique(), {
                    customerName: form.fullName.trim(),
                    customerId: '',
                    plan: plan?.name || planKey,
                    price: plan?.price || 0,
                    cycle: plan?.cycle || 'Mensual',
                    status: 'Pendiente',
                    startDate: new Date().toISOString().split('T')[0],
                    notes: `Email: ${form.email} | Tel: ${form.phone} | Negocio: ${form.business} | Método: ${paymentMethod}`,
                });
            }
            setStep('done');
        } catch (e: any) {
            alert('Error al registrar suscripción: ' + (e.message || 'Error desconocido'));
        } finally {
            setSaving(false);
        }
    };

    // ── Plan not found guard ─────────────────────────────────────────────────────
    if (!plan) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-200 block mb-4">error</span>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Plan no encontrado</h2>
                    <p className="text-slate-500 mb-6">El plan solicitado no existe.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:brightness-105"
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    const pm = PAYMENT_METHODS.find(m => m.id === paymentMethod);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#e8fbfe] flex flex-col">

            {/* Top Bar */}
            <nav className="bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors font-semibold"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Volver
                </button>
                <div className="flex items-center gap-2">
                    <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-lg">water_drop</span>
                    </div>
                    <span className="font-extrabold text-slate-900">AquaPos</span>
                </div>
                <div className="w-20" /> {/* Spacer */}
            </nav>

            <div className="flex-1 flex items-start justify-center p-6 pt-12">
                <div className="w-full max-w-4xl grid lg:grid-cols-5 gap-8">

                    {/* ── Left: Plan Summary ── */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-8">
                            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Resumen del pedido</p>
                            <h2 className="text-2xl font-black text-slate-900 mb-1">Plan {plan.name}</h2>
                            {plan.price > 0 ? (
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-3xl font-black text-slate-900">${plan.price}</span>
                                    <span className="text-slate-400 font-medium">USD / mes</span>
                                </div>
                            ) : (
                                <p className="text-2xl font-black text-slate-400 mb-6">Gratis</p>
                            )}
                            <ul className="space-y-3">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                                        <span className="material-symbols-outlined text-emerald-500 text-lg shrink-0">check_circle</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-500">Total hoy</span>
                                <span className="text-lg font-black text-slate-900">
                                    {plan.price > 0 ? `$${plan.price} USD` : '$0 — Gratis'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Steps ── */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Step indicators */}
                        <div className="flex items-center gap-2">
                            {['Datos', 'Pago', 'Confirmación'].map((s, i) => {
                                const stepKeys: Array<typeof step> = ['form', 'payment', 'done'];
                                const active = step === stepKeys[i];
                                const done = stepKeys.indexOf(step) > i;
                                return (
                                    <React.Fragment key={s}>
                                        <div className={`flex items-center gap-2 text-sm font-bold ${active ? 'text-primary' : done ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            <div className={`size-7 rounded-full flex items-center justify-center text-xs font-black
                        ${active ? 'bg-primary text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                {done ? <span className="material-symbols-outlined text-sm">check</span> : i + 1}
                                            </div>
                                            {s}
                                        </div>
                                        {i < 2 && <div className={`flex-1 h-0.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* ── STEP 1: Datos ── */}
                        {step === 'form' && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                                <h3 className="text-lg font-black text-slate-900">Tus datos de contacto</h3>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <Field label="Nombre completo *" placeholder="Juan Pérez"
                                        value={form.fullName} onChange={v => setForm(f => ({ ...f, fullName: v }))} />
                                    <Field label="Correo electrónico *" placeholder="juan@empresa.com" type="email"
                                        value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
                                    <Field label="Teléfono / WhatsApp" placeholder="+1 (809) 000-0000"
                                        value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
                                    <Field label="Nombre del negocio" placeholder="Mi Empresa S.R.L."
                                        value={form.business} onChange={v => setForm(f => ({ ...f, business: v }))} />
                                </div>

                                {formError && (
                                    <p className="text-sm text-red-500 font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">error</span>
                                        {formError}
                                    </p>
                                )}

                                <button
                                    onClick={handleFormNext}
                                    className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-105 transition-all flex items-center justify-center gap-2"
                                >
                                    Continuar al pago
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </button>
                            </div>
                        )}

                        {/* ── STEP 2: Pago ── */}
                        {step === 'payment' && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                                <h3 className="text-lg font-black text-slate-900">Método de pago</h3>

                                <div className="space-y-3">
                                    {PAYMENT_METHODS.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setPaymentMethod(m.id)}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4
                        ${paymentMethod === m.id ? m.activeColor : m.color}`}
                                        >
                                            <div className="size-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                                <span className="material-symbols-outlined text-2xl text-slate-700">{m.icon}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-bold text-slate-900">{m.name}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${m.badge}`}>
                                                        {m.id === 'paypal' ? 'Recomendado' : m.id === 'binance' ? 'Crypto' : 'Seguro'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {m.id === 'paypal' && 'Paga desde cualquier país, protección PayPal incluida'}
                                                    {m.id === 'binance' && 'USDT BEP-20 o TRC-20, sin comisiones de banco'}
                                                    {m.id === 'card' && 'Visa, Mastercard y AMEX — Pago seguro con encriptación SSL'}
                                                </p>
                                            </div>
                                            {paymentMethod === m.id && (
                                                <span className="material-symbols-outlined text-primary">check_circle</span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Instructions panel */}
                                {pm && (
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instrucciones de pago</p>
                                        <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                                            {pm.instructions(plan)}
                                        </pre>
                                        {pm.link && (
                                            <a
                                                href={pm.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:brightness-105 transition-all shadow-md shadow-primary/20"
                                            >
                                                <span className="material-symbols-outlined text-lg">open_in_new</span>
                                                {pm.linkLabel}
                                            </a>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep('form')}
                                        className="px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                                    >
                                        Atrás
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!paymentMethod || saving}
                                        className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                                        Confirmar suscripción
                                        <span className="material-symbols-outlined">check</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 3: Done ── */}
                        {step === 'done' && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
                                <div className="size-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                    <span className="material-symbols-outlined text-4xl text-emerald-500">check_circle</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-2">¡Suscripción registrada!</h3>
                                    <p className="text-slate-500 text-sm max-w-sm mx-auto">
                                        Hemos recibido tu solicitud del plan <strong>{plan.name}</strong>. Nuestro equipo
                                        verificará tu pago y activará tu cuenta en menos de <strong>24 horas</strong>.
                                    </p>
                                </div>

                                {pm && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                                        <p className="text-xs font-bold text-amber-600 uppercase mb-1">Próximo paso</p>
                                        <p className="text-sm text-amber-800">
                                            {pm.link
                                                ? `Completa el pago usando el link de ${pm.name} y envíanos el comprobante por WhatsApp.`
                                                : `Realiza el pago según las instrucciones y envíanos el comprobante por WhatsApp.`}
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                                    <button
                                        onClick={() => navigate('/')}
                                        className="px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                                    >
                                        Volver al inicio
                                    </button>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-105 transition-all text-sm"
                                    >
                                        Iniciar sesión
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Trust row */}
                        <div className="flex items-center justify-center gap-6 text-xs text-slate-400 font-medium pt-2">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">lock</span> SSL Seguro
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">verified_user</span> Datos protegidos
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">support_agent</span> Soporte 24/7
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Field helper ────────────────────────────────────────────────────────────
function Field({ label, placeholder, value, onChange, type = 'text' }: {
    label: string; placeholder: string; value: string;
    onChange: (v: string) => void; type?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
        </div>
    );
}
