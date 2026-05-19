import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { account, databases, ID, Query } from '@/lib/appwrite';

const DB = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COL_BUSINESSES = import.meta.env.VITE_APPWRITE_COLLECTION_BUSINESSES_ID || 'businesses';
const COL_USER_PROFILES = import.meta.env.VITE_APPWRITE_COLLECTION_USER_PROFILES_ID || 'user_profiles';

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

interface TenantContextValue {
  loading: boolean;
  user: any | null;
  profile: UserProfileDoc | null;
  business: BusinessDoc | null;
  businessId: string | null;
  isAdmin: boolean;
  reload: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  loading: true,
  user: null,
  profile: null,
  business: null,
  businessId: null,
  isAdmin: false,
  reload: async () => { },
});

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
    throw new Error('User is not assigned to a business');
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

  const load = async () => {
    setLoading(true);
    try {
      const u = await account.get();
      setUser(u);

      if (!DB) {
        setProfile(null);
        setBusiness(null);
        return;
      }

      try {
        const { profile: p, business: b } = await getOrCreateProfileAndBusiness(u);
        setProfile(p);
        setBusiness(b);
      } catch {
        setProfile(null);
        setBusiness(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      reload: load,
    };
  }, [loading, user, profile, business]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => useContext(TenantContext);
