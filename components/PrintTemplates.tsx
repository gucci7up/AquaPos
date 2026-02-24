import React from 'react';

interface PrintDocumentProps {
    type: 'ticket' | 'invoice' | 'quote' | 'order';
    data: any;
    businessSettings?: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
        taxId?: string;
        logo?: string;
    };
}

export const PrintTemplates: React.FC<PrintDocumentProps> = ({ type, data, businessSettings }) => {
    const isThermal = type === 'ticket';

    // Helper formatting
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    if (isThermal) {
        // 80mm Thermal Receipt Template
        return (
            <div className="print-thermal" style={{ width: '80mm', padding: '5mm', fontFamily: 'monospace', fontSize: '12px', color: '#000' }}>
                <style dangerouslySetInnerHTML={{
                    __html: `
          @media print {
            @page { margin: 0; }
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        `}} />
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <h2 style={{ margin: '0', fontSize: '16px' }}>{businessSettings?.name || 'AquaPos'}</h2>
                    <p style={{ margin: '2px 0' }}>{businessSettings?.address}</p>
                    <p style={{ margin: '2px 0' }}>Tel: {businessSettings?.phone}</p>
                    {businessSettings?.taxId && <p style={{ margin: '2px 0' }}>RNC: {businessSettings?.taxId}</p>}
                </div>

                <div style={{ borderTop: '1px dashed #000', paddingTop: '5px', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>No: {data.id?.substring(0, 8)}</span>
                        <span>{new Date(data.date).toLocaleDateString()}</span>
                    </div>
                    <div>Cliente: {data.customerName || 'General'}</div>
                    <div>Cajero: Admin</div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #000' }}>
                            <th style={{ textAlign: 'left' }}>Item</th>
                            <th style={{ textAlign: 'center' }}>Cant</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items?.map((item: any, i: number) => (
                            <tr key={i}>
                                <td style={{ padding: '2px 0' }}>{item.name || item.desc}</td>
                                <td style={{ textAlign: 'center' }}>{item.quantity || item.qty}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency((item.quantity || item.qty) * item.price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #000', paddingTop: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>SUBTOTAL:</span>
                        <span>{formatCurrency(data.subtotal || (data.total / 1.18))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{businessSettings?.taxId ? 'ITBIS' : 'IMP.'} ({data.taxRate || 18}%):</span>
                        <span>{formatCurrency(data.tax || (data.total - (data.subtotal || data.total / 1.18)))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'black', marginTop: '5px' }}>
                        <span>TOTAL:</span>
                        <span>{formatCurrency(data.total)}</span>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                    <p style={{ margin: '0' }}>¡Gracias por su compra!</p>
                    <p style={{ margin: '2px 0', fontSize: '10px' }}>aquapos.salamihost.lat</p>
                </div>
            </div>
        );
    }

    // A4 Generic Template (Invoice / Quote / Order)
    return (
        <div className="print-a4" style={{ width: '210mm', padding: '20mm', backgroundColor: '#fff', color: '#000', fontSize: '14px', minHeight: '297mm' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; margin: 0; }
          .no-print { display: none !important; }
        }
      `}} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ color: '#0ea5e9', fontSize: '32px', margin: '0' }}>{businessSettings?.name || 'AquaPos'}</h1>
                    <p style={{ color: '#64748b', fontSize: '12px' }}>Smart POS & Management Solution</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: '0', fontSize: '24px', textTransform: 'uppercase' }}>
                        {type === 'invoice' ? 'Factura' : type === 'quote' ? 'Cotización' : 'Orden de Compra'}
                    </h2>
                    <p style={{ margin: '5px 0', fontWeight: 'bold' }}>#{data.id || 'N/A'}</p>
                    <p style={{ margin: '0', fontSize: '12px' }}>{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
                <div>
                    <h4 style={{ textTransform: 'uppercase', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginBottom: '10px' }}>De parte de:</h4>
                    <p style={{ fontWeight: 'bold', margin: '0' }}>{businessSettings?.name || 'Administración AquaPos'}</p>
                    <p style={{ margin: '2px 0' }}>{businessSettings?.address}</p>
                    <p style={{ margin: '2px 0' }}>Tel: {businessSettings?.phone}</p>
                    <p style={{ margin: '2px 0' }}>{businessSettings?.email}</p>
                    {businessSettings?.taxId && <p style={{ margin: '2px 0' }}>RNC: {businessSettings?.taxId}</p>}
                </div>
                <div>
                    <h4 style={{ textTransform: 'uppercase', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginBottom: '10px' }}>Dirigido a:</h4>
                    <p style={{ fontWeight: 'bold', margin: '0' }}>{data.customerName || data.customer || 'Cliente General'}</p>
                    <p style={{ margin: '2px 0' }}>{data.customerEmail || 'No registrado'}</p>
                    <p style={{ margin: '2px 0' }}>{data.customerPhone}</p>
                    {data.taxId && <p style={{ margin: '2px 0' }}>RNC/Cédula: {data.taxId}</p>}
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '12px' }}>Descripción</th>
                        <th style={{ textAlign: 'center', padding: '12px' }}>Cantidad</th>
                        <th style={{ textAlign: 'right', padding: '12px' }}>Precio Unitario</th>
                        <th style={{ textAlign: 'right', padding: '12px' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items?.map((item: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px' }}>{item.name || item.desc}</td>
                            <td style={{ textAlign: 'center', padding: '12px' }}>{item.quantity || item.qty}</td>
                            <td style={{ textAlign: 'right', padding: '12px' }}>{formatCurrency(item.price)}</td>
                            <td style={{ textAlign: 'right', padding: '12px', fontWeight: 'bold' }}>{formatCurrency((item.quantity || item.qty) * item.price)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '250px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b' }}>Subtotal:</span>
                        <span>{formatCurrency(data.subtotal || (data.total / 1.18))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b' }}>ITBIS / TAX ({data.taxRate || 18}%):</span>
                        <span>{formatCurrency(data.tax || (data.total - (data.subtotal || data.total / 1.18)))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '20px', fontWeight: 'bold', color: '#0ea5e9' }}>
                        <span>Total:</span>
                        <span>{formatCurrency(data.total)}</span>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '60px', borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ textTransform: 'uppercase', fontSize: '10px', color: '#94a3b8', marginBottom: '10px' }}>Términos y Condiciones</h4>
                <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5' }}>
                    {type === 'quote' ? 'Esta cotización es válida por 30 días a partir de la fecha de emisión. Los precios pueden variar sin previo aviso.' :
                        type === 'invoice' ? 'Gracias por su preferencia. Favor realizar el pago en un plazo no mayor a 15 días.' :
                            'Esta orden de compra está sujeta a la aprobación del responsable de almacén.'}
                </p>
            </div>
        </div>
    );
};
