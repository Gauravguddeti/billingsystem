import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);

    // Return customers with aggregate billing data
    const data = await sql`
      SELECT
        c.id, c.name, c.address, c.phone, c.gstin,
        COUNT(i.id)::int AS total_invoices,
        COALESCE(SUM(i.grand_total) FILTER (WHERE COALESCE(i.is_deleted, false) = false), 0) AS total_billed,
        COALESCE(SUM(i.grand_total) FILTER (WHERE COALESCE(i.is_deleted, false) = false AND COALESCE(i.payment_status, 'unpaid') != 'paid'), 0) AS total_outstanding,
        MAX(i.date) AS last_invoice_date
      FROM customers c
      LEFT JOIN invoices i ON i.customer_name = c.name AND i.user_id = c.user_id
      WHERE c.user_id = ${user.id}
      GROUP BY c.id, c.name, c.address, c.phone, c.gstin
      ORDER BY c.name ASC
    `;

    return Response.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const body = await request.json();
    const { name, address, phone, gstin } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return Response.json({ error: 'Valid customer name is required' }, { status: 400 });
    }

    const newCustomer = await sql`
      INSERT INTO customers (user_id, name, address, phone, gstin)
      VALUES (${user.id}, ${name.trim()}, ${address || null}, ${phone || null}, ${gstin || null})
      RETURNING *
    `;

    return Response.json(newCustomer[0]);
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.code === '23505') {
      return Response.json({ error: 'Customer already exists' }, { status: 409 });
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
