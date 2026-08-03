import { pool } from "../db/pool";

export async function waitForDatabase(
    retries = 30,
    delay = 2000
): Promise<void> {

    for (let attempt = 1; attempt <= retries; attempt++) {

        try {

            await pool.query("SELECT 1");

            console.log("✅ Connected to PostgreSQL");

            return;

        } catch {

            console.log(
                `Database not ready (${attempt}/${retries})...`
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error("Unable to connect to PostgreSQL.");
}