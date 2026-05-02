require('dotenv').config();
const { Client } = require('pg');
const nodemailer = require('nodemailer');

const NEON_URI = 'postgresql://neondb_owner:npg_iAVxdGm8g3IR@ep-withered-king-amja9v7d-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function test() {
    const client = new Client({ connectionString: NEON_URI });
    await client.connect();

    console.log('Checking if user exists...');
    const res = await client.query('SELECT email FROM auth.users WHERE email = $1', ['amolguddeti3178@gmail.com']);
    console.log('User in auth.users:', res.rows.length > 0 ? 'YES' : 'NO');
    if (res.rows.length === 0) {
        const res2 = await client.query('SELECT email FROM users WHERE email = $1', ['amolguddeti3178@gmail.com']).catch(() => ({rows:[]}));
        console.log('User in public.users:', res2.rows.length > 0 ? 'YES' : 'NO');
    }

    await client.end();

    console.log('Testing SMTP connection...');
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'guddetigaurav1@gmail.com',
            pass: 'thalbfyekohrelnc'
        }
    });

    try {
        await transporter.verify();
        console.log('SMTP Verified successfully!');
        
        console.log('Sending test email to guddetigaurav1@gmail.com...');
        await transporter.sendMail({
            from: '"Smart GST Billing" <guddetigaurav1@gmail.com>',
            to: 'guddetigaurav1@gmail.com',
            subject: 'Test Email',
            text: 'This is a test from the backend.'
        });
        console.log('Test email sent successfully!');
    } catch (e) {
        console.error('SMTP Error:', e);
    }
}

test();
