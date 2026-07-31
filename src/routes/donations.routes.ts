import { Router } from 'express';
import { pool } from '../db/pool';
import { rowsToCamel } from '../utils/caseMapper';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Get Donations (role-scoped)
router.get('/', authenticateToken, async (req, res) => {
    try {
        let result;
        if (req.user!.role === 'Pharmacy') {
            result = await pool.query('SELECT * FROM donations WHERE pharmacy_id = $1 ORDER BY created_at DESC', [
                req.user!.id
            ]);
        } else if (req.user!.role === 'NGO') {
            result = await pool.query('SELECT * FROM donations WHERE ngo_id = $1 ORDER BY created_at DESC', [
                req.user!.id
            ]);
        } else {
            result = await pool.query('SELECT * FROM donations ORDER BY created_at DESC');
        }
        res.json(rowsToCamel(result.rows));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Request/Accept Donation (NGO) — creates the donation record AND flips the
// medicine to Donated in a single DB transaction, so the two writes can
// never end up inconsistent with each other.
router.post('/', authenticateToken, requireRole(['NGO']), async (req, res) => {
    const { medicineId } = req.body;
    if (!medicineId) return res.status(400).json({ error: 'Medicine ID required.' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const medResult = await client.query('SELECT * FROM medicines WHERE id = $1 FOR UPDATE', [medicineId]);
        const med = medResult.rows[0];
        if (!med) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Medicine not found.' });
        }
        if (med.status === 'Donated') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Medicine has already been donated.' });
        }

        const donationResult = await client.query(
            `INSERT INTO donations (medicine_name, quantity, pharmacy_id, pharmacy_name, ngo_id, ngo_name, status, date)
             VALUES ($1, $2, $3, $4, $5, $6, 'Delivered', CURRENT_DATE) RETURNING *`,
            [med.name, med.quantity, med.pharmacy_id, med.pharmacy_name, req.user!.id, req.user!.name]
        );

        await client.query(`UPDATE medicines SET status = 'Donated', updated_at = now() WHERE id = $1`, [
            medicineId
        ]);

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Donation request accepted successfully!',
            donation: rowsToCamel(donationResult.rows)[0]
        });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Update Donation Status
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const existing = await pool.query('SELECT * FROM donations WHERE id = $1', [req.params.id]);
        const donation = existing.rows[0];
        if (!donation) return res.status(404).json({ error: 'Donation record not found.' });

        if (
            req.user!.role !== 'Admin' &&
            donation.pharmacy_id !== req.user!.id &&
            donation.ngo_id !== req.user!.id
        ) {
            return res.status(403).json({ error: 'Not authorized.' });
        }

        await pool.query('UPDATE donations SET status = $1, updated_at = now() WHERE id = $2', [
            status,
            req.params.id
        ]);
        res.json({ message: `Donation status updated to ${status}.` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
