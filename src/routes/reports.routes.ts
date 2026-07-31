import { Router } from 'express';
import { pool } from '../db/pool';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Dashboard / reports statistics — rewritten as SQL aggregates instead of
// pulling every row into Node and filtering in memory (as the prototype did).
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user!.id;

        const [
            activePharmacies,
            activeNGOs,
            pendingUsers,
            totalDonations,
            completedDonations,
            medicinesSaved,
            ngosServed,
            pharmacyMeds,
            pharmacyNearExpiry,
            pharmacyDonated,
            pharmacyPendingDonated,
            ngoAvailableMeds,
            ngoPending,
            ngoAccepted,
            ngoRejected
        ] = await Promise.all([
            pool.query(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'Pharmacy' AND status = 'Active'`),
            pool.query(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'NGO' AND status = 'Active'`),
            pool.query(`SELECT COUNT(*)::int AS n FROM users WHERE status = 'Pending'`),
            pool.query(`SELECT COUNT(*)::int AS n FROM donations`),
            pool.query(`SELECT COUNT(*)::int AS n FROM donations WHERE status IN ('Delivered', 'Accepted')`),
            pool.query(
                `SELECT COALESCE(SUM(quantity), 0)::int AS n FROM donations WHERE status IN ('Delivered', 'Accepted')`
            ),
            pool.query(
                `SELECT COUNT(DISTINCT ngo_name)::int AS n FROM donations WHERE status IN ('Delivered', 'Accepted')`
            ),
            pool.query(`SELECT COUNT(*)::int AS n FROM medicines WHERE pharmacy_id = $1`, [userId]),
            pool.query(`SELECT COUNT(*)::int AS n FROM medicines WHERE pharmacy_id = $1 AND status = 'Near Expiry'`, [
                userId
            ]),
            pool.query(`SELECT COUNT(*)::int AS n FROM donations WHERE pharmacy_id = $1 AND status = 'Delivered'`, [
                userId
            ]),
            pool.query(`SELECT COUNT(*)::int AS n FROM donations WHERE pharmacy_id = $1 AND status = 'Pending'`, [
                userId
            ]),
            pool.query(`SELECT COUNT(*)::int AS n FROM medicines WHERE status IN ('Available', 'Near Expiry')`),
            pool.query(`SELECT COUNT(*)::int AS n FROM donations WHERE ngo_id = $1 AND status = 'Pending'`, [userId]),
            pool.query(
                `SELECT COUNT(*)::int AS n FROM donations WHERE ngo_id = $1 AND status IN ('Accepted', 'Delivered')`,
                [userId]
            ),
            pool.query(`SELECT COUNT(*)::int AS n FROM donations WHERE ngo_id = $1 AND status = 'Rejected'`, [userId])
        ]);

        res.json({
            totalPharmacies: activePharmacies.rows[0].n,
            totalNgos: activeNGOs.rows[0].n,
            totalDonations: totalDonations.rows[0].n,
            completedDonationsCount: completedDonations.rows[0].n,
            pendingApprovalsCount: pendingUsers.rows[0].n,
            medicinesSaved: medicinesSaved.rows[0].n,
            ngosServedCount: ngosServed.rows[0].n,
            activePharmaciesCount: activePharmacies.rows[0].n,

            // Pharmacy-specific helper counts
            pharmacyMedsCount: pharmacyMeds.rows[0].n,
            pharmacyNearExpiryCount: pharmacyNearExpiry.rows[0].n,
            pharmacyDonatedCount: pharmacyDonated.rows[0].n,
            pharmacyPendingDonatedCount: pharmacyPendingDonated.rows[0].n,

            // NGO-specific helper counts
            ngoAvailableMedsCount: ngoAvailableMeds.rows[0].n,
            ngoPendingCount: ngoPending.rows[0].n,
            ngoAcceptedCount: ngoAccepted.rows[0].n,
            ngoRejectedCount: ngoRejected.rows[0].n
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
