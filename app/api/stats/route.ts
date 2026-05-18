import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);

    const [invStats] = await sql`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(grand_total), 0) as total_revenue
      FROM invoices 
      WHERE user_id = ${user.id}
    `;

    const [monthStats] = await sql`
      SELECT 
        COALESCE(SUM(grand_total), 0) as this_month_revenue
      FROM invoices 
      WHERE user_id = ${user.id}
        AND date >= date_trunc('month', CURRENT_DATE)::date
    `;

    const [custStats] = await sql`
      SELECT COUNT(*) as total_customers
      FROM customers
      WHERE user_id = ${user.id}
    `;

    const recentInvoices = await sql`
      SELECT id, invoice_number, customer_name, grand_total 
      FROM invoices 
      WHERE user_id = ${user.id} 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    const topCustomers = await sql`
      SELECT customer_name, SUM(grand_total) as total
      FROM invoices
      WHERE user_id = ${user.id} AND customer_name IS NOT NULL
      GROUP BY customer_name
      ORDER BY total DESC
      LIMIT 5
    `;

    return Response.json({
      totalRevenue: Number(invStats.total_revenue),
      totalInvoices: Number(invStats.total_invoices),
      thisMonthRevenue: Number(monthStats.this_month_revenue),
      totalCustomers: Number(custStats.total_customers),
      recentInvoices: recentInvoices,
      topCustomers: topCustomers.map((tc: any) => [tc.customer_name, Number(tc.total)])
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
