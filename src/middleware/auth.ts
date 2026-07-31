import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, Role } from '../types';

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
    // Fail fast at boot rather than silently signing tokens with `undefined`.
    throw new Error('JWT_SECRET is not set. Add it to your .env file.');
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Please log in.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Session expired. Please log in again.' });
        }
        req.user = decoded as JwtPayload;
        next();
    });
}

export function requireRole(roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
}

export { JWT_SECRET };
