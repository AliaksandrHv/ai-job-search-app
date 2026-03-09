import { NextResponse } from "next/server";

import {
  generateFollowUp,
  getAiCopilotAvailability,
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

  const company =
    body && typeof body === "object" && "company" in body ? body.company : undefined;
  const role =
    body && typeof body === "object" && "role" in body ? body.role : undefined;
  const status =
    body && typeof body === "object" && "status" in body ? body.status : undefined;

  if (typeof company !== "string" || typeof role !== "string") {
    return createAiValidationResponse(
      "Company and role are required before generating a follow-up."
    );
  }

  try {
    const result = await generateFollowUp(
      company,
      role,
      typeof status === "string" ? status : ""
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return createAiErrorResponse(error);
  }
}
