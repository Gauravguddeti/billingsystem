const { Client } = require('pg');
const fs = require('fs');

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
    await client.connect();
    const sql = fs.readFileSync('./multi-business-migration.sql', 'utf8');
    const result = await client.query(sql);
    console.log('✅ Migration result:', result.rows);
    await client.end();
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
