const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(async () => {
    // Check product_rates columns
    const cols = await c.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='product_rates' ORDER BY ordinal_position"
    );
    console.log('=== product_rates columns ===');
    console.table(cols.rows);

    // Fix 1: Add category_id if missing
    await c.query('ALTER TABLE product_rates ADD COLUMN IF NOT EXISTS category_id BIGINT');
    console.log('✅ category_id column ensured on product_rates');

    // Fix 2: Clean up duplicate categories - keep highest id per name per user
    const dups = await c.query(`
        SELECT name, user_id, array_agg(id ORDER BY id) AS ids
        FROM categories
        GROUP BY name, user_id
        HAVING COUNT(*) > 1
    `);
    console.log('Duplicate categories:', dups.rows);
    for (const row of dups.rows) {
        const keep = row.ids[row.ids.length - 1]; // keep latest
        const del = row.ids.slice(0, -1);
        // Remap product_rates.category_id from old to new
        for (const oldId of del) {
            await c.query('UPDATE product_rates SET category_id=$1 WHERE category_id=$2', [keep, oldId]);
        }
        await c.query('DELETE FROM categories WHERE id=ANY($1)', [del]);
        console.log(`Merged category "${row.name}": kept id ${keep}, deleted ${del}`);
    }

    // Check final state
    const cats = await c.query('SELECT id, name FROM categories ORDER BY id');
    console.log('=== Final categories ===');
    console.table(cats.rows);

    await c.end();
}).catch(e => console.error('❌', e.message));
