'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Search } from 'lucide-react';
import { Product } from '@/types';

interface Category {
  id: string;
  name: string;
}

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', rate: '', mrp: '', hsn: '', category_id: '' });
  
  const [actionSheetProduct, setActionSheetProduct] = useState<Product | null>(null);
  const [showMoveCategory, setShowMoveCategory] = useState(false);

  const load = async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/categories').then(r => r.json())
    ]);
    if (Array.isArray(pRes)) setProducts(pRes);
    if (Array.isArray(cRes)) setCategories(cRes);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name) return;

    const payload = {
      name: formData.name,
      rate: Number(formData.rate) || 0,
      mrp: Number(formData.mrp) || 0,
      hsn: formData.hsn,
      category_id: formData.category_id || null
    };

    const url = editingId ? `/api/products/${editingId}` : '/api/products';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Failed to save');
        return;
      }
      setShowForm(false);
      setEditingId(null);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete product "${name}"?`)) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    load();
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = categoryFilter === 'all' || p.category_id === categoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.hsn && p.hsn.includes(searchQuery));
    return matchesCat && matchesSearch;
  });

  const handleDragStart = (e: React.DragEvent, product: Product) => {
    e.dataTransfer.setData('application/json', JSON.stringify(product));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCategoryDrop = async (e: React.DragEvent, targetCategoryId: string | null) => {
    e.preventDefault();
    setDragOverCategory(null);
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      try {
        const product = JSON.parse(data);
        if (product && product.id && product.category_id !== targetCategoryId) {
          await fetch(`/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...product, category_id: targetCategoryId })
          });
          load(); // refresh list to show updated category
        }
      } catch (err) {
        console.error('Drop parse error', err);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const inputCls = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-gray-900";

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
        <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">Product List</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products or HSN..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition text-gray-900"
            />
          </div>
          <button 
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ name: '', rate: '', mrp: '', hsn: '', category_id: categoryFilter !== 'all' ? categoryFilter : '' });
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg transition font-semibold flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" /> Add Product
          </button>
        </div>
      </div>

      {/* Categories Tab */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setCategoryFilter('all')}
          onDragOver={e => { e.preventDefault(); setDragOverCategory('all'); }}
          onDragLeave={() => setDragOverCategory(null)}
          onDrop={e => handleCategoryDrop(e, null)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${categoryFilter === 'all' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} ${dragOverCategory === 'all' ? 'ring-4 ring-purple-300 scale-105' : ''}`}
        >
          All ({products.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            onDragOver={e => { e.preventDefault(); setDragOverCategory(cat.id); }}
            onDragLeave={() => setDragOverCategory(null)}
            onDrop={e => handleCategoryDrop(e, cat.id)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${categoryFilter === cat.id ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} ${dragOverCategory === cat.id ? 'ring-4 ring-purple-300 scale-105' : ''}`}
          >
            {cat.name} ({products.filter(p => p.category_id === cat.id).length})
          </button>
        ))}
      </div>

      {/* Add/Edit Form Inline (Top) */}
      {showForm && !editingId && (
        <div className="mb-6 p-4 md:p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
          <h3 className="font-bold mb-4 text-lg text-gray-800">Add New Product</h3>
          <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Product Name</label>
              <input type="text" placeholder="e.g. Amba Lonche" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={`${inputCls} min-h-[44px]`} />
            </div>
            <div className="grid grid-cols-2 md:contents gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Selling Price</label>
                <input type="number" placeholder="Rate" value={formData.rate} onChange={e => setFormData({ ...formData, rate: e.target.value })} className={`${inputCls} min-h-[44px]`} step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">MRP</label>
                <input type="number" placeholder="MRP" value={formData.mrp} onChange={e => setFormData({ ...formData, mrp: e.target.value })} className={`${inputCls} min-h-[44px]`} step="0.01" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">HSN Code</label>
              <input type="text" placeholder="33074100" value={formData.hsn} onChange={e => setFormData({ ...formData, hsn: e.target.value })} className={`${inputCls} min-h-[44px]`} />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Bill Category</label>
              <select value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })} className={`${inputCls} min-h-[44px]`}>
                <option value="">— No Category —</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <button onClick={() => handleSave()} disabled={!formData.name} className="flex-1 md:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 md:py-2 min-h-[44px] rounded-lg hover:opacity-90 transition font-bold md:font-semibold disabled:opacity-50">Save</button>
            <button onClick={() => setShowForm(false)} className="flex-1 md:flex-none bg-gray-200 md:bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 md:py-2 min-h-[44px] rounded-lg transition font-bold md:font-semibold">Cancel</button>
          </div>
        </div>
      )}

      {/* Product List View */}
      {filteredProducts.length === 0 ? (
        <p className="text-center py-16 text-gray-500 text-lg border-2 border-dashed border-gray-200 rounded-xl">
          {searchQuery ? 'No products matched your search' : 'No products found'}
        </p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto border-2 border-gray-200 rounded-xl">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead className="bg-gray-50 border-b-2 border-gray-200 text-sm font-bold text-gray-700">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">HSN</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">MRP (₹)</th>
                  <th className="px-4 py-3 text-right">Rate (₹)</th>
                  <th className="px-4 py-3 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map(p => {
                  const isEditing = editingId === p.id;
                  const catName = categories.find(c => c.id === p.category_id)?.name || '—';

                  if (isEditing) {
                    return (
                      <tr key={p.id} className="bg-purple-50">
                        <td colSpan={7} className="px-4 py-4 border-2 border-purple-200 shadow-sm">
                          <div className="flex flex-col md:flex-row gap-3 items-center">
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputCls} placeholder="Name" />
                            <input type="text" value={formData.hsn} onChange={e => setFormData({...formData, hsn: e.target.value})} className={`${inputCls} w-32`} placeholder="HSN" />
                            <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className={inputCls}>
                              <option value="">— Category —</option>
                              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                            <input type="number" step="0.01" value={formData.mrp} onChange={e => setFormData({...formData, mrp: e.target.value})} className={`${inputCls} w-24 text-right`} placeholder="MRP" />
                            <input type="number" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} className={`${inputCls} w-24 text-right`} placeholder="Rate" />
                            <div className="flex gap-2">
                              <button onClick={() => handleSave()} className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 font-semibold text-sm">Save</button>
                              <button onClick={() => setEditingId(null)} className="bg-gray-300 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-400 font-semibold text-sm">Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr 
                      key={p.id} 
                      className="hover:bg-gray-50 transition cursor-move group"
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, p)}
                      title="Drag this product into the invoice table"
                    >
                      <td className="px-4 py-3 text-gray-400 group-hover:text-purple-500">
                        <GripVertical className="w-5 h-5" />
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-sm">{p.hsn || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {catName !== '—' && <span className="bg-gray-100 px-2 py-1 rounded-md border">{catName}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 line-through decoration-red-300">{p.mrp ? `₹${p.mrp}` : '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-purple-600">₹{p.rate}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => {
                            setEditingId(p.id);
                            setFormData({ name: p.name, rate: p.rate?.toString() || '', mrp: p.mrp?.toString() || '', hsn: p.hsn || '', category_id: p.category_id || '' });
                            setShowForm(false);
                          }} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded transition">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id, p.name)} className="text-red-600 hover:bg-red-100 p-1.5 rounded transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden flex flex-col gap-3 pb-8">
            {filteredProducts.map(p => {
              const catName = categories.find(c => c.id === p.category_id)?.name || '—';
              const isEditing = editingId === p.id;
              
              if (isEditing) {
                return (
                  <div key={p.id} className="bg-purple-50 p-4 rounded-xl border-2 border-purple-300 shadow-sm flex flex-col gap-3">
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`${inputCls} min-h-[44px]`} placeholder="Name" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={formData.hsn} onChange={e => setFormData({...formData, hsn: e.target.value})} className={`${inputCls} min-h-[44px]`} placeholder="HSN" />
                      <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className={`${inputCls} min-h-[44px]`}>
                        <option value="">— Category —</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" step="0.01" value={formData.mrp} onChange={e => setFormData({...formData, mrp: e.target.value})} className={`${inputCls} min-h-[44px]`} placeholder="MRP" />
                      <input type="number" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} className={`${inputCls} min-h-[44px]`} placeholder="Rate" />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleSave()} className="flex-1 bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 font-bold text-lg">Save</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-300 text-gray-800 p-3 rounded-lg hover:bg-gray-400 font-bold text-lg">Cancel</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={p.id} 
                     onClick={() => setActionSheetProduct(p)}
                     className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-gray-800 text-lg flex-1 pr-2">{p.name}</div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-indigo-700">₹{p.rate}</div>
                      {p.mrp ? <div className="text-xs text-gray-400 line-through">₹{p.mrp}</div> : null}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded-md text-xs font-semibold">{catName}</span>
                    <span className="font-mono text-xs">HSN: {p.hsn || '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Mobile Action Sheet */}
      {actionSheetProduct && !showMoveCategory && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setActionSheetProduct(null)} />
          <div className="bg-white rounded-t-3xl p-6 relative z-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-bold mb-2 text-gray-800 text-center leading-tight">{actionSheetProduct.name}</h3>
            <p className="text-center text-gray-500 mb-6 font-medium">₹{actionSheetProduct.rate} • {categories.find(c => c.id === actionSheetProduct.category_id)?.name || 'Uncategorized'}</p>
            
            <div className="flex flex-col gap-3">
              <button onClick={() => {
                setEditingId(actionSheetProduct.id);
                setFormData({
                  name: actionSheetProduct.name, rate: String(actionSheetProduct.rate),
                  mrp: String(actionSheetProduct.mrp), hsn: actionSheetProduct.hsn || '', category_id: actionSheetProduct.category_id || ''
                });
                setActionSheetProduct(null);
              }} className="w-full bg-blue-50 text-blue-700 p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 active:bg-blue-100">
                <Edit2 className="w-5 h-5"/> Edit Product
              </button>
              
              <button onClick={() => setShowMoveCategory(true)} className="w-full bg-purple-50 text-purple-700 p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 active:bg-purple-100">
                <GripVertical className="w-5 h-5"/> Move to Category
              </button>
              
              <button onClick={() => {
                handleDelete(actionSheetProduct.id, actionSheetProduct.name);
                setActionSheetProduct(null);
              }} className="w-full bg-red-50 text-red-700 p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 active:bg-red-100">
                <Trash2 className="w-5 h-5"/> Delete Product
              </button>
              
              <button onClick={() => setActionSheetProduct(null)} className="w-full bg-gray-100 text-gray-700 p-4 rounded-xl font-bold text-lg mt-3 active:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Category Sheet */}
      {actionSheetProduct && showMoveCategory && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowMoveCategory(false); setActionSheetProduct(null); }} />
          <div className="bg-white rounded-t-3xl p-6 relative z-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 flex-shrink-0"></div>
            <h3 className="text-xl font-bold mb-6 text-gray-800 text-center flex-shrink-0">Move to Category</h3>
            
            <div className="overflow-y-auto flex-1 flex flex-col gap-3">
              <button 
                onClick={async () => {
                  await fetch(`/api/products/${actionSheetProduct.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...actionSheetProduct, category_id: null })
                  });
                  load();
                  setShowMoveCategory(false); setActionSheetProduct(null);
                }}
                className={`p-4 rounded-xl font-bold text-left text-lg ${!actionSheetProduct.category_id ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500' : 'bg-gray-50 text-gray-700 active:bg-gray-100'}`}
              >
                — No Category —
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  onClick={async () => {
                    await fetch(`/api/products/${actionSheetProduct.id}`, {
                      method: 'PUT', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...actionSheetProduct, category_id: cat.id })
                    });
                    load();
                    setShowMoveCategory(false); setActionSheetProduct(null);
                  }}
                  className={`p-4 rounded-xl font-bold text-left text-lg ${actionSheetProduct.category_id === cat.id ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500' : 'bg-gray-50 text-gray-700 active:bg-gray-100'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            
            <button onClick={() => setShowMoveCategory(false)} className="w-full bg-gray-100 text-gray-700 p-4 rounded-xl font-bold text-lg mt-5 flex-shrink-0 active:bg-gray-200">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
