// Reassign category_id on existing products using invoice_items history
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect().then(async () => {
    // Step 1: show current categories
    const cats = await c.query('SELECT id, name, user_id FROM categories ORDER BY id');
    console.log('Categories:');
    console.table(cats.rows);

    // Step 2: For each product, find the most-used category from invoice_items → invoices → category_id
    const r = await c.query(`
        UPDATE product_rates pr
        SET category_id = sub.cat_id
        FROM (
            SELECT
                ii.item_name,
                inv.category_id AS cat_id,
                COUNT(*) AS usage_count,
                ROW_NUMBER() OVER (PARTITION BY ii.item_name ORDER BY COUNT(*) DESC) AS rn
            FROM invoice_items ii
            JOIN invoices inv ON inv.id = ii.invoice_id
            WHERE inv.category_id IS NOT NULL
            GROUP BY ii.item_name, inv.category_id
        ) sub
        WHERE sub.rn = 1
          AND LOWER(pr.name) = LOWER(sub.item_name)
          AND pr.category_id IS NULL
        RETURNING pr.name, pr.category_id
    `);
    console.log(`\n✅ Reassigned ${r.rowCount} products from invoice history`);

    // Step 3: count by category now
    const after = await c.query(`
        SELECT c.name, COUNT(pr.id) AS products
        FROM categories c
        LEFT JOIN product_rates pr ON pr.category_id = c.id
        GROUP BY c.id, c.name ORDER BY c.name
    `);
    console.log('\nProducts per category after fix:');
    console.table(after.rows);

    await c.end();
}).catch(e => console.error('❌', e.message));
