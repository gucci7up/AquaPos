import React, { createContext, useContext, useState, useEffect } from 'react';
import { databases, Query } from '@/lib/appwrite';

// ── Env vars ─────────────────────────────────────────────────────────────────
const DB = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COL = import.meta.env.VITE_APPWRITE_COLLECTION_SETTINGS_ID || 'settings';
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_IMAGES_ID || 'products';
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

const buildFileUrl = (fileId: string | null | undefined) => {
    if (!fileId || !ENDPOINT || !BUCKET_ID || !PROJECT_ID) return '';
    return `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/preview?project=${PROJECT_ID}&width=800`;
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BrandingConfig {
    businessName: string;
    logoUrl: string;   // full preview URL (ready for <img src>)
    primaryColor: string;   // e.g. '#13daec'
    address: string;
    phone: string;
    email: string;
    website: string;
    taxId: string;
    taxRegime: string;
    currency: string;
    taxRate: number;
    loginBg: string; // background image for Auth login page
    landingHero: string; // hero image for landing page
    landingFeature: string; // feature image for landing page
}

interface BrandingContextValue {
    branding: BrandingConfig;
    reloadBranding: () => void;
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const defaults: BrandingConfig = {
    businessName: 'AquaPos',
    logoUrl: '',
    primaryColor: '#13daec',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    taxRegime: '',
    currency: 'USD',
    taxRate: 0,
    loginBg: '',
    landingHero: '',
    landingFeature: '',
};

// ── Context ───────────────────────────────────────────────────────────────────
const BrandingContext = createContext<BrandingContextValue>({
    branding: defaults,
    reloadBranding: () => { },
});

// ── Provider ──────────────────────────────────────────────────────────────────
export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [branding, setBranding] = useState<BrandingConfig>(defaults);

    const loadBranding = async () => {
        if (!DB) return;
        try {
            const res = await databases.listDocuments(DB, COL, [Query.limit(1)]);
            if (!res.documents.length) return;
            const d = res.documents[0];

            const config: BrandingConfig = {
                businessName: d.businessName || d.name || defaults.businessName,
                logoUrl: buildFileUrl(d.branding_logoUrl),
                primaryColor: d.branding_primaryColor || defaults.primaryColor,
                address: d.address || '',
                phone: d.phone || '',
                email: d.email || '',
                website: d.website || '',
                taxId: d.legalId || d.taxId || '',
                taxRegime: d.taxRegime || '',
                currency: d.currency || 'USD',
                taxRate: Number(d.taxRate) || 0,
                loginBg: buildFileUrl(d.branding_loginBg),
                landingHero: buildFileUrl(d.branding_landingHero),
                landingFeature: buildFileUrl(d.branding_landingFeature),
            };

            setBranding(config);

            // Apply primaryColor as CSS variable so Tailwind `primary` classes update globally
            document.documentElement.style.setProperty('--color-primary', config.primaryColor);

        } catch (e) {
            console.warn('[BrandingContext] Could not load settings:', e);
        }
    };

    useEffect(() => {
        loadBranding();
    }, []);

    return (
        <BrandingContext.Provider value={{ branding, reloadBranding: loadBranding }}>
            {children}
        </BrandingContext.Provider>
    );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useBranding = () => useContext(BrandingContext);
