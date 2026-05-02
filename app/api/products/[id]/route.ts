import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    
    const { id } = await params;
    
    // Verify ownership
    const existing = await sql`SELECT id FROM product_rates WHERE id = ${id} AND user_id = ${user.id}`;
    if (existing.length === 0) return Response.json({ error: 'Not found or unauthorized' }, { status: 404 });
    
    const body = await request.json();
    const { name, rate, mrp, hsn, category_id } = body;
    
    if (!name) return Response.json({ error: 'Product name is required' }, { status: 400 });

    const updatedProduct = await sql`
      UPDATE product_rates SET
        name = ${name},
        rate = ${rate || 0},
        mrp = ${mrp || 0},
        hsn = ${hsn || '33074100'},
        category_id = ${category_id || null},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `;

    return Response.json(updatedProduct[0]);
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.code === '23505') { // unique violation
      return Response.json({ error: 'Another product with this name already exists' }, { status: 409 });
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    
    const { id } = await params;
    
    const deleted = await sql`DELETE FROM product_rates WHERE id = ${id} AND user_id = ${user.id} RETURNING id`;
    if (deleted.length === 0) return Response.json({ error: 'Not found or unauthorized' }, { status: 404 });
    
    return Response.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
