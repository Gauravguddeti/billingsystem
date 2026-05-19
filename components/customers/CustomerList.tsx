'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/types';
import { Modal } from '../ui/Modal';
import { TableRowSkeleton } from '../ui/Skeleton';

interface CustomerWithStats extends Customer {
  total_invoices?: number;
  total_billed?: number;
  total_outstanding?: number;
  last_invoice_date?: string;
}

export function CustomerList() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    gstin: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (Array.isArray(data)) setCustomers(data);
      else setCustomers([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/customers/${editingId}` : '/api/customers';
      const method = editingId ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        await fetchData();
        setShowModal(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save customer');
      }
    } catch (error) {
      console.error(error);
      alert('Error saving customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      } else {
        alert('Failed to delete customer');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({ name: '', address: '', phone: '', gstin: '' });
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setFormData({
      name: c.name || '',
      address: c.address || '',
      phone: c.phone || '',
      gstin: c.gstin || ''
    });
    setShowModal(true);
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.gstin && c.gstin.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto pb-24 md:pb-8">
        <div className="rounded-xl overflow-x-auto border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
          <table className="w-full" style={{ minWidth: '700px' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--color-border)' }}>
                {['Name','Phone','GSTIN','Total Billed','Outstanding','Actions'].map(h => (
                  <th key={h} className="th-label px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5].map(i => <TableRowSkeleton key={i} cols={6} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Customers</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border text-sm outline-none transition"
              style={{ borderColor: 'var(--color-border)', borderRadius: '8px', minWidth: '240px' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>
          <button
            onClick={openNew}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Table List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center border-2 border-dashed" style={{ borderColor: 'var(--color-border)' }}>
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>No customers found</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>Add your first customer to get started.</p>
          <button onClick={openNew} className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>Add Customer</button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl overflow-x-auto border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
            <table className="w-full text-left border-collapse" style={{ minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--color-border)' }}>
                  <th className="th-label px-5 py-3">Name</th>
                  <th className="th-label px-5 py-3">Phone</th>
                  <th className="th-label px-5 py-3">GSTIN</th>
                  <th className="th-label px-5 py-3 text-right">Total Billed</th>
                  <th className="th-label px-5 py-3 text-right">Outstanding</th>
                  <th className="th-label px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="hover:bg-gray-50 transition cursor-pointer"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{c.name}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{c.phone || '—'}</td>
                    <td className="px-5 py-3.5 text-sm font-mono" style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{c.gstin || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-right font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      ₹{Number(c.total_billed || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right font-semibold" style={{ color: Number(c.total_outstanding || 0) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      ₹{Number(c.total_outstanding || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition" style={{ color: 'var(--color-text-secondary)' }}><Edit2 className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="p-1.5 rounded-lg hover:bg-red-50 transition" style={{ color: 'var(--color-danger)' }}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col gap-3 pb-24">
            {filtered.map(c => {
              const outstanding = Number(c.total_outstanding || 0);
              const billed = Number(c.total_billed || 0);
              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/customers/${c.id}`)}
                  className="rounded-xl p-4 border cursor-pointer active:bg-gray-50 transition"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
                >
                  {/* Name + actions row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: '#EEF2FF', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 700, fontSize: 16,
                        color: 'var(--color-primary)', flexShrink: 0
                      }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{c.name}</p>
                        {c.phone && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{c.phone}</p>}
                        {c.gstin && <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{c.gstin}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-2 rounded-lg" style={{ background: '#F3F4F6', color: 'var(--color-text-secondary)' }}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="p-2 rounded-lg" style={{ background: '#FEF2F2', color: 'var(--color-danger)' }}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {/* Billing stats */}
                  <div className="grid grid-cols-2 gap-2 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total Billed</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        ₹{billed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Outstanding</p>
                      <p className="text-sm font-bold" style={{ color: outstanding > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        ₹{outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}


      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Customer' : 'New Customer'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Customer Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full border rounded-lg p-3 outline-none transition text-sm"
              style={{ borderColor: 'var(--color-border)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full border rounded-lg p-3 outline-none transition text-sm"
              style={{ borderColor: 'var(--color-border)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              placeholder="e.g. 9876543210"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>GSTIN</label>
            <input
              type="text"
              value={formData.gstin}
              onChange={e => setFormData({...formData, gstin: e.target.value.toUpperCase()})}
              className="w-full border rounded-lg p-3 outline-none transition text-sm uppercase"
              style={{ borderColor: 'var(--color-border)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              placeholder="27AADCB2230M1Z2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Billing Address</label>
            <textarea
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              className="w-full border rounded-lg p-3 outline-none transition text-sm min-h-[80px]"
              style={{ borderColor: 'var(--color-border)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              placeholder="Full address"
            />
          </div>
          
          <div className="pt-4 flex gap-3">
            <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary px-4 py-2.5 text-sm">Cancel</button>
            <button onClick={handleSave} disabled={!formData.name || saving} className="flex-1 btn-primary px-4 py-2.5 text-sm">
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
