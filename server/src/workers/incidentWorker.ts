import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { Incident } from "../models/Incident.js";
import { analyzeIncidentWithAI } from "../services/aiService.js";
import { createFixPullRequest } from "../services/githubService.js";
import { IncidentJobData } from "../queues/incidentQueue.js";
import { emitIncidentUpdate } from "../config/socket.js";

export const incidentWorker = new Worker<IncidentJobData>(
  "incident-processing",
  async (job: Job<IncidentJobData>) => {
    const { incidentId } = job.data;
    console.log(`\n🔍 Worker picked up job for Incident ID: ${incidentId}`);

    try {
      // 1. Fetch the incident from MongoDB
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error(`Incident not found in database: ${incidentId}`);
      }

      // 2. Call Groq AI to diagnose the crash
      console.log(`🤖 Requesting AI analysis for ${incident.serviceName}...`);
      const analysis = await analyzeIncidentWithAI(
        incident.serviceName,
        incident.errorMessage,
        incident.stackTrace
      );

      // 3. Update the incident in MongoDB with AI diagnostics
      incident.rootCause = analysis.rootCause;
      incident.severity = analysis.severity;
      incident.recommendedFix = analysis.recommendedFix;
      incident.codeDiffPatch = analysis.codeDiffPatch;
      incident.confidenceScore = analysis.confidenceScore;
      incident.status = "ANALYZED";
      await incident.save();
      emitIncidentUpdate("incident:analyzed", incident);
      console.log(`✅ Incident ${incidentId} analyzed.`);

      // 4. Trigger GitHub PR Automation
      console.log(`🚀 Dispatching GitHub Pull Request via Octokit...`);
      const prUrl = await createFixPullRequest({
        incidentId: incident._id.toString(),
        serviceName: incident.serviceName,
        rootCause: incident.rootCause,
        recommendedFix: incident.recommendedFix,
        codeDiffPatch: incident.codeDiffPatch,
      });

      // 5. Update Incident with PR URL and advance status
      incident.prUrl = prUrl;
      incident.status = "PR_CREATED";
      await incident.save();
      emitIncidentUpdate("incident:pr_created", incident);
      console.log(`🎉 Automated PR created successfully: ${prUrl}`);
    } catch (error) {
      console.error(`❌ Worker failed processing incident ${incidentId}:`, error);

      // Transition status to FAILED in MongoDB
      const failedIncident = await Incident.findByIdAndUpdate(
        incidentId,
        {
          status: "FAILED",
          recommendedFix:
            error instanceof Error
              ? `Remediation failed: ${error.message}`
              : "Internal worker error during processing.",
        },
        { new: true }
      );

      // Broadcast failure to frontend via WebSockets
      if (failedIncident) {
        emitIncidentUpdate("incident:analyzed", failedIncident);
      }

      // Re-throw so BullMQ registers the job failure in its metrics
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

incidentWorker.on("completed", (job) => {
  console.log(`✨ Job ${job.id} workflow completed end-to-end`);
});

incidentWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed with error:`, err);
});