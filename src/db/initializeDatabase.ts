import { pool } from "./pool";
import { seedDatabase } from "./seedDatabase";

export async function initializeDatabase() {

    const result = await pool.query(
        "SELECT COUNT(*) FROM users"
    );

    const count = Number(result.rows[0].count);

    if (count === 0) {

        console.log("🌱 Empty database detected.");

        console.log("Running initial seed...");

        await seedDatabase();

        console.log("Database initialized.");

    } else {

        console.log("Database already initialized.");

    }

}