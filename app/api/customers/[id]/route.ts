import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

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
