import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// La connessione arriva da DATABASE_URL (file .env).
// Il fallback serve solo all'ambiente di sviluppo interno.
const url =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
