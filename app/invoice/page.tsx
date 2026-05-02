import React from 'react';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { Navbar } from '@/components/layout/Navbar';
import { TabNav } from '@/components/layout/TabNav';

export default function InvoicePage() {
  return (
    <>
      <Navbar />
      <TabNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32 md:pb-8">
        <InvoiceForm />
      </main>
    </>
  );
}
