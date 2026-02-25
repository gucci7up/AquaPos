import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { account, ID } from '@/lib/appwrite';
import { useBranding } from '../BrandingContext';

export default function Auth() {
    const { t, language, setLanguage } = useLanguage();
    const { branding } = useBranding();
    const navigate = useNavigate();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'register') {
                await account.create(ID.unique(), email, password, name);
            }
            await account.createEmailPasswordSession(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Auth Error:', err);
            if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                setError('Network Error: Failed to connect to Appwrite. Please verify your SSL/CORS settings and if your domain is added to Appwrite Platforms.');
            } else {
                setError(err.message || 'Authentication failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side - Branding Image */}
            <div className="hidden lg:block w-1/2 relative overflow-hidden">
                <img
                    src={branding.loginBg || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop'}
                    alt="Login Background"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/60 flex flex-col justify-end p-16 text-white">
                    <div className="flex items-center gap-3 mb-6">
                        {branding.logoUrl ? (
                            <img src={branding.logoUrl} alt="logo" className="h-10 w-10 object-contain rounded-lg" />
                        ) : (
                            <div className="size-10 bg-[#13daec] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#13daec]/20">
                                <span className="material-symbols-outlined text-2xl font-bold">water_drop</span>
                            </div>
                        )}
                        <span className="text-3xl font-extrabold tracking-tight">{branding.businessName || 'AquaPos'}</span>
                    </div>
                    <h1 className="text-5xl font-extrabold leading-tight mb-4">
                        Manage your <br /> <span className="text-[#13daec]">Style Empire.</span>
                    </h1>
                    <p className="text-slate-300 text-lg max-w-md">
                        The all-in-one platform for fashion boutiques, perfume shops, and digital entrepreneurs.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 relative bg-white">
                <div className="absolute top-8 right-8 flex gap-2">
                    <button
                        onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                        className="text-xs font-bold uppercase text-slate-400 hover:text-slate-900 border border-slate-200 rounded px-3 py-1.5 transition-colors"
                    >
                        {language}
                    </button>
                </div>

                <div className="max-w-md w-full mx-auto">
                    <div className="mb-10 text-center lg:text-left">
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="size-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined text-3xl font-bold">water_drop</span>
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                            {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
                        </h2>
                        <p className="text-slate-500">
                            {mode === 'login' ? 'Access your store dashboard' : 'Launch your online business today'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}

                        {mode === 'register' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('auth.fullName')}</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[#13daec] focus:ring-1 focus:ring-[#13daec] outline-none transition-all"
                                        placeholder="Juan Pérez"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('auth.companyName')}</label>
                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[#13daec] focus:ring-1 focus:ring-[#13daec] outline-none transition-all" placeholder="Boutique Name" />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('auth.email')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[#13daec] focus:ring-1 focus:ring-[#13daec] outline-none transition-all"
                                placeholder="store@example.com"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('auth.password')}</label>
                                {mode === 'login' && (
                                    <button type="button" className="text-xs font-bold text-[#13daec] hover:underline">{t('auth.forgotPassword')}</button>
                                )}
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[#13daec] focus:ring-1 focus:ring-[#13daec] outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#13daec] hover:bg-[#0ebac9] text-white font-bold rounded-xl shadow-xl shadow-[#13daec]/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                        >
                            {loading ? (
                                <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                mode === 'login' ? t('auth.login') : t('auth.register')
                            )}
                        </button>
                    </form>

                    <div className="my-8 relative flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <span className="relative bg-white px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">O continúa con</span>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            account.createOAuth2Session(
                                'google' as any,
                                `${window.location.origin}${window.location.pathname}#/dashboard`,
                                `${window.location.origin}${window.location.pathname}#/login`
                            )
                        }
                        className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all font-bold text-slate-700 text-sm shadow-sm"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                        Continuar con Google
                    </button>

                    <p className="mt-8 text-center text-sm text-slate-500">
                        {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
                        <button
                            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            className="ml-2 font-bold text-[#13daec] hover:underline"
                        >
                            {mode === 'login' ? t('auth.signUp') : t('auth.signIn')}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}