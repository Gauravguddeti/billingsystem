'use client';

import React, { useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { InvoicePrint } from '@/components/invoice/InvoicePrint';
import { Invoice, InvoiceItem, Business } from '@/types';

interface Props {
  invoice: Invoice;
  items: InvoiceItem[];
  business: Business;
}

export default function InvoicePrintClient({ invoice, items, business }: Props) {
  return (
    <>
      {/* Print control bar — hidden when printing */}
      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          background: '#111827',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 100,
        }}
      >
        <button
          onClick={() => history.back()}
          className="flex items-center gap-2 text-sm"
          style={{ color: '#9CA3AF', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span style={{ color: '#374151', fontSize: '13px' }}>|</span>
        <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
          {invoice.invoice_number} — {invoice.customer_name}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg"
          style={{ background: '#6C47FF', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Invoice preview */}
      <div style={{ padding: '24px', background: '#F3F4F6', minHeight: 'calc(100vh - 48px)' }} className="no-print-bg">
        <InvoicePrint
          invoice={invoice}
          items={items}
          business={business}
          gstEnabled={!!invoice.tax_inclusive}
          previewMode={true}
        />
      </div>
    </>
  );
}
