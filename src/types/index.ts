export type Role = 'Admin' | 'Pharmacy' | 'NGO';
export type UserStatus = 'Active' | 'Pending';
export type MedicineStatus = 'Available' | 'Near Expiry' | 'Pending Donation' | 'Donated';
export type DonationStatus = 'Pending' | 'Accepted' | 'Delivered' | 'Rejected';
export type WishlistStatus = 'Open' | 'Fulfilled';

export interface JwtPayload {
    id: string;
    name: string;
    email: string;
    role: Role;
}

export interface SafeUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    phone: string;
    address: string;
    status: UserStatus;
}

export interface Medicine {
    id: string;
    name: string;
    quantity: number;
    expiryDate: string;
    status: MedicineStatus;
    pharmacyId: string;
    pharmacyName: string;
}

export interface Donation {
    id: string;
    medicineName: string;
    quantity: number;
    pharmacyId: string;
    pharmacyName: string;
    ngoId: string;
    ngoName: string;
    status: DonationStatus;
    date: string;
}

export interface WishlistItem {
    id: string;
    medicineName: string;
    quantity: number;
    ngoId: string;
    ngoName: string;
    status: WishlistStatus;
    pharmacyId?: string;
    pharmacyName?: string;
    fulfilledDate?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
