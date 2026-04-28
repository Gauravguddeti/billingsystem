// api/db.js — NeonDB Proxy (Production-hardened)
// Required ENV vars: DATABASE_URL, JWT_SECRET, GMAIL_EMAIL, GMAIL_APP_PASSWORD

import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs'; // Pure-JS, no native deps
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { randomInt } from 'crypto'; // Cryptographically secure RNG

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Allowed tables — prevents SQL injection via table-name manipulation
const ALLOWED_TABLES = new Set([
    'invoices', 'invoice_items', 'customers',
    'product_rates', 'categories', 'user_profiles'
]);

// Allowed columns per table for filter operations
const ALLOWED_COLUMNS = {
    invoices:       ['id', 'user_id', 'invoice_number', 'date', 'category_id', 'payment_status', 'created_at'],
    invoice_items:  ['id', 'invoice_id', 'item_name'],
    customers:      ['id', 'user_id', 'name'],
    product_rates:  ['id', 'user_id', 'name', 'category_id'],
    categories:     ['id', 'user_id', 'name'],
    user_profiles:  ['id', 'user_id'],
};

// Generic sanitized error (never expose raw DB errors to client)
const dbError = (res, msg = 'Database operation failed') =>
    res.status(500).json({ error: { message: msg }, data: null });

// Extract and verify JWT from Authorization header
function getAuthUser(req) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return null;
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
}

