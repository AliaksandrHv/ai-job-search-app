export type AiAvailabilityReason =
  | "enabled"
  | "feature_disabled"
  | "missing_api_key";

export type AiErrorCode =
  | "disabled"
  | "validation_error"
  | "provider_error"
  | "timeout"
  | "unknown";

export type AiStatusResponse = {
  enabled: boolean;
  reason: AiAvailabilityReason;
};

export type AiRouteSuccess = {
  ok: true;
  result: string;
};

export type AiRouteFailure = {
  ok: false;
  error: string;
  code: AiErrorCode;
};

export type AiRouteResponse = AiRouteSuccess | AiRouteFailure;

export type JobAiContext = {
  company: string;
  title: string;
  status: string;
  note: string;
  jobDescription?: string;
};

export type SummarizeJobRequest = {
  description: string;
};

export type GenerateFollowUpRequest = {
  company: string;
  role: string;
  status: string;
};

export type GenerateJobNotesRequest = {
  job: JobAiContext;
};

export type AiAction = "summarize" | "notes" | "follow-up";
