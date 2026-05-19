import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import InvoicePrintClient from './InvoicePrintClient';

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: session } = await auth.getSession();
  if (!session) notFound();

  const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);

  const invoices = await sql`
    SELECT * FROM invoices WHERE id = ${id} AND user_id = ${user.id}
  `;
  if (invoices.length === 0) notFound();

  const items = await sql`SELECT * FROM invoice_items WHERE invoice_id = ${id}`;
  const businessArr = await sql`SELECT * FROM businesses WHERE user_id = ${user.id} AND is_default = TRUE LIMIT 1`;
  const business = businessArr[0] || { name: 'My Business' };

  return (
    <InvoicePrintClient
      invoice={{ ...invoices[0] }}
      items={items as any[]}
      business={business as any}
    />
  );
}
