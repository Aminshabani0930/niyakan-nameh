import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { CATEGORIES, FORMATS, STATUSES } from "@/lib/categories";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  title: z.string().min(1),
  caption: z.string().default(""),
  script: z.string().default(""),
  category: z.string().refine(value => CATEGORIES.some(category => category.key === value)),
  format: z.enum(FORMATS),
  status: z.enum(STATUSES).default("IDEA"),
  publishDate: z.string().datetime(),
  recordDate: z.string().datetime().nullish(),
  mediaUrl: z.string().url().optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  source: z.enum(["MANUAL", "AI", "AGENT"]).optional(),
  imageError: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const deny = await requireAuth(); if (deny) return deny;
  return NextResponse.json(await db.contentItem.findMany({ orderBy: { publishDate: "asc" } }));
}

export async function POST(req: Request) {
  const deny = await requireAuth(); if (deny) return deny;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;
  const pub = new Date(b.publishDate);
  const mediaUrls = b.mediaUrls ?? [];
  const item = await db.contentItem.create({
    data: {
      ...b,
      mediaUrl: b.mediaUrl ?? mediaUrls[0],
      mediaUrls,
      source: b.source ?? "MANUAL",
      publishDate: pub,
      recordDate: b.recordDate ? new Date(b.recordDate) : new Date(pub.getTime() - 2 * 86400000),
    },
  });
  return NextResponse.json(item);
}

export async function PATCH(req: Request) {
  const deny = await requireAuth(); if (deny) return deny;
  const parsed = z.object({
    id: z.string().min(1),
    status: z.enum(["IDEA", "TO_RECORD", "READY"]).optional(),
    mediaUrl: z.string().url().nullable().optional(),
    mediaUrls: z.array(z.string().url()).max(10).optional(),
    imageError: z.string().nullable().optional(),
    caption: z.string().optional(),
  }).safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...data } = parsed.data;
  if (data.mediaUrls && data.mediaUrl === undefined) {
    data.mediaUrl = data.mediaUrls[0] ?? null;
  }
  return NextResponse.json(await db.contentItem.update({ where: { id }, data }));
}
