import Groq from "groq-sdk";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 1. Define the Zod schema for AI output
export const aiAnalysisSchema = z.object({
  rootCause: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  recommendedFix: z.string(),
  codeDiffPatch: z.string(),
  confidenceScore: z.number().min(0).max(1),
});
export const analyzeIncidentWithAI = async (
  serviceName: string,
  errorMessage: string,
  stackTrace: string
): Promise<AIAnalysisResult> => {
  const systemPrompt = `
You are an expert site reliability engineer and software debugger.
Analyze the provided application crash telemetry and provide a root cause analysis and a code patch.

CRITICAL: Return ONLY a valid JSON object matching this exact schema:
{
  "rootCause": "Clear explanation of why this crash happened",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "recommendedFix": "Clear explanation of how to resolve the issue",
  "codeDiffPatch": "Unified git diff showing the code fix (e.g. --- a/file.ts\\n+++ b/file.ts\\n@@ ...)",
  "confidenceScore": 0.95
}
Do not include any conversational text, markdown code blocks, or preamble. Output raw JSON only.
`;

  const userPrompt = `
Service Name: ${serviceName}
Error Message: ${errorMessage}
Stack Trace:
${stackTrace}
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model: "openai/gpt-oss-120b",
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const rawContent = chatCompletion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("No response received from Groq AI");
  }

  const parsedJson = JSON.parse(rawContent);
  return aiAnalysisSchema.parse(parsedJson);
};

export type AIAnalysisResult = z.infer<typeof aiAnalysisSchema>;