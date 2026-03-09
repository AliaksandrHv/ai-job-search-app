import { NextResponse } from "next/server";

import { getAiCopilotAvailability } from "../../../lib/ai/copilot";

export async function GET(request: Request) {
  return NextResponse.json(getAiCopilotAvailability(request.headers));
}
