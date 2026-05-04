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
    
    // 2. Insert Items (Bulk Insert to avoid N+1 queries)
    if (items && items.length > 0) {
      const cleanItems = items.map((item: any) => ({
        item_name: item.item_name,
        hsn: item.hsn,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        free_qty: item.free_qty || 0,
        free_unit: item.free_unit || 'Pcs',
        discount: item.discount || 0,
        base_amount: item.base_amount,
        cgst: item.cgst,
        sgst: item.sgst,
        total: item.total,
        mrp: item.mrp || 0,
        discount_amount: item.discount_amount || 0
      }));

      await sql`
        INSERT INTO invoice_items (
          invoice_id, item_name, hsn, quantity, unit, rate, 
          free_qty, free_unit, discount, base_amount, 
          cgst, sgst, total, mrp, discount_amount
        )
        SELECT 
          ${invId}, item_name, hsn, quantity, unit, rate, 
          free_qty, free_unit, discount, base_amount, 
          cgst, sgst, total, mrp, discount_amount
        FROM jsonb_to_recordset(${JSON.stringify(cleanItems)}::jsonb) AS x(
          item_name text, hsn text, quantity numeric, unit text, rate numeric,
          free_qty numeric, free_unit text, discount numeric, base_amount numeric,
          cgst numeric, sgst numeric, total numeric, mrp numeric, discount_amount numeric
        )
      `;
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
