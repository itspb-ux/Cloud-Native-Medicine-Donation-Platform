import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool';
import { rowToCamel } from '../utils/caseMapper';
import { authenticateToken, JWT_SECRET } from '../middleware/auth';

const router = Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const registerSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['Admin', 'Pharmacy', 'NGO']),
    phone: z.string().optional(),
    address: z.string().optional()
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

// Register
router.post('/register', async (req, res) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Please enter all required fields.' });
        }
        const { name, email, password, role, phone, address } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        // Admins are active immediately, pharmacies/NGOs require admin approval
        const status = role === 'Admin' ? 'Active' : 'Pending';

        const result = await pool.query(
            `INSERT INTO users (name, email, password, role, phone, address, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING status`,
            [name, normalizedEmail, hashedPassword, role, phone || '', address || '', status]
        );

        res.status(201).json({
            message: role === 'Admin' ? 'Registration successful.' : 'Registration successful! Awaiting Admin approval.',
            status: result.rows[0].status
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Please fill in all fields.' });
        }
        const { email, password } = parsed.data;

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
        const user = result.rows[0];
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        if (user.status === 'Pending') {
            return res.status(403).json({ error: 'Your account is pending approval by the Admin.' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address
            }
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const { password, ...safe } = rowToCamel<any>(user);
        res.json(safe);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        await pool.query(
            `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone),
             address = COALESCE($3, address), updated_at = now() WHERE id = $4`,
            [name, phone, address, req.user!.id]
        );
        res.json({ message: 'Profile updated successfully.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
