import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { runAgent } from "@/lib/agent";
import { aiErrorMessage } from "@/lib/ai";
import { NextResponse } from "next/server";

export const maxDuration = 300;

const Body = z.object({
  days: z.number().int().min(1).max(14).default(7),
  withImages: z.boolean().default(true),
});

export async function POST(req: Request) {
  const deny = await requireAuth(); if (deny) return deny;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await runAgent({
      days: parsed.data.days,
      withImages: parsed.data.withImages,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = aiErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
