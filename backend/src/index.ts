import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/db/client";
import path from "path";

async function main() {
  await migrate(db, { migrationsFolder: path.join(__dirname, "db/migrations") });
  await import("./server");
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
