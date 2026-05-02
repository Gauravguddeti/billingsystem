import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

// PUT /api/businesses/[id] — update
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const { id } = await params;
    const body = await req.json();
    const { name, address, gstin, phone, email, bank_name, branch_name, account_no, ifsc, terms_conditions, upi_id } = body;

    const result = await sql`
      UPDATE businesses SET
        name=${name||''}, address=${address||''}, gstin=${gstin||''}, phone=${phone||''},
        email=${email||''}, bank_name=${bank_name||''}, branch_name=${branch_name||''},
        account_no=${account_no||''}, ifsc=${ifsc||''}, terms_conditions=${terms_conditions||''}, upi_id=${upi_id||''}, updated_at=NOW()
      WHERE id=${id} AND user_id=${user.id}
      RETURNING *
    `;
    return Response.json(result[0] || {});
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/businesses/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const { id } = await params;
    await sql`DELETE FROM businesses WHERE id=${id} AND user_id=${user.id}`;
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/businesses/[id] — set as default
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const { id } = await params;
    // Clear all defaults first, then set this one
    await sql`UPDATE businesses SET is_default=FALSE WHERE user_id=${user.id}`;
    await sql`UPDATE businesses SET is_default=TRUE WHERE id=${id} AND user_id=${user.id}`;
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
