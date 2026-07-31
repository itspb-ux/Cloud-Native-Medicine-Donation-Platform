-- Medicine Donation Platform — PostgreSQL schema
-- Mirrors the four JSON "collections" from the prototype (users, medicines,
-- donations, wishlist) plus the emails/alerts log, so the existing frontend
-- (which expects string ids and the same field names) keeps working unchanged.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(9), 'hex'),
    name         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    password     TEXT NOT NULL,
    role         TEXT NOT NULL CHECK (role IN ('Admin', 'Pharmacy', 'NGO')),
    phone        TEXT DEFAULT '',
    address      TEXT DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Active', 'Pending')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================================
-- MEDICINES (catalogue + stock combined, matching the prototype/frontend)
-- ============================================================
CREATE TABLE IF NOT EXISTS medicines (
    id             TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(9), 'hex'),
    name           TEXT NOT NULL,
    quantity       INTEGER NOT NULL CHECK (quantity >= 0),
    expiry_date    DATE NOT NULL,
    status         TEXT NOT NULL DEFAULT 'Available'
                   CHECK (status IN ('Available', 'Near Expiry', 'Pending Donation', 'Donated')),
    pharmacy_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pharmacy_name  TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_medicines_pharmacy_id ON medicines(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_medicines_status ON medicines(status);
CREATE INDEX IF NOT EXISTS idx_medicines_expiry_date ON medicines(expiry_date);

-- ============================================================
-- DONATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS donations (
    id             TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(9), 'hex'),
    medicine_name  TEXT NOT NULL,
    quantity       INTEGER NOT NULL CHECK (quantity >= 0),
    pharmacy_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pharmacy_name  TEXT NOT NULL,
    ngo_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ngo_name       TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'Pending'
                   CHECK (status IN ('Pending', 'Accepted', 'Delivered', 'Rejected')),
    date           DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_donations_pharmacy_id ON donations(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_donations_ngo_id ON donations(ngo_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);

-- ============================================================
-- WISHLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlist (
    id              TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(9), 'hex'),
    medicine_name   TEXT NOT NULL,
    quantity        INTEGER NOT NULL CHECK (quantity >= 0),
    ngo_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ngo_name        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Fulfilled')),
    pharmacy_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
    pharmacy_name   TEXT,
    fulfilled_date  DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wishlist_ngo_id ON wishlist(ngo_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_status ON wishlist(status);

-- ============================================================
-- EMAILS (expiry alert log)
-- ============================================================
CREATE TABLE IF NOT EXISTS emails (
    id               TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(9), 'hex'),
    medicine_id      TEXT REFERENCES medicines(id) ON DELETE CASCADE,
    medicine_name    TEXT NOT NULL,
    expiry_date      DATE NOT NULL,
    pharmacy_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
    pharmacy_name    TEXT,
    recipient_email  TEXT NOT NULL,
    recipient_name   TEXT,
    subject          TEXT NOT NULL,
    body             TEXT NOT NULL,
    sent_date        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_medicine_id ON emails(medicine_id);
