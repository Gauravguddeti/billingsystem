import { auth } from '@/lib/auth/server';
import { sql, getOrCreateUser } from '@/lib/db';
import { NextRequest } from 'next/server';
import { numberToWords } from '@/lib/invoice-utils';

function recalculateInvoiceTotals(items: any[], taxInclusive: boolean, discountAmt: number, discountPct: number) {
  let subtotal = 0;
  let totalQty = 0;

  const cleanItems = items.map((item: any) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    const itemDiscPct = Math.max(0, Math.min(100, Number(item.discount) || 0));
    const itemDiscAmt = Math.max(0, Number(item.discount_amount) || 0);

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getOrCreateUser(session.user.id, session.user.email, session.user.name);
    const { id } = await params;

    const invoices = await sql`
      SELECT * FROM invoices
      WHERE id = ${id} AND user_id = ${user.id}
      AND COALESCE(is_deleted, false) = false
    `;
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

    const existing = await sql`SELECT id FROM invoices WHERE id = ${id} AND user_id = ${user.id}`;
    if (existing.length === 0) return Response.json({ error: 'Not found or unauthorized' }, { status: 404 });

    const body = await request.json();

    // Handle special PATCH-style operations passed as PUT
    // mark as paid
    if (body._action === 'mark_paid') {
      const updated = await sql`
        UPDATE invoices SET
          payment_status = 'paid',
          paid_at = NOW(),
          updated_at = NOW()
        WHERE id = ${id} AND user_id = ${user.id}
        RETURNING *
      `;
      return Response.json(updated[0]);
    }

    // update payment status
    if (body._action === 'set_payment_status') {
      const status = ['unpaid','paid','partial'].includes(body.payment_status) ? body.payment_status : 'unpaid';
      const updated = await sql`
        UPDATE invoices SET
          payment_status = ${status},
          paid_at = ${status === 'paid' ? sql`NOW()` : sql`NULL`},
          updated_at = NOW()
        WHERE id = ${id} AND user_id = ${user.id}
        RETURNING *
      `;
      return Response.json(updated[0]);
    }

    // Full update
    if (!body.customer_name?.trim()) {
      return Response.json({ error: 'Customer name is required' }, { status: 400 });
    }
    const validItems = (body.items || []).filter((i: any) => i.item_name && String(i.item_name).trim());
    const taxInclusive = !!body.tax_inclusive;
    const discountAmt = Math.max(0, Number(body.discount_amount) || 0);
    const discountPct = Math.max(0, Number(body.discount) || 0);

    const { cleanItems, subtotal, effectiveDiscAmt, afterDisc, taxableAmount, cgstTotal, sgstTotal, igstTotal, grandTotal, totalQty } =
      recalculateInvoiceTotals(validItems, taxInclusive, discountAmt, discountPct);

    const amountWords = numberToWords(Math.round(grandTotal));

    const invs = await sql`
      UPDATE invoices SET
        invoice_number = ${body.invoice_number || 'INV-001'},
        date = ${body.date},
        customer_name = ${body.customer_name.trim()},
        customer_address = ${body.customer_address || null},
        customer_phone = ${body.customer_phone || null},
        customer_gstin = ${body.customer_gstin || null},
        tax_inclusive = ${taxInclusive},
        discount = ${discountPct},
        subtotal = ${subtotal},
        discount_amount = ${effectiveDiscAmt},
        after_discount = ${afterDisc},
        taxable_amount = ${taxableAmount},
        cgst = ${cgstTotal},
        sgst = ${sgstTotal},
        igst = ${igstTotal},
        grand_total = ${grandTotal},
        total_quantity = ${totalQty},
        total_items = ${cleanItems.length},
        amount_words = ${amountWords},
        category_id = ${body.category_id || null},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `;

    await sql`DELETE FROM invoice_items WHERE invoice_id = ${id}`;

    if (cleanItems.length > 0) {
      await sql`
        INSERT INTO invoice_items (
          invoice_id, item_name, hsn, quantity, unit, rate,
          free_qty, free_unit, discount, base_amount,
          cgst, sgst, total, mrp, discount_amount
        )
        SELECT
          ${id}, item_name, hsn, quantity, unit, rate,
          free_qty, free_unit, discount, base_amount,
          cgst, sgst, total, mrp, discount_amount
        FROM jsonb_to_recordset(${JSON.stringify(cleanItems)}::jsonb) AS x(
          item_name text, hsn text, quantity numeric, unit text, rate numeric,
          free_qty numeric, free_unit text, discount numeric, base_amount numeric,
          cgst numeric, sgst numeric, total numeric, mrp numeric, discount_amount numeric
        )
      `;
    }

    return Response.json(invs[0]);
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

    // Soft delete — never physically remove invoices (GST compliance)
    const deleted = await sql`
      UPDATE invoices SET is_deleted = true, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id
    `;
    if (deleted.length === 0) return Response.json({ error: 'Not found or unauthorized' }, { status: 404 });
    return Response.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
