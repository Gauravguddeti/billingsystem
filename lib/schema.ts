export interface User {
  id: string; // uuid
  email: string;
  neon_auth_id?: string;
  created_at: string;
}

export interface Business {
  id: string; // bigint mapped to string
  user_id: string; // uuid
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  branch_name?: string;
  account_no?: string;
  ifsc?: string;
  is_default?: boolean;
  terms_conditions?: string;
  upi_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string; // bigint mapped to string
  user_id: string; // uuid
  business_id?: string; // bigint
  name: string;
  description?: string;
  default_hsn?: string;
  has_mrp?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string; // uuid
  user_id: string; // uuid
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string; // uuid
  user_id: string; // uuid
  category_id?: string; // bigint
  name: string;
  rate?: number;
  mrp?: number;
  hsn?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string; // uuid
  user_id: string; // uuid
  business_id?: string; // bigint
  category_id?: string; // bigint
  invoice_number: string;
  date: string;
  customer_name: string;
  customer_address?: string;
  customer_gstin?: string;
  customer_phone?: string;
  tax_inclusive?: boolean;
  discount?: number;
  subtotal: number;
  discount_amount?: number;
  after_discount: number;
  cgst: number;
  sgst: number;
  grand_total: number;
  total_quantity: number;
  total_items: number;
  amount_words?: string;
  payment_status?: string;
  amount_paid?: number;
  payment_date?: string;
  payment_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceItem {
  id: string; // uuid
  invoice_id: string; // uuid
  item_name: string;
  hsn?: string;
  quantity: number;
  unit: string;
  rate: number;
  free_qty?: number;
  free_unit?: string;
  discount?: number;
  base_amount: number;
  cgst: number;
  sgst: number;
  total: number;
  mrp?: number;
  discount_amount?: number;
  created_at?: string;
}
