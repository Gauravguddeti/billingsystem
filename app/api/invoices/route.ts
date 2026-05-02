import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    let data;
    if (from && to) {
      data = await sql`
        SELECT * FROM invoices 
        WHERE user_id = ${user.id} 
        AND date >= ${from} 
        AND date <= ${to} 
        ORDER BY created_at DESC
      `;
    } else {
      data = await sql`
        SELECT * FROM invoices 
        WHERE user_id = ${user.id} 
        ORDER BY created_at DESC
      `;
    }
    
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
    const {
      invoice_number, date, customer_name, customer_address, customer_phone, customer_gstin,
      tax_inclusive, discount, subtotal, discount_amount, after_discount,
      cgst, sgst, grand_total, total_quantity, total_items, amount_words, items
    } = body;

    // 1. Insert Invoice
    const invs = await sql`
      INSERT INTO invoices (
        user_id, invoice_number, date, customer_name, customer_address, 
        customer_phone, customer_gstin, tax_inclusive, discount, 
        subtotal, discount_amount, after_discount, cgst, sgst, 
        grand_total, total_quantity, total_items, amount_words
      ) VALUES (
        ${user.id}, ${invoice_number}, ${date}, ${customer_name}, ${customer_address},
        ${customer_phone}, ${customer_gstin}, ${tax_inclusive}, ${discount},
        ${subtotal}, ${discount_amount}, ${after_discount}, ${cgst}, ${sgst},
        ${grand_total}, ${total_quantity}, ${total_items}, ${amount_words}
      ) RETURNING *
    `;
    
    const invId = invs[0].id;
    
    // 2. Insert Items
    if (items && items.length > 0) {
      for (const item of items) {
        await sql`
          INSERT INTO invoice_items (
            invoice_id, item_name, hsn, quantity, unit, rate, 
            free_qty, free_unit, discount, base_amount, 
            cgst, sgst, total, mrp, discount_amount
          ) VALUES (
            ${invId}, ${item.item_name}, ${item.hsn}, ${item.quantity}, ${item.unit}, ${item.rate},
            ${item.free_qty || 0}, ${item.free_unit || 'Pcs'}, ${item.discount || 0}, ${item.base_amount},
            ${item.cgst}, ${item.sgst}, ${item.total}, ${item.mrp || 0}, ${item.discount_amount || 0}
          )
        `;
      }
    }
    
    // 3. Upsert Customer (Optional auto-save feature)
    if (customer_name) {
      await sql`
        INSERT INTO customers (user_id, name, address, phone, gstin)
        VALUES (${user.id}, ${customer_name}, ${customer_address}, ${customer_phone}, ${customer_gstin})
        ON CONFLICT (user_id, name) 
        DO UPDATE SET 
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          gstin = EXCLUDED.gstin,
          updated_at = NOW()
      `;
    }
    
    const newInvoice = invs[0];

    return Response.json(newInvoice);
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
