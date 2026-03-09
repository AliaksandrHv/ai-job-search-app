import { NextResponse } from "next/server";

import {
  generateJobNotes,
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

  const job =
    body && typeof body === "object" && "job" in body ? body.job : undefined;

  if (!job || typeof job !== "object") {
    return createAiValidationResponse("Job context is required.");
  }

  try {
    const result = await generateJobNotes({
      company:
        "company" in job && typeof job.company === "string" ? job.company : "",
      title: "title" in job && typeof job.title === "string" ? job.title : "",
      status: "status" in job && typeof job.status === "string" ? job.status : "",
      note: "note" in job && typeof job.note === "string" ? job.note : "",
      jobDescription:
        "jobDescription" in job && typeof job.jobDescription === "string"
          ? job.jobDescription
          : undefined,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return createAiErrorResponse(error);
  }
}
