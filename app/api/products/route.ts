import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const data = await sql`
      SELECT pr.*, c.name as category_name 
      FROM product_rates pr
      LEFT JOIN categories c ON c.id::text = pr.category_id::text AND c.user_id = pr.user_id
      WHERE pr.user_id = ${user.id}
      ORDER BY pr.name ASC
    `;
    return Response.json(data, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } });
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
    const { name, rate, mrp, hsn, category_id, stock_qty } = body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return Response.json({ error: 'Valid product name is required' }, { status: 400 });
    }
    if (name.length > 200) {
      return Response.json({ error: 'Product name too long (max 200 chars)' }, { status: 400 });
    }
    const cleanRate = Math.max(0, Number(rate) || 0);
    const cleanMrp = Math.max(0, Number(mrp) || 0);
    if (cleanRate > 10_000_000 || cleanMrp > 10_000_000) {
      return Response.json({ error: 'Rate/MRP value out of range' }, { status: 400 });
    }

    const newProduct = await sql`
      INSERT INTO product_rates (user_id, name, rate, mrp, hsn, category_id, stock_qty)
      VALUES (
        ${user.id}, ${name.trim()}, ${cleanRate}, ${cleanMrp}, ${hsn || '33074100'},
        ${category_id || null}, ${stock_qty !== undefined && stock_qty !== '' ? Number(stock_qty) : null}
      )
      RETURNING *
    `;
    return Response.json(newProduct[0]);
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.code === '23505') {
      return Response.json({ error: 'Product already exists' }, { status: 409 });
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
