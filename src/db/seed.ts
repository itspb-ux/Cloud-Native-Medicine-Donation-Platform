import bcrypt from 'bcryptjs';
import { pool } from './pool';

/**
 * Mirrors seedDatabase() from the original server.js — same users,
 * medicines, donations and wishlist entries — so the frontend behaves
 * identically to the prototype. Run with: npm run db:seed
 * Safe to re-run: skips seeding if users already exist.
 */
async function seed() {
    const client = await pool.connect();
    try {
        const existing = await client.query('SELECT id FROM users LIMIT 1');
        if (existing.rows.length > 0) {
            console.log('Users already exist — skipping seed. (Drop the tables first if you want to reseed.)');
            return;
        }

        console.log('Seeding initial database...');
        await client.query('BEGIN');

        // Passwords: admin123, pharmacy123, ngo123
        const adminPassword = await bcrypt.hash('admin123', 10);
        const pharmacyPassword = await bcrypt.hash('pharmacy123', 10);
        const ngoPassword = await bcrypt.hash('ngo123', 10);

        const insertUser = async (row: {
            name: string;
            email: string;
            password: string;
            role: string;
            phone: string;
            address: string;
            status: string;
        }) => {
            const r = await client.query(
                `INSERT INTO users (name, email, password, role, phone, address, status)
                 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name`,
                [row.name, row.email, row.password, row.role, row.phone, row.address, row.status]
            );
            return r.rows[0] as { id: string; name: string };
        };

        const admin = await insertUser({
            name: 'System Admin',
            email: 'admin@gmail.com',
            password: adminPassword,
            role: 'Admin',
            phone: '+91 9999999999',
            address: 'Mumbai, Maharashtra',
            status: 'Active'
        });
        void admin;

        const ph1 = await insertUser({
            name: 'City Care Pharmacy',
            email: 'citycare@gmail.com',
            password: pharmacyPassword,
            role: 'Pharmacy',
            phone: '+91 9876543210',
            address: 'Mumbai, Maharashtra',
            status: 'Active'
        });

        const ph2 = await insertUser({
            name: 'Health Plus Pharmacy',
            email: 'healthplus@gmail.com',
            password: pharmacyPassword,
            role: 'Pharmacy',
            phone: '+91 8765432109',
            address: 'Pune, Maharashtra',
            status: 'Active'
        });

        await insertUser({
            name: 'ABC Pharmacy',
            email: 'abcpharmacy@gmail.com',
            password: pharmacyPassword,
            role: 'Pharmacy',
            phone: '+91 7654321098',
            address: 'Thane, Maharashtra',
            status: 'Active'
        });

        const ngo1 = await insertUser({
            name: 'Helping Hands NGO',
            email: 'helpinghands@gmail.com',
            password: ngoPassword,
            role: 'NGO',
            phone: '+91 9555555555',
            address: 'Mumbai, Maharashtra',
            status: 'Active'
        });

        const ngo2 = await insertUser({
            name: 'Smile Foundation',
            email: 'smile@gmail.com',
            password: ngoPassword,
            role: 'NGO',
            phone: '+91 9444444444',
            address: 'Pune, Maharashtra',
            status: 'Active'
        });

        const ngo3 = await insertUser({
            name: 'Care Trust',
            email: 'caretrust@gmail.com',
            password: ngoPassword,
            role: 'NGO',
            phone: '+91 9333333333',
            address: 'Navi Mumbai, Maharashtra',
            status: 'Pending'
        });

        // Medicines — Near Expiry = within 30 days
        const today = new Date();
        const toISODate = (daysFromNow: number) =>
            new Date(today.getTime() + daysFromNow * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const insertMedicine = async (row: {
            name: string;
            quantity: number;
            expiryDate: string;
            status: string;
            pharmacyId: string;
            pharmacyName: string;
        }) => {
            await client.query(
                `INSERT INTO medicines (name, quantity, expiry_date, status, pharmacy_id, pharmacy_name)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [row.name, row.quantity, row.expiryDate, row.status, row.pharmacyId, row.pharmacyName]
            );
        };

        await insertMedicine({
            name: 'Paracetamol',
            quantity: 120,
            expiryDate: toISODate(10),
            status: 'Near Expiry',
            pharmacyId: ph1.id,
            pharmacyName: ph1.name
        });

        await insertMedicine({
            name: 'Vitamin C',
            quantity: 90,
            expiryDate: toISODate(60),
            status: 'Available',
            pharmacyId: ph1.id,
            pharmacyName: ph1.name
        });

        await insertMedicine({
            name: 'Ibuprofen',
            quantity: 60,
            expiryDate: toISODate(18),
            status: 'Near Expiry',
            pharmacyId: ph2.id,
            pharmacyName: ph2.name
        });

        await insertMedicine({
            name: 'Amoxicillin',
            quantity: 150,
            expiryDate: toISODate(120),
            status: 'Available',
            pharmacyId: ph2.id,
            pharmacyName: ph2.name
        });

        // Donations
        const insertDonation = async (row: {
            medicineName: string;
            quantity: number;
            pharmacyId: string;
            pharmacyName: string;
            ngoId: string;
            ngoName: string;
            status: string;
            date: string;
        }) => {
            await client.query(
                `INSERT INTO donations (medicine_name, quantity, pharmacy_id, pharmacy_name, ngo_id, ngo_name, status, date)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [row.medicineName, row.quantity, row.pharmacyId, row.pharmacyName, row.ngoId, row.ngoName, row.status, row.date]
            );
        };

        await insertDonation({
            medicineName: 'Paracetamol',
            quantity: 100,
            pharmacyId: ph1.id,
            pharmacyName: ph1.name,
            ngoId: ngo1.id,
            ngoName: ngo1.name,
            status: 'Delivered',
            date: '2026-07-10'
        });

        await insertDonation({
            medicineName: 'Vitamin C',
            quantity: 80,
            pharmacyId: ph2.id,
            pharmacyName: ph2.name,
            ngoId: ngo2.id,
            ngoName: ngo2.name,
            status: 'Delivered',
            date: '2026-07-12'
        });

        await insertDonation({
            medicineName: 'Insulin',
            quantity: 35,
            pharmacyId: ph2.id,
            pharmacyName: ph2.name,
            ngoId: ngo3.id,
            ngoName: ngo3.name,
            status: 'Pending',
            date: '2026-07-15'
        });

        // Wishlist
        await client.query(
            `INSERT INTO wishlist (medicine_name, quantity, ngo_id, ngo_name, status)
             VALUES ($1,$2,$3,$4,'Open')`,
            ['Paracetamol', 50, ngo1.id, ngo1.name]
        );

        await client.query(
            `INSERT INTO wishlist (medicine_name, quantity, ngo_id, ngo_name, status)
             VALUES ($1,$2,$3,$4,'Open')`,
            ['Vitamin C', 30, ngo2.id, ngo2.name]
        );

        await client.query(
            `INSERT INTO wishlist
                (medicine_name, quantity, ngo_id, ngo_name, status, pharmacy_id, pharmacy_name, fulfilled_date)
             VALUES ($1,$2,$3,$4,'Fulfilled',$5,$6,$7)`,
            ['Ibuprofen', 40, ngo2.id, ngo2.name, ph1.id, ph1.name, '2026-07-28']
        );

        await client.query('COMMIT');
        console.log('Database seeded successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding database:', err);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
