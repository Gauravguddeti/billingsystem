const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_iAVxdGm8g3IR@ep-withered-king-amja9v7d-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function inspect() {
    await client.connect();

    // Check tables
    const tables = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log('\n=== Tables in public schema ===');
    tables.rows.forEach(r => console.log(' -', r.table_name));

    // Check invoice columns
    const cols = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('\n=== invoices columns ===');
    cols.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

    // Sample invoices
    const inv = await client.query(
        `SELECT id, invoice_number, user_id, grand_total FROM invoices LIMIT 5`
    );
    console.log('\n=== Sample invoices ===');
    console.table(inv.rows);

    // Check user_profiles table structure
    try {
        const profCols = await client.query(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles' AND table_schema = 'public' ORDER BY ordinal_position`
        );
        console.log('\n=== user_profiles columns ===');
        profCols.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
    } catch(e) {
        console.log('user_profiles table not found:', e.message);
    }

    // Check invoice_items
    const itemCols = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'invoice_items' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('\n=== invoice_items columns ===');
    itemCols.rows.forEach(r => console.log(' -', r.column_name));

    // Count items per invoice (first invoice)
    if (inv.rows.length > 0) {
        const items = await client.query(
            `SELECT COUNT(*) as cnt FROM invoice_items WHERE invoice_id = $1`,
            [inv.rows[0].id]
        );
        console.log(`\n=== Items for first invoice (${inv.rows[0].invoice_number}) ===`);
        console.log(' Count:', items.rows[0].cnt);
    }

    await client.end();
}

inspect().catch(e => { console.error(e); process.exit(1); });
