import { Request, Response } from "express";
import { z } from "zod";
import { Incident } from "../models/Incident.js";
import { incidentQueue } from "../queues/incidentQueue.js";
import { emitIncidentUpdate } from "../config/socket.js";
export const telemetryPayloadSchema = z.object({
  serviceName: z.string().min(1, "serviceName is required"),
  errorMessage: z.string().min(1, "errorMessage is required"),
  stackTrace: z.string().min(1, "stackTrace is required"),
});

export const ingestTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = telemetryPayloadSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: "Invalid telemetry payload",
        details: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { serviceName, errorMessage, stackTrace } = validationResult.data;

    const newIncident = new Incident({
      serviceName,
      errorMessage,
      stackTrace,
      status: "INGESTED",
    });

    const savedIncident = await newIncident.save();
    emitIncidentUpdate("incident:created", savedIncident);
    await incidentQueue.add("process-incident", {
      incidentId: savedIncident._id.toString(),
    });

    res.status(202).json({
      message: "Telemetry ingested and queued for analysis",
      incidentId: savedIncident._id,
      status: savedIncident.status,
    });
  } catch (error) {
    console.error("Error ingesting telemetry:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};