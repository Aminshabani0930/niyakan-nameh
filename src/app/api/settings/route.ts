import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { POST_MIXES, getSettings } from "@/lib/settings";
import { NextResponse } from "next/server";

const Body = z.object({
  postMix: z.enum(POST_MIXES),
  postsPerWeek: z.number().int().min(1).max(14),
  agentEnabled: z.boolean(),
  imageStyle: z.string().min(1).max(1_000),
  carouselSlides: z.number().int().min(1).max(10),
  weeklyPattern: z.object({
    reelsPerWeek: z.number().int().min(0).max(14),
    carouselsPerWeek: z.number().int().min(0).max(14),
    storiesPerDay: z.number().int().min(0).max(4),
    reelTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    carouselTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    storyTimes: z.object({
      morning: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      noon: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      afternoon: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      night: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    }),
  }),
  digestTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).partial();

export async function GET() {
  const deny = await requireAuth(); if (deny) return deny;
  return NextResponse.json({ ...await getSettings(), autoPublish: false });
}

export async function PATCH(req: Request) {
  const deny = await requireAuth(); if (deny) return deny;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const settings = await db.appSetting.upsert({
    where: { id: "singleton" },
    update: { ...parsed.data, autoPublish: false },
    create: { id: "singleton", ...parsed.data, autoPublish: false },
  });
  return NextResponse.json({ ...settings, autoPublish: false });
}
