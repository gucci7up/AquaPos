import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';
import { databases, storage, functions, ID, Query } from '@/lib/appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_SETTINGS_ID = import.meta.env.VITE_APPWRITE_COLLECTION_SETTINGS_ID || 'settings';
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_IMAGES_ID || 'products';
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

// Build permanent public preview URL for an Appwrite Storage file
const getFilePreviewUrl = (fileId: string) =>
    `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/preview?project=${PROJECT_ID}&width=800`;

// Mock Data
const initialTeam = [
    { id: 1, role: 'Owner', users: 1, permissionKey: 'full', status: 'Active' },
    { id: 2, role: 'Admin', users: 2, permissionKey: 'all_except_billing', status: 'Active' },
    { id: 3, role: 'Cashier', users: 8, permissionKey: 'sales_only', status: 'Active' }
];

const initialUsers = [
    { id: 101, name: 'Juan Pérez', email: 'juan@aquapos.la', role: 'Owner', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=101' },
    { id: 102, name: 'Maria Gonzalez', email: 'maria@aquapos.la', role: 'Admin', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=102' },
    { id: 103, name: 'Carlos Rodriguez', email: 'carlos@aquapos.la', role: 'Cashier', status: 'Inactive', avatar: 'https://i.pravatar.cc/150?u=103' },
    { id: 104, name: 'Ana Silva', email: 'ana@aquapos.la', role: 'Cashier', status: 'Pending', avatar: 'https://i.pravatar.cc/150?u=104' },
];

const initialPlans = [
    { id: 1, title: 'Entrepreneur', priceMonth: 0, priceYear: 0, features: ['1 User', '100 Products', 'Basic Reports'], highlighted: false },
    { id: 2, title: 'Professional', priceMonth: 29, priceYear: 24, features: ['3 Users', 'Unlimited Products', 'Advanced Analytics', 'Inventory Alerts'], highlighted: true },
    { id: 3, title: 'Enterprise', priceMonth: 99, priceYear: 79, features: ['Unlimited Users', 'API Access', 'Dedicated Support', 'White Label', 'Multi-Branch'], highlighted: false },
];

export default function Settings() {
    const { t, language, setLanguage, isDark, toggleDark } = useLanguage();
    const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'team' | 'billing' | 'integrations'>('general');

    // State: Business Profile
    const [profileData, setProfileData] = useState({
        businessName: 'AquaPos Enterprise Latin America',
        legalId: '900.123.456-7',
        email: 'ops@aquapos.la',
        currency: 'DOP (Dominican Peso)',
        taxRate: 18,
        address: 'Carrera 15 # 93 - 60, Bogotá, Colombia'
    });
    const [settingsDocId, setSettingsDocId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // State: Branding — stores preview URLs for display
    const [branding, setBranding] = useState({
        loginBg: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
        logoUrl: '',
        primaryColor: '#13daec',
        landingHero: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA7lYcDqoIsNqzIvtzR5LqLXZ4JlKkCRqIagznKEbsvnI6pQ0x3chrwmsp2U2cowE7Ll7tO1aysWfCu6OAs8JWAmc3l7dTPPSPlpAo47gaVg6U8y2iE797oWUBO7ciQyHbV12LoYTMIPIG8GMEZd9lTyZvzWK_ruTQvnXT0-mnS1ALu5_BS9IBUSudsfL_KcDvFjHWumWoiUFxNRQHnf0DoZ7rRh823k53HIdQDHsKEFehywkn_mMIGNhvfoyrX86Qwx8nLDCcVw3s',
        landingFeature: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWvk9CAUtPBscww0R9xdnm16iCqTl3vQGzRcMDKb3AkQXIrubU3SwcHYdhUU41WiP2xhBPSZ3eTSeBHgAmArSU4b3y3-SBg3LgvQWtyr1YiUuMxCOXU4oAUQ5xgFWsHahkNg0berzKsxAomp43EQs9flRJVbHnlYxhEfKQNvTI4VU7J8dg5rEiY5qewE8Sw7PWbzcP2PO8Ds0LPhwuthyMeF-wdGACHbd5ZmTdiRlNLV42wfTy31U0QxmBqpdcsVYtVdvda09XJx8'
    });
    // Stores the Appwrite Storage file IDs for each branding image (for persistence)
    const [brandingFileIds, setBrandingFileIds] = useState<Record<string, string>>({
        loginBg: '', logoUrl: '', landingHero: '', landingFeature: ''
    });
    // Track which image slot is currently uploading
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);

    // State: Team & Users
    const [teamMembers, setTeamMembers] = useState(initialTeam);
    const [users, setUsers] = useState(initialUsers);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ email: '', role: 'Cashier' });

    // State: Integrations
    const [integrations, setIntegrations] = useState([
        { id: 1, icon: 'chat', name: 'WhatsApp Business', desc: 'Notifications & Sales', color: 'emerald', checked: true },
        { id: 2, icon: 'shopping_bag', name: 'Shopify', desc: 'Inventory Sync', color: 'indigo', checked: false },
        { id: 3, icon: 'credit_card', name: 'Stripe', desc: 'Card Payments', color: 'blue', checked: true }
    ]);

    // State: Global Preferences
    const [preferences, setPreferences] = useState({
        darkMode: false,
        autoAi: true,
        paperless: true
    });

    // State: Billing & Plans
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [plans, setPlans] = useState(initialPlans);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [planForm, setPlanForm] = useState({ title: '', priceMonth: '', priceYear: '', features: '', highlighted: false });

    // Fetch settings on mount
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        if (!DATABASE_ID || !COLLECTION_SETTINGS_ID) return;
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_SETTINGS_ID, [
                Query.limit(1)
            ]);
            if (response.documents.length > 0) {
                const doc = response.documents[0];
                setSettingsDocId(doc.$id);
                setProfileData({
                    businessName: doc.businessName || '',
                    legalId: doc.legalId || '',
                    email: doc.email || '',
                    currency: doc.currency || 'DOP (Dominican Peso)',
                    taxRate: doc.taxRate || 0,
                    address: doc.address || ''
                });
                // Restore saved file IDs and rebuild preview URLs
                const savedIds: Record<string, string> = {};
                const savedUrls: Partial<typeof branding> = {};
                (['logoUrl', 'loginBg', 'landingHero', 'landingFeature'] as const).forEach(key => {
                    const fileId = doc[`branding_${key}`];
                    if (fileId) {
                        savedIds[key] = fileId;
                        savedUrls[key] = getFilePreviewUrl(fileId);
                    }
                });
                if (Object.keys(savedIds).length > 0) {
                    setBrandingFileIds(prev => ({ ...prev, ...savedIds }));
                    setBranding(prev => ({ ...prev, ...savedUrls }));
                }
                // Restore primary color
                if (doc.branding_primaryColor) {
                    setBranding(prev => ({ ...prev, primaryColor: doc.branding_primaryColor }));
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    // Effect: Dark Mode Toggle

    // Handlers
    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = async () => {
        if (!DATABASE_ID || !COLLECTION_SETTINGS_ID) {
            alert('Error: Settings Collection ID not configured');
            return;
        }

        setIsSaving(true);
        try {
            // Include branding file IDs and primary color in settings doc
            const dataToSave = {
                ...profileData,
                branding_logoUrl: brandingFileIds.logoUrl || null,
                branding_loginBg: brandingFileIds.loginBg || null,
                branding_landingHero: brandingFileIds.landingHero || null,
                branding_landingFeature: brandingFileIds.landingFeature || null,
                branding_primaryColor: branding.primaryColor,
            };
            if (settingsDocId) {
                await databases.updateDocument(DATABASE_ID, COLLECTION_SETTINGS_ID, settingsDocId, dataToSave);
            } else {
                const res = await databases.createDocument(DATABASE_ID, COLLECTION_SETTINGS_ID, ID.unique(), dataToSave);
                setSettingsDocId(res.$id);
            }
            alert(t('settings.savedSuccess'));
        } catch (error: any) {
            console.error('Error saving settings:', error);
            alert('Error al guardar configuración: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInvite = () => {
        if (inviteForm.email) {
            const newUser = {
                id: Date.now(),
                name: 'Invited User',
                email: inviteForm.email,
                role: inviteForm.role,
                status: 'Pending',
                avatar: `https://ui-avatars.com/api/?name=${inviteForm.email}&background=random`
            };
            setUsers([...users, newUser]);
            setIsInviteModalOpen(false);
            setInviteForm({ email: '', role: 'Cashier' });
        }
    };

    const toggleUserStatus = (id: number) => {
        setUsers(users.map(u => {
            if (u.id === id) {
                return { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' };
            }
            return u;
        }));
    };

    const toggleIntegration = (id: number) => {
        setIntegrations(integrations.map(int =>
            int.id === id ? { ...int, checked: !int.checked } : int
        ));
    };

    const togglePreference = (key: string) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    };

    // Branding Handlers
    const handleBrandingChange = (key: string, value: string) => {
        setBranding(prev => ({ ...prev, [key]: value }));
    };

    // Upload image to Appwrite Storage → store fileId → update preview URL
    const handleFileUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !BUCKET_ID) return;

        // Show instant local preview immediately
        const localUrl = URL.createObjectURL(file);
        setBranding(prev => ({ ...prev, [key]: localUrl }));
        setUploadingKey(key);

        try {
            // Delete previous file if exists
            const prevFileId = brandingFileIds[key];
            if (prevFileId) {
                try { await storage.deleteFile(BUCKET_ID, prevFileId); } catch { }
            }

            // Upload new file
            const result = await storage.createFile(BUCKET_ID, ID.unique(), file);
            const fileId = result.$id;

            // Save fileId and update preview with permanent URL
            setBrandingFileIds(prev => ({ ...prev, [key]: fileId }));
            setBranding(prev => ({ ...prev, [key]: getFilePreviewUrl(fileId) }));

            // Auto-save the new fileId to the settings document immediately
            if (DATABASE_ID && COLLECTION_SETTINGS_ID) {
                const patch = { [`branding_${key}`]: fileId };
                if (settingsDocId) {
                    await databases.updateDocument(DATABASE_ID, COLLECTION_SETTINGS_ID, settingsDocId, patch);
                } else {
                    const res = await databases.createDocument(DATABASE_ID, COLLECTION_SETTINGS_ID, ID.unique(), patch);
                    setSettingsDocId(res.$id);
                }
            }
        } catch (error: any) {
            console.error('Error uploading image:', error);
            alert('Error al subir imagen: ' + (error.message || error));
        } finally {
            setUploadingKey(null);
            // Reset file input so same file can be re-selected
            e.target.value = '';
        }
    };

    // Plan Handlers
    const handleEditPlan = (plan: any) => {
        setEditingPlan(plan);
        setPlanForm({
            title: plan.title,
            priceMonth: plan.priceMonth.toString(),
            priceYear: plan.priceYear.toString(),
            features: plan.features.join('\n'),
            highlighted: plan.highlighted
        });
        setIsPlanModalOpen(true);
    };

    const handleCreatePlan = () => {
        setEditingPlan(null);
        setPlanForm({ title: '', priceMonth: '', priceYear: '', features: '', highlighted: false });
        setIsPlanModalOpen(true);
    };

    const savePlan = () => {
        const planData = {
            title: planForm.title,
            priceMonth: parseFloat(planForm.priceMonth) || 0,
            priceYear: parseFloat(planForm.priceYear) || 0,
            features: planForm.features.split('\n').filter(f => f.trim() !== ''),
            highlighted: planForm.highlighted
        };

        if (editingPlan) {
            setPlans(plans.map(p => p.id === editingPlan.id ? { ...p, ...planData } : p));
        } else {
            setPlans([...plans, { id: Date.now(), ...planData }]);
        }
        setIsPlanModalOpen(false);
    };

    const deletePlan = () => {
        if (editingPlan && confirm('Delete this plan?')) {
            setPlans(plans.filter(p => p.id !== editingPlan.id));
            setIsPlanModalOpen(false);
        }
    };

    return (
        <>
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-lg font-bold text-slate-900">{t('settings.title')}</h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 pl-2">
                        <UserMenu />
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden bg-background-light">
                {/* Tabs Header */}
                <div className="px-8 pt-6 border-b border-slate-200 bg-white sticky top-0 z-10">
                    <div className="flex space-x-8">
                        <TabButton id="general" label={t('settings.tabs.general')} icon="tune" active={activeTab} onClick={setActiveTab} />
                        <TabButton id="branding" label={t('settings.tabs.branding')} icon="palette" active={activeTab} onClick={setActiveTab} />
                        <TabButton id="team" label={t('settings.tabs.team')} icon="group" active={activeTab} onClick={setActiveTab} />
                        <TabButton id="billing" label={t('settings.tabs.billing')} icon="credit_card" active={activeTab} onClick={setActiveTab} />
                        <TabButton id="integrations" label={t('settings.tabs.integrations')} icon="extension" active={activeTab} onClick={setActiveTab} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-8">

                    {/* --- TAB: GENERAL --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Business Profile */}
                            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="text-lg font-bold text-slate-900">{t('settings.businessProfile')}</h3>
                                    <p className="text-sm text-slate-500">{t('settings.businessDesc')}</p>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Business Name</label>
                                        <input
                                            name="businessName"
                                            value={profileData.businessName}
                                            onChange={handleProfileChange}
                                            className="w-full bg-slate-50 border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-primary focus:border-primary outline-none border"
                                            type="text"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Legal ID (RUT/NIT)</label>
                                        <input
                                            name="legalId"
                                            value={profileData.legalId}
                                            onChange={handleProfileChange}
                                            className="w-full bg-slate-50 border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-primary focus:border-primary outline-none border"
                                            type="text"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contact Email</label>
                                        <input
                                            name="email"
                                            value={profileData.email}
                                            onChange={handleProfileChange}
                                            className="w-full bg-slate-50 border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-primary focus:border-primary outline-none border"
                                            type="email"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Store Currency</label>
                                        <select
                                            name="currency"
                                            value={profileData.currency}
                                            onChange={handleProfileChange}
                                            className="w-full bg-slate-50 border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-primary focus:border-primary outline-none border"
                                        >
                                            <option value="DOP (Dominican Peso)">DOP (Dominican Peso)</option>
                                            <option value="COP (Colombian Peso)">COP (Colombian Peso)</option>
                                            <option value="MXN (Mexican Peso)">MXN (Mexican Peso)</option>
                                            <option value="USD (US Dollar)">USD (US Dollar)</option>
                                            <option value="CLP (Chilean Peso)">CLP (Chilean Peso)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tax Rate (IVA %)</label>
                                        <input
                                            name="taxRate"
                                            type="number"
                                            step="0.01"
                                            value={profileData.taxRate}
                                            onChange={(e) => setProfileData({ ...profileData, taxRate: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-primary focus:border-primary outline-none border"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Physical Address</label>
                                        <input
                                            name="address"
                                            value={profileData.address}
                                            onChange={handleProfileChange}
                                            className="w-full bg-slate-50 border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-primary focus:border-primary outline-none border"
                                            type="text"
                                        />
                                    </div>
                                </div>
                                <div className="px-6 py-4 bg-slate-50 flex justify-end">
                                    <button
                                        onClick={handleSaveProfile}
                                        className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:brightness-105 transition-all flex items-center gap-2"
                                    >
                                        {isSaving && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                                        {t('settings.save')}
                                    </button>
                                </div>
                            </section>

                            {/* Global Preferences */}
                            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-widest">{t('settings.globalPrefs')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-slate-400">language</span>
                                            <span className="text-sm font-medium">{t('settings.language')}</span>
                                        </div>
                                        <div className="flex bg-slate-200 rounded-lg p-1">
                                            <button
                                                onClick={() => setLanguage('en')}
                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                EN
                                            </button>
                                            <button
                                                onClick={() => setLanguage('es')}
                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'es' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                ES
                                            </button>
                                        </div>
                                    </div>
                                    <PreferenceToggle
                                        icon="dark_mode"
                                        label={t('settings.darkMode')}
                                        checked={isDark}
                                        onChange={toggleDark}
                                    />
                                    <PreferenceToggle
                                        icon="analytics"
                                        label={t('settings.autoAi')}
                                        checked={preferences.autoAi}
                                        onChange={() => togglePreference('autoAi')}
                                    />
                                    <PreferenceToggle
                                        icon="receipt_long"
                                        label={t('settings.paperless')}
                                        checked={preferences.paperless}
                                        onChange={() => togglePreference('paperless')}
                                    />
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ... (Branding Tab content remains the same) ... */}
                    {activeTab === 'branding' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="text-lg font-bold text-slate-900">{t('settings.branding.title')}</h3>
                                    <p className="text-sm text-slate-500">{t('settings.branding.subtitle')}</p>
                                </div>

                                <div className="p-6 space-y-10">
                                    {/* App Identity */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <ImageManager
                                            label="Login Background Image"
                                            value={branding.loginBg}
                                            onUpload={(e: any) => handleFileUpload('loginBg', e)}
                                            helpText="Recomendado: 1920x1080px (JPG, PNG)"
                                            isUploading={uploadingKey === 'loginBg'}
                                        />
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700 block">Logo de la Marca</label>
                                                <div className="flex items-center gap-4">
                                                    {/* Preview */}
                                                    <div className="size-20 bg-slate-50 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200 shrink-0 overflow-hidden">
                                                        {branding.logoUrl
                                                            ? <img src={branding.logoUrl} className="w-full h-full object-contain p-1" alt="Logo" />
                                                            : <span className="material-symbols-outlined text-slate-400 text-3xl">image</span>
                                                        }
                                                    </div>
                                                    {/* Upload controls */}
                                                    <div className="flex flex-col gap-2 flex-1">
                                                        <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-lg transition-all w-fit ${uploadingKey === 'logoUrl' ? 'bg-primary/60 cursor-wait' : 'bg-primary hover:brightness-105'}`}>
                                                            <span className={`material-symbols-outlined text-sm ${uploadingKey === 'logoUrl' ? 'animate-spin' : ''}`}>
                                                                {uploadingKey === 'logoUrl' ? 'sync' : 'upload'}
                                                            </span>
                                                            {uploadingKey === 'logoUrl' ? 'Subiendo...' : 'Subir imagen'}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => handleFileUpload('logoUrl', e)}
                                                            />
                                                        </label>
                                                        <p className="text-xs text-slate-400">PNG, JPG, SVG · Recomendado 200×200px</p>
                                                        {branding.logoUrl && (
                                                            <button
                                                                onClick={() => handleBrandingChange('logoUrl', '')}
                                                                className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 w-fit"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                                Eliminar logo
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700 block">Primary Brand Color</label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="color"
                                                        value={branding.primaryColor}
                                                        onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                                                        className="size-10 rounded-lg cursor-pointer border-none bg-transparent"
                                                    />
                                                    <input
                                                        value={branding.primaryColor}
                                                        onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                                                        className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary uppercase font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100"></div>

                                    {/* Landing Page Visuals */}
                                    <div>
                                        <h4 className="text-md font-bold text-slate-900 mb-6 uppercase tracking-wider">{t('settings.branding.landingImages')}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <ImageManager
                                                label={t('settings.branding.heroImage')}
                                                value={branding.landingHero}
                                                onUpload={(e: any) => handleFileUpload('landingHero', e)}
                                                helpText="Se muestra en la sección hero principal."
                                                isUploading={uploadingKey === 'landingHero'}
                                            />
                                            <ImageManager
                                                label={t('settings.branding.featureImage')}
                                                value={branding.landingFeature}
                                                onUpload={(e: any) => handleFileUpload('landingFeature', e)}
                                                helpText="Imagen flotante para sección móvil/feature."
                                                isUploading={uploadingKey === 'landingFeature'}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-4 bg-slate-50 flex justify-end">
                                    <button className="px-6 py-2 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:brightness-105">
                                        {t('settings.save')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ... (Team Tab content remains the same) ... */}
                    {activeTab === 'team' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Roles Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {teamMembers.map(member => (
                                    <div key={member.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-10 rounded-lg flex items-center justify-center ${member.role === 'Owner' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                                                <span className="material-symbols-outlined">{member.role === 'Owner' ? 'verified_user' : 'group'}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{t(`common.roles.${member.role}`)}</p>
                                                <p className="text-xs text-slate-500">{t(`common.permissions.${member.permissionKey}`)}</p>
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black text-slate-900">{member.users}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Users Table */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-slate-900">{t('settings.team.directory')}</h3>
                                    <button
                                        onClick={() => setIsInviteModalOpen(true)}
                                        className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">person_add</span> {t('settings.inviteMember')}
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">User</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Role</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Access</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {users.map(user => (
                                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={user.avatar} className="size-8 rounded-full bg-slate-200" alt={user.name} />
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                                                                <p className="text-xs text-slate-500">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">{user.role}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${user.status === 'Active' ? 'bg-emerald-100 text-emerald-600' :
                                                            user.status === 'Inactive' ? 'bg-slate-100 text-slate-500' :
                                                                'bg-amber-100 text-amber-600'
                                                            }`}>
                                                            {user.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {user.role !== 'Owner' && (
                                                            <div className="flex justify-end">
                                                                <button
                                                                    onClick={() => toggleUserStatus(user.id)}
                                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                                >
                                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.status === 'Active' ? 'translate-x-6' : 'translate-x-1'}`} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: BILLING / PLANS (MODIFIED) --- */}
                    {activeTab === 'billing' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center max-w-2xl mx-auto mb-8">
                                <h3 className="text-2xl font-black text-slate-900 mb-2">{t('settings.plans.title')}</h3>
                                <p className="text-slate-500 mb-6">{t('settings.plans.subtitle')}</p>

                                <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm mb-4">
                                    <button
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setBillingCycle('yearly')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${billingCycle === 'yearly' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                                    >
                                        Yearly <span className="text-emerald-400 text-[10px] ml-1">-20%</span>
                                    </button>
                                </div>

                                <button onClick={handleCreatePlan} className="block mx-auto mt-2 text-sm font-bold text-primary hover:underline">
                                    + Create New Plan
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {plans.map(plan => (
                                    <div key={plan.id} className="relative group">
                                        <button
                                            onClick={() => handleEditPlan(plan)}
                                            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-primary z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                        <PlanCard
                                            title={plan.title}
                                            price={billingCycle === 'monthly' ? plan.priceMonth.toString() : plan.priceYear.toString()}
                                            current={false}
                                            highlight={plan.highlighted}
                                            features={plan.features}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ... (Integrations Tab content remains the same) ... */}
                    {activeTab === 'integrations' && (
                        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900">{t('settings.integrations')}</h3>
                                <p className="text-sm text-slate-500">Connect your favorite business tools.</p>
                            </div>
                            <div className="p-6 space-y-6">
                                {integrations.map(int => (
                                    <IntegrationRow
                                        key={int.id}
                                        {...int}
                                        onChange={() => toggleIntegration(int.id)}
                                    />
                                ))}
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50">
                                <button className="w-full text-center text-xs font-bold text-slate-500 hover:text-primary transition-colors">Explore Marketplace</button>
                            </div>
                        </section>
                    )}

                </div>
            </div>

            {/* Invite Modal (Existing) */}
            {isInviteModalOpen && (
                <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900">{t('settings.inviteMember')}</h3>
                            <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">{t('customers.email')}</label>
                                <input
                                    value={inviteForm.email}
                                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                                    placeholder="colleague@example.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">{t('settings.role')}</label>
                                <select
                                    value={inviteForm.role}
                                    onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                                >
                                    <option value="Admin">{t('common.roles.Admin')}</option>
                                    <option value="Cashier">{t('common.roles.Cashier')}</option>
                                    <option value="Viewer">{t('common.roles.Viewer')}</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                            <button onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-bold rounded-lg hover:bg-slate-50">
                                {t('settings.cancel')}
                            </button>
                            <button onClick={handleInvite} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:brightness-105 shadow-lg shadow-primary/20">
                                {t('settings.sendInvite')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Plan Editor Modal (New) */}
            {isPlanModalOpen && (
                <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
                            <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Plan Name</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-primary"
                                    value={planForm.title}
                                    onChange={e => setPlanForm({ ...planForm, title: e.target.value })}
                                    placeholder="e.g. Enterprise Plus"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Monthly Price ($)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-primary"
                                        value={planForm.priceMonth}
                                        onChange={e => setPlanForm({ ...planForm, priceMonth: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Yearly Price ($)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-primary"
                                        value={planForm.priceYear}
                                        onChange={e => setPlanForm({ ...planForm, priceYear: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Features (One per line)</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-primary h-32 resize-none"
                                    value={planForm.features}
                                    onChange={e => setPlanForm({ ...planForm, features: e.target.value })}
                                    placeholder="Unlimited Users&#10;24/7 Support..."
                                ></textarea>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="highlight"
                                    checked={planForm.highlighted}
                                    onChange={e => setPlanForm({ ...planForm, highlighted: e.target.checked })}
                                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="highlight" className="text-sm font-medium text-slate-700">Highlight this plan (Recommended)</label>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between">
                            <button onClick={deletePlan} className="text-red-500 font-bold text-sm hover:underline">Delete Plan</button>
                            <div className="flex gap-3">
                                <button onClick={() => setIsPlanModalOpen(false)} className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-bold rounded-lg hover:bg-slate-50">{t('settings.cancel')}</button>
                                <button onClick={savePlan} className="px-6 py-2 bg-primary text-white font-bold rounded-lg shadow-lg hover:brightness-105">{t('settings.save')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

const TabButton = ({ id, label, icon, active, onClick }: any) => (
    <button
        onClick={() => onClick(id)}
        className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all ${active === id
            ? 'border-primary text-primary'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
    >
        <span className="material-symbols-outlined text-lg">{icon}</span>
        {label}
    </button>
);

// New Helper Component for Image Management (URL + File Upload)
const ImageManager = ({ label, value, onUpload, helpText, isUploading }: any) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 block">{label}</label>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
                {value ? (
                    <img src={value} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-300">
                        <span className="material-symbols-outlined text-4xl">image</span>
                    </div>
                )}
                {/* Loading overlay */}
                {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-white text-3xl animate-spin">sync</span>
                        <p className="text-white font-bold text-sm">Subiendo...</p>
                    </div>
                )}
            </div>

            <div>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={onUpload}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                >
                    <span className="material-symbols-outlined text-sm">{value ? 'swap_horiz' : 'upload_file'}</span>
                    {isUploading ? 'Subiendo…' : value ? 'Cambiar imagen' : 'Subir imagen local'}
                </button>
            </div>
            {helpText && <p className="text-xs text-slate-400">{helpText}</p>}
        </div>
    );
};

const PlanCard = ({ title, price, features, current, highlight }: any) => (
    <div className={`rounded-2xl p-6 border h-full flex flex-col ${highlight ? 'border-primary ring-4 ring-primary/10 shadow-xl bg-white relative' : 'border-slate-200 bg-slate-50'}`}>
        {current && (
            <span className="absolute top-4 right-4 bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded uppercase">Current Plan</span>
        )}
        <h4 className="text-lg font-bold text-slate-900 mb-2">{title}</h4>
        <div className="flex items-end gap-1 mb-6">
            <span className="text-4xl font-black text-slate-900">${price}</span>
            <span className="text-slate-500 font-medium mb-1">/mo</span>
        </div>
        <ul className="space-y-3 mb-8 flex-1">
            {features.map((feat: string, idx: number) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className={`material-symbols-outlined text-lg ${highlight ? 'text-primary' : 'text-slate-400'}`}>check_circle</span>
                    {feat}
                </li>
            ))}
        </ul>
        <button
            disabled={current}
            className={`w-full py-3 rounded-xl font-bold transition-all ${current
                ? 'bg-slate-200 text-slate-500 cursor-default'
                : highlight
                    ? 'bg-primary text-white hover:brightness-105 shadow-lg'
                    : 'bg-white border border-slate-200 text-slate-900 hover:bg-slate-100'
                }`}
        >
            {current ? 'Active' : 'Upgrade'}
        </button>
    </div>
);

const IntegrationRow = ({ icon, name, desc, color, checked, onChange }: any) => {
    const colors: any = {
        emerald: 'bg-emerald-50 text-emerald-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        blue: 'bg-blue-50 text-blue-600'
    };
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`size-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-900">{name}</p>
                    <p className="text-[10px] text-slate-500">{desc}</p>
                </div>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                    checked={checked}
                    onChange={onChange}
                    className="peer absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-4 transition-all duration-300 z-10"
                    type="checkbox"
                />
                <div className="block overflow-hidden h-6 rounded-full bg-slate-300 peer-checked:bg-primary cursor-pointer transition-colors"></div>
            </div>
        </div>
    );
};

const PreferenceToggle = ({ icon, label, checked, onChange }: any) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-400">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="relative inline-block w-10 align-middle select-none">
            <input
                checked={checked}
                onChange={onChange}
                className="peer absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-4 transition-all duration-300 z-10"
                type="checkbox"
            />
            <div className="block overflow-hidden h-6 rounded-full bg-slate-300 peer-checked:bg-primary cursor-pointer transition-colors"></div>
        </div>
    </div>
);
