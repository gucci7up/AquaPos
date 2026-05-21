import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

type QuotePublic = {
  id: string;
  customerName: string;
  taxId: string;
  expiry: string;
  items: Array<{ desc?: string; name?: string; qty?: number; quantity?: number; price?: number }>;
  subtotal: number;
  total: number;
  status: string;
  approvalStatus: string;
};

function fmt(n: number) {
  return (Number(n) || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataUrlFromCanvas(canvas: HTMLCanvasElement) {
  return canvas.toDataURL('image/png');
}

type PointN = { x: number; y: number };

export default function QuoteApproval() {
  const { language } = useLanguage();
  const { quoteId, code } = useParams<{ quoteId?: string; code?: string }>();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuotePublic | null>(null);

  const [approverName, setApproverName] = useState('');
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [idDocPreviewName, setIdDocPreviewName] = useState<string | null>(null);
  const [idDocBase64, setIdDocBase64] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const strokesRef = useRef<PointN[][]>([]);
  const [signatureVersion, setSignatureVersion] = useState(0);

  const canSubmit = useMemo(() => {
    if (code) return Boolean(code && approverName.trim() && idDocBase64);
    return Boolean(quoteId && token && approverName.trim() && idDocBase64);
  }, [quoteId, token, code, approverName, idDocBase64]);

  const itemsTotal = useMemo(() => {
    if (!quote) return 0;
    if (Number(quote.total) > 0) return Number(quote.total) || 0;
    return (quote.items || []).reduce((sum, it) => {
      const qty = Number(it.qty ?? it.quantity ?? 0) || 0;
      const price = Number(it.price ?? 0) || 0;
      return sum + qty * price;
    }, 0);
  }, [quote]);

  useEffect(() => {
    const redraw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (const stroke of strokesRef.current) {
        if (stroke.length < 1) continue;
        for (let i = 1; i < stroke.length; i++) {
          const a = stroke[i - 1];
          const b = stroke[i];
          ctx.beginPath();
          ctx.moveTo(a.x * rect.width, a.y * rect.height);
          ctx.lineTo(b.x * rect.width, b.y * rect.height);
          ctx.stroke();
        }
      }
    };

    const setupCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0f172a';
      redraw();
    };

    setupCanvas();
    const ro = new ResizeObserver(() => setupCanvas());
    if (canvasRef.current) ro.observe(canvasRef.current);
    window.addEventListener('resize', setupCanvas);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setupCanvas);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (code) {
        setLoading(true);
        setError(null);
        try {
          const r = await fetch(`${API_BASE}/public/q/${encodeURIComponent(code)}`);
          const response = await r.json().catch(() => null);
          if (!r.ok || !response?.success) throw new Error(response?.error || 'No se pudo cargar la cotización.');
          const q = response.quote || {};
          const items = (q.items || []).map((it: any) => ({
            desc: it.description,
            qty: Number(it.qty) || 0,
            price: Number(it.price) || 0,
          }));
          setQuote({
            id: String(q.id),
            customerName: q.customer_name || q.customerName,
            taxId: q.tax_id || q.taxId,
            expiry: q.expiry_date || q.expiry,
            items,
            subtotal: Number(q.subtotal) || 0,
            total: Number(q.total) || 0,
            status: q.status,
            approvalStatus: q.approval_status || q.approvalStatus,
          });
        } catch (e: any) {
          setError(e?.message || 'Error cargando cotización.');
        } finally {
          setLoading(false);
        }
        return;
      }

      if (!quoteId || !token) {
        setError('Link inválido o incompleto.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`${API_BASE}/public/quotes/${quoteId}?token=${encodeURIComponent(token)}`);
        const response = await r.json().catch(() => null);
        if (!r.ok || !response?.success) throw new Error(response?.error || 'No se pudo cargar la cotización.');
        const q = response.quote || {};
        const items = (q.items || []).map((it: any) => ({
          desc: it.description,
          qty: Number(it.qty) || 0,
          price: Number(it.price) || 0,
        }));
        setQuote({
          id: String(q.id),
          customerName: q.customer_name || q.customerName,
          taxId: q.tax_id || q.taxId,
          expiry: q.expiry_date || q.expiry,
          items,
          subtotal: Number(q.subtotal) || 0,
          total: Number(q.total) || 0,
          status: q.status,
          approvalStatus: q.approval_status || q.approvalStatus,
        });
      } catch (e: any) {
        setError(e?.message || 'Error cargando cotización.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quoteId, token, code]);

  const getLocalPoint = (e: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ne = (e as any).nativeEvent;
    const ox = ne?.offsetX ?? (e as any).offsetX;
    const oy = ne?.offsetY ?? (e as any).offsetY;
    if (typeof ox === 'number' && typeof oy === 'number') {
      return { x: ox, y: oy };
    }
    const rect = canvas.getBoundingClientRect();
    const clientX = (e as any).clientX;
    const clientY = (e as any).clientY;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, clientY - rect.top), rect.height);
    return { x, y };
  };

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    lastPointRef.current = null;
    strokesRef.current = [];
    setSignatureVersion(v => v + 1);
  };

  const hasSignature = () => {
    for (const stroke of strokesRef.current) {
      if (stroke.length > 1) return true;
    }
    return false;
  };

  const undoSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const stroke of strokesRef.current) {
      if (stroke.length < 1) continue;
      for (let i = 1; i < stroke.length; i++) {
        const a = stroke[i - 1];
        const b = stroke[i];
        ctx.beginPath();
        ctx.moveTo(a.x * rect.width, a.y * rect.height);
        ctx.lineTo(b.x * rect.width, b.y * rect.height);
        ctx.stroke();
      }
    }
    setSignatureVersion(v => v + 1);
  };

  const readFileDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') return reject(new Error('No se pudo leer el archivo.'));
        resolve(result);
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.readAsDataURL(file);
    });

  const handlePickIdDoc = async (file: File | null) => {
    setIdDocFile(file);
    setIdDocBase64(null);
    setIdDocPreviewName(file ? file.name : null);
    if (!file) return;
    try {
      const dataUrl = await readFileDataUrl(file);
      setIdDocBase64(dataUrl);
    } catch (e: any) {
      setError(e?.message || 'Error leyendo documento.');
    }
  };

  const handleSubmit = async () => {
    if (!idDocFile || !idDocBase64) return;
    if (!canvasRef.current) return;

    setError(null);

    if (!hasSignature()) {
      setError('Por favor, firma en el recuadro antes de enviar.');
      return;
    }

    setSubmitting(true);
    try {
      const signatureDataUrl = dataUrlFromCanvas(canvasRef.current);
      const url = code
        ? `${API_BASE}/public/q/${encodeURIComponent(code)}/submit`
        : `${API_BASE}/public/quotes/${quoteId}/submit`;
      const body = code
        ? {
          approverName: approverName.trim(),
          signatureDataUrl,
          idDocDataUrl: idDocBase64,
          idDocMime: idDocFile.type || 'application/octet-stream',
          idDocFilename: idDocFile.name,
        }
        : {
          token,
          approverName: approverName.trim(),
          signatureDataUrl,
          idDocDataUrl: idDocBase64,
          idDocMime: idDocFile.type || 'application/octet-stream',
          idDocFilename: idDocFile.name,
        };
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const response = await r.json().catch(() => null);
      if (!r.ok || !response?.success) throw new Error(response?.error || 'No se pudo enviar la aprobación.');
      setQuote(prev => prev ? { ...prev, approvalStatus: 'PendingVerification', status: 'InReview' } : prev);
    } catch (e: any) {
      setError(e?.message || 'Error enviando aprobación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-black text-slate-900">Aprobación de Cotización</h1>
          <p className="text-sm text-slate-500">
            Completa tu nombre, firma digital y sube tu documento de identidad para aprobar.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">Cargando…</div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
              {error}
            </div>
          </div>
        ) : quote ? (
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cotización</p>
                  <p className="text-sm font-bold text-slate-900">{quote.id}</p>
                </div>
                <div className="text-sm text-slate-600">
                  Total: <span className="font-black text-slate-900">{language === 'es' ? `RD$${fmt(itemsTotal)}` : `$${fmt(itemsTotal)}`}</span>
                </div>
              </div>
            </div>

            {quote.approvalStatus === 'PendingVerification' || quote.status === 'InReview' ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium">
                Esta cotización ya fue enviada y está en proceso de verificación.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tu nombre completo</label>
                    <input
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documento de identidad</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handlePickIdDoc(e.target.files?.[0] || null)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    />
                    {idDocPreviewName && (
                      <p className="text-xs text-slate-500">Archivo: {idDocPreviewName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firma digital</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={undoSignature}
                        disabled={strokesRef.current.length === 0}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-50"
                      >
                        Deshacer
                      </button>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Firma</div>
                      <div className="text-[11px] text-slate-500">
                        {signatureVersion ? 'Listo para firmar' : 'Firma dentro del recuadro'}
                      </div>
                    </div>
                    <canvas
                      ref={canvasRef}
                      className="w-full h-[260px] touch-none"
                      style={{ touchAction: 'none' }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        drawingRef.current = true;
                        const p = getLocalPoint(e);
                        lastPointRef.current = p || null;
                        if (p) {
                          const canvas = canvasRef.current;
                          if (canvas) {
                            const rect = canvas.getBoundingClientRect();
                            const pn = { x: rect.width ? p.x / rect.width : 0, y: rect.height ? p.y / rect.height : 0 };
                            strokesRef.current = [...strokesRef.current, [pn]];
                          }
                        }
                        (e.currentTarget as any).setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        e.preventDefault();
                        if (!drawingRef.current) return;
                        const p = getLocalPoint(e);
                        if (!p) return;
                        if (lastPointRef.current) drawLine(lastPointRef.current, p);
                        lastPointRef.current = p;
                        const canvas = canvasRef.current;
                        if (canvas) {
                          const rect = canvas.getBoundingClientRect();
                          const pn = { x: rect.width ? p.x / rect.width : 0, y: rect.height ? p.y / rect.height : 0 };
                          const strokes = strokesRef.current.slice();
                          const last = strokes[strokes.length - 1] || null;
                          if (last) {
                            last.push(pn);
                            strokesRef.current = strokes;
                          }
                        }
                      }}
                      onPointerUp={() => {
                        drawingRef.current = false;
                        lastPointRef.current = null;
                        setSignatureVersion(v => v + 1);
                      }}
                      onPointerCancel={() => {
                        drawingRef.current = false;
                        lastPointRef.current = null;
                        setSignatureVersion(v => v + 1);
                      }}
                    />
                    <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
                      <div className="text-[11px] text-slate-500">Usa dedo, mouse o lápiz.</div>
                      <div className="text-[11px] text-slate-500">Consejo: firma en una sola línea.</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Dibuja tu firma claramente. El recuadro es grande para que la firma no quede pequeña.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-end">
                  <button
                    type="button"
                    disabled={!canSubmit || submitting}
                    onClick={handleSubmit}
                    className="px-6 py-3 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 disabled:opacity-60 disabled:pointer-events-none active:scale-95 transition"
                  >
                    {submitting ? 'Enviando…' : 'Aprobar cotización'}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-6 text-slate-500">No se encontró la cotización.</div>
        )}
      </div>
    </div>
  );
}
