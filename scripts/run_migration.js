const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

const steps = [
  // Fix: drop FK constraint blocking user_profiles inserts with Neon Auth IDs
  ['Drop user_profiles_id_fkey FK', `ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey`],
  ['Add neon_auth_id column to user_profiles', `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS neon_auth_id TEXT`],
  ['Create unique index on neon_auth_id', `CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_neon_auth_id_idx ON user_profiles(neon_auth_id) WHERE neon_auth_id IS NOT NULL`],

  // Invoice schema additions
  ['Add taxable_amount to invoices', `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2)`],
  ['Add igst to invoices', `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst NUMERIC(12,2) DEFAULT 0`],
  ['Add payment_status to invoices', `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid'`],
  ['Add paid_at to invoices', `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`],
  ['Add type to invoices', `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'invoice'`],
  ['Add reference_invoice_id to invoices', `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reference_invoice_id UUID`],
  ['Add is_deleted to invoices', `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`],

  // Product schema additions
  ['Add stock_qty to product_rates', `ALTER TABLE product_rates ADD COLUMN IF NOT EXISTS stock_qty INTEGER`],

  // Backfill defaults on existing rows
  [`Backfill payment_status`, `UPDATE invoices SET payment_status = 'unpaid' WHERE payment_status IS NULL`],
  [`Backfill type`, `UPDATE invoices SET type = 'invoice' WHERE type IS NULL`],
  [`Backfill is_deleted`, `UPDATE invoices SET is_deleted = FALSE WHERE is_deleted IS NULL`],
];

async function runMigrations() {
  console.log('🚀 Running production migrations...\n');
  let passed = 0, failed = 0;

  for (const [name, query] of steps) {
    try {
      await sql.query(query);
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('does not exist')) {
        console.log(`  ⏭  ${name} (skipped)`);
        passed++;
      } else {
        console.error(`  ❌ ${name}: ${msg}`);
        failed++;
      }
    }
  }

  console.log(`\n${passed} passed  ${failed} failed`);
  if (failed === 0) console.log('🎉 All migrations complete!\n');
}

runMigrations().catch(console.error);
