import fs from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const password = process.env.SUPABASE_DB_PASSWORD;
if (!projectUrl || !password) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_DB_PASSWORD are required");
const source = new URL(projectUrl);
const host = `db.${source.hostname}`;
const sql = await fs.readFile(new URL("../supabase/migrations/0001_bodyiq_initial.sql", import.meta.url), "utf8");
const pool = new Pool({
  host,
  port: 5432,
  user: "postgres",
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  max: 1,
});
try {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log(`Applied BodyIQ Supabase migration to ${host}`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
