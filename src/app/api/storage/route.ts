import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
    const deny = await requireAuth();
    if (deny) return deny;
    try {
        const [result] = await db.$queryRaw<{ bytes: bigint }[]>(Prisma.sql`SELECT pg_database_size(current_database()) AS bytes`);
        return NextResponse.json({ bytes: Number(result.bytes) });
    } catch {
        return NextResponse.json({ bytes: null, error: "اندازه‌ی دیتابیس در این اتصال در دسترس نیست." });
    }
}
