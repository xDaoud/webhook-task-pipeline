import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

/**
 * Verifies the database is reachable before the app starts accepting traffic.
 * Retries with a fixed delay to handle slow container startup ordering in Docker Compose.
 */
async function connectWithRetry(retries = 5, delay = 3000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      // Borrow and immediately return a connection to confirm the pool can reach the DB
      const client = await pool.connect();
      client.release();
      console.log("Database connected successfully");
      return;
    } catch (error) {
      console.log(
        `Database connection attempt ${i + 1} failed: ${error instanceof Error ? error.message : "Unknown error"}, retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Failed to connect to database after multiple retries");
}

export { connectWithRetry };

export const db = drizzle(pool, { schema });
