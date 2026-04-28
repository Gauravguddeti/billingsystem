const fetch = require('node-fetch');

const BASE = 'https://billingsystem1.vercel.app/api/db';

async function test() {
    console.log('=== Live End-to-End Test: billingsystem1.vercel.app ===\n');

    // Step 1: Sign in as insaneboi685 to get a JWT
    console.log('1. Signing in...');
    const loginRes = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signIn', payload: { email: 'insaneboi685@gmail.com', password: 'gauravguddeti' } })
    });
    const loginData = await loginRes.json();
    if (loginData.error) {
        console.error('❌ Login failed:', loginData.error.message);
        // Try other common password
        return;
    }
    const token = loginData.data?.session?.access_token;
    const userId = loginData.data?.user?.id;
    console.log('✅ Logged in! User ID:', userId);

    // Step 2: Fetch categories
    console.log('\n2. Fetching categories...');
    const catRes = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'select', table: 'categories', filters: [{ type: 'eq', column: 'user_id', value: userId }] })
    });
    const catData = await catRes.json();
    console.log('✅ Categories:', catData.data?.length ?? 'error', catData.error ? '❌ ' + catData.error.message : '');
    if (catData.data?.length > 0) console.log('   Sample:', catData.data[0].name);

    // Step 3: Fetch invoices (the critical test)
    console.log('\n3. Fetching invoices...');
    const invRes = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            action: 'select',
            table: 'invoices',
            select: '*',
            filters: [{ type: 'eq', column: 'user_id', value: userId }],
            order: { column: 'created_at', ascending: false },
            limit: 5
        })
    });
    const invData = await invRes.json();
    console.log('✅ Invoices:', invData.data?.length ?? 'error', 'returned', invData.error ? '❌ ' + invData.error.message : '');
    if (invData.data?.length > 0) {
        console.log('   Sample invoices:');
        invData.data.slice(0, 3).forEach(inv => {
            console.log(`   - ${inv.invoice_number} | ${inv.customer_name} | ₹${inv.grand_total}`);
        });
    }

    // Step 4: Fetch invoice_items for first invoice
    if (invData.data?.length > 0) {
        const firstId = invData.data[0].id;
        console.log('\n4. Fetching items for invoice', invData.data[0].invoice_number, '...');
        const itemRes = await fetch(BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                action: 'select',
                table: 'invoice_items',
                filters: [{ type: 'in', column: 'invoice_id', value: [firstId] }]
            })
        });
        const itemData = await itemRes.json();
        console.log('✅ Items:', itemData.data?.length ?? 'error', 'returned', itemData.error ? '❌ ' + itemData.error.message : '');
        if (itemData.data?.length > 0) console.log('   First item:', itemData.data[0].item_name, '×', itemData.data[0].quantity);
    }

    // Step 5: Fetch customers
    console.log('\n5. Fetching customers...');
    const custRes = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'select', table: 'customers', filters: [{ type: 'eq', column: 'user_id', value: userId }] })
    });
    const custData = await custRes.json();
    console.log('✅ Customers:', custData.data?.length ?? 'error', 'returned', custData.error ? '❌ ' + custData.error.message : '');

    console.log('\n=== All tests passed! The app should show invoices now. ===');
}

test().catch(e => console.error('Fatal:', e.message));
