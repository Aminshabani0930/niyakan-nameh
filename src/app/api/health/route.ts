import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await db.$queryRaw`SELECT 1`;
        return NextResponse.json({ ok: true, time: new Date().toISOString() }, { status: 200 });
    } catch {
        return NextResponse.json({ ok: false }, { status: 503 });
    }
}