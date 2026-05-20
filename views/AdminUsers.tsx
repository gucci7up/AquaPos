import React, { useEffect, useMemo, useState } from 'react';
import UserMenu from '../UserMenu';
import { useTenant, UserRole } from '../TenantContext';
import { account, databases, ID, Query } from '@/lib/appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_BUSINESSES_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BUSINESSES_ID || 'businesses';
const COLLECTION_USER_PROFILES_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USER_PROFILES_ID || 'user_profiles';
const COLLECTION_USER_INVITES_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USER_INVITES_ID || 'user_invites';

export default function AdminUsers() {
  const { isAdmin } = useTenant();
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);

  const [newBusinessName, setNewBusinessName] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Cashier' as UserRole,
    businessId: '',
  });

  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'Cashier' as UserRole,
    businessId: '',
  });

  const businessById = useMemo(() => {
    const map = new Map<string, any>();
    for (const b of businesses) map.set(b.$id, b);
    return map;
  }, [businesses]);

  const loadAll = async () => {
    if (!DATABASE_ID) return;
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_BUSINESSES_ID, [
          Query.orderAsc('name'),
          Query.limit(200),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_USER_PROFILES_ID, [
          Query.orderDesc('$createdAt'),
          Query.limit(200),
        ]),
      ]);
      const iRes = await databases.listDocuments(DATABASE_ID, COLLECTION_USER_INVITES_ID, [
        Query.orderDesc('$createdAt'),
        Query.limit(200),
      ]);
      setBusinesses(bRes.documents as any[]);
      setProfiles(pRes.documents as any[]);
      setInvites(iRes.documents as any[]);
    } catch (e: any) {
      alert('Error cargando usuarios/negocios: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateBusiness = async () => {
    const name = newBusinessName.trim();
    if (!name || !DATABASE_ID) return;
    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_BUSINESSES_ID, ID.unique(), { name });
      setNewBusinessName('');
      await loadAll();
    } catch (e: any) {
      alert('Error creando negocio: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!DATABASE_ID) return;
    if (!newUser.email || !newUser.password || !newUser.name || !newUser.businessId) return;
    setLoading(true);
    try {
      const created = await account.create(ID.unique(), newUser.email, newUser.password, newUser.name);
      await databases.createDocument(DATABASE_ID, COLLECTION_USER_PROFILES_ID, ID.unique(), {
        userId: created.$id,
        businessId: newUser.businessId,
        role: newUser.role,
        name: newUser.name,
        email: newUser.email,
      });
      setNewUser({ name: '', email: '', password: '', role: 'Cashier', businessId: '' });
      await loadAll();
    } catch (e: any) {
      alert('Error creando usuario: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!DATABASE_ID) return;
    const email = String(newInvite.email || '').trim().toLowerCase();
    if (!email || !newInvite.businessId) return;
    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_USER_INVITES_ID, ID.unique(), {
        email,
        businessId: newInvite.businessId,
        role: newInvite.role,
        createdAt: new Date().toISOString(),
      });
      setNewInvite({ email: '', role: 'Cashier', businessId: '' });
      await loadAll();
    } catch (e: any) {
      alert('Error creando invitación: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const deleteInvite = async (inviteId: string) => {
    if (!DATABASE_ID) return;
    setLoading(true);
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_USER_INVITES_ID, inviteId);
      await loadAll();
    } catch (e: any) {
      alert('Error eliminando invitación: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileId: string, patch: any) => {
    if (!DATABASE_ID) return;
    setLoading(true);
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_USER_PROFILES_ID, profileId, patch);
      await loadAll();
    } catch (e: any) {
      alert('Error actualizando usuario: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900">Acceso denegado</h2>
          <p className="text-sm text-slate-500 mt-1">Solo el usuario Admin puede administrar usuarios y negocios.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-lg font-bold text-slate-900">Control de Usuarios</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-2">
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden bg-background-light">
        <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-8">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Negocios</h3>
                <p className="text-sm text-slate-500">Crea negocios y asigna usuarios a cada uno.</p>
              </div>
              <button
                onClick={loadAll}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 flex items-center gap-2 disabled:opacity-60"
                disabled={loading}
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Recargar
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                className="md:col-span-2 w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                placeholder="Nombre del negocio"
              />
              <button
                onClick={handleCreateBusiness}
                disabled={loading || !newBusinessName.trim()}
                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:brightness-105 disabled:opacity-60"
              >
                Crear negocio
              </button>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {businesses.map(b => (
                  <div key={b.$id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{b.name}</p>
                      <p className="text-xs text-slate-500">{b.$id}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                      {profiles.filter(p => p.businessId === b.$id).length} usuario(s)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Crear Usuario</h3>
              <p className="text-sm text-slate-500">Crea un usuario y asígnalo a un negocio.</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</label>
                <input
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                  placeholder="Nombre del usuario"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <input
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                  placeholder="correo@dominio.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                >
                  <option value="Admin">Admin</option>
                  <option value="Owner">Owner</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Negocio</label>
                <select
                  value={newUser.businessId}
                  onChange={(e) => setNewUser(prev => ({ ...prev, businessId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                >
                  <option value="">Selecciona un negocio...</option>
                  {businesses.map(b => (
                    <option key={b.$id} value={b.$id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end">
              <button
                onClick={handleCreateUser}
                disabled={loading || !newUser.name || !newUser.email || !newUser.password || !newUser.businessId}
                className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:brightness-105 disabled:opacity-60"
              >
                Crear usuario
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Invitar Usuario (Google)</h3>
              <p className="text-sm text-slate-500">Autoriza un correo para entrar con Google. Al iniciar sesión se crea el perfil automáticamente.</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <input
                  value={newInvite.email}
                  onChange={(e) => setNewInvite(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                  placeholder="correo@dominio.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</label>
                <select
                  value={newInvite.role}
                  onChange={(e) => setNewInvite(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                >
                  <option value="Admin">Admin</option>
                  <option value="Owner">Owner</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Negocio</label>
                <select
                  value={newInvite.businessId}
                  onChange={(e) => setNewInvite(prev => ({ ...prev, businessId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                >
                  <option value="">Selecciona un negocio...</option>
                  {businesses.map(b => (
                    <option key={b.$id} value={b.$id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                El correo debe coincidir exactamente con el correo de Google del usuario.
              </div>
              <button
                onClick={handleCreateInvite}
                disabled={loading || !String(newInvite.email || '').trim() || !newInvite.businessId}
                className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-60"
              >
                Crear invitación
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Rol</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Negocio</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invites.map((i) => (
                    <tr key={i.$id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900 font-bold">{i.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{i.role || 'Cashier'}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700">{businessById.get(i.businessId)?.name || i.businessId}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{i.businessId}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteInvite(i.$id)}
                          disabled={loading}
                          className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 disabled:opacity-60"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {invites.length === 0 && (
                    <tr>
                      <td className="px-6 py-6 text-sm text-slate-500" colSpan={4}>No hay invitaciones.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Usuarios</h3>
              <p className="text-sm text-slate-500">Asigna el negocio y el rol de cada usuario.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Usuario</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Rol</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Negocio</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.map(p => (
                    <tr key={p.$id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{p.name || p.userId}</p>
                        <p className="text-xs text-slate-500">{p.userId}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{p.email || '-'}</td>
                      <td className="px-6 py-4">
                        <select
                          value={p.role}
                          onChange={(e) => {
                            const role = e.target.value as UserRole;
                            setProfiles(prev => prev.map(x => x.$id === p.$id ? { ...x, role } : x));
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Owner">Owner</option>
                          <option value="Cashier">Cashier</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={p.businessId}
                          onChange={(e) => {
                            const businessId = e.target.value;
                            setProfiles(prev => prev.map(x => x.$id === p.$id ? { ...x, businessId } : x));
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                        >
                          {businesses.map(b => (
                            <option key={b.$id} value={b.$id}>{b.name}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">{businessById.get(p.businessId)?.name || ''}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => updateProfile(p.$id, { role: p.role, businessId: p.businessId })}
                          disabled={loading}
                          className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 disabled:opacity-60"
                        >
                          Guardar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>No hay usuarios aún.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
