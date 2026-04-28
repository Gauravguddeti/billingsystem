// Required ENV vars: DATABASE_URL, JWT_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: { message: 'Method Not Allowed' } });
    }

    try {
        const { action, table, payload, filters, select, order, limit, single } = req.body;

        // AUTH ACTIONS
        if (action === 'signUp') {
            const { email, password } = payload;
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Generate a UUID for the new user (or let DB do it)
            // But since this is a proxy, we'll let Postgres handle id if it's default gen_random_uuid()
            // However, Supabase auth.users has specific fields. Let's assume a generic users table
            // or auth.users if they created one.
            const query = `
                INSERT INTO auth.users (email, encrypted_password, created_at)
                VALUES ($1, $2, NOW())
                RETURNING id, email
            `;
            try {
                const { rows } = await pool.query(query, [email, hashedPassword]);
                const user = rows[0];
                const token = jwt.sign({ sub: user.id, email: user.email, role: 'authenticated' }, process.env.JWT_SECRET, { expiresIn: '7d' });
                return res.status(200).json({ data: { user, session: { access_token: token, user } }, error: null });
            } catch (err) {
                // If auth schema doesn't exist, try public.users
                if (err.code === '3F000') {
                    const fallbackQuery = `INSERT INTO users (email, password, created_at) VALUES ($1, $2, NOW()) RETURNING id, email`;
                    const { rows } = await pool.query(fallbackQuery, [email, hashedPassword]);
                    const user = rows[0];
                    const token = jwt.sign({ sub: user.id, email: user.email, role: 'authenticated' }, process.env.JWT_SECRET, { expiresIn: '7d' });
                    return res.status(200).json({ data: { user, session: { access_token: token, user } }, error: null });
                }
                throw err;
            }
        }

        if (action === 'signIn') {
            const { email, password } = payload;
            // Check auth.users first, then public.users
            let user;
            try {
                const { rows } = await pool.query(`SELECT * FROM auth.users WHERE email = $1`, [email]);
                user = rows[0];
            } catch (e) {
                const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
                user = rows[0];
            }

            if (!user) {
                return res.status(400).json({ error: { message: 'Invalid credentials' }, data: null });
            }

            const isMatch = await bcrypt.compare(password, user.encrypted_password || user.password);
            if (!isMatch) {
                return res.status(400).json({ error: { message: 'Invalid credentials' }, data: null });
            }

            const token = jwt.sign({ sub: user.id, email: user.email, role: 'authenticated' }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ data: { user, session: { access_token: token, user } }, error: null });
        }

        if (action === 'resetPassword') {
            const { email, opts } = payload;
            let user;
            try {
                const { rows } = await pool.query(`SELECT * FROM auth.users WHERE email = $1`, [email]);
                user = rows[0];
            } catch (e) {
                const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
                user = rows[0];
            }

            if (!user) {
                // Return success even if user not found to prevent email enumeration
                return res.status(200).json({ data: { message: 'Password reset email sent' }, error: null });
            }

            // Generate a short-lived reset token
            const token = jwt.sign({ sub: user.id, email: user.email, role: 'authenticated' }, process.env.JWT_SECRET, { expiresIn: '15m' });
            
            const resetLink = `${opts?.redirectTo || 'http://localhost:3000/?reset=1'}&token=${token}`;
            
            // Set up Nodemailer
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 465,
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
                    subject: 'Reset Your Password',
                    text: `You requested a password reset. Click this link to set a new password: ${resetLink}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #333;">Password Reset Request</h2>
                            <p>You recently requested to reset your password for your Smart GST Billing account.</p>
                            <p>Click the button below to set a new password. This link will expire in 15 minutes.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                            </div>
                            <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                        </div>
                    `
                });
            } catch (err) {
                console.error('Email send error:', err);
                return res.status(500).json({ error: { message: 'Failed to send reset email' }, data: null });
            }

            return res.status(200).json({ data: { message: 'Password reset email sent' }, error: null });
        }

        if (action === 'updateUser') {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) return res.status(401).json({ error: { message: 'Unauthorized' } });
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const { password } = payload;
            const hashedPassword = await bcrypt.hash(password, 10);
            
            try {
                await pool.query(`UPDATE auth.users SET encrypted_password = $1 WHERE id = $2`, [hashedPassword, decoded.sub]);
            } catch (e) {
                await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashedPassword, decoded.sub]);
            }
            
            return res.status(200).json({ data: { user: decoded }, error: null });
        }

        // DB ACTIONS
        let query = '';
        let params = [];
        let paramIndex = 1;

        const buildWhere = () => {
            let whereClause = '';
            if (filters && filters.length > 0) {
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
                if (conditions.length > 0) {
                    whereClause = ' WHERE ' + conditions.join(' AND ');
                }
            }
            return whereClause;
        };

        const selectFields = select || '*';

        if (action === 'select') {
            query = `SELECT ${selectFields} FROM "${table}"`;
            query += buildWhere();

            if (order) {
                query += ` ORDER BY "${order.column}" ${order.ascending ? 'ASC' : 'DESC'}`;
            }

            if (limit) {
                query += ` LIMIT ${limit}`;
            }
        } 
        else if (action === 'insert') {
            const isArray = Array.isArray(payload);
            const items = isArray ? payload : [payload];
            if (items.length === 0) return res.status(200).json({ data: [], error: null });

            const keys = Object.keys(items[0]);
            const columns = keys.map(k => `"${k}"`).join(', ');
            
            const values = [];
            items.forEach(item => {
                const row = [];
                keys.forEach(k => {
                    params.push(item[k]);
                    row.push(`$${paramIndex++}`);
                });
                values.push(`(${row.join(', ')})`);
            });

            query = `INSERT INTO "${table}" (${columns}) VALUES ${values.join(', ')} RETURNING ${selectFields}`;
        }
        else if (action === 'update') {
            const keys = Object.keys(payload);
            const setClause = keys.map(k => {
                params.push(payload[k]);
                return `"${k}" = $${paramIndex++}`;
            }).join(', ');

            query = `UPDATE "${table}" SET ${setClause}`;
            query += buildWhere();
            query += ` RETURNING ${selectFields}`;
        }
        else if (action === 'upsert') {
            // Simplified upsert (assumes primary key conflict on 'id' if not provided)
            // or we just rely on Supabase's ON CONFLICT behavior.
            const isArray = Array.isArray(payload);
            const items = isArray ? payload : [payload];
            if (items.length === 0) return res.status(200).json({ data: [], error: null });

            const keys = Object.keys(items[0]);
            const columns = keys.map(k => `"${k}"`).join(', ');
            
            const values = [];
            items.forEach(item => {
                const row = [];
                keys.forEach(k => {
                    params.push(item[k]);
                    row.push(`$${paramIndex++}`);
                });
                values.push(`(${row.join(', ')})`);
            });

            // Extract onConflict columns if provided, else use default (e.g. id)
            // Note: In original code: supabase.from('product_rates').upsert(payload,{onConflict:'user_id,name'})
            // We should parse onConflict from the request if it exists.
            const onConflict = req.body.onConflict ? req.body.onConflict.split(',').map(c => `"${c.trim()}"`).join(', ') : '"id"';
            
            const updateSet = keys.filter(k => k !== 'id' && k !== 'created_at').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');

            query = `INSERT INTO "${table}" (${columns}) VALUES ${values.join(', ')} 
                     ON CONFLICT (${onConflict}) 
                     DO UPDATE SET ${updateSet}
                     RETURNING ${selectFields}`;
        }
        else if (action === 'delete') {
            query = `DELETE FROM "${table}"`;
            query += buildWhere();
            query += ` RETURNING ${selectFields}`;
        }

        const { rows } = await pool.query(query, params);

        let data = rows;
        if (single) {
            if (rows.length === 0) {
                return res.status(406).json({ error: { message: 'JSON object requested, multiple (or no) rows returned' }, data: null });
            }
            data = rows[0];
        }

        return res.status(200).json({ data, error: null });
    } catch (error) {
        console.error('DB Proxy Error:', error);
        return res.status(500).json({ error: { message: error.message || 'Internal Server Error' }, data: null });
    }
}
