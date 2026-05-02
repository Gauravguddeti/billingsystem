import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    
    const data = await sql`SELECT * FROM businesses WHERE user_id = ${user.id} AND is_default = TRUE`;
    if (data.length > 0) {
      return Response.json(data[0]);
    } else {
      // Return empty business profile if none found
      return Response.json({ name: 'My Business' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    
    const body = await request.json();
    const { name, address, phone, email: businessEmail, gstin, bank_name, branch_name, account_no, ifsc } = body;
    
    // Check if default business exists
    const existing = await sql`SELECT id FROM businesses WHERE user_id = ${user.id} AND is_default = TRUE`;
    
    let updated;
    if (existing.length > 0) {
      updated = await sql`
        UPDATE businesses SET
          name = ${name || 'My Business'},
          address = ${address || ''},
          phone = ${phone || ''},
          email = ${businessEmail || ''},
          gstin = ${gstin || ''},
          bank_name = ${bank_name || ''},
          branch_name = ${branch_name || ''},
          account_no = ${account_no || ''},
          ifsc = ${ifsc || ''},
          updated_at = NOW()
        WHERE user_id = ${user.id} AND is_default = TRUE
        RETURNING *
      `;
    } else {
      updated = await sql`
        INSERT INTO businesses (
          user_id, name, address, phone, email, gstin, bank_name, branch_name, account_no, ifsc, is_default
        ) VALUES (
          ${user.id}, ${name || 'My Business'}, ${address || ''}, ${phone || ''}, ${businessEmail || ''},
          ${gstin || ''}, ${bank_name || ''}, ${branch_name || ''}, ${account_no || ''}, ${ifsc || ''}, TRUE
        )
        RETURNING *
      `;
    }
    
    return Response.json(updated[0]);
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
