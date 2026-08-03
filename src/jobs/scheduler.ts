import { checkExpiringMedicines } from "./expiryAlerts";

export function startScheduler() {
    console.log("Starting expiry alert scheduler...");

    checkExpiringMedicines();

    const interval =
        Number(process.env.EXPIRY_CHECK_INTERVAL_MS) || 3600000;

    setInterval(checkExpiringMedicines, interval);
}