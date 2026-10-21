import { Router } from "express";
import {
  getAllIncidents,
  getIncidentById,
} from "../controllers/incidentController.js";

const router = Router();

router.get("/", getAllIncidents);
router.get("/:id", getIncidentById);

export default router;