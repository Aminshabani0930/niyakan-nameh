import { z } from "zod";
import { db } from "@/lib/db";
import { handle } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { ItemSchema } from "@/lib/schema";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };
const Patch = ItemSchema.partial().extend({
  mediaUrl: z.string().url().nullable().optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  imageError: z.string().nullable().optional(),
});

const authenticated = <C>(handler: (req: Request, ctx: C) => Promise<Response>) =>
  async (req: Request, ctx: C) => {
    const deny = await requireAuth();
    return deny ?? handler(req, ctx);
  };

export const PATCH = authenticated(handle(async (req, { params }: Ctx) => {
  const data = Patch.parse(await req.json());
  if (data.status === "PUBLISHED") {
    throw new z.ZodError([{
      code: "custom",
      message: "محتوا فقط پس از انتشار موفق در اینستاگرام منتشرشده علامت می‌خورد",
      path: ["status"],
    }]);
  }
  if (data.mediaUrls && data.mediaUrl === undefined) {
    data.mediaUrl = data.mediaUrls[0] ?? null;
  }
  return db.contentItem.update({ where: { id: (await params).id }, data });
}));

export const DELETE = authenticated(handle(async (_req, { params }: Ctx) =>
  db.contentItem.delete({ where: { id: (await params).id } })));
