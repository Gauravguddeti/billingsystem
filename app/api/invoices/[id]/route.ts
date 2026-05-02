import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    
    const { id } = await params;
    
    const invoices = await sql`SELECT * FROM invoices WHERE id = ${id} AND user_id = ${user.id}`;
    if (invoices.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
    
    const items = await sql`SELECT * FROM invoice_items WHERE invoice_id = ${id}`;
    
    return Response.json({ ...invoices[0], items });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    
    const { id } = await params;
    
    // Verify ownership
    const existing = await sql`SELECT id FROM invoices WHERE id = ${id} AND user_id = ${user.id}`;
    if (existing.length === 0) return Response.json({ error: 'Not found or unauthorized' }, { status: 404 });
    
    const body = await request.json();
    const {
      invoice_number, date, customer_name, customer_address, customer_phone, customer_gstin,
      tax_inclusive, discount, subtotal, discount_amount, after_discount,
      cgst, sgst, grand_total, total_quantity, total_items, amount_words, items
    } = body;

    // 1. Update Invoice
    const invs = await sql`
      UPDATE invoices SET
        invoice_number = ${invoice_number},
        date = ${date},
        customer_name = ${customer_name},
        customer_address = ${customer_address},
        customer_phone = ${customer_phone},
        customer_gstin = ${customer_gstin},
        tax_inclusive = ${tax_inclusive},
        discount = ${discount},
        subtotal = ${subtotal},
        discount_amount = ${discount_amount},
        after_discount = ${after_discount},
        cgst = ${cgst},
        sgst = ${sgst},
        grand_total = ${grand_total},
        total_quantity = ${total_quantity},
        total_items = ${total_items},
        amount_words = ${amount_words},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `;
    
    // 2. Delete old items
    await sql`DELETE FROM invoice_items WHERE invoice_id = ${id}`;
    
    // 3. Insert new items
    if (items && items.length > 0) {
      for (const item of items) {
        await sql`
          INSERT INTO invoice_items (
            invoice_id, item_name, hsn, quantity, unit, rate, 
            free_qty, free_unit, discount, base_amount, 
            cgst, sgst, total, mrp, discount_amount
          ) VALUES (
            ${id}, ${item.item_name}, ${item.hsn}, ${item.quantity}, ${item.unit}, ${item.rate},
            ${item.free_qty || 0}, ${item.free_unit || 'Pcs'}, ${item.discount || 0}, ${item.base_amount},
            ${item.cgst}, ${item.sgst}, ${item.total}, ${item.mrp || 0}, ${item.discount_amount || 0}
          )
        `;
      }
    }
    
    const updatedInvoice = invs[0];

    return Response.json(updatedInvoice);
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    
    const { id } = await params;
    
    const deleted = await sql`DELETE FROM invoices WHERE id = ${id} AND user_id = ${user.id} RETURNING id`;
    if (deleted.length === 0) return Response.json({ error: 'Not found or unauthorized' }, { status: 404 });
    
    return Response.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
