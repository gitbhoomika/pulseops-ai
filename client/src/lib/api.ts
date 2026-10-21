import axios from "axios";
import { io, Socket } from "socket.io-client";
import { IncidentApiResponse } from "../types/incident";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const fetchIncidents = async (): Promise<IncidentApiResponse> => {
  const response = await axios.get<IncidentApiResponse>(`${API_BASE_URL}/api/v1/incidents`);
  return response.data;
};

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
};
export interface IngestPayload {
  serviceName: string;
  errorMessage: string;
  stackTrace: string;
}

export const simulateCrash = async (payload: IngestPayload) => {
  const response = await axios.post(`${API_BASE_URL}/api/v1/telemetry/ingest`, payload);
  return response.data;
};