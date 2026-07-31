import { Pool, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// If DATABASE_URL is set, use it. Otherwise fall back to the individual
// PG* env vars (both are supported by most hosting providers / Docker setups).
export const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
              host: process.env.PGHOST,
              port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
              database: process.env.PGDATABASE,
              user: process.env.PGUSER,
              password: process.env.PGPASSWORD
          }
);

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query<T extends QueryResultRow = any>(text: string, params: any[] = []) {
    return pool.query<T>(text, params);
}
