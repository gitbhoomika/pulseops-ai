import mongoose, { Schema, Document } from "mongoose";

export interface IIncident extends Document {
  serviceName: string;
  errorMessage: string;
  stackTrace: string;
  status: "INGESTED" | "ANALYZED" | "PR_CREATED" | "RESOLVED";
  rootCause?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendedFix?: string;
  codeDiffPatch?: string;
  confidenceScore?: number;
  prUrl?: string;
  prNumber?: number;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    serviceName: { type: String, required: true },
    errorMessage: { type: String, required: true },
    stackTrace: { type: String, required: true },
    status: {
      type: String,
      enum: ["INGESTED", "ANALYZED", "PR_CREATED", "RESOLVED"],
      default: "INGESTED",
    },
    rootCause: { type: String },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
    recommendedFix: { type: String },
    codeDiffPatch: { type: String },
    confidenceScore: { type: Number },
    prUrl: { type: String },
    prNumber: { type: Number },
  },
  { timestamps: true }
);

export const Incident = mongoose.model<IIncident>("Incident", IncidentSchema);