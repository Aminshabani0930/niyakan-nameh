import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await db.$queryRaw`SELECT 1`;
        return NextResponse.json({ ok: true, time: new Date().toISOString() }, { status: 200 });
    } catch (error: unknown) {
        const details = typeof error === "object" && error !== null
            ? error as { code?: unknown; name?: unknown }
            : {};
        console.error("Health check failed", { code: details.code, name: details.name });
        return NextResponse.json({ ok: false }, { status: 503 });
    }
}