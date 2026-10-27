import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PlanInput = z.object({
  topic: z.string().trim().min(1).max(500),
  publishDate: z.string().datetime(),
  type: z.enum(["POST", "CAROUSEL", "REEL"]),
  tone: z.string().trim().min(1).max(100),
  notes: z.string().max(2_000).default(""),
});

export async function GET() {
  const deny = await requireAuth();
  if (deny) return deny;
  return NextResponse.json(await db.planItem.findMany({
    orderBy: [{ publishDate: "asc" }, { createdAt: "asc" }],
  }));
}

export async function POST(req: Request) {
  const deny = await requireAuth();
  if (deny) return deny;
  const parsed = PlanInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "اطلاعات برنامه معتبر نیست." }, { status: 400 });
  const item = await db.planItem.create({
    data: { ...parsed.data, publishDate: new Date(parsed.data.publishDate) },
  });
  return NextResponse.json(item, { status: 201 });
}
