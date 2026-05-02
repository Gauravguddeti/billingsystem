import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const { id } = await params;
    const body = await req.json();
    const { name, description, default_hsn, has_mrp } = body;
    const result = await sql`
      UPDATE categories SET name=${name}, description=${description||''}, default_hsn=${default_hsn||'33074100'}, has_mrp=${has_mrp||false}, updated_at=NOW()
      WHERE id=${id} AND user_id=${user.id} RETURNING *
    `;
    return Response.json(result[0] || {});
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const { id } = await params;
    await sql`DELETE FROM categories WHERE id=${id} AND user_id=${user.id}`;
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
