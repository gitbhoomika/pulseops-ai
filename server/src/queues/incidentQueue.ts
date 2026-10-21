import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export interface IncidentJobData {
  incidentId: string;
}

export const incidentQueue = new Queue<IncidentJobData>("incident-processing", {
  connection: redisConnection,
});