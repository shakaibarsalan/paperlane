import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __paperlanePool: Pool | undefined;
}

export function db(): Pool {
  if (!globalThis.__paperlanePool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    globalThis.__paperlanePool = new Pool({
      connectionString,
      max: 3,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 10000,
    });
  }
  return globalThis.__paperlanePool;
}
