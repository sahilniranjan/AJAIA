import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 reads connection settings from here, not schema.prisma.
// Migrations must use the direct (non-pooled) Neon URL: Prisma Migrate over PgBouncer can fail with
// "prepared statement already exists". The runtime client uses the pooled DATABASE_URL via the pg adapter.
// DATABASE_URL_UNPOOLED is the name `neon env pull` and the Vercel Neon integration use.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? "",
  },
});
