import fs from "node:fs/promises";
import path from "node:path";
import { db } from "../lib/db";

async function main() {
  const sql = await fs.readFile(path.join(process.cwd(), "db/schema.sql"), "utf8");
  await db().query(sql);
  console.log("Database initialized");
  await db().end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
