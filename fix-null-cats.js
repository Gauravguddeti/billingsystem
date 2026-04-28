const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
const USER = 'a0baf283-c68c-4b58-8eaf-68ad227d6bd0';

c.connect().then(async () => {
    const nullProds = await c.query('SELECT name FROM product_rates WHERE category_id IS NULL AND user_id=$1', [USER]);
    console.log('Null-category products:', nullProds.rows.map(r => r.name));

    const r = await c.query(`
        UPDATE product_rates pr SET category_id = sub.cat_id
        FROM (
            SELECT ii.item_name, inv.category_id AS cat_id, COUNT(*) AS cnt,
                   ROW_NUMBER() OVER (PARTITION BY ii.item_name ORDER BY COUNT(*) DESC) AS rn
            FROM invoice_items ii
            JOIN invoices inv ON inv.id = ii.invoice_id
            WHERE inv.user_id = $1 AND inv.category_id IS NOT NULL
            GROUP BY ii.item_name, inv.category_id
        ) sub
        WHERE sub.rn = 1 AND LOWER(pr.name) = LOWER(sub.item_name)
          AND pr.category_id IS NULL AND pr.user_id = $1
        RETURNING pr.name, pr.category_id
    `, [USER]);
    console.log('Assigned:', r.rows.length, 'products');

    const final = await c.query(
        'SELECT category_id, COUNT(*) AS count FROM product_rates WHERE user_id=$1 GROUP BY category_id ORDER BY category_id',
        [USER]
    );
    console.log('\nFinal product counts by category_id:');
    console.table(final.rows);
    await c.end();
}).catch(e => console.error(e.message));
