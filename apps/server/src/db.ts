import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/fullstack_template";

export const sql = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20
});

export const db = drizzle(sql, { schema });
