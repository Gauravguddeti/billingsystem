import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET() {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const data = await sql`SELECT * FROM categories WHERE user_id = ${user.id} ORDER BY created_at ASC`;
    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const body = await req.json();
    const { name, description, default_hsn, has_mrp } = body;
    if (!name) return Response.json({ error: 'Category name required' }, { status: 400 });
    const result = await sql`
      INSERT INTO categories (user_id, name, description, default_hsn, has_mrp)
      VALUES (${user.id}, ${name}, ${description||''}, ${default_hsn||'33074100'}, ${has_mrp||false})
      RETURNING *
    `;
    return Response.json(result[0]);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
