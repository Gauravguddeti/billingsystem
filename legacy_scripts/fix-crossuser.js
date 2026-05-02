// Fix: reset category_id to null for products where the assigned category belongs to a DIFFERENT user
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(async () => {
    // Reset products that have a category_id belonging to someone else
    const r = await c.query(`
        UPDATE product_rates pr
        SET category_id = NULL
        FROM categories cat
        WHERE pr.category_id = cat.id
          AND cat.user_id != pr.user_id
        RETURNING pr.user_id, pr.name, pr.category_id
    `);
    console.log(`✅ Reset ${r.rowCount} cross-user category assignments`);
    if (r.rowCount > 0) console.table(r.rows.slice(0, 10));

    // Now reassign those products based on THAT USER's own invoice history only
    const r2 = await c.query(`
        UPDATE product_rates pr
        SET category_id = sub.cat_id
        FROM (
            SELECT ii.item_name, inv.category_id AS cat_id, inv.user_id,
                   COUNT(*) AS cnt,
                   ROW_NUMBER() OVER (PARTITION BY ii.item_name, inv.user_id ORDER BY COUNT(*) DESC) AS rn
            FROM invoice_items ii
            JOIN invoices inv ON inv.id = ii.invoice_id
            WHERE inv.category_id IS NOT NULL
            GROUP BY ii.item_name, inv.category_id, inv.user_id
        ) sub
        JOIN categories cat ON cat.id = sub.cat_id AND cat.user_id = sub.user_id
        WHERE sub.rn = 1
          AND LOWER(pr.name) = LOWER(sub.item_name)
          AND pr.category_id IS NULL
          AND pr.user_id = sub.user_id
        RETURNING pr.user_id, pr.name, pr.category_id
    `);
    console.log(`✅ Correctly reassigned ${r2.rowCount} products via per-user invoice history`);

    // Final state
    const fin = await c.query(`
        SELECT pr.user_id, c.name AS cat_name, COUNT(pr.id) AS count
        FROM product_rates pr
        LEFT JOIN categories c ON c.id = pr.category_id
        GROUP BY pr.user_id, c.name
        ORDER BY pr.user_id, c.name
    `);
    console.log('\nFinal product assignments:');
    console.table(fin.rows);
    await c.end();
}).catch(e => console.error('❌', e.message));
