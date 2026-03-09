import {
  AI_COPILOT_LOCAL_OVERRIDE_KEY,
  AI_COPILOT_OVERRIDE_HEADER,
  aiCopilotDevOverrideAllowed,
  features,
} from "@/config/features";
import type {
  AiErrorCode,
  AiRouteResponse,
  AiStatusResponse,
  GenerateFollowUpRequest,
  GenerateJobNotesRequest,
  SummarizeJobRequest,
} from "@/lib/ai/types";

type AiRequestError = Error & {
  code?: AiErrorCode;
};

function buildHeaders() {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (isAiCopilotOverrideEnabled()) {
    headers[AI_COPILOT_OVERRIDE_HEADER] = "true";
  }

  return headers;
}

export function isAiCopilotOverrideEnabled() {
  if (!aiCopilotDevOverrideAllowed || typeof window === "undefined") {
    return false;
  }

  return (
    window.localStorage.getItem(AI_COPILOT_LOCAL_OVERRIDE_KEY) === "true"
  );
}

export function isAiCopilotRequestedOnClient() {
  return features.aiCopilot || isAiCopilotOverrideEnabled();
}

export async function fetchAiCopilotStatus(): Promise<AiStatusResponse> {
  const response = await fetch("/api/ai/status", {
    cache: "no-store",
    headers: isAiCopilotOverrideEnabled()
      ? { [AI_COPILOT_OVERRIDE_HEADER]: "true" }
      : undefined,
  });

  const payload = (await response.json().catch(() => null)) as AiStatusResponse | null;
  if (!payload) {
    throw new Error("Could not determine AI Copilot status.");
  }

  return payload;
}

async function postAiRoute<TPayload>(path: string, payload: TPayload) {
  const response = await fetch(path, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as AiRouteResponse | null;
  if (!response.ok || !body || !body.ok) {
    const error = new Error(
      body && !body.ok ? body.error : "AI Copilot request failed."
    ) as AiRequestError;
    error.code = body && !body.ok ? body.code : "unknown";
    throw error;
  }

  return body.result;
}

export async function requestJobSummary(payload: SummarizeJobRequest) {
  return postAiRoute("/api/ai/summarize", payload);
}

export async function requestFollowUp(payload: GenerateFollowUpRequest) {
  return postAiRoute("/api/ai/follow-up", payload);
}

export async function requestJobNotes(payload: GenerateJobNotesRequest) {
  return postAiRoute("/api/ai/notes", payload);
}
