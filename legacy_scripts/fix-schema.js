const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_iAVxdGm8g3IR@ep-withered-king-amja9v7d-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function fix() {
    await client.connect();

    // 1. Check categories table
    const catCols = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'categories' AND table_schema = 'public' ORDER BY ordinal_position`
    );
    console.log('\n=== categories columns ===');
    catCols.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

    const catData = await client.query(`SELECT * FROM categories LIMIT 5`);
    console.log('\n=== Sample categories ===');
    console.table(catData.rows);

    // 2. Add missing branch_name column to user_profiles if absent
    const hasBranch = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'branch_name' AND table_schema = 'public'`
    );
    if (hasBranch.rows.length === 0) {
        console.log('\n⚠️  branch_name missing from user_profiles — adding it...');
        await client.query(`ALTER TABLE user_profiles ADD COLUMN branch_name text DEFAULT ''`);
        console.log('✅ branch_name column added');
    } else {
        console.log('\n✅ branch_name already exists in user_profiles');
    }

    // 3. Verify user_ids match between auth.users and invoices
    const mismatch = await client.query(`
        SELECT i.user_id, COUNT(*) as inv_count
        FROM invoices i
        LEFT JOIN auth.users u ON u.id = i.user_id
        WHERE u.id IS NULL
        GROUP BY i.user_id
    `);
    if (mismatch.rows.length > 0) {
        console.log('\n❌ Invoices with orphan user_ids (no matching user):');
        console.table(mismatch.rows);
    } else {
        console.log('\n✅ All invoices have matching users in auth.users');
    }

    // 4. Count per user
    const perUser = await client.query(`
        SELECT u.email, COUNT(i.id) as invoices, COUNT(DISTINCT c.id) as customers
        FROM auth.users u
        LEFT JOIN invoices i ON i.user_id = u.id
        LEFT JOIN customers c ON c.user_id = u.id
        GROUP BY u.email
        ORDER BY invoices DESC
    `);
    console.log('\n=== Data per user ===');
    console.table(perUser.rows);

    await client.end();
}

fix().catch(e => { console.error(e); process.exit(1); });
