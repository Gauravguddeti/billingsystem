'use client';

import React, { useEffect, useState } from 'react';
import { Invoice, InvoiceItem, Business } from '@/types';

interface InvoicePrintProps {
  invoice: Invoice;
  items: InvoiceItem[];
  business: Business;
  gstEnabled?: boolean;
  previewMode?: boolean;
}

export function InvoicePrint({ invoice, items, business, gstEnabled = true, previewMode = false }: InvoicePrintProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const validItems = items.filter(i => i.item_name && i.item_name.trim() !== '');
  
  // Use same logic as original HTML for small invoice styling
  const isSmall = validItems.length <= 5;
  const hasDisc = validItems.some(i => (i.discount && Number(i.discount) > 0) || (i.discount_amount && Number(i.discount_amount) > 0));
  const hasFreeQty = validItems.some(i => i.free_qty && Number(i.free_qty) > 0);
  const hasMrp = validItems.some(i => i.mrp && Number(i.mrp) > 0);

  // Spans calculation matching original:
  // Base columns before Total: #, Item, HSN, Qty, Unit, Free, Rate
  // +1 if MRP, +1 if Disc, +1 if Taxable
  // Wait, original leftSpan = hasMrp ? 8 : 7
  let leftSpan = 7;
  if (hasMrp) leftSpan++;
  
  let rightSpan = 1; // Total column
  if (hasDisc) rightSpan++;
  if (gstEnabled) rightSpan++; // Taxable

  const totalQty = validItems.reduce((acc, curr) => acc + Number(curr.quantity), 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @page { size: A4 portrait; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 6mm 12mm; font-size: 12px; background: white;
                 -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-container { display: block !important; width: 100%; box-sizing: border-box; }
          .invoice-table { border-collapse: collapse; width: 100%; font-size: 11px; margin: 8px 0; }
          .invoice-table th, .invoice-table td { border: 1px solid #000; padding: 4px 7px; word-wrap: break-word; }
          .print-header { margin-bottom: 20px; }
          .print-footer { margin-top: 10px; }
          h1,h2,h3 { margin: 4px 0; } p { margin: 2px 0; }
          /* Half-page (≤5 items) */
          .small-invoice { display: flex !important; flex-direction: column !important;
            min-height: 100mm; box-sizing: border-box; border-bottom: 1px dashed #888;
            padding-bottom: 2mm; margin-bottom: 2mm; page-break-after: always; }
          .small-invoice .print-footer { margin-top: auto !important; padding-top: 5px !important; }
          .small-invoice h1 { font-size: 17px !important; margin: 0 0 3px 0 !important; }
          .small-invoice h2 { font-size: 15px !important; margin: 0 0 3px 0 !important; }
          .small-invoice h3 { font-size: 12px !important; margin: 0 0 2px 0 !important; }
          .small-invoice p { font-size: 10px !important; margin: 1px 0 !important; line-height: 1.3 !important; }
          .small-invoice .print-header { padding-bottom: 5px !important; margin-bottom: 6px !important; }
          .small-invoice .invoice-table { font-size: 10px !important; margin: 5px 0 !important; }
          .small-invoice .invoice-table th, .small-invoice .invoice-table td { padding: 3px 5px !important; }
          .small-invoice .print-footer .signature-gap { height: 16px !important; }
          .small-invoice div[style] { margin-bottom: 5px !important; }
        }
        ${!previewMode ? '@media screen { .print-container:not(.preview-mode) { display: none; } }' : ''}
      `}} />
      <div id="print-area" className={`print-container bg-white text-black ${isSmall ? 'small-invoice' : ''} ${previewMode ? 'preview-mode shadow-2xl p-8 max-w-4xl mx-auto mb-8' : ''}`}>
        
        {/* Header exact match to index.html */}
        <div className="print-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                {business?.name || 'Business Name'}
              </h1>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>{business?.address || ''}</p>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>GSTIN: {business?.gstin || ''}</p>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Phone: {business?.phone || ''}</p>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Email: {business?.email || ''}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                {gstEnabled ? 'TAX INVOICE' : 'INVOICE'}
              </h2>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>
                <strong>Invoice #: </strong>{invoice.invoice_number}
              </p>
              <p style={{ margin: '2px 0', fontSize: '13px' }}>
                <strong>Date: </strong>{new Date(invoice.date).toISOString().split('T')[0]}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #000' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 5px 0' }}>Bill To:</h3>
            <p style={{ margin: '2px 0', fontSize: '13px' }}><strong>{invoice.customer_name}</strong></p>
            <p style={{ margin: '2px 0', fontSize: '13px' }}>{invoice.customer_address}</p>
            {invoice.customer_phone && (
              <p style={{ margin: '2px 0', fontSize: '13px' }}>Phone: {invoice.customer_phone}</p>
            )}
            {invoice.customer_gstin && (
              <p style={{ margin: '2px 0', fontSize: '13px' }}>GSTIN: {invoice.customer_gstin}</p>
            )}
          </div>
        </div>

        {/* Items Table exact match to index.html */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>#</th>
              <th style={{ width: '22%' }}>Item</th>
              <th style={{ width: '9%' }}>HSN</th>
              {hasMrp && <th style={{ width: '8%', textAlign: 'right' }}>MRP</th>}
              <th style={{ width: '6%' }}>Qty</th>
              <th style={{ width: '6%' }}>Unit</th>
              <th style={{ width: '9%' }}>Free</th>
              <th style={{ width: gstEnabled ? '10%' : '15%', textAlign: 'right' }}>Rate</th>
              {hasDisc && <th style={{ width: '10%', textAlign: 'right' }}>Disc(₹)</th>}
              {gstEnabled && <th style={{ width: '11%', textAlign: 'right' }}>Taxable</th>}
              <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((it, idx) => {
              const freeText = (it.free_qty && Number(it.free_qty) > 0)
                ? `${it.free_qty} ${it.free_unit || 'Pcs'}`
                : '0';
              // Check item discount amount exactly like the original
              const discRupee = Number(it.discount_amount || 0).toFixed(2);
              
              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{it.item_name}</td>
                  <td>{it.hsn || '-'}</td>
                  {hasMrp && <td style={{ textAlign: 'right' }}>₹{Number(it.mrp || 0).toFixed(2)}</td>}
                  <td>{it.quantity}</td>
                  <td>{it.unit || 'Pcs'}</td>
                  <td>{freeText}</td>
                  <td style={{ textAlign: 'right' }}>₹{Number(it.rate).toFixed(2)}</td>
                  {hasDisc && (
                    <td style={{ textAlign: 'right', color: Number(discRupee) > 0 ? '#c00' : 'inherit' }}>
                      {Number(discRupee) > 0 ? `-₹${discRupee}` : '—'}
                    </td>
                  )}
                  {gstEnabled && <td style={{ textAlign: 'right' }}>₹{Number(it.base_amount || 0).toFixed(2)}</td>}
                  <td style={{ textAlign: 'right' }}>₹{Number(it.total).toFixed(2)}</td>
                </tr>
              );
            })}

            <tr>
              <td colSpan={leftSpan} style={{ textAlign: 'right', fontWeight: 'bold' }}>Subtotal:</td>
              <td colSpan={rightSpan} style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{Number(invoice.subtotal).toFixed(2)}</td>
            </tr>
            
            {(Number(invoice.discount) > 0 || Number(invoice.discount_amount) > 0) && (
              <tr>
                <td colSpan={leftSpan} style={{ textAlign: 'right' }}>
                  Discount {Number(invoice.discount_amount) > 0 ? `(₹${invoice.discount_amount})` : `(${invoice.discount}%)`}:
                </td>
                <td colSpan={rightSpan} style={{ textAlign: 'right' }}>-₹{Number(invoice.discount_amount || 0).toFixed(2)}</td>
              </tr>
            )}

            {(Number(invoice.discount) > 0 || Number(invoice.discount_amount) > 0) && (
              <tr>
                <td colSpan={leftSpan} style={{ textAlign: 'right', fontWeight: 'bold' }}>After Discount:</td>
                <td colSpan={rightSpan} style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{Number(invoice.after_discount || 0).toFixed(2)}</td>
              </tr>
            )}

            {gstEnabled && (
              <tr>
                <td colSpan={leftSpan} style={{ textAlign: 'right' }}>CGST @ 2.5%:</td>
                <td colSpan={rightSpan} style={{ textAlign: 'right' }}>₹{Number(invoice.cgst).toFixed(2)}</td>
              </tr>
            )}

            {gstEnabled && (
              <tr>
                <td colSpan={leftSpan} style={{ textAlign: 'right' }}>SGST @ 2.5%:</td>
                <td colSpan={rightSpan} style={{ textAlign: 'right' }}>₹{Number(invoice.sgst).toFixed(2)}</td>
              </tr>
            )}

            <tr>
              <td colSpan={leftSpan + rightSpan} style={{ textAlign: 'right', fontSize: '10px', color: '#555', paddingTop: '4px' }}>
                Total Qty: {totalQty}
              </td>
            </tr>
            
            <tr>
              <td colSpan={leftSpan} style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>GRAND TOTAL:</td>
              <td colSpan={rightSpan} style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>₹{Number(invoice.grand_total).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer exact match to index.html */}
        <div className="print-footer">
          <p style={{ fontSize: '13px', marginBottom: '15px' }}>
            <strong>Amount in Words: </strong>{invoice.amount_words}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <div>
              <p style={{ fontSize: '13px', margin: '2px 0' }}><strong>Bank Details:</strong></p>
              <p style={{ fontSize: '12px', margin: '2px 0' }}>Bank: {business?.bank_name || ''}</p>
              {business?.branch_name && <p style={{ fontSize: '12px', margin: '2px 0' }}>Branch: {business.branch_name}</p>}
              <p style={{ fontSize: '12px', margin: '2px 0' }}>A/C: {business?.account_no || ''}</p>
              <p style={{ fontSize: '12px', margin: '2px 0' }}>IFSC: {business?.ifsc || ''}</p>
              {business?.upi_id && <p style={{ fontSize: '12px', margin: '2px 0' }}>UPI: {business.upi_id}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '13px', margin: '2px 0' }}>For {business?.name || 'Business'}</p>
              <div className="signature-gap" style={{ height: '60px' }}></div>
              <p style={{ fontSize: '13px', margin: '2px 0', borderTop: '1px solid #000', paddingTop: '5px' }}>
                Authorized Signatory
              </p>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '11px', marginTop: '8px', borderTop: '1px dashed #aaa', paddingTop: '6px', fontStyle: 'italic' }}>
            <strong>Terms: </strong>{business?.terms_conditions || 'Cheque Bouncing Charges ₹500. Thank you for your business!'}
          </p>
        </div>
      </div>
    </>
  );
}
