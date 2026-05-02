import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

// GET /api/businesses — list all businesses for user
export async function GET() {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const data = await sql`SELECT * FROM businesses WHERE user_id = ${user.id} ORDER BY is_default DESC, created_at ASC`;
    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/businesses — create new business
export async function POST(req: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const body = await req.json();
    const { name, address, gstin, phone, email, bank_name, branch_name, account_no, ifsc, terms_conditions, upi_id } = body;
    if (!name) return Response.json({ error: 'Business name required' }, { status: 400 });

    const result = await sql`
      INSERT INTO businesses (user_id, name, address, gstin, phone, email, bank_name, branch_name, account_no, ifsc, terms_conditions, upi_id, is_default)
      VALUES (${user.id}, ${name}, ${address||''}, ${gstin||''}, ${phone||''}, ${email||''}, ${bank_name||''}, ${branch_name||''}, ${account_no||''}, ${ifsc||''}, ${terms_conditions||''}, ${upi_id||''}, FALSE)
      RETURNING *
    `;
    return Response.json(result[0]);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
