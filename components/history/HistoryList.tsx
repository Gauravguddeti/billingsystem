'use client';

import React, { useState, useEffect } from 'react';
import { Search, Printer, Edit, Trash2, Calendar, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Invoice, InvoiceItem } from '@/types';
import { Toast, ToastProps } from '../ui/Toast';
import { Spinner } from '../ui/Spinner';
import { InvoicePrint } from '../invoice/InvoicePrint';

export function HistoryList() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [printInvoice, setPrintInvoice] = useState<{ inv: Invoice, items: InvoiceItem[] } | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);

  const showToast = (message: string, type: 'success'|'error'|'info') =>
    setToast({ message, type, onClose: () => setToast(null) });

  const loadInvoices = () => {
    setLoading(true);
    let url = '/api/invoices';
    const params = new URLSearchParams();
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    if (params.toString()) url += '?' + params.toString();
    
    fetch(url)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setInvoices(data); })
      .catch(() => showToast('Failed to load invoices', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInvoices();
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data && !data.error) setBusinessData(data);
    }).catch(() => {});
  }, [fromDate, toDate]);

  const handleDelete = async (id: string, invNum: string, customer: string) => {
    if (!confirm(`Delete invoice ${invNum} for ${customer}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Invoice deleted', 'info');
      loadInvoices();
    } catch {
      showToast('Error deleting invoice', 'error');
    }
  };

  const handleReprint = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPrintInvoice({ inv: data, items: data.items || [] });
      setTimeout(() => {
        window.print();
        setTimeout(() => setPrintInvoice(null), 1000);
      }, 500);
    } catch {
      showToast('Error loading invoice for print', 'error');
    }
  };

  const handleExportCSV = () => {
    const filtered = filteredInvoices;
    if (filtered.length === 0) { showToast('No invoices to export', 'info'); return; }
    
    const headers = ['Invoice #','Date','Customer','Address','Phone','Subtotal','CGST','SGST','Grand Total','Payment Status'];
    const rows = filtered.map(inv => [
      inv.invoice_number,
      inv.date,
      inv.customer_name,
      inv.customer_address || '',
      inv.customer_phone || '',
      Number(inv.subtotal).toFixed(2),
      Number(inv.cgst).toFixed(2),
      Number(inv.sgst).toFixed(2),
      Number(inv.grand_total).toFixed(2),
      inv.payment_status || 'unpaid'
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateLabel = fromDate && toDate ? `${fromDate}_to_${toDate}` : new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `invoices_${dateLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = filteredInvoices.reduce((s, inv) => s + Number(inv.grand_total), 0);

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-8 no-print min-h-screen md:min-h-0">
        <div className="hidden md:flex justify-between items-start mb-6 pb-4 border-b gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Invoice History</h2>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        
        {/* Sticky Search & Filters */}
        <div className="sticky top-0 bg-white z-10 py-3 md:py-0 md:static border-b md:border-0 border-gray-100 mb-6 flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search invoice or customer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 md:py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition min-h-[44px]"
              />
            </div>
            <button 
              onClick={() => setShowFilters(true)}
              className="md:hidden flex items-center justify-center bg-gray-100 text-gray-700 p-3 rounded-lg min-h-[44px] min-w-[44px] relative"
            >
              <Calendar className="w-5 h-5" />
              {(fromDate || toDate) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white"></span>}
            </button>
          </div>
          
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <Calendar className="text-gray-500 w-5 h-5" />
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="border-2 border-gray-200 rounded-lg p-2 outline-none focus:border-indigo-500" />
            <span className="text-gray-500">to</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="border-2 border-gray-200 rounded-lg p-2 outline-none focus:border-indigo-500" />
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate(''); }}
                className="text-sm text-gray-500 hover:text-gray-800 underline">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Summary strip */}
        {filteredInvoices.length > 0 && (
          <div className="flex gap-6 mb-4 text-sm text-gray-600 bg-indigo-50 rounded-lg px-4 py-2">
            <span><strong>{filteredInvoices.length}</strong> invoices</span>
            <span>Total: <strong className="text-indigo-700">₹{totalRevenue.toLocaleString('en-IN', {minimumFractionDigits:2})}</strong></span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <Spinner className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block" />
            <p className="text-gray-500 mt-4">Loading history...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-gray-500">No invoices found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-700">Invoice #</th>
                    <th className="px-6 py-3 font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 font-semibold text-gray-700">Customer</th>
                    <th className="px-6 py-3 font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 font-semibold text-gray-700 text-right">Amount (₹)</th>
                    <th className="px-6 py-3 font-semibold text-gray-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-indigo-600">{inv.invoice_number}</td>
                      <td className="px-6 py-4 text-gray-600">{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{inv.customer_name}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${inv.tax_inclusive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {inv.tax_inclusive ? 'Tax' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800">₹{Number(inv.grand_total).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleReprint(inv.id)}
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition" title="Reprint">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => router.push(`/invoice/${inv.id}`)}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(inv.id, inv.invoice_number, inv.customer_name)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-4">
              {filteredInvoices.map(inv => (
                <div key={inv.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-gray-800 text-lg">{inv.customer_name}</div>
                      <div className="text-gray-500 text-sm">{inv.invoice_number} • {new Date(inv.date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${inv.tax_inclusive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {inv.tax_inclusive ? 'Tax' : 'Normal'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-indigo-700">₹{Number(inv.grand_total).toFixed(2)}</div>
                  <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
                    <button onClick={() => handleReprint(inv.id)} className="flex-1 flex justify-center items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 p-3 rounded-lg font-medium min-h-[44px]">
                      <Printer className="w-5 h-5"/> Print
                    </button>
                    <button onClick={() => router.push(`/invoice/${inv.id}`)} className="flex-1 flex justify-center items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 p-3 rounded-lg font-medium min-h-[44px]">
                      <Edit className="w-5 h-5"/> Edit
                    </button>
                    <button onClick={() => handleDelete(inv.id, inv.invoice_number, inv.customer_name)} className="flex-1 flex justify-center items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 p-3 rounded-lg font-medium min-h-[44px]">
                      <Trash2 className="w-5 h-5"/> Delete
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
          <div className="bg-white rounded-t-3xl p-6 relative z-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
            <h3 className="text-xl font-bold mb-6 text-gray-800">Filter by Date</h3>
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-4 min-h-[44px] focus:border-indigo-500 outline-none text-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-4 min-h-[44px] focus:border-indigo-500 outline-none text-lg" />
              </div>
              <button onClick={() => setShowFilters(false)} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-xl font-bold mt-4 text-lg">Apply Filters</button>
              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); setShowFilters(false); }} className="w-full text-gray-500 p-4 font-semibold text-lg">Clear Filters</button>
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
