import { Request, Response } from "express";
import { Incident } from "../models/Incident.js";

// GET /api/v1/incidents
export const getAllIncidents = async (req: Request, res: Response) => {
  try {
    const { status, serviceName } = req.query;
    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    }
    if (serviceName) {
      filter.serviceName = serviceName;
    }

    const incidents = await Incident.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve incidents",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

// GET /api/v1/incidents/:id
export const getIncidentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: `Incident not found with id: ${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve incident details",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};