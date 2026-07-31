import { pool } from '../db/pool';

/**
 * Ported from the prototype's checkExpiringMedicines(): scans active
 * medicine stock, and for anything expiring within 30 days that doesn't
 * already have an alert on file, inserts a simulated email into the
 * `emails` table. The SQL does the date filter and de-dupe directly instead
 * of pulling every row into Node.
 *
 * This is the stand-in for the AWS Lambda + EventBridge job described in
 * the project plan — swap the setInterval in server.ts for that when ready.
 */
export async function checkExpiringMedicines() {
    try {
        console.log('Running automated expiry alerts check...');

        const result = await pool.query(`
            SELECT m.id, m.name, m.quantity, m.expiry_date, m.pharmacy_id, m.pharmacy_name,
                   u.email AS pharmacy_email
            FROM medicines m
            LEFT JOIN users u ON u.id = m.pharmacy_id
            LEFT JOIN emails e ON e.medicine_id = m.id
            WHERE m.status NOT IN ('Donated', 'Pending Donation')
              AND m.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
              AND e.id IS NULL
        `);

        for (const med of result.rows) {
            const recipientEmail = med.pharmacy_email || 'pharmacy@gmail.com';
            const recipientName = med.pharmacy_name || 'Pharmacy';

            console.log(
                `[ALERT] Medicine "${med.name}" is expiring on ${med.expiry_date}. Sending simulated email to ${recipientEmail}...`
            );

            await pool.query(
                `INSERT INTO emails
                    (medicine_id, medicine_name, expiry_date, pharmacy_id, pharmacy_name,
                     recipient_email, recipient_name, subject, body, sent_date)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
                [
                    med.id,
                    med.name,
                    med.expiry_date,
                    med.pharmacy_id,
                    med.pharmacy_name,
                    recipientEmail,
                    recipientName,
                    `\u26A0\uFE0F Expiry Notification: ${med.name} is expiring soon`,
                    `Dear ${recipientName},\n\nThis is an automated alert notification that your medicine stock of "${med.name}" (Qty: ${med.quantity}) will expire on ${med.expiry_date}.\n\nPlease consider marking it for donation immediately to prevent waste and help local NGOs in need.\n\nBest regards,\nMedicine Donation Platform Team`
                ]
            );
        }
    } catch (err) {
        console.error('Error running expiry check:', err);
    }
}
