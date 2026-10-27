import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** پوشش یکسان برای همه‌ی روت‌ها: خروجی JSON + مدیریت خطا */
export const handle =
  <C>(fn: (req: Request, ctx: C) => Promise<unknown>) =>
  async (req: Request, ctx: C) => {
    try {
      return NextResponse.json(await fn(req, ctx));
    } catch (e) {
      const bad = e instanceof ZodError;
      const code = typeof e === "object" && e !== null && "code" in e ? e.code : null;
      if (!bad) console.error("API request failed");
      const msg = bad
        ? "ورودی نامعتبر: " + e.issues.map(i => i.path.join(".")).join("، ")
        : code === "P2025" ? "محتوا پیدا نشد" : "خطای داخلی سرور";
      return NextResponse.json({ error: msg }, { status: bad ? 400 : code === "P2025" ? 404 : 500 });
    }
  };
