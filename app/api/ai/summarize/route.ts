import { NextResponse } from "next/server";

import {
  getAiCopilotAvailability,
  summarizeJob,
} from "@/lib/ai/copilot";
import {
  createAiDisabledResponse,
  createAiErrorResponse,
  createAiValidationResponse,
} from "@/lib/ai/responses";

export async function POST(request: Request) {
  const availability = getAiCopilotAvailability(request.headers);
  if (!availability.enabled) {
    return createAiDisabledResponse(availability.reason);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return createAiValidationResponse("Request body must be valid JSON.");
  }

  const description =
    body && typeof body === "object" && "description" in body
      ? body.description
      : undefined;

  if (typeof description !== "string" || !description.trim()) {
    return createAiValidationResponse(
      "Job description is required before summarizing."
    );
  }

  try {
    const result = await summarizeJob(description);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return createAiErrorResponse(error);
  }
}
