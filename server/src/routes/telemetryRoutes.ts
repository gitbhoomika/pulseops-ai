import { Router } from "express";
import { ingestTelemetry } from "../controllers/telemetryController.js";

const router = Router();

// POST /api/v1/telemetry/ingest
router.post("/ingest", ingestTelemetry);

export default router;