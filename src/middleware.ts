import { withAuth } from "next-auth/middleware";

export default withAuth({ pages: { signIn: "/login" } });

// فقط صفحات محافظت می‌شوند؛ API ها خودشان requireAuth دارند و cron با Bearer کار می‌کند
export const config = {
  matcher: ["/((?!api|login|_next|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/).*)"],
};
