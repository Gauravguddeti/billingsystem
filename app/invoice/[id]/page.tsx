import React from 'react';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { Navbar } from '@/components/layout/Navbar';
import { TabNav } from '@/components/layout/TabNav';

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <>
      <Navbar />
      <TabNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InvoiceForm initialInvoiceId={id} />
      </main>
    </>
  );
}
