import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);

    // Get customer details + aggregate stats
    const customers = await sql`
      SELECT
        c.*,
        COUNT(i.id)::int AS total_invoices,
        COALESCE(SUM(i.grand_total) FILTER (WHERE COALESCE(i.is_deleted, false) = false), 0) AS total_billed,
        COALESCE(SUM(i.grand_total) FILTER (WHERE COALESCE(i.is_deleted, false) = false AND COALESCE(i.payment_status, 'unpaid') != 'paid'), 0) AS total_outstanding,
        MAX(i.date) AS last_invoice_date
      FROM customers c
      LEFT JOIN invoices i ON i.customer_name = c.name AND i.user_id = c.user_id
      WHERE c.id = ${id} AND c.user_id = ${user.id}
      GROUP BY c.id
    `;

    if (customers.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });

    // Get invoices for this customer
    const invoices = await sql`
      SELECT * FROM invoices
      WHERE user_id = ${user.id}
      AND customer_name = ${customers[0].name}
      AND COALESCE(is_deleted, false) = false
      ORDER BY date DESC, created_at DESC
    `;

    return Response.json({ customer: customers[0], invoices });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const body = await request.json();
    const { name, address, phone, gstin } = body;

    const updated = await sql`
      UPDATE customers
      SET
        name = COALESCE(${name}, name),
        address = ${address},
        phone = ${phone},
        gstin = ${gstin},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `;

    if (updated.length === 0) return Response.json({ error: 'Customer not found' }, { status: 404 });
    return Response.json(updated[0]);
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.code === '23505') {
      return Response.json({ error: 'Customer name already exists' }, { status: 409 });
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);

    const deleted = await sql`
      DELETE FROM customers
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id
    `;

    if (deleted.length === 0) return Response.json({ error: 'Customer not found' }, { status: 404 });
    return Response.json({ success: true, id: deleted[0].id });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
