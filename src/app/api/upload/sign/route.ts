import { signUpload } from "@/lib/cloudinary";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const deny = await requireAuth(); if (deny) return deny;
  const { isVideo } = await req.json();
  return NextResponse.json(signUpload(isVideo ? "video" : "image"));
}
