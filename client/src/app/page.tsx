"use client";

import { useEffect, useState } from "react";
import { fetchIncidents, getSocket, simulateCrash } from "@/lib/api";
import { Incident } from "@/types/incident";
import {
  ExternalLink,
  GitPullRequest,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Flame,
  Activity,
  X,
  Copy,
  Check,
  Zap,
} from "lucide-react";

const CRASH_PRESETS = [
  {
    name: "Payment Gateway Timeout",
    serviceName: "payment-service",
    errorMessage: "StripeConnectionTimeout: Request to api.stripe.com failed after 10000ms",
    stackTrace:
      "StripeConnectionTimeout: Request to api.stripe.com failed after 10000ms\n    at Timeout._onTimeout (/app/node_modules/stripe/lib/StripeResource.js:142:25)\n    at processPayment (/app/src/controllers/paymentController.ts:88:12)\n    at async /app/src/routes/checkout.ts:45:5",
  },
  {
    name: "Database Connection Pool Exhaustion",
    serviceName: "order-service",
    errorMessage: "MongoPoolExhaustionError: Timed out waiting for connection from pool",
    stackTrace:
      "MongoPoolExhaustionError: Timed out waiting for connection from pool\n    at ConnectionPool.checkout (/app/node_modules/mongodb/lib/cmap/connection_pool.js:290:17)\n    at getOrderDetails (/app/src/services/orderService.ts:34:21)\n    at Layer.handle (/app/node_modules/express/lib/router/layer.js:95:5)",
  },
  {
    name: "JWT Authentication Malformed",
    serviceName: "auth-service",
    errorMessage: "JsonWebTokenError: jwt malformed",
    stackTrace:
      "JsonWebTokenError: jwt malformed\n    at module.exports (/app/node_modules/jsonwebtoken/verify.js:63:17)\n    at authenticateToken (/app/src/middlewares/authMiddleware.ts:24:22)\n    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)",
  },
];

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchIncidents()
      .then((res) => setIncidents(res.data))
      .catch((err) => console.error("Error fetching incidents:", err));

    const socket = getSocket();

    socket.on("connect", () => setSocketStatus("connected"));
    socket.on("disconnect", () => setSocketStatus("disconnected"));

    socket.on("incident:created", (newIncident: Incident) => {
      setIncidents((prev) => [newIncident, ...prev]);
    });

    socket.on("incident:analyzed", (updatedIncident: Incident) => {
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === updatedIncident._id ? updatedIncident : inc))
      );
      setSelectedIncident((current) =>
        current?._id === updatedIncident._id ? updatedIncident : current
      );
    });

    socket.on("incident:pr_created", (updatedIncident: Incident) => {
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === updatedIncident._id ? updatedIncident : inc))
      );
      setSelectedIncident((current) =>
        current?._id === updatedIncident._id ? updatedIncident : current
      );
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("incident:created");
      socket.off("incident:analyzed");
      socket.off("incident:pr_created");
    };
  }, []);

  const handleSimulate = async (preset: typeof CRASH_PRESETS[0]) => {
    try {
      setIsSubmitting(true);
      await simulateCrash({
        serviceName: preset.serviceName,
        errorMessage: preset.errorMessage,
        stackTrace: preset.stackTrace,
      });
      setIsSimulateOpen(false);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalIncidents = incidents.length;
  const prsCreated = incidents.filter((i) => i.status === "PR_CREATED").length;
  const highOrCritical = incidents.filter(
    (i) => i.severity === "HIGH" || i.severity === "CRITICAL"
  ).length;

  const getStatusBadge = (status: Incident["status"]) => {
    switch (status) {
      case "INGESTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 animate-spin" /> INGESTED
          </span>
        );
      case "ANALYZED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3 h-3" /> ANALYZED
          </span>
        );
      case "PR_CREATED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <GitPullRequest className="w-3 h-3" /> PR_CREATED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> FAILED
          </span>
        );
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <header className="flex justify-between items-center pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="text-indigo-500" /> PulseOps AI
          </h1>
          <p className="text-gray-400 text-sm mt-1">Autonomous SRE & Incident Remediation Engine</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSimulateOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-medium transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Simulate Crash
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-800 bg-gray-900/60 backdrop-blur">
            <span
              className={`w-2 h-2 rounded-full ${
                socketStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-xs uppercase tracking-wider font-mono text-gray-300">
              {socketStatus}
            </span>
          </div>
        </div>
      </header>

      {/* SRE KPI Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-gray-900/40 border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">Total Ingested</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalIncidents}</h3>
          </div>
          <div className="p-3 bg-gray-800/60 rounded-lg text-gray-300">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-gray-900/40 border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">High / Critical</p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1">{highOrCritical}</h3>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-gray-900/40 border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">Automated PRs</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{prsCreated}</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
            <GitPullRequest className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Incident Feed */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
          Live Telemetry Feed
          <span className="text-xs font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
            {incidents.length}
          </span>
        </h2>

        <div className="space-y-3">
          {incidents.map((incident) => (
            <div
              key={incident._id}
              onClick={() => setSelectedIncident(incident)}
              className="p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-indigo-500/40 hover:bg-gray-900/80 transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                      {incident.serviceName}
                    </span>
                    {incident.severity && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                        {incident.severity}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(incident.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-100 font-mono">
                    {incident.errorMessage}
                  </h3>
                </div>
                <div>{getStatusBadge(incident.status)}</div>
              </div>

              {incident.rootCause && (
                <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800/80 text-xs text-gray-300 space-y-1">
                  <span className="text-indigo-400 font-semibold tracking-wide uppercase font-mono block">
                    AI Diagnosis:
                  </span>
                  <p className="leading-relaxed line-clamp-2">{incident.rootCause}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-xs text-gray-500 font-mono">
                <span>Click card to inspect root cause & code patch</span>
                {incident.prUrl && (
                  <a
                    href={incident.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    PR on GitHub
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Crash Simulation Trigger Modal */}
      {isSimulateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Zap className="w-4 h-4 text-amber-400 fill-current" />
                Simulate Production Incident
              </div>
              <button
                onClick={() => setIsSimulateOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Select a synthetic crash scenario. This sends a telemetry payload into the gateway,
              triggering BullMQ queuing, Groq AI diagnostics, and GitHub PR creation live.
            </p>
            <div className="space-y-2.5">
              {CRASH_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  disabled={isSubmitting}
                  onClick={() => handleSimulate(preset)}
                  className="w-full text-left p-3.5 rounded-xl bg-gray-950 border border-gray-800 hover:border-indigo-500/50 hover:bg-gray-950/80 transition group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                      {preset.serviceName}
                    </span>
                    <span className="text-xs text-gray-500 font-mono group-hover:text-indigo-400 transition">
                      Trigger &rarr;
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-200 mt-2">{preset.name}</h4>
                  <p className="text-xs text-gray-500 font-mono mt-1 truncate">{preset.errorMessage}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deep-Dive Slide-over Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between pb-4 border-b border-gray-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                    {selectedIncident.serviceName}
                  </span>
                  {selectedIncident.severity && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                      {selectedIncident.severity}
                    </span>
                  )}
                  {getStatusBadge(selectedIncident.status)}
                </div>
                <h2 className="text-lg font-bold text-white font-mono mt-2">
                  {selectedIncident.errorMessage}
                </h2>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedIncident.rootCause && (
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-mono text-indigo-400 font-semibold tracking-wider">
                  Root Cause Analysis
                </h4>
                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 text-sm text-gray-300 leading-relaxed">
                  {selectedIncident.rootCause}
                </div>
              </div>
            )}

            {selectedIncident.recommendedFix && (
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-mono text-emerald-400 font-semibold tracking-wider">
                  Remediation Strategy
                </h4>
                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 text-sm text-gray-300 leading-relaxed">
                  {selectedIncident.recommendedFix}
                </div>
              </div>
            )}

            {selectedIncident.codeDiffPatch && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase font-mono text-gray-400 font-semibold tracking-wider">
                    Generated Unified Diff Patch
                  </h4>
                  <button
                    onClick={() => copyToClipboard(selectedIncident.codeDiffPatch!)}
                    className="flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-white"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy Diff"}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-gray-950 border border-gray-800 font-mono text-xs text-emerald-400/90 overflow-x-auto whitespace-pre">
                  {selectedIncident.codeDiffPatch}
                </pre>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs uppercase font-mono text-gray-400 font-semibold tracking-wider">
                Raw Telemetry Stack Trace
              </h4>
              <pre className="p-4 rounded-xl bg-gray-950 border border-gray-800 font-mono text-xs text-rose-400/80 overflow-x-auto whitespace-pre">
                {selectedIncident.stackTrace}
              </pre>
            </div>

            {selectedIncident.prUrl && (
              <div className="pt-4 border-t border-gray-800 flex justify-end">
                <a
                  href={selectedIncident.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium transition"
                >
                  <GitPullRequest className="w-4 h-4" />
                  Review & Merge Pull Request on GitHub
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}