import { InvoiceItem } from '@/types';

/**
 * Calculates invoice totals matching original index.html logic exactly:
 * 
 * taxBillMode=true  (Tax Invoice):
 *   - Rate entered is SELLING PRICE including GST (GST-inclusive)
 *   - base = sellingRate * 100/105  (back-calculate taxable value)
 *   - CGST = afterDisc * 0.025
 *   - SGST = afterDisc * 0.025
 *   - Grand Total = afterDisc + CGST + SGST  (same as original billing amount)
 * 
 * taxBillMode=false (Normal Invoice):
 *   - Rate is final price, no GST at all
 *   - Grand Total = subtotal - discount
 */
export function calculateTotals(
  items: InvoiceItem[],
  taxBillMode: boolean,
  overallDiscountAmt: number,
  overallDiscountPct: number = 0
) {
  let subtotal = 0;
  let totalQty = 0;

  const processedItems = items.map(item => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const itemDiscPct = Number(item.discount) || 0;
    const itemDiscAmt = Number(item.discount_amount) || 0;

    const gross = qty * rate;

    // Per-item discount: flat amount takes priority over %
    let sellingRate: number;
    if (itemDiscAmt > 0) {
      sellingRate = rate - itemDiscAmt;
    } else {
      sellingRate = rate - (rate * itemDiscPct / 100);
    }
    const afterItemDisc = sellingRate * qty;

    // In tax bill mode: rate is inclusive of GST, so base = rate * 100/105
    let base: number;
    if (taxBillMode) {
      base = afterItemDisc * (100 / 105);
    } else {
      base = afterItemDisc;
    }

    if (item.item_name) {
      subtotal += base;
      totalQty += qty;
    }

    return {
      ...item,
      base_amount: base,
      cgst: 0,   // Line-level GST is 0; totals computed at invoice level
      sgst: 0,
      total: afterItemDisc,  // Line total = what customer pays
      line_discount_amount: itemDiscAmt > 0 ? itemDiscAmt * qty : gross * itemDiscPct / 100, // Total discount for this line
    };
  });

  // Overall discount: flat amount takes priority over %
  const discAmt = overallDiscountAmt > 0
    ? overallDiscountAmt
    : (subtotal * overallDiscountPct / 100);
  const afterDisc = subtotal - discAmt;

  let cgstTotal = 0;
  let sgstTotal = 0;
  let grandTotal: number;

  if (taxBillMode) {
    // Recalculate GST on discounted taxable amount
    cgstTotal = afterDisc * 0.025;
    sgstTotal = afterDisc * 0.025;
    grandTotal = afterDisc + cgstTotal + sgstTotal;
  } else {
    // Normal bill — no GST
    cgstTotal = 0;
    sgstTotal = 0;
    grandTotal = afterDisc;
  }

  return {
    processedItems,
    subtotal,
    cgstTotal,
    sgstTotal,
    grandTotal,
    discAmt,
    afterDisc,
    totalQty,
    validItemCount: processedItems.filter(i => i.item_name).length
  };
}

export function numberToWords(num: number): string {
  if (!num || num === 0) return 'Zero Rupees Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  return result + ' Only';
}

export function generateNextInvoiceNumber(lastNumber?: string): string {
  if (!lastNumber) return 'INV-001';
  const match = lastNumber.match(/INV-(\d+)/);
  if (!match) return 'INV-001';
  const num = parseInt(match[1], 10) + 1;
  return `INV-${num.toString().padStart(3, '0')}`;
}
