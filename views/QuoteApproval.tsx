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

type PointN = { x: number; y: number };

const SIG_W = 1000;
const SIG_H = 300;

function buildStrokePath(points: PointN[]) {
  if (!points.length) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y + 0.01}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

async function signatureToPngDataUrl(strokes: PointN[][]) {
  const paths = strokes
    .filter(s => s.length)
    .map(s => `<path d="${buildStrokePath(s)}" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`)
    .join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIG_W}" height="${SIG_H}" viewBox="0 0 ${SIG_W} ${SIG_H}">
  <rect width="100%" height="100%" fill="#ffffff" />
  ${paths}
</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo generar la firma.'));
    });
    img.src = url;
    await loaded;
    const canvas = document.createElement('canvas');
    canvas.width = SIG_W;
    canvas.height = SIG_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo generar la firma.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIG_W, SIG_H);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

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

  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawingRef = useRef(false);
  const [strokes, setStrokes] = useState<PointN[][]>([]);

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

  const clearSignature = () => {
    setStrokes([]);
  };

  const hasSignature = () => {
    return strokes.some(s => s.length > 1);
  };

  const undoSignature = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const getSvgPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    const x = Math.min(Math.max(0, p.x), SIG_W);
    const y = Math.min(Math.max(0, p.y), SIG_H);
    return { x, y } as PointN;
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

    setError(null);

    if (!hasSignature()) {
      setError('Por favor, firma en el recuadro antes de enviar.');
      return;
    }

    setSubmitting(true);
    try {
      const signatureDataUrl = await signatureToPngDataUrl(strokes);
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
                        disabled={strokes.length === 0}
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
                        Firma dentro del recuadro
                      </div>
                    </div>
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${SIG_W} ${SIG_H}`}
                      preserveAspectRatio="none"
                      className="block w-full h-[260px] touch-none bg-white"
                      style={{ touchAction: 'none' }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        drawingRef.current = true;
                        const p = getSvgPoint(e);
                        if (!p) return;
                        setStrokes(prev => [...prev, [p]]);
                        (e.currentTarget as any).setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        e.preventDefault();
                        if (!drawingRef.current) return;
                        const p = getSvgPoint(e);
                        if (!p) return;
                        setStrokes(prev => {
                          if (!prev.length) return prev;
                          const next = prev.slice();
                          const last = next[next.length - 1].slice();
                          last.push(p);
                          next[next.length - 1] = last;
                          return next;
                        });
                      }}
                      onPointerUp={() => {
                        drawingRef.current = false;
                      }}
                      onPointerCancel={() => {
                        drawingRef.current = false;
                      }}
                    >
                      <rect x="0" y="0" width={SIG_W} height={SIG_H} fill="#ffffff" />
                      {strokes.map((s, idx) => (
                        <path
                          key={idx}
                          d={buildStrokePath(s)}
                          fill="none"
                          stroke="#0f172a"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </svg>
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
