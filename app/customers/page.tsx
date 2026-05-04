import { Navbar } from '@/components/layout/Navbar';
import { CustomerList } from '@/components/customers/CustomerList';
import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export default async function CustomersPage() {
  const { data: session } = await auth.getSession();
  
  if (!session) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col print:bg-white">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 print:p-0">
        <CustomerList />
      </main>
    </div>
  );
}
