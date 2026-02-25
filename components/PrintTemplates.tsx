import React from 'react';

interface PrintDocumentProps {
    type: 'ticket' | 'invoice' | 'quote' | 'order';
    data: any;
    businessSettings?: {
        name?: string;
        address?: string;
        phone?: string;
        email?: string;
        website?: string;
        taxId?: string;
        taxRegime?: string;
        logo?: string;
    };
}

export const PrintTemplates: React.FC<PrintDocumentProps> = ({ type, data, businessSettings }) => {
    const isThermal = type === 'ticket';

    const fmtCurrency = (val: number) =>
        new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

    const fmtDate = (d?: string) => {
        if (!d) return new Date().toLocaleDateString('es-DO');
        const date = new Date(d);
        if (isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
            ' ' + date.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
    };

    const items: any[] = data.items || [];
    const subtotal = Number(data.subtotal) || items.reduce((a, i) => a + (i.price * (i.quantity || i.qty || 1)), 0);
    const taxRate = Number(data.taxRate) || 0;
    const tax = Number(data.tax) || (subtotal * taxRate / 100);
    const total = Number(data.total) || (subtotal + tax);
    const totalLines = items.length;
    const totalProducts = items.reduce((a, i) => a + (i.quantity || i.qty || 1), 0);

    const biz = businessSettings || {};
    const docNum = data.id ? `#${String(data.id).substring(0, 8).toUpperCase()}` : '#—';

    // ── SHARED PRINT STYLES ─────────────────────────────────────────────────
    const thermalStyles = `
        @media print {
            @page { margin: 0; size: 58mm auto; }
            body { margin: 0; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
        }
        * { box-sizing: border-box; }
    `;

    const a4Styles = `
        @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
        }
        * { box-sizing: border-box; }
    `;

    // ── THERMAL TICKET ──────────────────────────────────────────────────────
    if (isThermal) {
        const S: Record<string, React.CSSProperties> = {
            wrap: { width: '58mm', padding: '3mm 3mm 6mm', fontFamily: "'Courier New', Courier, monospace", fontSize: '9px', color: '#000', backgroundColor: '#fff', lineHeight: '1.4' },
            center: { textAlign: 'center' },
            row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
            dash: { borderTop: '1px dashed #000', margin: '4px 0' },
            solid: { borderTop: '1px solid #000', margin: '4px 0' },
            bold: { fontWeight: 'bold' },
            huge: { fontSize: '14px', fontWeight: 'bold' },
            sm: { fontSize: '8px' },
            tr: { textTransform: 'uppercase' },
            box: { border: '1px solid #000', padding: '3px 4px', margin: '4px 0' },
            right: { textAlign: 'right' },
        };

        return (
            <div style={S.wrap}>
                <style dangerouslySetInnerHTML={{ __html: thermalStyles }} />

                {/* ── Company header ── */}
                <div style={{ ...S.center, marginBottom: '6px' }}>
                    {biz.logo && (
                        <img src={biz.logo} alt="logo" style={{ maxHeight: '20mm', maxWidth: '50mm', marginBottom: '3px', objectFit: 'contain' }} />
                    )}
                    {!biz.logo && (
                        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px', letterSpacing: '1px' }}>
                            ★ {(biz.name || 'Mi Empresa').toUpperCase()} ★
                        </div>
                    )}
                    <div style={{ ...S.bold, fontSize: '12px' }}>{biz.name || 'Mi Empresa'}</div>
                    {biz.address && <div style={S.sm}>{biz.address}</div>}
                    {biz.phone && <div style={S.sm}>Teléfono: {biz.phone}</div>}
                    {biz.email && <div style={S.sm}>{biz.email}</div>}
                    {biz.website && <div style={S.sm}>Sitio web: {biz.website}</div>}
                    {biz.taxId && <div style={S.sm}>RNC: {biz.taxId}</div>}
                    {biz.taxRegime && <div style={S.sm}>Régimen: {biz.taxRegime}</div>}
                </div>

                {/* ── Customer block ── */}
                {(data.customerName || data.customer) && (
                    <>
                        <div style={S.dash} />
                        <div style={{ ...S.box, marginBottom: '4px' }}>
                            <div style={{ ...S.bold, ...S.center, fontSize: '10px', marginBottom: '2px' }}>
                                Cliente: {data.customerName || data.customer}
                            </div>
                            {(data.customerAddress || data.customerCity) && (
                                <div style={S.sm}>{[data.customerAddress, data.customerCity].filter(Boolean).join(', ')}</div>
                            )}
                            {data.customerPhone && <div style={S.sm}>Teléfono: {data.customerPhone}</div>}
                            {data.taxId && <div style={S.sm}>RNC/Cédula: {data.taxId}</div>}
                        </div>
                    </>
                )}

                {/* ── Document details ── */}
                <div style={S.dash} />
                <div style={{ ...S.center, ...S.bold, fontSize: '10px', marginBottom: '3px' }}>
                    {type === 'invoice' ? 'Factura' : type === 'quote' ? 'Cotización' : 'Ticket de Venta'}
                </div>
                <div style={{ ...S.bold, ...S.center, fontSize: '11px', marginBottom: '3px' }}>{docNum}</div>

                <div style={S.sm}>
                    <div style={S.row}><span>Fecha:</span><span>{fmtDate(data.date)}</span></div>
                    {data.paymentMethod && <div style={S.row}><span>Método de pago:</span><span>{data.paymentMethod}</span></div>}
                    {data.vendor && <div style={S.row}><span>Vendedor:</span><span>{data.vendor}</span></div>}
                    {data.dueDate && <div style={S.row}><span>Vencimiento:</span><span>{fmtDate(data.dueDate)}</span></div>}
                </div>

                {/* ── Items table ── */}
                <div style={S.dash} />
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #000' }}>
                            <th style={{ textAlign: 'left', paddingBottom: '2px', width: '45%' }}>Descripción</th>
                            <th style={{ textAlign: 'center', width: '10%' }}>C</th>
                            <th style={{ textAlign: 'right', width: '20%' }}>P.U.</th>
                            <th style={{ textAlign: 'right', width: '25%' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item: any, i: number) => {
                            const qty = item.quantity || item.qty || 1;
                            const price = Number(item.price) || 0;
                            const lineTotal = qty * price;
                            return (
                                <tr key={i}>
                                    <td style={{ padding: '2px 0', verticalAlign: 'top' }}>{item.name || item.desc}</td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{qty}</td>
                                    <td style={{ textAlign: 'right', verticalAlign: 'top' }}>${fmtCurrency(price)}</td>
                                    <td style={{ textAlign: 'right', verticalAlign: 'top' }}>${fmtCurrency(lineTotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* ── Totals ── */}
                <div style={S.dash} />
                <div style={{ fontSize: '9px' }}>
                    <div style={S.row}><span>Subtotal:</span><span>${fmtCurrency(subtotal)}</span></div>
                    {taxRate > 0 && (
                        <div style={S.row}>
                            <span>ITBIS ({taxRate}%):</span>
                            <span>${fmtCurrency(tax)}</span>
                        </div>
                    )}
                </div>
                <div style={{ ...S.solid, ...S.row, ...S.huge, marginTop: '3px' }}>
                    <span>Total:</span>
                    <span>${fmtCurrency(total)}</span>
                </div>

                {/* ── Payment summary ── */}
                <div style={{ ...S.sm, marginTop: '4px' }}>
                    <div style={S.row}><span>Total recibido:</span><span>${fmtCurrency(data.cashReceived || total)}</span></div>
                    <div style={S.row}><span>Total de líneas:</span><span>{totalLines}</span></div>
                    <div style={S.row}><span>Total de productos:</span><span>{totalProducts}</span></div>
                    {(data.cashReceived || 0) > total && (
                        <div style={{ ...S.row, fontWeight: 'bold' }}>
                            <span>Cambio:</span><span>${fmtCurrency((data.cashReceived || 0) - total)}</span>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div style={{ ...S.dash }} />
                <div style={{ ...S.center, fontSize: '8px', lineHeight: '1.5' }}>
                    <p style={{ margin: '2px 0' }}>
                        Todos nuestros productos cuentan con garantía de un mes a partir de la fecha de su facturación.
                    </p>
                    <p style={{ margin: '4px 0 2px', fontWeight: 'bold' }}>¡Gracias por su compra! 🙂</p>
                    {docNum && <p style={{ margin: '2px 0' }}>Factura N°: {docNum}</p>}
                    <p style={{ margin: '2px 0' }}>Generado en AquaPos · {biz.website || 'aquapos.app'}</p>
                </div>
            </div>
        );
    }

    // ── A4 INVOICE / QUOTE / ORDER ──────────────────────────────────────────
    const docTitle = type === 'invoice' ? 'Factura' : type === 'quote' ? 'Cotización' : 'Orden de Compra';
    const primaryColor = '#0ea5e9';

    return (
        <div style={{ width: '210mm', minHeight: '297mm', padding: '18mm 20mm', backgroundColor: '#fff', color: '#1e293b', fontSize: '13px', lineHeight: '1.5', fontFamily: 'Arial, sans-serif' }}>
            <style dangerouslySetInnerHTML={{ __html: a4Styles }} />

            {/* ── A4 Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    {biz.logo
                        ? <img src={biz.logo} alt="logo" style={{ maxHeight: '60px', maxWidth: '180px', objectFit: 'contain', marginBottom: '8px' }} />
                        : <div style={{ fontSize: '28px', fontWeight: 'bold', color: primaryColor }}>{biz.name || 'Mi Empresa'}</div>
                    }
                    {biz.logo && <div style={{ fontSize: '20px', fontWeight: 'bold', color: primaryColor }}>{biz.name}</div>}
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                        {biz.address && <div>{biz.address}</div>}
                        {biz.phone && <div>Tel: {biz.phone}</div>}
                        {biz.email && <div>{biz.email}</div>}
                        {biz.website && <div>{biz.website}</div>}
                        {biz.taxId && <div>RNC: {biz.taxId}</div>}
                        {biz.taxRegime && <div>Régimen: {biz.taxRegime}</div>}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', textTransform: 'uppercase', color: '#1e293b' }}>{docTitle}</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: primaryColor, marginTop: '4px' }}>{docNum}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                        <div>Fecha: {fmtDate(data.date)}</div>
                        {data.dueDate && <div>Vencimiento: {fmtDate(data.dueDate)}</div>}
                        {data.paymentMethod && <div>Método: {data.paymentMethod}</div>}
                        {data.vendor && <div>Vendedor: {data.vendor}</div>}
                    </div>
                </div>
            </div>

            {/* ── Party info ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>De parte de:</div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{biz.name || 'Mi Empresa'}</div>
                    {biz.address && <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{biz.address}</div>}
                    {biz.phone && <div style={{ fontSize: '11px', color: '#475569' }}>Tel: {biz.phone}</div>}
                    {biz.email && <div style={{ fontSize: '11px', color: '#475569' }}>{biz.email}</div>}
                    {biz.taxId && <div style={{ fontSize: '11px', color: '#475569' }}>RNC: {biz.taxId}</div>}
                </div>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px' }}>Dirigido a:</div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{data.customerName || data.customer || 'Cliente General'}</div>
                    {(data.customerAddress || data.customerCity) && (
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                            {[data.customerAddress, data.customerCity].filter(Boolean).join(', ')}
                        </div>
                    )}
                    {data.customerPhone && <div style={{ fontSize: '11px', color: '#475569' }}>Tel: {data.customerPhone}</div>}
                    {data.customerEmail && <div style={{ fontSize: '11px', color: '#475569' }}>{data.customerEmail}</div>}
                    {data.taxId && <div style={{ fontSize: '11px', color: '#475569' }}>RNC/Cédula: {data.taxId}</div>}
                </div>
            </div>

            {/* ── Items table ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px', fontSize: '12px' }}>
                <thead>
                    <tr style={{ backgroundColor: primaryColor, color: '#fff' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '4px 0 0 0' }}>Descripción</th>
                        <th style={{ textAlign: 'center', padding: '10px 12px', width: '80px' }}>Cant.</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', width: '110px' }}>P. Unitario</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', width: '110px', borderRadius: '0 4px 0 0' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item: any, i: number) => {
                        const qty = item.quantity || item.qty || 1;
                        const price = Number(item.price) || 0;
                        const lineTotal = qty * price;
                        return (
                            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '10px 12px' }}>{item.name || item.desc}</td>
                                <td style={{ textAlign: 'center', padding: '10px 12px' }}>{qty}</td>
                                <td style={{ textAlign: 'right', padding: '10px 12px' }}>${fmtCurrency(price)}</td>
                                <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 'bold' }}>${fmtCurrency(lineTotal)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* ── Totals ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
                <div style={{ width: '280px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b' }}>Subtotal:</span>
                        <span>${fmtCurrency(subtotal)}</span>
                    </div>
                    {taxRate > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{ color: '#64748b' }}>ITBIS ({taxRate}%):</span>
                            <span>${fmtCurrency(tax)}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: primaryColor, color: '#fff', borderRadius: '6px', marginTop: '6px', fontSize: '16px', fontWeight: 'bold' }}>
                        <span>Total:</span>
                        <span>${fmtCurrency(total)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                        <span>Total de líneas: {totalLines}</span>
                        <span>Total de productos: {totalProducts}</span>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: 'auto' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.7' }}>
                    <strong style={{ display: 'block', marginBottom: '4px', color: '#475569' }}>
                        {type === 'quote' ? 'Términos de la Cotización' : type === 'invoice' ? 'Términos y Condiciones' : 'Condiciones de la Orden'}
                    </strong>
                    {type === 'quote'
                        ? 'Esta cotización es válida por 30 días a partir de la fecha de emisión. Los precios pueden variar sin previo aviso.'
                        : type === 'invoice'
                            ? 'Todos nuestros productos cuentan con garantía de un mes a partir de la fecha de su facturación. Favor realizar el pago dentro del plazo establecido.'
                            : 'Esta orden de compra está sujeta a la aprobación del responsable de almacén.'}
                    <div style={{ marginTop: '10px', color: '#cbd5e1' }}>
                        Generado en AquaPos · {biz.website || 'aquapos.app'}
                    </div>
                </div>
            </div>
        </div>
    );
};