export default async function handler(req, res) {
    // CORS preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: { message: 'Method Not Allowed' } });
    }

    try {
        const { action, table, payload, filters, select, order, limit, single } = req.body;

        // ── AUTH ACTIONS (no JWT required) ───────────────────────────────

        if (action === 'signUp') {
            const { email, password } = payload;
            if (!email || !password || password.length < 6) {
                return res.status(400).json({ error: { message: 'Email and password (min 6 chars) required' }, data: null });
            }
            const hashedPassword = await bcrypt.hash(password, 12);
            try {
                const { rows } = await pool.query(
                    `INSERT INTO auth.users (email, encrypted_password, created_at)
                     VALUES ($1, $2, NOW()) RETURNING id, email`,
                    [email.toLowerCase().trim(), hashedPassword]
                );
                const user = rows[0];
                const token = jwt.sign({ sub: user.id, email: user.email, role: 'authenticated' }, process.env.JWT_SECRET, { expiresIn: '7d' });
                return res.status(200).json({ data: { user, session: { access_token: token, user } }, error: null });
            } catch (err) {
                // Duplicate email (Postgres unique violation)
                if (err.code === '23505') {
                    return res.status(409).json({ error: { message: 'Email already registered. Please log in.' }, data: null });
                }
                throw err;
            }
        }

        if (action === 'signIn') {
            const { email, password } = payload;
            if (!email || !password) {
                return res.status(400).json({ error: { message: 'Email and password required' }, data: null });
            }
            const { rows } = await pool.query(`SELECT * FROM auth.users WHERE email = $1`, [email.toLowerCase().trim()]);
            const user = rows[0];
            if (!user) {
                return res.status(401).json({ error: { message: 'Invalid email or password' }, data: null });
            }
            const isMatch = await bcrypt.compare(password, user.encrypted_password);
            if (!isMatch) {
                return res.status(401).json({ error: { message: 'Invalid email or password' }, data: null });
            }
            const token = jwt.sign({ sub: user.id, email: user.email, role: 'authenticated' }, process.env.JWT_SECRET, { expiresIn: '7d' });
            const safeUser = { id: user.id, email: user.email };
            return res.status(200).json({ data: { user: safeUser, session: { access_token: token, user: safeUser } }, error: null });
        }

        if (action === 'sendOTP') {
            const { email } = payload;
            if (!email) return res.status(400).json({ error: { message: 'Email required' }, data: null });

            const { rows } = await pool.query(`SELECT id, email FROM auth.users WHERE email = $1`, [email.toLowerCase().trim()]);
            const user = rows[0];
            if (!user) {
                return res.status(404).json({ error: { message: 'No account found with that email. Please sign up.' }, data: null });
            }

            // Cryptographically secure 6-digit OTP
            const otp = randomInt(100000, 1000000).toString();
            const otpHash = await bcrypt.hash(otp, 10);
            const otpToken = jwt.sign({ sub: user.id, email: user.email, otpHash }, process.env.JWT_SECRET, { expiresIn: '15m' });

            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT) || 465,
                secure: true,
                auth: {
                    user: process.env.GMAIL_EMAIL || process.env.SMTP_USER,
                    pass: process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS
                }
            });

            try {
                await transporter.sendMail({
                    from: `"Smart GST Billing" <${process.env.GMAIL_EMAIL || process.env.SMTP_USER}>`,
                    to: email,
                    subject: 'Your Password Reset OTP',
                    text: `Your OTP is: ${otp}. Expires in 15 minutes.`,
                    html: `
                        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
                            <h2 style="color:#4f46e5;margin-bottom:8px;">Password Reset</h2>
                            <p style="color:#374151;">Your one-time password (OTP) is:</p>
                            <div style="text-align:center;margin:28px 0;">
                                <span style="background:#f3f4f6;color:#111827;padding:16px 32px;border-radius:8px;font-size:28px;font-weight:700;letter-spacing:8px;">${otp}</span>
                            </div>
                            <p style="color:#6b7280;font-size:14px;">This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
                        </div>`
                });
            } catch (err) {
                console.error('[OTP] Email send error:', err.message);
                return res.status(500).json({ error: { message: 'Failed to send OTP email. Please try again.' }, data: null });
            }

            return res.status(200).json({ data: { otpToken, message: 'OTP sent successfully' }, error: null });
        }

        if (action === 'verifyOTP') {
            const { email, otp, otpToken } = payload;
            if (!otpToken || !otp || !email) {
                return res.status(400).json({ error: { message: 'Missing parameters' }, data: null });
            }
            let decoded;
            try {
                decoded = jwt.verify(otpToken, process.env.JWT_SECRET);
            } catch {
                return res.status(401).json({ error: { message: 'OTP expired. Please request a new one.' }, data: null });
            }
            if (decoded.email.toLowerCase() !== email.toLowerCase()) {
                return res.status(401).json({ error: { message: 'Invalid OTP request' }, data: null });
            }
            const isMatch = await bcrypt.compare(otp, decoded.otpHash);
            if (!isMatch) {
                return res.status(401).json({ error: { message: 'Incorrect OTP. Please check and try again.' }, data: null });
            }
            const verifiedToken = jwt.sign(
                { sub: decoded.sub, email: decoded.email, canResetPassword: true },
                process.env.JWT_SECRET,
                { expiresIn: '10m' }
            );
            return res.status(200).json({ data: { verifiedToken, message: 'OTP verified' }, error: null });
        }

        if (action === 'updatePasswordWithToken') {
            const { verifiedToken, newPassword } = payload;
            if (!verifiedToken || !newPassword) {
                return res.status(400).json({ error: { message: 'Missing parameters' }, data: null });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ error: { message: 'Password must be at least 6 characters' }, data: null });
            }
            let decoded;
            try {
                decoded = jwt.verify(verifiedToken, process.env.JWT_SECRET);
            } catch {
                return res.status(401).json({ error: { message: 'Session expired. Please restart the reset process.' }, data: null });
            }
            if (!decoded.canResetPassword) {
                return res.status(403).json({ error: { message: 'Unauthorized action' }, data: null });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            const { rowCount } = await pool.query(
                `UPDATE auth.users SET encrypted_password = $1 WHERE id = $2`,
                [hashedPassword, decoded.sub]
            );
            if (rowCount === 0) {
                return res.status(404).json({ error: { message: 'User not found' }, data: null });
            }
            return res.status(200).json({ data: { message: 'Password updated successfully' }, error: null });
        }

        if (action === 'updateUser') {
            const authUser = getAuthUser(req);
            if (!authUser) return res.status(401).json({ error: { message: 'Unauthorized' }, data: null });
            const { password } = payload;
            if (!password || password.length < 6) {
                return res.status(400).json({ error: { message: 'Password must be at least 6 characters' }, data: null });
            }
            const hashedPassword = await bcrypt.hash(password, 12);
            await pool.query(
                `UPDATE auth.users SET encrypted_password = $1 WHERE id = $2`,
                [hashedPassword, authUser.sub]
            );
            return res.status(200).json({ data: { user: { id: authUser.sub, email: authUser.email } }, error: null });
        }

        // ── DATA ACTIONS (JWT required) ───────────────────────────────────

        const authUser = getAuthUser(req);
        if (!authUser) {
            return res.status(401).json({ error: { message: 'Unauthorized. Please log in.' }, data: null });
        }

        // Validate table name against whitelist
        if (!table || !ALLOWED_TABLES.has(table)) {
            return res.status(400).json({ error: { message: 'Invalid table' }, data: null });
        }

        // Validate filter columns against whitelist
        if (filters && Array.isArray(filters)) {
            const allowed = ALLOWED_COLUMNS[table] || [];
            for (const f of filters) {
                if (!allowed.includes(f.column)) {
                    return res.status(400).json({ error: { message: `Invalid filter column: ${f.column}` }, data: null });
                }
            }
        }

        let query = '';
        let params = [];
        let paramIndex = 1;

        const buildWhere = () => {
            if (!filters || filters.length === 0) return '';
            const conditions = filters.map(f => {
                if (f.type === 'eq') {
                    params.push(f.value);
                    return `"${f.column}" = $${paramIndex++}`;
                } else if (f.type === 'in') {
                    params.push(f.value);
                    return `"${f.column}" = ANY($${paramIndex++})`;
                }
                return '';
            }).filter(Boolean);
            return conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
        };

        // Sanitize select — never allow * categories(*) or subquery syntax
        const safeSelect = (select && /^[\w\s,*]+$/.test(select)) ? select : '*';

        if (action === 'select') {
            query = `SELECT ${safeSelect} FROM "${table}"`;
            query += buildWhere();
            if (order && ALLOWED_COLUMNS[table]?.includes(order.column)) {
                query += ` ORDER BY "${order.column}" ${order.ascending ? 'ASC' : 'DESC'}`;
            }
            if (limit && Number.isInteger(Number(limit))) {
                query += ` LIMIT ${Number(limit)}`;
            }
        } else if (action === 'insert') {
            const items = Array.isArray(payload) ? payload : [payload];
            if (items.length === 0) return res.status(200).json({ data: [], error: null });
            const keys = Object.keys(items[0]);
            const columns = keys.map(k => `"${k}"`).join(', ');
            const values = [];
            items.forEach(item => {
                const row = [];
                keys.forEach(k => { params.push(item[k]); row.push(`$${paramIndex++}`); });
                values.push(`(${row.join(', ')})`);
            });
            query = `INSERT INTO "${table}" (${columns}) VALUES ${values.join(', ')} RETURNING ${safeSelect}`;
        } else if (action === 'update') {
            const keys = Object.keys(payload);
            const setClause = keys.map(k => { params.push(payload[k]); return `"${k}" = $${paramIndex++}`; }).join(', ');
            query = `UPDATE "${table}" SET ${setClause}${buildWhere()} RETURNING ${safeSelect}`;
        } else if (action === 'upsert') {
            const items = Array.isArray(payload) ? payload : [payload];
            if (items.length === 0) return res.status(200).json({ data: [], error: null });
            const keys = Object.keys(items[0]);
            const columns = keys.map(k => `"${k}"`).join(', ');
            const values = [];
            items.forEach(item => {
                const row = [];
                keys.forEach(k => { params.push(item[k]); row.push(`$${paramIndex++}`); });
                values.push(`(${row.join(', ')})`);
            });
            const conflictCols = req.body.onConflict
                ? req.body.onConflict.split(',').map(c => `"${c.trim()}"`).join(', ')
                : '"id"';
            const updateSet = keys
                .filter(k => k !== 'id' && k !== 'created_at')
                .map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
            query = `INSERT INTO "${table}" (${columns}) VALUES ${values.join(', ')}
                     ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateSet}
                     RETURNING ${safeSelect}`;
        } else if (action === 'delete') {
            query = `DELETE FROM "${table}"${buildWhere()} RETURNING ${safeSelect}`;
        } else {
            return res.status(400).json({ error: { message: 'Unknown action' }, data: null });
        }

        const { rows } = await pool.query(query, params);
        const data = single ? (rows[0] ?? null) : rows;

        if (single && !rows[0]) {
            return res.status(406).json({ error: { message: 'No rows found' }, data: null });
        }

        return res.status(200).json({ data, error: null });

    } catch (error) {
        // Log full error server-side but return sanitized message to client
        console.error('[db.js] Error:', error.message, error.code);
        return dbError(res);
    }
}
