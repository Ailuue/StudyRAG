import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "./client";

async function main() {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  await db.query(sql);
  console.log("Migration complete");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
