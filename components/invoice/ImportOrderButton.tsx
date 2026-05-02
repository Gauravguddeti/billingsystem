'use client';

import React, { useRef, useState } from 'react';
import { Spinner } from '../ui/Spinner';
import { Camera } from 'lucide-react';
import { InvoiceItem } from '@/types';
import { defaultRow } from '@/hooks/useInvoice';

interface OrderBlock {
  customerName: string | null;
  customerAddress: string | null;
  date: string | null;
  items: { name: string; rate: number; qty: number }[];
  notes: string | null;
}

interface ImportOrderButtonProps {
  onExtractSuccess: (order: OrderBlock) => void;
  onMultipleOrders: (orders: OrderBlock[]) => void;
  onError: (msg: string) => void;
}

export function ImportOrderButton({ onExtractSuccess, onMultipleOrders, onError }: ImportOrderButtonProps) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      onError('Please take a screenshot instead of uploading PDF');
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      onError('Only image files are supported');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/extract-order', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to extract order');
      }

      const data = await res.json();
      
      if (!data.orders || !Array.isArray(data.orders) || data.orders.length === 0) {
        throw new Error('No orders found in the image');
      }

      // Filter out zero quantity items from all orders
      const filteredOrders = data.orders.map((o: any) => ({
        ...o,
        items: (o.items || []).filter((i: any) => i.qty > 0)
      })).filter((o: any) => o.items.length > 0);

      if (filteredOrders.length === 0) {
        throw new Error('No valid items found in the image');
      }

      if (filteredOrders.length === 1) {
        onExtractSuccess(filteredOrders[0]);
      } else {
        onMultipleOrders(filteredOrders);
      }
    } catch (err: any) {
      onError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 px-4 md:px-5 py-2 md:py-3 rounded-lg transition font-semibold text-sm md:text-base flex items-center gap-2 disabled:opacity-60"
      >
        {loading ? <Spinner className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin inline-block" /> : <Camera className="w-5 h-5" />}
        {loading ? 'Reading...' : 'Import Order'}
      </button>
    </>
  );
}
