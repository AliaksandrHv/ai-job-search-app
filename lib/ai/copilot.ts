import "server-only";

import {
  AI_COPILOT_OVERRIDE_HEADER,
  aiCopilotDevOverrideAllowed,
  features,
} from "@/config/features";
import type {
  AiAvailabilityReason,
  AiErrorCode,
  AiStatusResponse,
  JobAiContext,
} from "@/lib/ai/types";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const AI_TIMEOUT_MS = 10_000;

type OpenAiPrompt = {
  instructions: string;
  input: string;
  maxOutputTokens?: number;
};

type OpenAiResponse = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      text?: unknown;
    }>;
  }>;
  error?: {
    message?: unknown;
  };
};

export class AiCopilotError extends Error {
  code: AiErrorCode;
  status: number;

  constructor(message: string, code: AiErrorCode, status: number) {
    super(message);
    this.name = "AiCopilotError";
    this.code = code;
    this.status = status;
  }
}

function isAiCopilotRequestOverrideEnabled(headers?: Headers) {
  return (
    aiCopilotDevOverrideAllowed &&
    headers?.get(AI_COPILOT_OVERRIDE_HEADER) === "true"
  );
}

export function getAiCopilotAvailability(headers?: Headers): AiStatusResponse {
  const featureEnabled =
    features.aiCopilot || isAiCopilotRequestOverrideEnabled(headers);

  if (!featureEnabled) {
    return { enabled: false, reason: "feature_disabled" };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { enabled: false, reason: "missing_api_key" };
  }

  return { enabled: true, reason: "enabled" };
}

function ensureApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new AiCopilotError(
      "AI Copilot is disabled until OPENAI_API_KEY is configured.",
      "disabled",
      403
    );
  }
}

function extractResponseText(payload: OpenAiResponse | null): string {
  if (!payload) return "";

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) {
    return "";
  }

  const textParts: string[] = [];

  payload.output.forEach((item) => {
    if (!Array.isArray(item.content)) return;

    item.content.forEach((contentItem) => {
      if (typeof contentItem.text === "string" && contentItem.text.trim()) {
        textParts.push(contentItem.text.trim());
      }
    });
  });

  return textParts.join("\n\n").trim();
}

async function requestOpenAi(prompt: OpenAiPrompt): Promise<string> {
  ensureApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: prompt.instructions,
        input: prompt.input,
        max_output_tokens: prompt.maxOutputTokens ?? 350,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as OpenAiResponse | null;

    if (!response.ok) {
      const message =
        payload && typeof payload.error?.message === "string"
          ? payload.error.message
          : "OpenAI request failed.";
      throw new AiCopilotError(message, "provider_error", response.status);
    }

    const text = extractResponseText(payload);
    if (!text) {
      throw new AiCopilotError(
        "OpenAI returned an empty response.",
        "provider_error",
        502
      );
    }

    return text;
  } catch (error) {
    if (error instanceof AiCopilotError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AiCopilotError(
        "AI request timed out after 10 seconds.",
        "timeout",
        504
      );
    }

    throw new AiCopilotError(
      "AI request failed unexpectedly.",
      "unknown",
      500
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildJobNotesContext(job: JobAiContext) {
  return [
    `Company: ${job.company}`,
    `Role: ${job.title}`,
    `Pipeline status: ${job.status}`,
    `Existing note: ${job.note || "None"}`,
    `Job description: ${job.jobDescription || "Not provided"}`,
  ].join("\n");
}

export async function summarizeJob(description: string): Promise<string> {
  const trimmedDescription = description.trim();
  if (!trimmedDescription) {
    throw new AiCopilotError(
      "Job description is required before summarizing.",
      "validation_error",
      400
    );
  }

  return requestOpenAi({
    instructions:
      "You are an assistant for job seekers. Summarize the job description with concise Markdown headings and bullets. Include exactly these sections: Summary, Key Responsibilities, Important Skills.",
    input: trimmedDescription,
  });
}

export async function generateFollowUp(
  company: string,
  role: string,
  status: string
): Promise<string> {
  const trimmedCompany = company.trim();
  const trimmedRole = role.trim();
  const trimmedStatus = status.trim();

  if (!trimmedCompany || !trimmedRole) {
    throw new AiCopilotError(
      "Company and role are required before generating a follow-up.",
      "validation_error",
      400
    );
  }

  return requestOpenAi({
    instructions:
      "You help job seekers draft concise recruiter follow-ups. Write a short outreach message that sounds professional, warm, and specific. Keep it under 120 words and include a subject line on the first line.",
    input: `Company: ${trimmedCompany}\nRole: ${trimmedRole}\nCurrent status: ${trimmedStatus || "Unknown"}`,
    maxOutputTokens: 220,
  });
}

export async function generateJobNotes(job: JobAiContext): Promise<string> {
  if (!job.company.trim() || !job.title.trim()) {
    throw new AiCopilotError(
      "Job context is incomplete.",
      "validation_error",
      400
    );
  }

  return requestOpenAi({
    instructions:
      "You are an assistant for a job search tracker. Produce 2 concise bullets with tactical notes about the job. Focus on likely interview emphasis, company context, or immediate next steps. Do not repeat the raw job title or company unless necessary.",
    input: buildJobNotesContext(job),
    maxOutputTokens: 180,
  });
}

export function getAiCopilotDisabledMessage(reason: AiAvailabilityReason) {
  if (reason === "missing_api_key") {
    return "AI Copilot is disabled until OPENAI_API_KEY is configured.";
  }

  return "AI Copilot is currently disabled.";
}
