'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Users, MapPin, Phone, FileText } from 'lucide-react';
import { Customer } from '@/types';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
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
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
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
    return <div className="flex justify-center p-12"><Spinner className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center gap-2">
          <Users className="w-8 h-8 text-purple-600" /> Customers
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none"
            />
          </div>
          <button 
            onClick={openNew}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-md whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Add Customer
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border-2 border-dashed border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No customers found</h3>
          <p className="text-gray-500 mt-1 mb-4">Add your first customer to get started.</p>
          <button onClick={openNew} className="text-purple-600 font-bold hover:underline">Add Customer</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-gray-800 break-words flex-1 pr-2">{c.name}</h3>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              
              <div className="space-y-2 mt-auto">
                {c.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" /> {c.phone}
                  </div>
                )}
                {c.gstin && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4 text-gray-400" /> {c.gstin}
                  </div>
                )}
                {c.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" /> 
                    <span className="line-clamp-2">{c.address}</span>
                  </div>
                )}
                {!c.phone && !c.gstin && !c.address && (
                  <div className="text-sm text-gray-400 italic">No additional details</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Customer' : 'New Customer'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Name *</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 outline-none"
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
            <input 
              type="text" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 outline-none"
              placeholder="e.g. 9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">GSTIN</label>
            <input 
              type="text" 
              value={formData.gstin} 
              onChange={e => setFormData({...formData, gstin: e.target.value.toUpperCase()})}
              className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 outline-none uppercase"
              placeholder="27AADCB2230M1Z2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Billing Address</label>
            <textarea 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})}
              className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-purple-500 outline-none min-h-[100px]"
              placeholder="Full address"
            />
          </div>
          
          <div className="pt-4 flex gap-3">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50 transition">Cancel</button>
            <button onClick={handleSave} disabled={!formData.name || saving} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-lg font-bold hover:opacity-90 transition disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
