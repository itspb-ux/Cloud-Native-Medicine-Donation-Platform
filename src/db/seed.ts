import { seedDatabase } from "./seedDatabase";
import { pool } from "./pool";

seedDatabase()
    .then(async () => {
        await pool.end();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error(err);
        await pool.end();
        process.exit(1);
    });