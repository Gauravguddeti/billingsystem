import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';
import { numberToWords } from '@/lib/invoice-utils';

// ─── Server-side total recalculation (prevents client-side tampering) ──────────
function recalculateInvoiceTotals(items: any[], taxInclusive: boolean, discountAmt: number, discountPct: number) {
  let subtotal = 0;
  let totalQty = 0;

  const cleanItems = items.map((item: any) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    const itemDiscPct = Math.max(0, Math.min(100, Number(item.discount) || 0));
    const itemDiscAmt = Math.max(0, Number(item.discount_amount) || 0);

    const gross = qty * rate;
    let sellingRate: number;
    if (itemDiscAmt > 0) {
      sellingRate = Math.max(0, rate - itemDiscAmt);
    } else {
      sellingRate = rate - (rate * itemDiscPct / 100);
    }
    const afterItemDisc = sellingRate * qty;
    const base = taxInclusive ? afterItemDisc * (100 / 105) : afterItemDisc;

    if (item.item_name) {
      subtotal += base;
      totalQty += qty;
    }

    return {
      item_name: String(item.item_name || '').trim(),
      hsn: String(item.hsn || '33074100').trim(),
      quantity: qty,
      unit: String(item.unit || 'Pcs'),
      rate,
      free_qty: Math.max(0, Number(item.free_qty) || 0),
      free_unit: String(item.free_unit || 'Pcs'),
      discount: itemDiscPct,
      discount_amount: itemDiscAmt,
      base_amount: base,
      cgst: 0,
      sgst: 0,
      total: afterItemDisc,
      mrp: Math.max(0, Number(item.mrp) || 0),
    };
  });

  const effectiveDiscAmt = discountAmt > 0 ? discountAmt : (subtotal * discountPct / 100);
  const afterDisc = Math.max(0, subtotal - effectiveDiscAmt);
  const taxableAmount = afterDisc;

  let cgstTotal = 0, sgstTotal = 0, igstTotal = 0, grandTotal = 0;
  if (taxInclusive) {
    cgstTotal = afterDisc * 0.025;
    sgstTotal = afterDisc * 0.025;
    grandTotal = afterDisc + cgstTotal + sgstTotal;
  } else {
    grandTotal = afterDisc;
  }

  return { cleanItems, subtotal, effectiveDiscAmt, afterDisc, taxableAmount, cgstTotal, sgstTotal, igstTotal, grandTotal, totalQty };
}

export async function GET(request: NextRequest) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = searchParams.get('limit');
    const paymentStatus = searchParams.get('payment_status');
    const type = searchParams.get('type');

    let data;
    if (limit) {
      data = await sql`
        SELECT * FROM invoices
        WHERE user_id = ${user.id}
        AND COALESCE(is_deleted, false) = false
        ORDER BY created_at DESC
        LIMIT ${parseInt(limit, 10)}
      `;
    } else if (from && to) {
      if (paymentStatus && paymentStatus !== 'all') {
        data = await sql`
          SELECT * FROM invoices
          WHERE user_id = ${user.id}
          AND date >= ${from} AND date <= ${to}
          AND payment_status = ${paymentStatus}
          AND COALESCE(is_deleted, false) = false
          ORDER BY created_at DESC
        `;
      } else {
        data = await sql`
          SELECT * FROM invoices
          WHERE user_id = ${user.id}
          AND date >= ${from} AND date <= ${to}
          AND COALESCE(is_deleted, false) = false
          ORDER BY created_at DESC
        `;
      }
    } else {
      if (paymentStatus && paymentStatus !== 'all') {
        data = await sql`
          SELECT * FROM invoices
          WHERE user_id = ${user.id}
          AND payment_status = ${paymentStatus}
          AND COALESCE(is_deleted, false) = false
          ORDER BY created_at DESC
        `;
      } else {
        data = await sql`
          SELECT * FROM invoices
          WHERE user_id = ${user.id}
          AND COALESCE(is_deleted, false) = false
          ORDER BY created_at DESC
        `;
      }
    }

    return Response.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
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

    // --- Basic validation ---
    if (!body.customer_name || typeof body.customer_name !== 'string' || !body.customer_name.trim()) {
      return Response.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (body.customer_name.length > 200) {
      return Response.json({ error: 'Customer name too long (max 200 chars)' }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return Response.json({ error: 'At least one item is required' }, { status: 400 });
    }
    if (body.items.length > 100) {
      return Response.json({ error: 'Too many items (max 100 per invoice)' }, { status: 400 });
    }
    const validItems = body.items.filter((i: any) => i.item_name && String(i.item_name).trim());
    if (validItems.length === 0) {
      return Response.json({ error: 'At least one item with a name is required' }, { status: 400 });
    }

    const taxInclusive = !!body.tax_inclusive;
    const discountAmt = Math.max(0, Number(body.discount_amount) || 0);
    const discountPct = Math.max(0, Number(body.discount) || 0);

    // SERVER-SIDE recalculation — never trust client totals
    const {
      cleanItems, subtotal, effectiveDiscAmt, afterDisc,
      taxableAmount, cgstTotal, sgstTotal, igstTotal, grandTotal, totalQty
    } = recalculateInvoiceTotals(validItems, taxInclusive, discountAmt, discountPct);

    const invoiceNumber = body.invoice_number?.trim() || 'INV-001';
    const invoiceDate = body.date || new Date().toISOString().split('T')[0];
    const amountWords = numberToWords(Math.round(grandTotal));

    // Handle credit note type
    const docType = body.type === 'credit_note' ? 'credit_note' : 'invoice';
    const refInvoiceId = body.reference_invoice_id || null;

    // 1. Insert Invoice
    const invs = await sql`
      INSERT INTO invoices (
        user_id, invoice_number, date, customer_name, customer_address,
        customer_phone, customer_gstin, tax_inclusive, discount,
        subtotal, discount_amount, after_discount, taxable_amount,
        cgst, sgst, igst, grand_total, total_quantity, total_items,
        amount_words, category_id, type, reference_invoice_id, payment_status
      ) VALUES (
        ${user.id}, ${invoiceNumber}, ${invoiceDate},
        ${body.customer_name.trim()}, ${body.customer_address || null},
        ${body.customer_phone || null}, ${body.customer_gstin || null},
        ${taxInclusive}, ${discountPct},
        ${subtotal}, ${effectiveDiscAmt}, ${afterDisc}, ${taxableAmount},
        ${cgstTotal}, ${sgstTotal}, ${igstTotal}, ${grandTotal},
        ${totalQty}, ${cleanItems.length},
        ${amountWords}, ${body.category_id || null},
        ${docType}, ${refInvoiceId}, 'unpaid'
      ) RETURNING *
    `;

    const invId = invs[0].id;

    // 2. Insert Items (bulk)
    if (cleanItems.length > 0) {
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

    // 3. Upsert Customer
    if (body.customer_name?.trim()) {
      await sql`
        INSERT INTO customers (user_id, name, address, phone, gstin)
        VALUES (${user.id}, ${body.customer_name.trim()}, ${body.customer_address || null}, ${body.customer_phone || null}, ${body.customer_gstin || null})
        ON CONFLICT (user_id, name)
        DO UPDATE SET
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          gstin = EXCLUDED.gstin,
          updated_at = NOW()
      `;
    }

    return Response.json(invs[0]);
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.code === '23505') {
      return Response.json({ error: 'Invoice number already exists' }, { status: 409 });
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
