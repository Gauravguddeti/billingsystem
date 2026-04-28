// Remap product category_ids to the correct user's categories
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
const USER_ID = 'a0baf283-c68c-4b58-8eaf-68ad227d6bd0';

c.connect().then(async () => {
    // Show what category_ids products currently have
    const before = await c.query(`
        SELECT pr.category_id, c.name AS cat_name, c.user_id AS cat_owner, COUNT(*) AS prods
        FROM product_rates pr
        LEFT JOIN categories c ON c.id = pr.category_id
        WHERE pr.user_id = $1
        GROUP BY pr.category_id, c.name, c.user_id
        ORDER BY pr.category_id
    `, [USER_ID]);
    console.log('Products by category_id (before remap):');
    console.table(before.rows);

    // Fix: remap products that point to other users' categories → same-name category of our user
    const remap = await c.query(`
        UPDATE product_rates pr
        SET category_id = my_cat.id
        FROM categories other_cat
        JOIN categories my_cat ON LOWER(my_cat.name) = LOWER(other_cat.name) AND my_cat.user_id = $1
        WHERE pr.category_id = other_cat.id
          AND other_cat.user_id != $1
          AND pr.user_id = $1
        RETURNING pr.name, pr.category_id
    `, [USER_ID]);
    console.log(`\n✅ Remapped ${remap.rowCount} products to correct user categories`);

    // Also remap invoices.category_id the same way
    const invRemap = await c.query(`
        UPDATE invoices i
        SET category_id = my_cat.id
        FROM categories other_cat
        JOIN categories my_cat ON LOWER(my_cat.name) = LOWER(other_cat.name) AND my_cat.user_id = $1
        WHERE i.category_id = other_cat.id
          AND other_cat.user_id != $1
          AND i.user_id = $1
    `, [USER_ID]);
    console.log(`✅ Remapped ${invRemap.rowCount} invoices to correct categories`);

    // Final state
    const after = await c.query(`
        SELECT c.id, c.name, COUNT(pr.id) AS products, COUNT(i.id) AS invoices
        FROM categories c
        LEFT JOIN product_rates pr ON pr.category_id = c.id AND pr.user_id = $1
        LEFT JOIN invoices i ON i.category_id = c.id AND i.user_id = $1
        WHERE c.user_id = $1
        GROUP BY c.id, c.name ORDER BY c.name
    `, [USER_ID]);
    console.log('\n=== Final state for your user ===');
    console.table(after.rows);

    await c.end();
}).catch(e => console.error('❌', e.message));
