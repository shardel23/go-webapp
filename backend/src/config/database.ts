import { prisma } from "../lib/prisma";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL database via Prisma");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
};

export default prisma;
