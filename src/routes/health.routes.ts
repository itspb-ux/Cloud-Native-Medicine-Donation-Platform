import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

router.get("/", async (_req, res) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({
            status: "UP",
            database: "CONNECTED",
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({
            status: "DOWN",
            database: "DISCONNECTED",
            error: err instanceof Error ? err.message : "Unknown error"
        });
    }
});

export default router;