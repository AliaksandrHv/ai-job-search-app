import { NextResponse } from "next/server";

import {
  AiCopilotError,
  getAiCopilotDisabledMessage,
} from "@/lib/ai/copilot";
import type { AiAvailabilityReason } from "@/lib/ai/types";

export function createAiDisabledResponse(reason: AiAvailabilityReason) {
  return NextResponse.json(
    {
      ok: false,
      error: getAiCopilotDisabledMessage(reason),
      code: "disabled",
    },
    { status: 403 }
  );
}

export function createAiValidationResponse(message: string) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code: "validation_error",
    },
    { status: 400 }
  );
}

export function createAiErrorResponse(error: unknown) {
  if (error instanceof AiCopilotError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        code: error.code,
      },
      { status: error.status }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: "AI Copilot failed unexpectedly.",
      code: "unknown",
    },
    { status: 500 }
  );
}
