import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { TabNav } from '@/components/layout/TabNav';
import { ProductList } from '@/components/products/ProductList';

export default function ProductsPage() {
  return (
    <>
      <Navbar />
      <TabNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
        <ProductList />
      </main>
    </>
  );
}
