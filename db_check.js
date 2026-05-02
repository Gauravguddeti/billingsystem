const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function checkAndAlter() {
  try {
    const res = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='businesses';
    `;
    const cols = res.map(r => r.column_name);
    console.log("Existing columns:", cols);
    
    if (!cols.includes('terms_conditions')) {
      console.log("Adding terms_conditions...");
      await sql`ALTER TABLE businesses ADD COLUMN terms_conditions TEXT;`;
    }
    if (!cols.includes('upi_id')) {
      console.log("Adding upi_id...");
      await sql`ALTER TABLE businesses ADD COLUMN upi_id TEXT;`;
    }
    console.log("Done checking/altering DB.");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
checkAndAlter();
