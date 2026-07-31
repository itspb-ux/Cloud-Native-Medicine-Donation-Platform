import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import medicinesRoutes from './routes/medicines.routes';
import donationsRoutes from './routes/donations.routes';
import wishlistRoutes from './routes/wishlist.routes';
import adminRoutes from './routes/admin.routes';
import reportsRoutes from './routes/reports.routes';
import { checkExpiringMedicines } from './jobs/expiryAlerts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json());

// Static frontend files — same folder the prototype served, unchanged.
const FRONTEND_PATH = process.env.FRONTEND_PATH
    ? path.resolve(__dirname, '..', process.env.FRONTEND_PATH)
    : path.resolve(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_PATH));

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportsRoutes);

// Catch-all: serve index.html for any non-API route (same behavior as the
// prototype — frontend script.js handles auth redirects on protected pages).
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// Basic error handler (last resort — routes already catch/report their own errors)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);

    await checkExpiringMedicines();
    const intervalMs = process.env.EXPIRY_CHECK_INTERVAL_MS
        ? parseInt(process.env.EXPIRY_CHECK_INTERVAL_MS, 10)
        : 60 * 60 * 1000; // 1 hour, matching the prototype
    setInterval(checkExpiringMedicines, intervalMs);
});
