const envAiCopilotEnabled = process.env.NEXT_PUBLIC_FEATURE_AI_COPILOT === "true";

export const features = {
  aiCopilot: envAiCopilotEnabled,
} as const;

export const AI_COPILOT_LOCAL_OVERRIDE_KEY = "ai_job_search_ai_copilot_override";
export const AI_COPILOT_OVERRIDE_HEADER = "x-ai-copilot-override";
export const aiCopilotDevOverrideAllowed = process.env.NODE_ENV !== "production";
