export interface Incident {
  _id: string;
  serviceName: string;
  errorMessage: string;
  stackTrace: string;
  status: "INGESTED" | "ANALYZED" | "PR_CREATED" | "FAILED";
  rootCause?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendedFix?: string;
  codeDiffPatch?: string;
  confidenceScore?: number;
  prUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentApiResponse {
  success: boolean;
  count: number;
  data: Incident[];
}