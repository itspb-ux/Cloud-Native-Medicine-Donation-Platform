import { MedicineStatus } from '../types';

/**
 * Same rule as the prototype: within 30 days of today counts as "Near Expiry",
 * otherwise "Available". Only used when auto-deriving status from a date —
 * an explicit status (e.g. 'Donated') passed by the caller always wins.
 */
export function computeMedicineStatus(expiryDate: string): MedicineStatus {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 ? 'Near Expiry' : 'Available';
}
