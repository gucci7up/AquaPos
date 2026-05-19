import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { useTenant } from '../TenantContext';
import UserMenu from '../UserMenu';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

type SupportMessage = {
  id: number;
  sender: 'user' | 'agent' | 'system' | string;
  body: string;
  created_at: string;
};

type SupportConversation = {
  id: number;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  status: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  last_sender?: string | null;
  last_body?: string | null;
  last_created_at?: string | null;
};

function formatWhen(s?: string | null) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

function clsx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(' ');
}

export default function Support() {
  const { t } = useLanguage();
  const { businessId, isAdmin, user } = useTenant();
  const [config, setConfig] = useState<{ telegram?: { enabled: boolean; inboundEnabled: boolean } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [meConversation, setMeConversation] = useState<SupportConversation | null>(null);
  const [meMessages, setMeMessages] = useState<SupportMessage[]>([]);
  const [meDraft, setMeDraft] = useState('');
  const [sendingMe, setSendingMe] = useState(false);

  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<SupportConversation | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<SupportMessage[]>([]);
  const [adminDraft, setAdminDraft] = useState('');
  const [sendingAdmin, setSendingAdmin] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const defaultHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (businessId) h['x-business-id'] = businessId;
    if (user?.$id) h['x-user-id'] = user.$id;
    if (user?.name) h['x-user-name'] = user.name;
    if (user?.email) h['x-user-email'] = user.email;
    h['x-user-admin'] = isAdmin ? '1' : '0';
    return h;
  }, [businessId, isAdmin, user?.$id, user?.email, user?.name]);

  const apiFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!API_BASE) throw new Error('Missing VITE_API_BASE_URL');
      const r = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...defaultHeaders,
          ...(init?.headers || {}),
        },
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.success) {
        throw new Error(data?.error || `Request failed (${r.status})`);
      }
      return data;
    },
    [defaultHeaders]
  );

  const loadConfig = useCallback(async () => {
    try {
      const data = await apiFetch('/api/support/config');
      setConfig(data);
    } catch {
      setConfig(null);
    }
  }, [apiFetch]);

  const loadMe = useCallback(async () => {
    if (!businessId || !user?.$id) return;
    try {
      const data = await apiFetch('/api/support/me');
      setMeConversation(data.conversation || null);
      setMeMessages(Array.isArray(data.messages) ? data.messages : []);
      setError(null);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }, [apiFetch, businessId, user?.$id]);

  const loadConversations = useCallback(async () => {
    if (!businessId || !isAdmin) return;
    try {
      const data = await apiFetch('/api/support/conversations');
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
      setError(null);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }, [apiFetch, businessId, isAdmin]);

  const loadConversation = useCallback(
    async (id: number) => {
      if (!businessId || !isAdmin) return;
      try {
        const data = await apiFetch(`/api/support/conversations/${id}`);
        setSelectedConversation(data.conversation || null);
        setSelectedMessages(Array.isArray(data.messages) ? data.messages : []);
        setError(null);
      } catch (e: any) {
        setError(String(e?.message || e));
      }
    },
    [apiFetch, businessId, isAdmin]
  );

  const sendMe = useCallback(async () => {
    const text = meDraft.trim();
    if (!text) return;
    if (!businessId || !user?.$id) return;
    setSendingMe(true);
    try {
      await apiFetch('/api/support/me/messages', { method: 'POST', body: JSON.stringify({ text }) });
      setMeDraft('');
      await loadMe();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSendingMe(false);
    }
  }, [apiFetch, businessId, loadMe, meDraft, user?.$id]);

  const sendAdmin = useCallback(async () => {
    const text = adminDraft.trim();
    if (!text) return;
    if (!businessId || !isAdmin || !selectedConversationId) return;
    setSendingAdmin(true);
    try {
      await apiFetch(`/api/support/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setAdminDraft('');
      await loadConversation(selectedConversationId);
      await loadConversations();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSendingAdmin(false);
    }
  }, [adminDraft, apiFetch, businessId, isAdmin, loadConversation, loadConversations, selectedConversationId]);

  const updateStatus = useCallback(
    async (conversationId: number, status: string) => {
      if (!businessId || !isAdmin) return;
      try {
        await apiFetch(`/api/support/conversations/${conversationId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status }),
        });
        await loadConversations();
        await loadConversation(conversationId);
      } catch (e: any) {
        setError(String(e?.message || e));
      }
    },
    [apiFetch, businessId, isAdmin, loadConversation, loadConversations]
  );

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (!businessId || !user?.$id) return;
    if (isAdmin) {
      loadConversations();
    } else {
      loadMe();
    }
  }, [businessId, isAdmin, loadConversations, loadMe, user?.$id]);

  useEffect(() => {
    if (!isAdmin || !selectedConversationId) return;
    loadConversation(selectedConversationId);
  }, [isAdmin, loadConversation, selectedConversationId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!businessId || !user?.$id) return;
      if (isAdmin) {
        loadConversations();
        if (selectedConversationId) loadConversation(selectedConversationId);
      } else {
        loadMe();
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [businessId, isAdmin, loadConversation, loadConversations, loadMe, selectedConversationId, user?.$id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isAdmin ? selectedMessages.length : meMessages.length]);

  const telegramEnabledUi = Boolean(config?.telegram?.enabled);
  const telegramInboundEnabledUi = Boolean(config?.telegram?.inboundEnabled);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-lg font-bold text-slate-900">{t('support.title')}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={clsx(
              'hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border',
              telegramEnabledUi ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
            )}
          >
            <span
              className={clsx(
                'material-symbols-outlined text-sm',
                telegramEnabledUi ? 'text-emerald-500' : 'text-amber-600'
              )}
            >
              {telegramEnabledUi ? 'mark_chat_read' : 'warning'}
            </span>
            <span className={clsx('text-[10px] font-bold uppercase', telegramEnabledUi ? 'text-emerald-600' : 'text-amber-700')}>
              {telegramEnabledUi ? 'Telegram conectado' : 'Telegram no configurado'}
            </span>
          </div>
          <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
          <div className="flex items-center gap-3 pl-2">
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-6 md:p-8">
        <div className="max-w-6xl mx-auto h-full">
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-rose-600 text-base">error</span>
              <span className="flex-1">{error}</span>
              <button className="text-rose-800 font-bold" onClick={() => setError(null)}>
                Cerrar
              </button>
            </div>
          )}

          <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Soporte en vivo</h3>
              <p className="text-sm md:text-base text-slate-500 mt-1">
                Escribe tu problema y te respondemos. {isAdmin ? 'Responde desde tu Telegram personal.' : 'Nuestro equipo responde lo antes posible.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2',
                  telegramEnabledUi ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-800'
                )}
              >
                <span className="material-symbols-outlined text-sm">{telegramEnabledUi ? 'mark_chat_read' : 'warning'}</span>
                {telegramEnabledUi ? 'Telegram listo' : 'Falta configurar Telegram'}
              </div>
              {telegramEnabledUi && (
                <div
                  className={clsx(
                    'px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2',
                    telegramInboundEnabledUi ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-amber-50 border-amber-100 text-amber-800'
                  )}
                >
                  <span className="material-symbols-outlined text-sm">{telegramInboundEnabledUi ? 'sync' : 'sync_problem'}</span>
                  {telegramInboundEnabledUi ? 'Respuestas activas' : 'Webhook pendiente'}
                </div>
              )}
            </div>
          </div>

          {isAdmin ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)]">
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-0">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">inbox</span>
                    <span className="font-bold text-slate-900">Conversaciones</span>
                  </div>
                  <button
                    onClick={() => loadConversations()}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Actualizar
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">No hay conversaciones todavía.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {conversations.map((c) => {
                        const active = c.id === selectedConversationId;
                        const title = c.user_name || c.user_email || c.user_id;
                        const preview = (c.last_body || '').slice(0, 80);
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSelectedConversationId(c.id)}
                            className={clsx('w-full text-left p-4 hover:bg-slate-50 transition-colors', active && 'bg-primary/5')}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 truncate">{title}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    SUP-{c.id}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 truncate">{preview || 'Sin mensajes'}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span
                                  className={clsx(
                                    'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                    c.status === 'Closed'
                                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                                      : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                  )}
                                >
                                  {c.status || 'Open'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">{formatWhen(c.last_created_at || c.last_message_at)}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-0">
                {!selectedConversation ? (
                  <div className="flex-1 p-8 flex items-center justify-center text-slate-500">
                    Selecciona una conversación para ver el chat.
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">
                            {selectedConversation.user_name || selectedConversation.user_email || selectedConversation.user_id}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            SUP-{selectedConversation.id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Última actividad: {formatWhen(selectedConversation.last_message_at || selectedConversation.updated_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedConversation.status || 'Open'}
                          onChange={(e) => updateStatus(selectedConversation.id, e.target.value)}
                          className="text-xs font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white"
                        >
                          <option value="Open">Open</option>
                          <option value="Pending">Pending</option>
                          <option value="Closed">Closed</option>
                        </select>
                        <button
                          onClick={async () => {
                            const text = `/r ${selectedConversation.id} `;
                            await navigator.clipboard.writeText(text);
                          }}
                          className="px-3 py-2 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90"
                        >
                          Copiar comando
                        </button>
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-600 flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">info</span>
                      Responde desde Telegram con: <span className="font-bold">/r {selectedConversation.id} tu mensaje</span> o responde haciendo reply al último mensaje SUP-{selectedConversation.id}.
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                      {selectedMessages.length === 0 ? (
                        <div className="text-sm text-slate-500">Sin mensajes todavía.</div>
                      ) : (
                        selectedMessages.map((m) => {
                          const mine = m.sender === 'agent';
                          return (
                            <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
                              <div
                                className={clsx(
                                  'max-w-[85%] rounded-2xl px-4 py-3 border text-sm whitespace-pre-wrap',
                                  mine
                                    ? 'bg-slate-900 text-white border-slate-900 rounded-br-md'
                                    : 'bg-slate-50 text-slate-800 border-slate-200 rounded-bl-md'
                                )}
                              >
                                <div>{m.body}</div>
                                <div className={clsx('text-[10px] font-bold mt-2', mine ? 'text-white/70' : 'text-slate-400')}>
                                  {formatWhen(m.created_at)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-white">
                      <div className="flex items-end gap-3">
                        <textarea
                          value={adminDraft}
                          onChange={(e) => setAdminDraft(e.target.value)}
                          className="flex-1 resize-none border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none"
                          rows={2}
                          placeholder="Escribe aquí si quieres responder desde la web (opcional)..."
                        />
                        <button
                          disabled={sendingAdmin || !adminDraft.trim()}
                          onClick={sendAdmin}
                          className={clsx(
                            'px-5 py-3 rounded-2xl text-sm font-bold text-white',
                            sendingAdmin || !adminDraft.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
                          )}
                        >
                          Enviar
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2">
                        Consejo: si respondes desde Telegram, el cliente lo ve aquí automáticamente (cada pocos segundos).
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)]">
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-0">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">Chat de soporte</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Ticket: {meConversation ? `SUP-${meConversation.id}` : '...'} · Estado: {meConversation?.status || 'Open'}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    {meConversation?.last_message_at ? `Último: ${formatWhen(meConversation.last_message_at)}` : ''}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                  {meMessages.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      Cuéntanos qué necesitas y te respondemos por este chat.
                    </div>
                  ) : (
                    meMessages.map((m) => {
                      const mine = m.sender === 'user';
                      return (
                        <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
                          <div
                            className={clsx(
                              'max-w-[85%] rounded-2xl px-4 py-3 border text-sm whitespace-pre-wrap',
                              mine
                                ? 'bg-primary text-white border-primary rounded-br-md'
                                : 'bg-slate-50 text-slate-800 border-slate-200 rounded-bl-md'
                            )}
                          >
                            <div>{m.body}</div>
                            <div className={clsx('text-[10px] font-bold mt-2', mine ? 'text-white/70' : 'text-slate-400')}>
                              {formatWhen(m.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-slate-100 bg-white">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={meDraft}
                      onChange={(e) => setMeDraft(e.target.value)}
                      className="flex-1 resize-none border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none"
                      rows={2}
                      placeholder="Escribe tu mensaje..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendMe();
                      }}
                    />
                    <button
                      disabled={sendingMe || !meDraft.trim()}
                      onClick={sendMe}
                      className={clsx(
                        'px-5 py-3 rounded-2xl text-sm font-bold text-white',
                        sendingMe || !meDraft.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
                      )}
                    >
                      Enviar
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">Tip: Ctrl+Enter para enviar.</div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                    <span className="font-bold text-slate-900">Tiempo de respuesta</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-2">
                    Normalmente respondemos rápido. Si tu caso es urgente, escribe “URGENTE” al inicio del mensaje.
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary to-blue-500 rounded-2xl p-5 text-white shadow-lg shadow-primary/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined">support_agent</span>
                    <span className="font-bold">Soporte por Telegram</span>
                  </div>
                  <div className="text-sm text-white/90 mt-2">
                    Tu mensaje llega directamente al equipo. Te respondemos por este mismo chat.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
