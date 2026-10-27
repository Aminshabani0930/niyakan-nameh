import { runAgent } from "@/lib/agent";
import { aiErrorMessage } from "@/lib/ai";
import { NextResponse } from "next/server";

export const maxDuration = 300;

function unauthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return !secret || req.headers.get("authorization") !== `Bearer ${secret}`;
}

async function handler(req: Request) {
  if (unauthorized(req)) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const days = Math.max(1, Math.min(30, Number(url.searchParams.get("days") || 7)));
  const withImages = url.searchParams.get("images") !== "0";

  try {
    const result = await runAgent({
      days,
      withImages,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = aiErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
