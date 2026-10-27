import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  return session ? null : NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
}
