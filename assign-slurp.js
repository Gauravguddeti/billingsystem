const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
const USER = 'a0baf283-c68c-4b58-8eaf-68ad227d6bd0';
c.connect().then(async () => {
    const r = await c.query('UPDATE product_rates SET category_id=6 WHERE category_id IS NULL AND user_id=$1', [USER]);
    console.log('Assigned to Slurp (category 6):', r.rowCount, 'products');
    const final = await c.query('SELECT category_id, COUNT(*) AS count FROM product_rates WHERE user_id=$1 GROUP BY category_id ORDER BY category_id', [USER]);
    console.table(final.rows);
    await c.end();
}).catch(e => console.error(e.message));
