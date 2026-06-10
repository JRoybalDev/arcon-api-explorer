import { defineConfig } from "drizzle-kit";
import { loadRootEnv } from "./src/loadEnv";

loadRootEnv();

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/fullstack_template"
  }
});
