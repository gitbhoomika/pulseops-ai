import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined in environment variables");
}

// BullMQ requires maxRetriesPerRequest to be null for its connection
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => {
  console.log("⚡ Connected to Upstash Redis");
});

redisConnection.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});