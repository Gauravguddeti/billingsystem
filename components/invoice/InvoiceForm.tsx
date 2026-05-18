'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useInvoice, defaultRow } from '@/hooks/useInvoice';
import { calculateTotals, numberToWords, generateNextInvoiceNumber } from '@/lib/invoice-utils';
import { InvoicePrint } from './InvoicePrint';
import { ImportOrderButton } from './ImportOrderButton';
import { MultiOrderModal } from './MultiOrderModal';
import { Toast, ToastProps } from '../ui/Toast';
import { Customer, Product } from '@/types';

export function InvoiceForm({ initialInvoiceId }: { initialInvoiceId?: string }) {
  const {
    customerName, setCustomerName,
    customerPhone, setCustomerPhone,
    customerAddress, setCustomerAddress,
    customerGstin, setCustomerGstin,
    items, setItems,
    invoiceDate, setInvoiceDate,
    taxInclusive: taxBillMode, setTaxInclusive: setTaxBillMode,
    overallDiscount, setOverallDiscount,
    editingInvoiceId, setEditingInvoiceId,
    isEditMode, setIsEditMode,
    isDraftRestored,
    categoryId, setCategoryId
  } = useInvoice();

  const [invoiceNumber, setInvoiceNumber] = useState('INV-001');
  const [overallDiscPct, setOverallDiscPct] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  
  // Autocomplete UI state
  const [showCustAuto, setShowCustAuto] = useState(false);
  const [activeItemAuto, setActiveItemAuto] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{top:number,left:number,width:number} | null>(null);
  const [itemAutoHighlight, setItemAutoHighlight] = useState(-1);  // keyboard nav index
  const [custAutoHighlight, setCustAutoHighlight] = useState(-1);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [toast, setToast] = useState<ToastProps | null>(null);
  const [multiOrders, setMultiOrders] = useState<any[]>([]);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null); // To pass to InvoicePrint
  const [isDragOver, setIsDragOver] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  useEffect(() => {
    setIsSaved(false);
  }, [customerName, customerPhone, customerAddress, customerGstin, items, invoiceDate, taxBillMode, overallDiscount, overallDiscPct, categoryId]);

  // Data fetching
  useEffect(() => {
    fetch('/api/products').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setProducts(data);
    });
    fetch('/api/customers').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setCustomers(data);
    });
    fetch('/api/categories').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setCategories(data);
    });
    // Fetch business data for printing
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data && !data.error) setBusinessData(data);
    }).catch(() => {});
    
    // Load existing invoice if edit mode
    if (initialInvoiceId) {
      setIsEditMode(true);
      setEditingInvoiceId(initialInvoiceId);
      fetch(`/api/invoices/${initialInvoiceId}`).then(res => res.json()).then(data => {
        if (!data.error) {
          setInvoiceNumber(data.invoice_number || '');
          setCustomerName(data.customer_name || '');
          setCustomerAddress(data.customer_address || '');
          setCustomerPhone(data.customer_phone || '');
          setCustomerGstin(data.customer_gstin || '');
          setInvoiceDate(
            data.date 
              ? new Date(data.date).toLocaleDateString('en-CA') 
              : new Date().toLocaleDateString('en-CA')
          );
          setTaxBillMode(data.tax_inclusive || false);
          setOverallDiscount(data.discount || 0);
          setCategoryId(data.category_id || '');
          
          if (data.items && data.items.length > 0) {
            setItems(data.items.map((i: any) => ({
              ...defaultRow,
              ...i,
              quantity: Number(i.quantity),
              rate: Number(i.rate)
            })));
          }
        }
      });
    }
  }, [initialInvoiceId]);

  // Fetch next invoice number
  useEffect(() => {
    if (!isEditMode && !editingInvoiceId) {
      fetch('/api/invoices?limit=1').then(res => res.json()).then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setInvoiceNumber(generateNextInvoiceNumber(data[0].invoice_number));
        } else {
          setInvoiceNumber('INV-001');
        }
      });
    }
  }, [isEditMode, editingInvoiceId]);

  const { processedItems, subtotal, cgstTotal, sgstTotal, grandTotal, discAmt, afterDisc, totalQty, validItemCount } = calculateTotals(items, taxBillMode, overallDiscount, overallDiscPct);

  const proceedWithNewInvoice = () => {
    setIsEditMode(false);
    setEditingInvoiceId(null);
    localStorage.removeItem('invoiceDraft');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerGstin('');
    setItems([{ ...defaultRow }]);
    setOverallDiscount(0);
    setTaxBillMode(false);
    setOverallDiscPct(0);
    setInvoiceDate(new Date().toLocaleDateString('en-CA'));
    setIsSaved(true);
    
    // Refresh invoice number
    fetch('/api/invoices?limit=1').then(res => res.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setInvoiceNumber(generateNextInvoiceNumber(data[0].invoice_number));
      }
    });
  };

  const handleNewInvoice = () => {
    // If not saved and not completely blank
    if (!isSaved && (customerName || items.some(i => i.item_name))) {
      setShowUnsavedModal(true);
    } else {
      proceedWithNewInvoice();
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    if (field === 'item_name') {
      setItemAutoHighlight(-1);
      const prod = products.find(p => p.name.toLowerCase() === value.toLowerCase());
      if (prod) {
        newItems[index].rate = prod.rate || 0;
        newItems[index].mrp = prod.mrp || 0;
        newItems[index].hsn = prod.hsn || '33074100';
      }
    }
    setItems(newItems);
  };

  const handleItemDiscountPctChange = (index: number, value: string) => {
    const newItems = [...items];
    const parsed = value === '' ? 0 : Number(value);
    newItems[index] = { ...newItems[index], discount: parsed };
    if (value !== '') {
      newItems[index].discount_amount = 0;
    }
    setItems(newItems);
  };

  const handleItemDiscountAmtChange = (index: number, value: string) => {
    const newItems = [...items];
    const parsed = value === '' ? 0 : Number(value);
    newItems[index] = { ...newItems[index], discount_amount: parsed };
    if (value !== '') {
      newItems[index].discount = 0;
    }
    setItems(newItems);
  };

  const openItemDropdown = (index: number, inputEl: HTMLInputElement | null) => {
    if (inputEl) {
      const rect = inputEl.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + window.scrollY + 2, left: rect.left + window.scrollX, width: Math.max(rect.width, 260) });
    }
    setActiveItemAuto(index);
    setItemAutoHighlight(-1);
  };

  const addRow = () => setItems([...items, { ...defaultRow, id: Date.now().toString() }]);
  const removeRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!customerName || validItemCount === 0) {
      setToast({ message: 'Customer name and at least one item required', type: 'error', onClose: () => setToast(null) });
      return;
    }

    setSaving(true);
    const payload = {
      invoice_number: invoiceNumber,
      date: invoiceDate,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_phone: customerPhone,
      customer_gstin: customerGstin,
      tax_inclusive: taxBillMode,
      discount: overallDiscPct || 0,
      subtotal,
      discount_amount: discAmt,
      after_discount: afterDisc,
      cgst: cgstTotal,
      sgst: sgstTotal,
      grand_total: grandTotal,
      total_quantity: totalQty,
      total_items: validItemCount,
      amount_words: numberToWords(Math.round(grandTotal)),
      category_id: categoryId || null,
      items: processedItems.filter(i => i.item_name).map(i => ({
        ...i,
        free_qty: Number(i.free_qty) || 0,
        free_unit: i.free_unit || 'Pcs',
      }))
    };

    try {
      const url = isEditMode && editingInvoiceId ? `/api/invoices/${editingInvoiceId}` : '/api/invoices';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to save invoice');
      
      setToast({ message: '✅ Invoice saved — review and print when ready', type: 'success', onClose: () => setToast(null) });
      setIsSaved(true);
      
      // DO NOT clear form automatically, allow printing!
      // But we can clear the draft and edit mode so refreshing doesn't bring it back as a draft
      setIsEditMode(false);
      setEditingInvoiceId(null);
      localStorage.removeItem('invoiceDraft');

      // Auto-save new products
      const newProductsAdded = [];
      for (const item of processedItems) {
        if (!item.item_name) continue;
        const exists = products.find(p => p.name.toLowerCase() === item.item_name.toLowerCase());
        if (!exists) {
          try {
            const newProdObj = {
              name: item.item_name,
              rate: Number(item.rate) || 0,
              mrp: Number(item.mrp) || 0,
              hsn: item.hsn || '33074100',
              category_id: categoryId || null
            };
            const prodRes = await fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newProdObj)
            });
            if (prodRes.ok) {
              const createdProd = await prodRes.json();
              newProductsAdded.push(createdProd);
            }
          } catch (e) {
            console.error('Failed to auto-save product', e);
          }
        }
      }
      
      if (newProductsAdded.length > 0) {
        fetch('/api/products').then(res => res.json()).then(data => {
          if (Array.isArray(data)) setProducts(data);
        });
      }

    } catch (err) {
      setToast({ message: 'Error saving invoice', type: 'error', onClose: () => setToast(null) });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const invalidItems = items.filter(i => i.item_name && (!i.quantity || Number(i.quantity) <= 0 || !i.rate || Number(i.rate) <= 0));
    if (invalidItems.length > 0) {
      setToast({ message: 'Please fill quantity AND rate for all items before printing!', type: 'error', onClose: () => setToast(null) });
      return;
    }
    setShowPrintPreview(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const product = JSON.parse(data) as Product;
      
      const newRow = {
        ...defaultRow,
        id: Date.now().toString(),
        item_name: product.name,
        quantity: 1,
        rate: Number(product.rate) || 0,
        mrp: Number(product.mrp) || 0,
        hsn: product.hsn || '33074100'
      };

      // Add to first empty row, or append
      const emptyIndex = items.findIndex(i => !i.item_name);
      if (emptyIndex >= 0) {
        const newItems = [...items];
        newItems[emptyIndex] = { ...newItems[emptyIndex], ...newRow, id: newItems[emptyIndex].id };
        setItems(newItems);
      } else {
        setItems([...items, newRow]);
      }
      setToast({ message: `Added ${product.name}`, type: 'success', onClose: () => setToast(null) });
    } catch (e) {
      console.error('Drop error', e);
    }
  };

  return (
    <>
      <div 
        className={`bg-white rounded-xl shadow-lg p-6 md:p-8 no-print mb-8 transition-colors ${isDragOver ? 'border-4 border-dashed border-purple-500 bg-purple-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 rounded-xl pointer-events-none">
            <h2 className="text-3xl font-bold text-purple-600">Drop Product Here!</h2>
          </div>
        )}
        <div className="relative">
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-gray-200 gap-4">
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                {isEditMode ? `Edit ${invoiceNumber}` : 'New Invoice'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {isDraftRestored && !isEditMode && <p className="text-xs text-orange-500 font-medium">Draft restored</p>}
                <p className={`text-xs font-semibold ${isSaved ? 'text-green-600' : 'text-red-500'}`}>
                  {isSaved ? '• Saved' : '• Not saved'}
                </p>
              </div>
            </div>

            <div className="flex-1 w-full md:w-auto flex justify-start md:justify-center">
              <div className="w-full md:w-auto flex flex-col md:flex-row gap-4 md:gap-3">
                <div className="w-full md:w-[220px]">
                  <div className="text-xs font-semibold text-gray-500 mb-1 text-left md:text-center">Bill Type</div>
                  <select
                    value={taxBillMode ? 'tax' : 'normal'}
                    onChange={(e) => setTaxBillMode(e.target.value === 'tax')}
                    className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-base rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-4 py-2 font-bold cursor-pointer transition w-full"
                  >
                    <option value="normal">📄 Normal Bill</option>
                    <option value="tax">🧾 Tax Bill (GST)</option>
                  </select>
                </div>
                <div className="w-full md:w-[220px]">
                  <div className="text-xs font-semibold text-gray-500 mb-1 text-left md:text-center">Category</div>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="bg-white border border-gray-200 text-gray-800 text-base rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-4 py-2 font-semibold cursor-pointer transition w-full"
                  >
                    <option value="">— All Products —</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0 justify-start md:justify-end">
              <button onClick={handleNewInvoice} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 md:py-2 rounded-lg transition font-semibold flex-1 md:flex-none text-center min-h-[44px]">
                🆕 New
              </button>
              <ImportOrderButton
                onExtractSuccess={(order) => {
                  setCustomerName(order.customerName || '');
                  setCustomerAddress(order.customerAddress || '');
                  if (order.date) setInvoiceDate(order.date);

                  const validItems = order.items.filter(i => Number(i.qty) > 0);
                  const newItems = validItems.map((i, idx) => {
                    const prod = products.find(p => p.name.toLowerCase() === i.name.toLowerCase());
                    return {
                      ...defaultRow,
                      id: Date.now().toString() + idx,
                      item_name: i.name,
                      quantity: i.qty,
                      rate: prod?.rate ?? i.rate ?? 0,
                      mrp: prod?.mrp ?? 0,
                      hsn: prod?.hsn ?? '33074100'
                    };
                  });
                  setItems(newItems.length > 0 ? newItems : [{...defaultRow}]);
                  setToast({ message: '✅ Order extracted', type: 'success', onClose: () => setToast(null) });
                }}
                onMultipleOrders={(orders) => {
                  setMultiOrders(orders);
                  setShowMultiModal(true);
                }}
                onError={(msg) => setToast({ message: msg, type: 'error', onClose: () => setToast(null) })}
              />
              <div className="hidden md:flex items-center gap-3">
                <button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-lg hover:opacity-90 transition font-semibold disabled:opacity-50 text-center min-h-[44px]">
                  {saving ? 'Saving...' : '💾 Save'}
                </button>
                {validItemCount > 0 && (
                  <button onClick={handlePrint} className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg transition font-semibold text-center min-h-[44px]">
                    🖨 Print
                  </button>
                )}
              </div>
            </div>
          </div>

        {/* Customer & Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Name *</label>
            <input 
              type="text" 
              value={customerName}
              onChange={e => { setCustomerName(e.target.value); setShowCustAuto(true); setCustAutoHighlight(-1); }}
              onFocus={() => setShowCustAuto(true)}
              onBlur={() => setTimeout(() => setShowCustAuto(false), 200)}
              onKeyDown={e => {
                const filtered = customers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()) && c.name !== customerName);
                if (e.key === 'ArrowDown') { e.preventDefault(); setCustAutoHighlight(h => Math.min(h + 1, filtered.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setCustAutoHighlight(h => Math.max(h - 1, 0)); }
                else if (e.key === 'Enter' && custAutoHighlight >= 0 && filtered[custAutoHighlight]) {
                  e.preventDefault();
                  const c = filtered[custAutoHighlight];
                  setCustomerName(c.name);
                  if (c.address) setCustomerAddress(c.address);
                  if (c.phone) setCustomerPhone(c.phone);
                  if (c.gstin) setCustomerGstin(c.gstin);
                  setShowCustAuto(false);
                } else if (e.key === 'Escape') { setShowCustAuto(false); }
              }}
              className="w-full border-2 border-gray-200 rounded-lg p-3 md:p-2.5 min-h-[44px] focus:border-indigo-500 focus:ring-0 outline-none transition text-gray-900 placeholder-gray-400"
              placeholder="Start typing..."
            />
            {showCustAuto && customerName && customers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()) && c.name !== customerName).length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {customers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()) && c.name !== customerName).map((c, i) => (
                  <li 
                    key={i} 
                    className={`p-3 md:p-2.5 hover:bg-indigo-50 cursor-pointer border-b last:border-b-0 min-h-[44px] flex flex-col justify-center ${i === custAutoHighlight ? 'bg-indigo-50' : ''}`}
                    onClick={() => {
                      setCustomerName(c.name);
                      if (c.address) setCustomerAddress(c.address);
                      if (c.phone) setCustomerPhone(c.phone);
                      if (c.gstin) setCustomerGstin(c.gstin);
                      setShowCustAuto(false);
                    }}
                  >
                    <div className="font-medium text-gray-800 leading-tight">{c.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{c.address} {c.phone && `• ${c.phone}`}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="w-full md:w-64 border-2 border-gray-200 rounded-lg p-3 md:p-2.5 min-h-[44px] focus:border-indigo-500 outline-none transition text-gray-900"
              />
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
              <input 
                type="text" 
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg p-3 md:p-2.5 min-h-[44px] focus:border-indigo-500 outline-none transition"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
              <input 
                type="text" 
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg p-3 md:p-2.5 min-h-[44px] focus:border-indigo-500 outline-none transition"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">GSTIN</label>
              <input 
                type="text" 
                value={customerGstin}
                onChange={e => setCustomerGstin(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg p-3 md:p-2.5 min-h-[44px] focus:border-indigo-500 outline-none transition"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        {/* Invoice Number */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Invoice Number</label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={e => setInvoiceNumber(e.target.value)}
            className="w-full md:w-64 border-2 border-gray-200 rounded-lg p-3 md:p-2.5 min-h-[44px] focus:border-indigo-500 outline-none transition font-mono font-semibold"
          />
        </div>

        {/* Items Table */}
        {/* Items Table */}
        <div className="border-2 border-gray-200 rounded-xl mb-6 bg-white overflow-hidden">
          {/* Header (Desktop Only) */}
          <div className="hidden md:grid grid-cols-[minmax(200px,1fr)_80px_100px_80px_80px_80px_100px_100px_100px_50px] gap-2 p-3 bg-gray-50 border-b-2 text-sm font-bold text-gray-700">
            <div>Item Name</div>
            <div>HSN</div>
            <div className="text-right">MRP (₹)</div>
            <div className="text-right">Qty</div>
            <div>Unit</div>
            <div className="text-right">Free</div>
            <div className="text-right">Rate (₹)</div>
            <div className="text-right">Disc % / ₹</div>
            <div className="text-right">Amount</div>
            <div></div>
          </div>
          
          <div className="divide-y divide-gray-200 p-3 md:p-0 bg-gray-50 md:bg-white">
            {processedItems.map((item, index) => (
              <div key={item.id} className="flex flex-col md:grid md:grid-cols-[minmax(200px,1fr)_80px_100px_80px_80px_80px_100px_100px_100px_50px] gap-3 md:gap-2 p-4 md:p-2 hover:bg-gray-50 transition rounded-xl md:rounded-none border border-gray-200 md:border-0 mb-4 md:mb-0 bg-white shadow-sm md:shadow-none">
                
                {/* Mobile Top Row: Item Name & Delete */}
                <div className="flex md:contents justify-between gap-2 relative">
                  <div className="flex-1 relative">
                    <label className="md:hidden text-xs text-gray-500 font-semibold mb-1 block">Item Name</label>
                    <input 
                      type="text" 
                      value={item.item_name}
                      ref={el => { inputRefs.current[index] = el; }}
                        onChange={e => {
                          handleItemChange(index, 'item_name', e.target.value);
                          openItemDropdown(index, e.currentTarget);
                        }}
                        onClick={e => openItemDropdown(index, e.currentTarget)}
                        onFocus={e => { 
                          e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
                          openItemDropdown(index, e.currentTarget); 
                        }}
                        onBlur={() => setTimeout(() => { setActiveItemAuto(null); setDropdownPos(null); }, 200)}
                        onKeyDown={e => {
                          const filtered = products.filter(p => p.name.toLowerCase().includes(item.item_name.toLowerCase()));
                        if (e.key === 'ArrowDown') { e.preventDefault(); setItemAutoHighlight(h => Math.min(h + 1, filtered.length - 1)); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setItemAutoHighlight(h => Math.max(h - 1, 0)); }
                        else if (e.key === 'Enter' && itemAutoHighlight >= 0 && filtered[itemAutoHighlight]) {
                          e.preventDefault();
                          handleItemChange(index, 'item_name', filtered[itemAutoHighlight].name);
                          setActiveItemAuto(null); setDropdownPos(null);
                        } else if (e.key === 'Escape') { setActiveItemAuto(null); setDropdownPos(null); }
                      }}
                      className="w-full border border-gray-300 rounded-lg p-3 md:p-1.5 min-h-[44px] focus:border-indigo-500 outline-none text-gray-900 placeholder-gray-400 font-medium"
                      placeholder="Item name"
                    />
                  </div>
                  <button 
                    onClick={() => removeRow(index)}
                    className="md:hidden mt-5 text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 min-h-[44px]"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:contents gap-3 md:gap-2">
                  <div className="flex flex-col justify-center">
                    <label className="md:hidden text-xs text-gray-500 font-semibold mb-1 block">HSN</label>
                    <input type="text" value={item.hsn || ''} onChange={e => handleItemChange(index, 'hsn', e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 md:p-1.5 min-h-[44px] focus:border-indigo-500 outline-none text-gray-900" placeholder="HSN" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="md:hidden text-xs text-gray-500 font-semibold mb-1 block">MRP (₹)</label>
                    <input type="number" min="0" step="0.01" value={item.mrp || ''} onChange={e => handleItemChange(index, 'mrp', e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 md:p-1.5 min-h-[44px] text-right focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="md:hidden text-xs text-gray-500 font-semibold mb-1 block">Qty</label>
                    <input type="number" min="0" step="0.01" value={item.quantity || ''} onChange={e => handleItemChange(index, 'quantity', e.target.value)} onFocus={e => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="w-full border border-gray-300 rounded-lg p-3 md:p-1.5 min-h-[44px] text-right focus:border-indigo-500 outline-none font-bold" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="md:hidden text-xs text-gray-500 font-semibold mb-1 block">Unit</label>
                    <select value={item.unit || 'Pcs'} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 md:p-1.5 min-h-[44px] focus:border-indigo-500 outline-none text-gray-900 bg-white">
                      <option value="Pcs">Pcs</option><option value="Kg">Kg</option><option value="Ltr">Ltr</option><option value="Box">Box</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="md:hidden text-xs text-gray-500 font-semibold mb-1 block">Free Qty</label>
                    <input type="number" min="0" step="1" value={item.free_qty || ''} onChange={e => handleItemChange(index, 'free_qty', e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 md:p-1.5 min-h-[44px] text-right focus:border-indigo-500 outline-none bg-green-50" placeholder="0" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="md:hidden text-xs text-gray-500 font-semibold mb-1 block">Rate (₹)</label>
                    <input type="number" min="0" step="0.01" value={item.rate || ''} onChange={e => handleItemChange(index, 'rate', e.target.value)} onFocus={e => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="w-full border border-gray-300 rounded-lg p-3 md:p-1.5 min-h-[44px] text-right focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="md:hidden text-xs text-gray-500 font-semibold mb-1 block">Disc % / ₹</label>
                    <div className="flex flex-col gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount === 0 ? '' : item.discount}
                        onChange={e => handleItemDiscountPctChange(index, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 md:p-1.5 min-h-[44px] text-right focus:border-indigo-500 outline-none text-red-600"
                        placeholder="%"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount_amount === 0 ? '' : item.discount_amount}
                        onChange={e => handleItemDiscountAmtChange(index, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 md:p-1.5 min-h-[44px] text-right focus:border-indigo-500 outline-none text-red-600"
                        placeholder="₹"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex md:contents justify-between items-center mt-2 md:mt-0 pt-3 md:pt-0 border-t border-dashed border-gray-200 md:border-0">
                  <div className="md:hidden text-sm font-semibold text-gray-600">Total Amount</div>
                  <div className="text-right font-bold text-indigo-700 md:text-gray-900 md:font-medium flex items-center md:justify-end text-lg md:text-sm">
                    ₹{item.total.toFixed(2)}
                  </div>
                  <div className="hidden md:flex justify-center items-center">
                    <button onClick={() => removeRow(index)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition min-h-[44px]" title="Remove Item">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Portal dropdown — rendered outside table to escape overflow:hidden */}
        {typeof document !== 'undefined' && activeItemAuto !== null && dropdownPos && (() => {
          const idx = activeItemAuto;
          const currentItem = items[idx];
          if (!currentItem) return null;
          const filtered = products.filter(p => 
            (!categoryId || !p.category_id || p.category_id === categoryId) && 
            p.name.toLowerCase().includes((currentItem.item_name || '').toLowerCase())
          );
          if (filtered.length === 0) return null;
          return createPortal(
            <ul style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
              className="bg-white border border-gray-200 rounded-lg shadow-2xl max-h-56 overflow-y-auto"
            >
              {filtered.map((p, i) => (
                <li key={i}
                  className={`px-3 py-2 border-b last:border-b-0 cursor-pointer flex justify-between items-center ${i === itemAutoHighlight ? 'bg-indigo-100' : 'hover:bg-indigo-50'}`}
                  onMouseDown={e => {
                    e.preventDefault(); // prevent blur from firing first
                    handleItemChange(idx, 'item_name', p.name);
                    setActiveItemAuto(null);
                    setDropdownPos(null);
                  }}
                >
                  <span className="font-medium text-gray-900 text-sm">{p.name}</span>
                  <span className="text-gray-500 text-sm">₹{p.rate}</span>
                </li>
              ))}
            </ul>,
            document.body
          );
        })()}

        <button 
          onClick={addRow}
          className="flex items-center justify-center md:justify-start gap-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 md:bg-transparent md:hover:bg-transparent md:text-indigo-600 font-semibold md:hover:text-indigo-800 transition mb-8 w-full md:w-auto p-4 md:p-0 rounded-xl md:rounded-none min-h-[56px] md:min-h-0 text-lg md:text-base border-2 border-indigo-100 md:border-0"
        >
          <div className="bg-indigo-200 md:bg-indigo-100 p-1.5 md:p-1 rounded-lg md:rounded"><Plus className="w-5 h-5 md:w-4 md:h-4" /></div>
          Add Item
        </button>

        {/* Totals Section */}
        <div className="flex flex-col md:flex-row justify-end border-t-2 border-gray-200 pt-6">
          <div className="w-full md:w-1/3 space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>
            {taxBillMode && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>CGST (2.5%):</span>
                  <span className="font-semibold">₹{cgstTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>SGST (2.5%):</span>
                  <span className="font-semibold">₹{sgstTotal.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center text-gray-600 gap-2">
              <span className="whitespace-nowrap">Discount:</span>
              <div className="flex items-center gap-1">
                <input type="number" min="0" step="0.01"
                    value={overallDiscPct === 0 ? '' : overallDiscPct}
                    onChange={e => { setOverallDiscPct(e.target.value === '' ? 0 : Number(e.target.value)); setOverallDiscount(0); }}
                  className="w-16 border border-gray-300 rounded p-1 text-right focus:border-indigo-500 outline-none"
                  placeholder="%"
                />
                <span className="text-gray-400">%</span>
                <span className="text-gray-400 mx-1">or</span>
                <span className="text-gray-400">₹</span>
                <input type="number" min="0" step="0.01"
                    value={overallDiscount === 0 ? '' : overallDiscount}
                    onChange={e => { setOverallDiscount(e.target.value === '' ? 0 : Number(e.target.value)); setOverallDiscPct(0); }}
                  className="w-20 border border-gray-300 rounded p-1 text-right focus:border-indigo-500 outline-none"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-800 pt-3 border-t">
              <span>Grand Total:</span>
              <span className="text-indigo-600">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      </div>

      {toast && <Toast {...toast} />}
      
      {/* Unsaved Changes Form Warning Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-[250] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Unsaved Changes</h3>
            <p className="text-gray-600 mb-6">You have unsaved changes in this invoice. Are you sure you want to discard them and create a new invoice?</p>
            <div className="flex justify-end gap-3 flex-wrap">
              <button 
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition"
              >
                Keep Editing
              </button>
              <button 
                onClick={() => {
                  setShowUnsavedModal(false);
                  proceedWithNewInvoice();
                }}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
              >
                Discard & New
              </button>
            </div>
          </div>
        </div>
      )}

      <MultiOrderModal 
        isOpen={showMultiModal} 
        onClose={() => setShowMultiModal(false)}
        orders={multiOrders}
        onSelectOrder={(order) => {
          setCustomerName(order.customerName || '');
          setCustomerAddress(order.customerAddress || '');
          if (order.date) setInvoiceDate(order.date);
          
          const newItems = order.items.map((i, idx) => {
            const prod = products.find(p => p.name.toLowerCase() === i.name.toLowerCase());
            return {
              ...defaultRow,
              id: Date.now().toString() + idx,
              item_name: i.name,
              quantity: i.qty,
              rate: prod?.rate ?? i.rate ?? 0,
              mrp: prod?.mrp ?? 0,
              hsn: prod?.hsn ?? '33074100'
            };
          });
          setItems(newItems.length > 0 ? newItems : [{...defaultRow}]);
          setShowMultiModal(false);
          setToast({ message: '✅ Order loaded', type: 'success', onClose: () => setToast(null) });
        }}
      />

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-gray-900/95 flex flex-col no-print backdrop-blur-md">
          <div className="bg-white px-4 py-4 flex justify-between items-center shadow-lg pb-[calc(1rem+env(safe-area-inset-top))]">
            <button onClick={() => setShowPrintPreview(false)} className="text-gray-600 font-bold px-4 py-2 bg-gray-100 rounded-lg active:bg-gray-200">Cancel</button>
            <h2 className="font-bold text-xl text-gray-800">Print Preview</h2>
            <button onClick={() => {
               const originalTitle = document.title;
               const sanitizedCustomer = customerName.trim().replace(/[^a-zA-Z0-9]/g, '_') || 'Customer';
               document.title = `${invoiceNumber}_${sanitizedCustomer}_${invoiceDate}`;
               window.print();
               setTimeout(() => { document.title = originalTitle; }, 500);
            }} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2 rounded-lg font-bold shadow-md active:opacity-80 flex items-center gap-2">
              🖨 Print / PDF
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start touch-pan-x touch-pan-y">
            <InvoicePrint 
              invoice={{
                id: '', user_id: '', invoice_number: invoiceNumber, date: invoiceDate,
                customer_name: customerName, customer_address: customerAddress, customer_phone: customerPhone, customer_gstin: customerGstin,
                tax_inclusive: taxBillMode, discount: overallDiscPct, subtotal, discount_amount: discAmt,
                after_discount: afterDisc, cgst: cgstTotal, sgst: sgstTotal, grand_total: grandTotal,
                total_quantity: totalQty, total_items: validItemCount, amount_words: numberToWords(Math.round(grandTotal))
              }}
              items={processedItems}
              business={businessData || { id: '', user_id: '', name: 'My Business' }}
              gstEnabled={taxBillMode}
              previewMode={true}
            />
          </div>
        </div>
      )}

      {/* Hidden print container for normal Ctrl+P and modal Print */}
      <InvoicePrint 
        invoice={{
          id: '', user_id: '', invoice_number: invoiceNumber, date: invoiceDate,
          customer_name: customerName, customer_address: customerAddress, customer_phone: customerPhone, customer_gstin: customerGstin,
          tax_inclusive: taxBillMode, discount: overallDiscPct, subtotal, discount_amount: discAmt,
          after_discount: afterDisc, cgst: cgstTotal, sgst: sgstTotal, grand_total: grandTotal,
          total_quantity: totalQty, total_items: validItemCount, amount_words: numberToWords(Math.round(grandTotal))
        }}
        items={processedItems}
        business={businessData || { id: '', user_id: '', name: 'My Business' }}
        gstEnabled={taxBillMode}
        previewMode={false}
      />
      {/* Mobile Sticky Action Bar */}
      <div className="md:hidden fixed bottom-[60px] left-0 right-0 bg-white border-t border-gray-200 p-3 flex gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] z-40 no-print">
         <button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 rounded-lg font-bold flex-1 min-h-[48px] shadow-md">
           {saving ? 'Saving...' : '💾 Save'}
         </button>
         {validItemCount > 0 && (
           <button onClick={handlePrint} className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-bold flex-1 min-h-[48px] shadow-md">
             🖨 Print / PDF
           </button>
         )}
      </div>
    </>
  );
}
