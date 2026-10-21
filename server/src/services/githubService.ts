import { Octokit } from "octokit";
import dotenv from "dotenv";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.GITHUB_OWNER || "";
const repo = process.env.GITHUB_REPO || "";

interface CreatePRParams {
  incidentId: string;
  serviceName: string;
  rootCause: string;
  recommendedFix: string;
  codeDiffPatch: string;
}

export const createFixPullRequest = async ({
  incidentId,
  serviceName,
  rootCause,
  recommendedFix,
  codeDiffPatch,
}: CreatePRParams): Promise<string> => {
  if (!owner || !repo || !process.env.GITHUB_TOKEN) {
    throw new Error("Missing GitHub configuration in environment variables");
  }

  // 1. Get the latest commit SHA of the default branch (main)
  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: "heads/main",
  });
  const mainCommitSha = refData.object.sha;

  // 2. Create a unique branch name for the fix
  const branchName = `pulseops/fix-${serviceName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${incidentId.slice(-6)}`;

  // 3. Create the new branch reference
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: mainCommitSha,
  });

  // 4. Commit a patch document to the branch
  const patchFileName = `fixes/incident-${incidentId.slice(-6)}-patch.diff`;
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: patchFileName,
    message: `fix(${serviceName}): automated remediation patch for incident ${incidentId}`,
    content: Buffer.from(codeDiffPatch).toString("base64"),
    branch: branchName,
  });

  // 5. Open the Pull Request
  const prBody = `## 🤖 PulseOps AI Incident Remediation

**Incident ID:** \`${incidentId}\`
**Service:** \`${serviceName}\`

### 🔍 Root Cause Analysis
${rootCause}

### 💡 Recommended Fix
${recommendedFix}

### 📝 Code Diff Applied
\`\`\`diff
${codeDiffPatch}
\`\`\`

---
*Created automatically by PulseOps AI Automation Engine.*`;

  const { data: pr } = await octokit.rest.pulls.create({
    owner,
    repo,
    title: `fix(${serviceName}): auto-remediation for incident ${incidentId.slice(-6)}`,
    head: branchName,
    base: "main",
    body: prBody,
    draft: true, // Opened as Draft for human review
  });

  return pr.html_url;
};