'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Star, Check } from 'lucide-react';

interface Business {
  id: string;
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  branch_name?: string;
  account_no?: string;
  ifsc?: string;
  terms_conditions?: string;
  upi_id?: string;
  is_default?: boolean;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  default_hsn?: string;
  has_mrp?: boolean;
}

const emptyBiz: Omit<Business, 'id'> = { name: '', address: '', gstin: '', phone: '', email: '', bank_name: '', branch_name: '', account_no: '', ifsc: '', terms_conditions: '', upi_id: '' };
const emptyCat = { name: '', description: '', default_hsn: '33074100', has_mrp: false };

export function SettingsForm() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Business form state
  const [showBizForm, setShowBizForm] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  const [bizForm, setBizForm] = useState({ ...emptyBiz });

  // Category form state
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ ...emptyCat });

  const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    const [bizRes, catRes] = await Promise.all([
      fetch('/api/businesses').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]);
    if (Array.isArray(bizRes)) setBusinesses(bizRes);
    if (Array.isArray(catRes)) setCategories(catRes);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  /* ── BUSINESSES ── */
  const saveBusiness = async () => {
    if (!bizForm.name.trim()) { showMsg('Business name is required'); return; }
    const url = editingBiz ? `/api/businesses/${editingBiz.id}` : '/api/businesses';
    const method = editingBiz ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bizForm) });
    if (!res.ok) { showMsg('Error saving business'); return; }
    showMsg(editingBiz ? '✅ Business updated' : '✅ Business added');
    setShowBizForm(false); setEditingBiz(null); setBizForm({ ...emptyBiz });
    load();
  };

  const deleteBusiness = async (biz: Business) => {
    if (biz.is_default) { showMsg('Cannot delete the default business'); return; }
    if (!confirm(`Delete "${biz.name}"?`)) return;
    await fetch(`/api/businesses/${biz.id}`, { method: 'DELETE' });
    load();
  };

  const setDefault = async (biz: Business) => {
    await fetch(`/api/businesses/${biz.id}`, { method: 'PATCH' });
    showMsg(`✅ ${biz.name} set as default`);
    load();
  };

  /* ── CATEGORIES ── */
  const saveCategory = async () => {
    if (!catForm.name.trim()) { showMsg('Category name is required'); return; }
    const url = editingCat ? `/api/categories/${editingCat.id}` : '/api/categories';
    const method = editingCat ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) });
    if (!res.ok) { showMsg('Error saving category'); return; }
    showMsg(editingCat ? '✅ Category updated' : '✅ Category added');
    setShowCatForm(false); setEditingCat(null); setCatForm({ ...emptyCat });
    load();
  };

  const deleteCategory = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  const inputCls = 'w-full px-4 py-3 md:py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition text-gray-900 min-h-[44px]';

  return (
    <div className="space-y-10">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg font-semibold text-sm">
          {toast}
        </div>
      )}

      {/* ── MY BUSINESSES ── */}
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b gap-4">
          <h2 className="text-2xl font-bold text-gray-800">🏢 My Businesses</h2>
          <button
            onClick={() => { setEditingBiz(null); setBizForm({ ...emptyBiz }); setShowBizForm(true); }}
            className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 md:py-2 rounded-lg hover:opacity-90 transition font-bold md:font-semibold flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Plus className="w-5 h-5 md:w-4 md:h-4" /> New Business
          </button>
        </div>

        {/* Business Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {businesses.length === 0 && !showBizForm && (
            <p className="text-gray-400 col-span-2 text-center py-8">No businesses yet. Add one to get started.</p>
          )}
          {businesses.map(biz => (
            <div key={biz.id} className={`border-2 rounded-xl p-5 transition ${biz.is_default ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold text-xl text-gray-800">{biz.name}</h4>
                    {biz.is_default && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Default</span>}
                  </div>
                  {biz.address && <p className="text-sm text-gray-500">{biz.address}</p>}
                  {biz.gstin && <p className="text-sm text-gray-500 mt-1">GSTIN: <span className="font-mono">{biz.gstin}</span></p>}
                  {biz.phone && <p className="text-sm text-gray-500">📞 {biz.phone}</p>}
                  {biz.bank_name && <p className="text-sm text-gray-400 mt-2">🏦 {biz.bank_name} • A/C: {biz.account_no}</p>}
                  {biz.upi_id && <p className="text-sm text-gray-400">💳 UPI: {biz.upi_id}</p>}
                </div>
                <div className="flex gap-2 w-full md:w-auto md:ml-2 flex-shrink-0 pt-3 md:pt-0 border-t border-gray-100 md:border-0 mt-2 md:mt-0">
                  {!biz.is_default && (
                    <button onClick={() => setDefault(biz)} className="flex-1 md:flex-none flex justify-center items-center gap-1 text-sm px-3 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-bold min-h-[44px]" title="Set as Default">
                      <Star className="w-4 h-4" /> <span className="md:hidden">Default</span>
                    </button>
                  )}
                  {biz.is_default && (
                    <span className="flex-1 md:flex-none flex justify-center items-center gap-1 text-sm px-3 py-2 rounded-lg bg-purple-100 text-purple-700 font-bold min-h-[44px]">
                      <Check className="w-4 h-4" /> <span className="md:hidden">Active</span>
                    </span>
                  )}
                  <button onClick={() => { setEditingBiz(biz); setBizForm({ name: biz.name, address: biz.address||'', gstin: biz.gstin||'', phone: biz.phone||'', email: biz.email||'', bank_name: biz.bank_name||'', branch_name: biz.branch_name||'', account_no: biz.account_no||'', ifsc: biz.ifsc||'', terms_conditions: biz.terms_conditions||'', upi_id: biz.upi_id||'' }); setShowBizForm(true); }}
                    className="flex-1 md:flex-none flex justify-center items-center text-sm px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold min-h-[44px]">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteBusiness(biz)} className="flex-1 md:flex-none flex justify-center items-center text-sm px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold min-h-[44px]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Business Add/Edit Form */}
        {showBizForm && (
          <div className="p-4 md:p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
            <h4 className="font-bold text-xl mb-5 text-purple-800">{editingBiz ? '✎ Edit Business' : '➕ Add Business'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1 text-gray-700 text-sm">Business Name *</label>
                <input className={inputCls} value={bizForm.name} onChange={e => setBizForm({ ...bizForm, name: e.target.value })} placeholder="e.g. Gaurav Enterprises" />
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1 text-gray-700 text-sm">Address</label>
                <textarea className={`${inputCls} min-h-[80px]`} rows={2} value={bizForm.address} onChange={e => setBizForm({ ...bizForm, address: e.target.value })} placeholder="Full address" />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700 text-sm">GSTIN</label>
                <input className={inputCls} value={bizForm.gstin} onChange={e => setBizForm({ ...bizForm, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700 text-sm">Phone</label>
                <input className={inputCls} value={bizForm.phone} onChange={e => setBizForm({ ...bizForm, phone: e.target.value })} type="tel" />
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1 text-gray-700 text-sm">Email</label>
                <input type="email" className={inputCls} value={bizForm.email} onChange={e => setBizForm({ ...bizForm, email: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700 text-sm">Bank Name</label>
                <input className={inputCls} value={bizForm.bank_name} onChange={e => setBizForm({ ...bizForm, bank_name: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700 text-sm">Branch Name</label>
                <input className={inputCls} value={bizForm.branch_name} onChange={e => setBizForm({ ...bizForm, branch_name: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700 text-sm">Account No</label>
                <input className={inputCls} value={bizForm.account_no} onChange={e => setBizForm({ ...bizForm, account_no: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700 text-sm">IFSC Code</label>
                <input className={inputCls} value={bizForm.ifsc} onChange={e => setBizForm({ ...bizForm, ifsc: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700 text-sm">UPI ID</label>
                <input className={inputCls} value={bizForm.upi_id} onChange={e => setBizForm({ ...bizForm, upi_id: e.target.value })} placeholder="merchant@upi" />
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1 text-gray-700 text-sm">Terms & Conditions</label>
                <textarea className={`${inputCls} min-h-[80px]`} rows={2} value={bizForm.terms_conditions} onChange={e => setBizForm({ ...bizForm, terms_conditions: e.target.value })} placeholder="e.g. Cheque Bouncing Charges ₹500. Thank you for your business!" />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3 mt-6">
              <button onClick={saveBusiness} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 md:py-2 min-h-[44px] rounded-lg hover:opacity-90 transition font-bold text-lg md:text-base">💾 Save</button>
              <button onClick={() => { setShowBizForm(false); setEditingBiz(null); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 md:py-2 min-h-[44px] rounded-lg transition font-bold text-lg md:text-base">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* ── BILL CATEGORIES ── */}
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📋 Bill Categories</h2>
            <p className="text-sm text-gray-500 mt-1">Organise invoices by product type (e.g. Jelly, Candy, Pudding)</p>
          </div>
          <button
            onClick={() => { setEditingCat(null); setCatForm({ ...emptyCat }); setShowCatForm(true); }}
            className="w-full md:w-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-3 md:py-2 min-h-[44px] rounded-lg hover:opacity-90 transition font-bold flex justify-center items-center gap-2"
          >
            <Plus className="w-5 h-5 md:w-4 md:h-4" /> New Category
          </button>
        </div>

        {/* Category list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {categories.length === 0 && !showCatForm && (
            <p className="text-gray-400 col-span-3 text-center py-8">No categories yet. Add one to organise your products.</p>
          )}
          {categories.map(cat => (
            <div key={cat.id} className="border-2 border-gray-200 rounded-xl p-5 hover:border-green-400 transition bg-white flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-lg text-gray-800">{cat.name}</h4>
                  {cat.description && <p className="text-sm text-gray-500 mt-1">{cat.description}</p>}
                  <p className="text-sm text-gray-400 mt-2 font-mono bg-gray-50 inline-block px-2 py-1 rounded">HSN: {cat.default_hsn || '—'} {cat.has_mrp && '• Has MRP'}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, description: cat.description||'', default_hsn: cat.default_hsn||'33074100', has_mrp: cat.has_mrp||false }); setShowCatForm(true); }}
                  className="flex-1 flex justify-center items-center text-sm px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold min-h-[44px]">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteCategory(cat)} className="flex-1 flex justify-center items-center text-sm px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold min-h-[44px]">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Category Add/Edit Form */}
        {showCatForm && (
          <div className="p-4 md:p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
            <h4 className="font-bold text-xl mb-5 text-green-800">{editingCat ? '✎ Edit Category' : '➕ Add Category'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1 text-gray-700 text-sm">Category Name *</label>
                <input className={inputCls} value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Jelly Products" />
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1 text-gray-700 text-sm">Description</label>
                <input className={inputCls} value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700 text-sm">Default HSN Code</label>
                <input className={inputCls} value={catForm.default_hsn} onChange={e => setCatForm({ ...catForm, default_hsn: e.target.value })} placeholder="33074100" />
              </div>
              <div className="flex items-center gap-3 pt-4 md:pt-6">
                <input type="checkbox" id="has_mrp" checked={catForm.has_mrp} onChange={e => setCatForm({ ...catForm, has_mrp: e.target.checked })}
                  className="w-5 h-5 accent-green-600 cursor-pointer" />
                <label htmlFor="has_mrp" className="font-semibold text-gray-700 text-base cursor-pointer">Products have MRP column</label>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3 mt-6">
              <button onClick={saveCategory} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 md:py-2 min-h-[44px] rounded-lg hover:opacity-90 transition font-bold text-lg md:text-base">💾 Save</button>
              <button onClick={() => { setShowCatForm(false); setEditingCat(null); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 md:py-2 min-h-[44px] rounded-lg transition font-bold text-lg md:text-base">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
