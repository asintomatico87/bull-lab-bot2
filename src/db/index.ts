import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

// La connessione non deve far fallire la BUILD quando la variabile manca:
// su Vercel le variabili sono disponibili, ma in fase di build o in ambienti
// di anteprima può capitare che non lo siano. In quel caso usiamo un segnaposto
// e le query falliscono a runtime con un messaggio chiaro (health -> ok:false),
// invece di bloccare la compilazione.
const connectionString =
  databaseUrl ?? "postgresql://missing:missing@127.0.0.1:5432/missing";

if (!databaseUrl && process.env.NODE_ENV === "production") {
  console.warn(
    "[Bull Lab] DATABASE_URL non impostata: il database non sarà raggiungibile finché non aggiungi la variabile d'ambiente."
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString,
    // Evita attese infinite quando l'host non esiste (es. segnaposto)
    connectionTimeoutMillis: 12000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);

/** true se la variabile d'ambiente del database è configurata */
export const isDatabaseConfigured = Boolean(databaseUrl);
