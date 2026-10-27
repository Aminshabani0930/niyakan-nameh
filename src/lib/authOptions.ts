import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { timingSafeEqual } from "crypto";

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "password",
      credentials: { password: { label: "رمز", type: "password" } },
      async authorize(creds) {
        const pw = process.env.APP_PASSWORD;
        if (!pw || !creds?.password || !same(creds.password, pw)) return null;
        return { id: "admin", name: "نیاکان نامه" };
      },
    }),
  ],
};
