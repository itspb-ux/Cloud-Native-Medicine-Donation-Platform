import { Router } from 'express';
import { pool } from '../db/pool';
import { rowsToCamel } from '../utils/caseMapper';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Get all users (Admin) — excludes password hashes
router.get('/users', authenticateToken, requireRole(['Admin']), async (_req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, phone, address, status, created_at, updated_at FROM users ORDER BY created_at DESC'
        );
        res.json(rowsToCamel(result.rows));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Approve user (Admin)
router.put('/users/:id/approve', authenticateToken, requireRole(['Admin']), async (req, res) => {
    try {
        const existing = await pool.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

        await pool.query(`UPDATE users SET status = 'Active', updated_at = now() WHERE id = $1`, [req.params.id]);
        res.json({ message: 'User approved successfully!' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Reject/delete user (Admin)
router.delete('/users/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
    try {
        const existing = await pool.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'User deleted/rejected successfully.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Expiry alert log (Admin)
router.get('/alerts', authenticateToken, requireRole(['Admin']), async (_req, res) => {
    try {
        const result = await pool.query('SELECT * FROM emails ORDER BY sent_date DESC');
        res.json(rowsToCamel(result.rows));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
