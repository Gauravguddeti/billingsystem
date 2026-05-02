import { useState, useEffect } from 'react';
import { InvoiceItem } from '@/types';

export const defaultRow: InvoiceItem = {
  id: Date.now().toString(),
  invoice_id: '',
  item_name: '',
  hsn: '33074100',
  quantity: 1,
  unit: 'Pcs',
  rate: 0,
  free_qty: 0,
  free_unit: 'Pcs',
  discount: 0,
  base_amount: 0,
  cgst: 0,
  sgst: 0,
  total: 0,
  mrp: 0,
  discount_amount: 0,
};

export function useInvoice() {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ ...defaultRow }]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // 1. Draft restore on mount
  useEffect(() => {
    if (editingInvoiceId) return; // never restore draft in edit mode
    const draft = localStorage.getItem('invoiceDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setCustomerName(parsed.customerName || '');
        setCustomerPhone(parsed.customerPhone || '');
        setCustomerAddress(parsed.customerAddress || '');
        setCustomerGstin(parsed.customerGstin || '');
        setItems(parsed.items?.length > 0 ? parsed.items : [{ ...defaultRow }]);
        setInvoiceDate(parsed.invoiceDate || new Date().toISOString().split('T')[0]);
        setTaxInclusive(parsed.taxInclusive || false);
        setOverallDiscount(parsed.overallDiscount || 0);
        setCategoryId(parsed.categoryId || '');
        setIsDraftRestored(true);
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    }
  }, [editingInvoiceId]);

  // 2. Draft auto-save
  useEffect(() => {
    if (!isEditMode && invoiceDate) {
      // only save draft when NOT in edit mode
      localStorage.setItem('invoiceDraft', JSON.stringify({
        customerName, customerPhone, customerAddress, customerGstin,
        items, invoiceDate, taxInclusive, overallDiscount, categoryId
      }));
    }
  }, [customerName, customerPhone, customerAddress, customerGstin, items, invoiceDate, taxInclusive, overallDiscount, categoryId, isEditMode]);

  return {
    customerName, setCustomerName,
    customerPhone, setCustomerPhone,
    customerAddress, setCustomerAddress,
    customerGstin, setCustomerGstin,
    items, setItems,
    invoiceDate, setInvoiceDate,
    taxInclusive, setTaxInclusive,
    overallDiscount, setOverallDiscount,
    categoryId, setCategoryId,
    editingInvoiceId, setEditingInvoiceId,
    isEditMode, setIsEditMode,
    isDraftRestored, setIsDraftRestored
  };
}
