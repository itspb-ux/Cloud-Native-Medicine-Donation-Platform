import { Router } from 'express';
import { pool } from '../db/pool';
import { rowsToCamel } from '../utils/caseMapper';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Get Wishlist
router.get('/', authenticateToken, async (_req, res) => {
    try {
        const result = await pool.query('SELECT * FROM wishlist ORDER BY created_at DESC');
        res.json(rowsToCamel(result.rows));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Post Wishlist Request (NGO)
router.post('/', authenticateToken, requireRole(['NGO']), async (req, res) => {
    try {
        const { medicineName, quantity } = req.body;
        if (!medicineName || !quantity) {
            return res.status(400).json({ error: 'Please enter all fields.' });
        }

        const result = await pool.query(
            `INSERT INTO wishlist (medicine_name, quantity, ngo_id, ngo_name, status)
             VALUES ($1, $2, $3, $4, 'Open') RETURNING *`,
            [medicineName, parseInt(quantity, 10), req.user!.id, req.user!.name]
        );

        res.status(201).json(rowsToCamel(result.rows)[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Fulfill Wishlist Request (Pharmacy) — creates a donation record and marks
// the wishlist item Fulfilled in a single DB transaction.
router.post('/:id/fulfill', authenticateToken, requireRole(['Pharmacy']), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const itemResult = await client.query('SELECT * FROM wishlist WHERE id = $1 FOR UPDATE', [req.params.id]);
        const item = itemResult.rows[0];
        if (!item) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Wishlist request not found.' });
        }
        if (item.status === 'Fulfilled') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'This request has already been fulfilled.' });
        }

        const donationResult = await client.query(
            `INSERT INTO donations (medicine_name, quantity, pharmacy_id, pharmacy_name, ngo_id, ngo_name, status, date)
             VALUES ($1, $2, $3, $4, $5, $6, 'Delivered', CURRENT_DATE) RETURNING *`,
            [item.medicine_name, item.quantity, req.user!.id, req.user!.name, item.ngo_id, item.ngo_name]
        );

        await client.query(
            `UPDATE wishlist SET status = 'Fulfilled', pharmacy_id = $1, pharmacy_name = $2,
             fulfilled_date = CURRENT_DATE, updated_at = now() WHERE id = $3`,
            [req.user!.id, req.user!.name, req.params.id]
        );

        await client.query('COMMIT');

        res.json({ message: 'Request fulfilled successfully!', donation: rowsToCamel(donationResult.rows)[0] });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

export default router;
