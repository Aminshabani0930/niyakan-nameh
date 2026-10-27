import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { extractSourceText, normalizePersianText, sourceChunkTitle, splitSourceText } from "../src/lib/source-library.ts";

const prisma = new PrismaClient();
const root = process.cwd();
const dataDir = path.resolve(root, "data");
const manifestPath = path.join(dataDir, "sources.manifest.json");
const maxBytes = 100 * 1024 * 1024;

function insideDataDirectory(filePath) {
  const resolved = path.resolve(dataDir, filePath);
  if (!resolved.startsWith(`${dataDir}${path.sep}`)) throw new Error("مسیر فایل باید داخل پوشه‌ی data/ باشد.");
  return resolved;
}

try {
  const entries = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(entries)) throw new Error("sources.manifest.json باید آرایه‌ای از منبع‌ها باشد.");
  for (const [index, entry] of entries.entries()) {
    if (!entry.file || !entry.title?.trim() || !entry.license?.trim() || !["SHAHNAMEH", "HISTORY", "ARCHITECTURE", "CYRUS", "OTHER"].includes(entry.type)) {
      throw new Error(`metadata منبع شماره‌ی ${index + 1} معتبر نیست؛ title، type، license و file الزامی‌اند.`);
    }
    const buffer = await readFile(insideDataDirectory(entry.file));
    if (buffer.byteLength > maxBytes) throw new Error(`حجم ${entry.file} از سقف ۱۰۰ مگابایت بیشتر است.`);
    const contentHash = createHash("sha256").update(buffer).digest("hex");
    const existing = await prisma.source.findUnique({ where: { contentHash }, select: { id: true, title: true } });
    if (existing) { console.log(`رد شد (تکراری): ${entry.title}`); continue; }
    const text = (await extractSourceText(buffer, entry.file, maxBytes)).trim();
    const chunks = splitSourceText(text);
    if (!chunks.length) throw new Error(`متن قابل استخراج نیست: ${entry.file}`);
    await prisma.$transaction(async transaction => {
      const source = await transaction.source.create({
        data: {
          title: entry.title.trim(), authorEditor: entry.authorEditor ?? "", type: entry.type,
          yearEdition: entry.yearEdition ?? "", license: entry.license.trim(),
          sourceUrl: entry.sourceUrl ?? "", notes: entry.notes ?? "", period: entry.period ?? null,
          contentHash,
        },
      });
      for (let offset = 0; offset < chunks.length; offset += 50) {
        await transaction.sourceChunk.createMany({
          data: chunks.slice(offset, offset + 50).map((chunk, part) => ({
            sourceId: source.id, sequence: offset + part + 1, title: sourceChunkTitle(chunk),
            text: chunk, normalizedText: normalizePersianText(chunk), period: entry.period ?? null,
          })),
        });
      }
    });
    console.log(`وارد شد: ${entry.title} (${chunks.length} بخش)`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "ورود فایل ناموفق بود.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href && !process.env.DATABASE_URL) {
  console.error("DATABASE_URL در محیط اجرا تنظیم نشده است.");
  process.exitCode = 1;
}
