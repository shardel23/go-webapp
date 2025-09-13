"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const prisma_1 = require("../lib/prisma");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connectDB = async () => {
    try {
        await prisma_1.prisma.$connect();
        console.log("Connected to PostgreSQL database via Prisma");
    }
    catch (err) {
        console.error("Database connection error:", err);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
exports.default = prisma_1.prisma;
//# sourceMappingURL=database.js.map