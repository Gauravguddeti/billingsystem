'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Printer, Edit, Trash2, Calendar, Download, CheckCircle, Copy, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Invoice, InvoiceItem } from '@/types';
import { Toast, ToastProps } from '../ui/Toast';
import { TableRowSkeleton } from '../ui/Skeleton';
import { InvoicePrint } from '../invoice/InvoicePrint';

function PaymentBadge({ status, type }: { status?: string; type?: string }) {
  if (type === 'credit_note') return <span className="badge badge-cn">Credit Note</span>;
  const map: Record<string, { label: string; cls: string }> = {
    paid:    { label: 'Paid',    cls: 'badge badge-paid' },
    unpaid:  { label: 'Unpaid',  cls: 'badge badge-unpaid' },
    partial: { label: 'Partial', cls: 'badge badge-partial' },
  };
  const { label, cls } = map[status || 'unpaid'] || map.unpaid;
  return <span className={cls}>{label}</span>;
}

export function HistoryList() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [printInvoice, setPrintInvoice] = useState<{ inv: Invoice; items: InvoiceItem[] } | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type, onClose: () => setToast(null) });

  const loadInvoices = () => {
    setLoading(true);
    let url = '/api/invoices';
    const params = new URLSearchParams();
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    if (paymentFilter && paymentFilter !== 'all') params.set('payment_status', paymentFilter);
    if (params.toString()) url += '?' + params.toString();
    fetch(url)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setInvoices(data); })
      .catch(() => showToast('Failed to load invoices', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInvoices();
    fetch('/api/settings').then(r => r.json()).then(d => { if (d && !d.error) setBusinessData(d); }).catch(() => {});
  }, [fromDate, toDate, paymentFilter]);

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDelete = async (id: string, invNum: string, customer: string) => {
    if (!confirm(`Delete invoice ${invNum} for ${customer}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Invoice deleted', 'info');
      loadInvoices();
    } catch { showToast('Error deleting invoice', 'error'); }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'mark_paid' }),
      });
      if (!res.ok) throw new Error();
      showToast('Marked as paid', 'success');
      loadInvoices();
    } catch { showToast('Failed to update', 'error'); }
  };

  const handleReprint = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPrintInvoice({ inv: data, items: data.items || [] });
      setTimeout(() => { window.print(); setTimeout(() => setPrintInvoice(null), 1000); }, 500);
    } catch { showToast('Error loading invoice for print', 'error'); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error();
      const inv = await res.json();
      // Navigate to invoice page with prefill data stored in sessionStorage
      sessionStorage.setItem('duplicateInvoice', JSON.stringify(inv));
      router.push('/invoice?duplicate=1');
    } catch { showToast('Failed to duplicate invoice', 'error'); }
  };



  // ─── GSTR-1 Export ─────────────────────────────────────────────────────────
  const handleExportCSV = (gstr1 = false) => {
    const filtered = filteredInvoices;
    if (filtered.length === 0) { showToast('No invoices to export', 'info'); return; }
    setShowExportMenu(false);

    if (!gstr1) {
      const headers = ['Invoice #', 'Date', 'Customer', 'Address', 'Phone', 'GSTIN', 'Subtotal', 'CGST', 'SGST', 'Grand Total', 'Payment Status', 'Type'];
      const rows = filtered.map(inv => [
        inv.invoice_number, inv.date, inv.customer_name,
        inv.customer_address || '', inv.customer_phone || '', inv.customer_gstin || '',
        Number(inv.subtotal).toFixed(2), Number(inv.cgst).toFixed(2), Number(inv.sgst).toFixed(2),
        Number(inv.grand_total).toFixed(2), inv.payment_status || 'unpaid', inv.type || 'invoice',
      ]);
      downloadCSV([headers, ...rows], `invoices_${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      // GSTR-1 format
      const b2bHeaders = ['GSTIN of Supplier', 'Trade/Legal Name', 'Invoice Number', 'Invoice Date',
        'Invoice Value', 'Place of Supply', 'Reverse Charge', 'Invoice Type', 'Rate', 'Taxable Value',
        'CGST Amount', 'SGST Amount', 'IGST Amount', 'Cess Amount'];
      const b2bRows: string[][] = [];
      const b2csRows: string[][] = [];

      filtered.filter(inv => inv.type !== 'credit_note').forEach(inv => {
        const row = [
          businessData?.gstin || '', businessData?.name || '',
          inv.invoice_number,
          new Date(inv.date).toLocaleDateString('en-IN'),
          Number(inv.grand_total).toFixed(2),
          '', // Place of supply
          'N', // Reverse charge
          inv.customer_gstin ? 'B2B' : 'B2C',
          '5', // GST rate %
          Number(inv.after_discount || 0).toFixed(2),
          Number(inv.cgst || 0).toFixed(2),
          Number(inv.sgst || 0).toFixed(2),
          Number((inv as any).igst || 0).toFixed(2),
          '0',
        ];
        if (inv.customer_gstin) b2bRows.push(row);
        else b2csRows.push(row);
      });

      const all = [['---B2B Invoices---'], b2bHeaders, ...b2bRows, [''], ['---B2CS Invoices---'], b2bHeaders, ...b2csRows];
      downloadCSV(all, `GSTR1_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const downloadCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = filteredInvoices.reduce((s, inv) => s + Number(inv.grand_total), 0);

  const thStyle = { padding: '10px 20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', background: '#FAFAFA' };

  return (
    <>
      <div className="no-print" style={{ background: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '24px' }}>
        {/* Header */}
        <div className="hidden md:flex justify-between items-center mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Invoice History</h2>
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setShowExportMenu(v => !v)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium btn-secondary"
            >
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border z-50 w-48 py-1 animate-fade-in" style={{ borderColor: 'var(--color-border)' }}>
                <button onClick={() => handleExportCSV(false)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition" style={{ color: 'var(--color-text-primary)' }}>
                  Standard CSV
                </button>
                <button onClick={() => handleExportCSV(true)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition" style={{ color: 'var(--color-text-primary)' }}>
                  GSTR-1 Format
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search + Filters row */}
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search by invoice # or customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border text-sm outline-none transition min-h-[40px]"
              style={{ borderColor: 'var(--color-border)', borderRadius: '8px' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="border text-sm px-3 py-2 outline-none" style={{ borderColor: 'var(--color-border)', borderRadius: '8px' }} />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>to</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="border text-sm px-3 py-2 outline-none" style={{ borderColor: 'var(--color-border)', borderRadius: '8px' }} />
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="border text-sm px-3 py-2 outline-none"
              style={{ borderColor: 'var(--color-border)', borderRadius: '8px' }}
            >
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
            </select>
            {(fromDate || toDate || paymentFilter !== 'all') && (
              <button onClick={() => { setFromDate(''); setToDate(''); setPaymentFilter('all'); }}
                className="text-sm underline" style={{ color: 'var(--color-text-muted)' }}>Clear</button>
            )}
          </div>
          {/* Mobile filter button */}
          <button onClick={() => setShowFilters(true)} className="md:hidden flex items-center justify-center border rounded-lg p-2.5 min-h-[40px] relative" style={{ borderColor: 'var(--color-border)' }}>
            <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            {(fromDate || toDate || paymentFilter !== 'all') && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />}
          </button>
        </div>

        {/* Summary strip */}
        {filteredInvoices.length > 0 && (
          <div className="flex gap-6 mb-4 text-sm px-4 py-2.5 rounded-lg" style={{ background: '#F0F4FF', color: 'var(--color-text-secondary)' }}>
            <span><strong style={{ color: 'var(--color-text-primary)' }}>{filteredInvoices.length}</strong> invoices</span>
            <span>Total: <strong style={{ color: 'var(--color-primary)' }}>₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
          </div>
        )}

        {loading ? (
          <div className="hidden md:block overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {['Invoice #','Date','Customer','Type','Status','Amount','Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4,5,6].map(i => <TableRowSkeleton key={i} cols={7} />)}
              </tbody>
            </table>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center rounded-xl border-2 border-dashed" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            No invoices found
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th style={thStyle}>Invoice #</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Customer</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-5 py-3.5 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>{inv.invoice_number}</td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-3.5 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{inv.customer_name}</td>
                      <td className="px-5 py-3.5">
                        <span className="badge" style={{ background: inv.tax_inclusive ? '#DCFCE7' : '#F3F4F6', color: inv.tax_inclusive ? '#16A34A' : '#6B7280', fontSize: '11px' }}>
                          {inv.tax_inclusive ? 'Tax' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <PaymentBadge status={inv.payment_status} type={inv.type} />
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        ₹{Number(inv.grand_total).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          {inv.payment_status !== 'paid' && inv.type !== 'credit_note' && (
                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border"
                              style={{ background: '#16A34A', color: 'white', border: '1px solid #15803D' }}
                              title="Mark as Paid"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                            </button>
                          )}
                          <button onClick={() => handleReprint(inv.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                            style={{ color: 'var(--color-text-secondary)' }} title="Print">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => router.push(`/invoice/${inv.id}`)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition"
                            style={{ color: '#3B82F6' }} title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDuplicate(inv.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                            style={{ color: 'var(--color-text-muted)' }} title="Duplicate">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(inv.id, inv.invoice_number, inv.customer_name)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition"
                            style={{ color: 'var(--color-danger)' }} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {filteredInvoices.map(inv => (
                <div key={inv.id} className="rounded-xl p-4 border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{inv.customer_name}</div>
                      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{inv.invoice_number} · {new Date(inv.date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <PaymentBadge status={inv.payment_status} type={inv.type} />
                  </div>
                  <div className="text-2xl font-bold mb-3" style={{ color: 'var(--color-primary)' }}>₹{Number(inv.grand_total).toFixed(2)}</div>
                  <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <button onClick={() => handleReprint(inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium" style={{ background: '#F3F4F6', color: 'var(--color-text-secondary)' }}>
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    <button onClick={() => router.push(`/invoice/${inv.id}`)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => handleDuplicate(inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium" style={{ background: '#F5F3FF', color: 'var(--color-primary)' }}>
                      <Copy className="w-4 h-4" /> Copy
                    </button>
                    {inv.payment_status !== 'paid' && inv.type !== 'credit_note' && (
                      <button onClick={() => handleMarkPaid(inv.id)} className="flex items-center justify-center gap-1 p-2.5 rounded-lg font-bold" style={{ background: '#16A34A', color: 'white' }}>
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(inv.id, inv.invoice_number, inv.customer_name)} className="flex items-center justify-center p-2.5 rounded-lg" style={{ background: '#FEF2F2', color: 'var(--color-danger)' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mobile Filter Bottom Sheet */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
          <div className="bg-white rounded-t-3xl p-6 relative z-10 shadow-2xl" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>Filters</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>From Date</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full border rounded-xl p-3 text-base outline-none" style={{ borderColor: 'var(--color-border)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>To Date</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full border rounded-xl p-3 text-base outline-none" style={{ borderColor: 'var(--color-border)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Payment Status</label>
                <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="w-full border rounded-xl p-3 text-base outline-none" style={{ borderColor: 'var(--color-border)' }}>
                  <option value="all">All Status</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <button onClick={() => setShowFilters(false)} className="btn-primary w-full p-4 text-base font-semibold rounded-xl mt-2">Apply</button>
              {(fromDate || toDate || paymentFilter !== 'all') && (
                <button onClick={() => { setFromDate(''); setToDate(''); setPaymentFilter('all'); setShowFilters(false); }}
                  className="w-full p-3 text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Clear Filters</button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} />}
      {printInvoice && (
        <InvoicePrint
          invoice={printInvoice.inv}
          items={printInvoice.items}
          business={businessData || { id: '', user_id: '', name: 'My Business' }}
          gstEnabled={!!printInvoice.inv.tax_inclusive}
        />
      )}
    </>
  );
}
