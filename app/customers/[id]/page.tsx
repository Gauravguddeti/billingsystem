'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Printer, CheckCircle, Edit2, X, Phone, MapPin, Building2, FileText } from 'lucide-react';
import { Toast, ToastProps } from '@/components/ui/Toast';
import { Skeleton, TableRowSkeleton } from '@/components/ui/Skeleton';
import { InvoicePrint } from '@/components/invoice/InvoicePrint';

function PaymentBadge({ status }: { status?: string }) {
  const s = status || 'unpaid';
  const map: Record<string, { label: string; cls: string }> = {
    paid:    { label: 'Paid',    cls: 'badge badge-paid' },
    unpaid:  { label: 'Unpaid',  cls: 'badge badge-unpaid' },
    partial: { label: 'Partial', cls: 'badge badge-partial' },
  };
  const { label, cls } = map[s] || map.unpaid;
  return <span className={cls}>{label}</span>;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [printInvoice, setPrintInvoice] = useState<{ inv: any; items: any[] } | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', address: '', phone: '', gstin: '' });
  const [saving, setSaving] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type, onClose: () => setToast(null) });

  const load = async () => {
    setLoading(true);
    try {
      const [custRes, bizRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch('/api/settings'),
      ]);
      const custData = await custRes.json();
      const bizData = await bizRes.json();
      if (custData.error) { showToast('Customer not found', 'error'); return; }
      setData(custData);
      if (!bizData.error) setBusinessData(bizData);
    } catch {
      showToast('Failed to load customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleMarkPaid = async (invId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'mark_paid' }),
      });
      if (!res.ok) throw new Error();
      showToast('Marked as paid', 'success');
      load();
    } catch {
      showToast('Failed to update', 'error');
    }
  };

  const handlePrint = async (invId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invId}`);
      const inv = await res.json();
      setPrintInvoice({ inv, items: inv.items || [] });
      setTimeout(() => { window.print(); setTimeout(() => setPrintInvoice(null), 800); }, 300);
    } catch {
      showToast('Failed to load invoice', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Customer updated', 'success');
      setShowEdit(false);
      load();
    } catch (e: any) {
      showToast(e.message || 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pb-24 md:pb-8" style={{ paddingTop: '16px' }}>
        {/* Back button skeleton */}
        <Skeleton className="h-5 w-32 mb-6" />
        {/* Info card skeleton */}
        <div className="rounded-xl p-6 border mb-6" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
          <div className="flex gap-4 items-start mb-6">
            <Skeleton className="w-13 h-13 rounded-full flex-shrink-0" style={{ width: 52, height: 52 }} />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-40" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
        {/* Table skeleton */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <Skeleton className="h-4 w-32" />
          </div>
          <table className="w-full">
            <tbody>{[1,2,3].map(i => <TableRowSkeleton key={i} cols={5} />)}</tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { customer, invoices } = data;
  const totalBilled = Number(customer.total_billed || 0);
  const totalOutstanding = Number(customer.total_outstanding || 0);
  const totalPaid = totalBilled - totalOutstanding;

  const stats = [
    { label: 'Total Invoices', value: customer.total_invoices || 0 },
    { label: 'Total Billed', value: `₹${totalBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
    { label: 'Total Paid', value: `₹${totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
    { label: 'Outstanding', value: `₹${totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, highlight: totalOutstanding > 0 },
    { label: 'Last Invoice', value: customer.last_invoice_date ? new Date(customer.last_invoice_date).toLocaleDateString('en-IN') : '—' },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-8 no-print px-4 md:px-0">
      {/* Back button - below navbar with proper spacing */}
      <button
        onClick={() => router.push('/customers')}
        className="flex items-center gap-2 text-sm font-medium transition mt-2 mb-6"
        style={{ color: 'var(--color-text-secondary)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      {/* Customer info card */}
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: '#EEF2FF', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0
            }}>
              {customer.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                {customer.name}
              </h1>
              <div className="flex flex-col gap-1">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <Phone className="w-3.5 h-3.5" /> {customer.phone}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <MapPin className="w-3.5 h-3.5" /> {customer.address}
                  </div>
                )}
                {customer.gstin && (
                  <div className="flex items-center gap-2 text-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                    <Building2 className="w-3.5 h-3.5" /> GSTIN: {customer.gstin}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setEditForm({ name: customer.name, address: customer.address || '', phone: customer.phone || '', gstin: customer.gstin || '' });
              setShowEdit(true);
            }}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 btn-secondary"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <p className="stat-label">{s.label}</p>
              <p style={{
                fontSize: '16px', fontWeight: 600,
                color: (s as any).highlight ? 'var(--color-danger)' : 'var(--color-text-primary)'
              }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice history */}
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Invoice History
          </p>
          <span className="ml-auto text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {invoices?.length || 0} invoices
          </span>
        </div>

        {!invoices || invoices.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--color-text-muted)' }}>No invoices found for this customer.</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--color-border)' }}>
                    <th className="th-label px-5 py-3">Invoice #</th>
                    <th className="th-label px-5 py-3">Date</th>
                    <th className="th-label px-5 py-3 text-right">Amount</th>
                    <th className="th-label px-5 py-3">Status</th>
                    <th className="th-label px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>{inv.invoice_number}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(inv.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-5 py-3 text-sm text-right font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        ₹{Number(inv.grand_total).toFixed(2)}
                      </td>
                      <td className="px-5 py-3">
                        <PaymentBadge status={inv.payment_status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handlePrint(inv.id)}
                            className="p-2 rounded-lg transition"
                            style={{ color: 'var(--color-text-secondary)' }}
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {inv.payment_status !== 'paid' && (
                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                              style={{ background: '#16A34A', color: 'white', border: '1px solid #15803D' }}
                              title="Mark as Paid"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F9FAFB', borderTop: '2px solid var(--color-border)' }}>
                    <td colSpan={2} className="px-5 py-3 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Summary
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      ₹{totalBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td colSpan={2} className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Outstanding: <span style={{ color: totalOutstanding > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
                        ₹{totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-3 p-4">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="rounded-xl p-4 border" style={{ borderColor: 'var(--color-border)', background: '#FAFAFA' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>{inv.invoice_number}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{new Date(inv.date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <PaymentBadge status={inv.payment_status} />
                  </div>
                  <p className="text-xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>₹{Number(inv.grand_total).toFixed(2)}</p>
                  <div className="flex gap-2" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                    <button onClick={() => handlePrint(inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium" style={{ background: '#F3F4F6', color: 'var(--color-text-secondary)' }}>
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    {inv.payment_status !== 'paid' && (
                      <button onClick={() => handleMarkPaid(inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold" style={{ background: '#16A34A', color: 'white' }}>
                        <CheckCircle className="w-4 h-4" /> Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Edit Customer</h3>
              <button onClick={() => setShowEdit(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Name *', key: 'name', placeholder: 'Customer name' },
                { label: 'Phone', key: 'phone', placeholder: '9876543210' },
                { label: 'GSTIN', key: 'gstin', placeholder: '27AADCB2230M1Z2' },
                { label: 'Address', key: 'address', placeholder: 'Billing address' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>{f.label}</label>
                  <input
                    type="text"
                    value={(editForm as any)[f.key]}
                    onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none transition"
                    style={{ borderColor: 'var(--color-border)' }}
                    placeholder={f.placeholder}
                    onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEdit(false)} className="flex-1 btn-secondary px-4 py-2 text-sm">Cancel</button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editForm.name.trim() || saving}
                  className="flex-1 btn-primary px-4 py-2 text-sm"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
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
    </div>
  );
}
