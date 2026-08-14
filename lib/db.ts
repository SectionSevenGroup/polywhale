import { Pool } from "pg";

let pool: Pool | undefined;

export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
  return pool;
}

export async function query<T = Record<string, unknown>>(text: string, values: unknown[] = []) {
  const result = await db().query(text, values);
  return result.rows as T[];
}
