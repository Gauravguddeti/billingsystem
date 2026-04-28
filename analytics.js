require('dotenv').config();
const { Client } = require('pg');

const NEON_URI = 'postgresql://neondb_owner:npg_iAVxdGm8g3IR@ep-withered-king-amja9v7d-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function runAnalytics() {
    const client = new Client({ connectionString: NEON_URI });
    
    try {
        await client.connect();
        
        console.log('--- USER ANALYTICS ---');
        
        // Find users with most invoices
        const invoiceQuery = `
            SELECT 
                u.email, 
                COUNT(i.id) as total_invoices,
                SUM(i.grand_total) as total_revenue
            FROM auth.users u
            LEFT JOIN invoices i ON u.id = i.user_id
            GROUP BY u.email
            ORDER BY total_invoices DESC
            LIMIT 5;
        `;
        
        const invoiceRes = await client.query(invoiceQuery);
        console.log('\nTop 5 Users by Invoices Created:');
        console.table(invoiceRes.rows);

        // Find users with most customers created
        const customerQuery = `
            SELECT 
                u.email, 
                COUNT(c.id) as total_customers
            FROM auth.users u
            LEFT JOIN customers c ON u.id = c.user_id
            GROUP BY u.email
            ORDER BY total_customers DESC
            LIMIT 5;
        `;
        
        const customerRes = await client.query(customerQuery);
        console.log('\nTop 5 Users by Customers Created:');
        console.table(customerRes.rows);
        
        // Find users with most products created
        const productQuery = `
            SELECT 
                u.email, 
                COUNT(p.id) as total_products
            FROM auth.users u
            LEFT JOIN product_rates p ON u.id = p.user_id
            GROUP BY u.email
            ORDER BY total_products DESC
            LIMIT 5;
        `;
        
        const productRes = await client.query(productQuery);
        console.log('\nTop 5 Users by Products Created:');
        console.table(productRes.rows);

    } catch (err) {
        console.error('Error running analytics:', err);
    } finally {
        await client.end();
    }
}

runAnalytics();
