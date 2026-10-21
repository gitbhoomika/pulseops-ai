import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { initSocket } from "./config/socket.js";
import telemetryRoutes from "./routes/telemetryRoutes.js";
import incidentRoutes from "./routes/incidentRoutes.js";
import "./workers/incidentWorker.js"; // Ensures the worker runs

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with the HTTP server
initSocket(server);

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/v1/telemetry", telemetryRoutes);
app.use("/api/v1/incidents", incidentRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  // Note: we listen on 'server', NOT 'app'
  server.listen(PORT, () => {
    console.log(`🚀 PulseOps AI server running on port ${PORT}`);
  });
});