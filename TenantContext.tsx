import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { account, databases, ID, Query } from '@/lib/appwrite';

const DB = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COL_BUSINESSES = import.meta.env.VITE_APPWRITE_COLLECTION_BUSINESSES_ID || 'businesses';
const COL_USER_PROFILES = import.meta.env.VITE_APPWRITE_COLLECTION_USER_PROFILES_ID || 'user_profiles';
const COL_USER_INVITES = import.meta.env.VITE_APPWRITE_COLLECTION_USER_INVITES_ID || 'user_invites';

export type UserRole = 'Admin' | 'Owner' | 'Cashier' | 'Viewer';

export interface BusinessDoc {
  $id: string;
  name: string;
  ownerUserId?: string;
}

export interface UserProfileDoc {
  $id: string;
  userId: string;
  businessId: string;
  role: UserRole;
  name?: string;
  email?: string;
}

export interface UserInviteDoc {
  $id: string;
  email: string;
  businessId: string;
  role: UserRole;
  createdAt?: string;
  usedAt?: string;
  usedByUserId?: string;
}

interface TenantContextValue {
  loading: boolean;
  user: any | null;
  profile: UserProfileDoc | null;
  business: BusinessDoc | null;
  businessId: string | null;
  isAdmin: boolean;
  authError: string | null;
  reload: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  loading: true,
  user: null,
  profile: null,
  business: null,
  businessId: null,
  isAdmin: false,
  authError: null,
  reload: async () => { },
});

function normalizeEmail(v: any) {
  const s = String(v || '').trim().toLowerCase();
  return s || '';
}

async function getOrCreateProfileAndBusiness(user: any) {
  if (!DB) throw new Error('Missing VITE_APPWRITE_DATABASE_ID');

  const res = await databases.listDocuments(DB, COL_USER_PROFILES, [
    Query.equal('userId', user.$id),
    Query.limit(1),
  ]);

  if (res.documents.length) {
    const profile = res.documents[0] as any as UserProfileDoc;
    const business = (await databases.getDocument(DB, COL_BUSINESSES, profile.businessId)) as any as BusinessDoc;
    return { profile, business };
  }

  const anyProfiles = await databases.listDocuments(DB, COL_USER_PROFILES, [Query.limit(1)]);
  if (anyProfiles.documents.length) {
    const email = normalizeEmail(user?.email);
    if (email) {
      try {
        const inviteRes = await databases.listDocuments(DB, COL_USER_INVITES, [
          Query.equal('email', email),
          Query.limit(1),
        ]);
        if (inviteRes.documents.length) {
          const invite = inviteRes.documents[0] as any as UserInviteDoc;
          const business = (await databases.getDocument(DB, COL_BUSINESSES, invite.businessId)) as any as BusinessDoc;
          const createdProfile = (await databases.createDocument(DB, COL_USER_PROFILES, ID.unique(), {
            userId: user.$id,
            businessId: invite.businessId,
            role: invite.role || 'Cashier',
            name: user?.name || '',
            email: email,
          })) as any as UserProfileDoc;
          try {
            await databases.updateDocument(DB, COL_USER_INVITES, invite.$id, {
              usedAt: new Date().toISOString(),
              usedByUserId: user.$id,
            });
          } catch { }
          return { profile: createdProfile, business };
        }
      } catch { }
    }
    throw new Error('Access denied');
  }

  const businessName = user?.name ? `${user.name}` : 'Mi Negocio';
  const createdBusiness = (await databases.createDocument(DB, COL_BUSINESSES, ID.unique(), {
    name: businessName,
    ownerUserId: user.$id,
  })) as any as BusinessDoc;

  const createdProfile = (await databases.createDocument(DB, COL_USER_PROFILES, ID.unique(), {
    userId: user.$id,
    businessId: createdBusiness.$id,
    role: 'Admin',
    name: user?.name || '',
    email: user?.email || '',
  })) as any as UserProfileDoc;

  return { profile: createdProfile, business: createdBusiness };
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [business, setBusiness] = useState<BusinessDoc | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const u = await account.get();
      setUser(u);

      if (!DB) {
        setProfile(null);
        setBusiness(null);
        setAuthError(null);
        return;
      }

      try {
        const { profile: p, business: b } = await getOrCreateProfileAndBusiness(u);
        setProfile(p);
        setBusiness(b);
        setAuthError(null);
      } catch {
        setProfile(null);
        setBusiness(null);
        setAuthError(String(e?.message || e || 'Access denied'));
      }
    } catch {
      setUser(null);
      setProfile(null);
      setBusiness(null);
      setAuthError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const id = profile?.businessId;
    if (!id) return;
    try {
      localStorage.setItem('aquapos:lastBusinessId', id);
    } catch { }
  }, [profile?.businessId]);

  const value = useMemo<TenantContextValue>(() => {
    const businessId = profile?.businessId || null;
    const role = profile?.role || null;
    return {
      loading,
      user,
      profile,
      business,
      businessId,
      isAdmin: role === 'Admin' || role === 'Owner',
      authError,
      reload: load,
    };
  }, [loading, user, profile, business, authError]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => useContext(TenantContext);
