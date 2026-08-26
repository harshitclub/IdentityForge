import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

/**
 * ============================================================================
 * Prisma ORM & Database Client Configuration
 * ============================================================================
 * Initializes Prisma Client backed by the `@prisma/adapter-pg` driver adapter
 * for native PostgreSQL connection pooling and high-throughput query execution.
 */

const connectionString = `${process.env.DATABASE_URL}`;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

// Instantiate pg-driver adapter with database connection string
const adapter = new PrismaPg({ connectionString });

// Instantiate single Prisma Client instance with PostgreSQL driver adapter
const prisma = new PrismaClient({ adapter });

export { prisma };
