import { Router } from 'express';
import { pool } from '../db/pool';
import { rowsToCamel } from '../utils/caseMapper';
import { authenticateToken, requireRole } from '../middleware/auth';
import { computeMedicineStatus } from '../utils/expiry';

const router = Router();

// Get Medicines (role-scoped, same as prototype)
router.get('/', authenticateToken, async (req, res) => {
    try {
        let result;
        if (req.user!.role === 'Pharmacy') {
            result = await pool.query('SELECT * FROM medicines WHERE pharmacy_id = $1 ORDER BY created_at DESC', [
                req.user!.id
            ]);
        } else if (req.user!.role === 'NGO') {
            result = await pool.query(
                `SELECT * FROM medicines WHERE status IN ('Available', 'Near Expiry') ORDER BY expiry_date ASC`
            );
        } else {
            // Admin
            result = await pool.query('SELECT * FROM medicines ORDER BY created_at DESC');
        }
        res.json(rowsToCamel(result.rows));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Add Medicine (Pharmacy)
router.post('/', authenticateToken, requireRole(['Pharmacy']), async (req, res) => {
    try {
        const { name, quantity, expiryDate } = req.body;
        if (!name || !quantity || !expiryDate) {
            return res.status(400).json({ error: 'Please enter all fields.' });
        }

        const status = computeMedicineStatus(expiryDate);

        const result = await pool.query(
            `INSERT INTO medicines (name, quantity, expiry_date, status, pharmacy_id, pharmacy_name)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, parseInt(quantity, 10), expiryDate, status, req.user!.id, req.user!.name]
        );

        res.status(201).json(rowsToCamel(result.rows)[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update Medicine (Pharmacy — must own it)
router.put('/:id', authenticateToken, requireRole(['Pharmacy']), async (req, res) => {
    try {
        const { name, quantity, expiryDate, status } = req.body;

        const existing = await pool.query('SELECT * FROM medicines WHERE id = $1', [req.params.id]);
        const med = existing.rows[0];
        if (!med) return res.status(404).json({ error: 'Medicine not found.' });
        if (med.pharmacy_id !== req.user!.id) {
            return res.status(403).json({ error: 'Not authorized to modify this medicine.' });
        }

        const nextExpiryDate = expiryDate || med.expiry_date;
        const nextStatus = status || (expiryDate ? computeMedicineStatus(expiryDate) : med.status);

        const result = await pool.query(
            `UPDATE medicines SET
                name = COALESCE($1, name),
                quantity = COALESCE($2, quantity),
                expiry_date = $3,
                status = $4,
                updated_at = now()
             WHERE id = $5 RETURNING *`,
            [name, quantity ? parseInt(quantity, 10) : null, nextExpiryDate, nextStatus, req.params.id]
        );

        res.json({ message: 'Medicine updated successfully.', medicine: rowsToCamel(result.rows)[0] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Mark medicine for donation (Pharmacy)
router.post('/:id/donate', authenticateToken, requireRole(['Pharmacy']), async (req, res) => {
    try {
        const existing = await pool.query('SELECT * FROM medicines WHERE id = $1', [req.params.id]);
        const med = existing.rows[0];
        if (!med) return res.status(404).json({ error: 'Medicine not found.' });
        if (med.pharmacy_id !== req.user!.id) {
            return res.status(403).json({ error: 'Not authorized.' });
        }

        await pool.query(`UPDATE medicines SET status = 'Pending Donation', updated_at = now() WHERE id = $1`, [
            req.params.id
        ]);
        res.json({ message: 'Medicine marked for donation successfully!' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Medicine (Pharmacy — own only, or Admin)
router.delete('/:id', authenticateToken, requireRole(['Pharmacy', 'Admin']), async (req, res) => {
    try {
        const existing = await pool.query('SELECT * FROM medicines WHERE id = $1', [req.params.id]);
        const med = existing.rows[0];
        if (!med) return res.status(404).json({ error: 'Medicine not found.' });

        if (req.user!.role === 'Pharmacy' && med.pharmacy_id !== req.user!.id) {
            return res.status(403).json({ error: 'Not authorized.' });
        }

        await pool.query('DELETE FROM medicines WHERE id = $1', [req.params.id]);
        res.json({ message: 'Medicine deleted successfully.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
