const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(async () => {
    // Show all tables
    const tabs = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    console.log('Tables:'); console.table(tabs.rows);

    // Find the user table
    const userTab = tabs.rows.find(r => r.tablename.includes('user'));
    if (userTab) {
        const u = await c.query(`SELECT * FROM ${userTab.tablename} LIMIT 10`);
        console.log(`\n${userTab.tablename}:`); console.table(u.rows);
    }

    // List distinct user_ids in product_rates
    const pids = await c.query('SELECT DISTINCT user_id, COUNT(*) AS prods FROM product_rates GROUP BY user_id');
    console.log('\nDistinct users in product_rates:'); console.table(pids.rows);

    // List categories per user
    const cats = await c.query('SELECT user_id, id, name FROM categories ORDER BY user_id, id');
    console.log('\nAll categories:'); console.table(cats.rows);

    await c.end();
}).catch(e => console.error(e.message));
