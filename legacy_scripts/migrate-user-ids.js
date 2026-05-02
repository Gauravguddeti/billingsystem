/**
 * Migration Script: Update Supabase data rows to use NeonDB user IDs
 *
 * The app now uses NeonDB for auth, so user.id = NeonDB UUID.
 * But all existing data in Supabase (invoices, customers, products etc.)
 * was created with old Supabase UUIDs. This script maps old → new IDs
 * and updates every row in Supabase data tables.
 */
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIG ---
const NEON_URI = 'postgresql://neondb_owner:npg_iAVxdGm8g3IR@ep-withered-king-amja9v7d-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const SUPABASE_URL = 'https://yylahhomjnjsybazxpt.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bGFoaG9tam5panN5YmF6eHB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA1MjMwOCwiZXhwIjoyMDg1NjI4MzA4fQ.F6Q-juVpq9ZTHjujg3ts_70k3WUAMa72_dGCMdKefRU';

// Tables that have a user_id column
const DATA_TABLES = ['invoices', 'invoice_items', 'customers', 'product_rates', 'categories', 'user_profiles'];

async function main() {
    console.log('=== User ID Migration: Supabase → NeonDB ===\n');

    // 1. Get all users from NeonDB
    const neon = new Client({ connectionString: NEON_URI });
    await neon.connect();
    console.log('✅ Connected to NeonDB');

    const { rows: neonUsers } = await neon.query(`SELECT id, email FROM auth.users`);
    console.log(`Found ${neonUsers.length} users in NeonDB:`);
    neonUsers.forEach(u => console.log(`  NeonDB: ${u.email} → ${u.id}`));

    await neon.end();

    // 2. Get all users from Supabase
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { users: supabaseUsers }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
        console.error('❌ Could not list Supabase users:', listErr.message);
        process.exit(1);
    }
    console.log(`\nFound ${supabaseUsers.length} users in Supabase:`);
    supabaseUsers.forEach(u => console.log(`  Supabase: ${u.email} → ${u.id}`));

    // 3. Build email → {oldId, newId} mapping
    const emailMap = {};
    supabaseUsers.forEach(su => {
        const neonUser = neonUsers.find(nu => nu.email.toLowerCase() === su.email.toLowerCase());
        if (neonUser) {
            emailMap[su.email] = { oldId: su.id, newId: neonUser.id };
        }
    });

    console.log('\n=== ID Mapping (OldSupabaseId → NewNeonId) ===');
    const mappings = Object.entries(emailMap);
    if (mappings.length === 0) {
        console.log('⚠️  No matching users found between Supabase and NeonDB!');
        console.log('   Make sure the emails in both databases match exactly.');
        process.exit(1);
    }

    mappings.forEach(([email, { oldId, newId }]) => {
        if (oldId === newId) {
            console.log(`  ⏭️  ${email}: IDs already match, skipping`);
        } else {
            console.log(`  ${email}:\n    OLD: ${oldId}\n    NEW: ${newId}`);
        }
    });

    // 4. For each mapping where IDs differ, update Supabase data tables
    const toUpdate = mappings.filter(([, { oldId, newId }]) => oldId !== newId);

    if (toUpdate.length === 0) {
        console.log('\n✅ All user IDs already match! No migration needed.');
        return;
    }

    console.log(`\n=== Updating ${toUpdate.length} user(s) across ${DATA_TABLES.length} tables ===`);

    for (const [email, { oldId, newId }] of toUpdate) {
        console.log(`\n--- Migrating ${email} ---`);

        for (const table of DATA_TABLES) {
            try {
                // Check if table has user_id column
                const { data, error, count } = await supabaseAdmin
                    .from(table)
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', oldId);

                if (error) {
                    // Table might not exist or have different structure
                    console.log(`  ⏭️  ${table}: skipped (${error.message})`);
                    continue;
                }

                if (count === 0) {
                    console.log(`  📭  ${table}: 0 rows to update`);
                    continue;
                }

                // Special handling for invoice_items (join via invoices)
                if (table === 'invoice_items') {
                    // invoice_items links to invoices, not directly to user_id in some schemas
                    console.log(`  ℹ️   invoice_items: checking via invoice_id join...`);
                    // Get invoice IDs for this user
                    const { data: invoices } = await supabaseAdmin
                        .from('invoices')
                        .select('id')
                        .eq('user_id', oldId);

                    if (!invoices || invoices.length === 0) {
                        console.log(`  📭  invoice_items: no parent invoices found`);
                        continue;
                    }

                    const invoiceIds = invoices.map(i => i.id);
                    const { error: iiErr, count: iiCount } = await supabaseAdmin
                        .from('invoice_items')
                        .update({ user_id: newId })
                        .in('invoice_id', invoiceIds);

                    if (iiErr && iiErr.code !== 'PGRST204') {
                        console.log(`  ⚠️   invoice_items: ${iiErr.message}`);
                    } else {
                        console.log(`  ✅  invoice_items: updated rows for ${invoiceIds.length} invoices`);
                    }
                    continue;
                }

                // Special handling for user_profiles (id = user_id)
                if (table === 'user_profiles') {
                    const { error: upErr } = await supabaseAdmin
                        .from('user_profiles')
                        .update({ id: newId })
                        .eq('id', oldId);

                    if (upErr) {
                        // Try with user_id column instead
                        const { error: upErr2 } = await supabaseAdmin
                            .from('user_profiles')
                            .update({ user_id: newId })
                            .eq('user_id', oldId);
                        if (upErr2) {
                            console.log(`  ⚠️   user_profiles: ${upErr2.message}`);
                        } else {
                            console.log(`  ✅  user_profiles: updated`);
                        }
                    } else {
                        console.log(`  ✅  user_profiles: updated id column`);
                    }
                    continue;
                }

                // Standard update for all other tables
                const { error: updateErr } = await supabaseAdmin
                    .from(table)
                    .update({ user_id: newId })
                    .eq('user_id', oldId);

                if (updateErr) {
                    console.log(`  ❌  ${table}: ${updateErr.message}`);
                } else {
                    console.log(`  ✅  ${table}: updated ${count} row(s)`);
                }
            } catch (e) {
                console.log(`  ❌  ${table}: unexpected error - ${e.message}`);
            }
        }
    }

    console.log('\n=== ✅ Migration Complete! ===');
    console.log('Please clear your browser localStorage cache and log in again.');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
