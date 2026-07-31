// Small helper to convert Postgres snake_case rows into the camelCase shape
// the existing frontend already expects (e.g. pharmacy_id -> pharmacyId),
// so no frontend code has to change.

function snakeToCamel(key: string): string {
    return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function rowToCamel<T = any>(row: Record<string, any>): T {
    const out: Record<string, any> = {};
    for (const key of Object.keys(row)) {
        out[snakeToCamel(key)] = row[key];
    }
    return out as T;
}

export function rowsToCamel<T = any>(rows: Record<string, any>[]): T[] {
    return rows.map((r) => rowToCamel<T>(r));
}
