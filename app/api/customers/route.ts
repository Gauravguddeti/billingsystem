import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    
    // In the legacy app, customers were selected uniquely by name
    const data = await sql`
      SELECT id, name, address, phone, gstin 
      FROM customers 
      WHERE user_id = ${user.id} 
      ORDER BY name ASC
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
      VALUES (${user.id}, ${name}, ${address || null}, ${phone || null}, ${gstin || null})
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
