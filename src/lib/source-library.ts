import mammoth from "mammoth";
import { parse as parseCsv } from "csv-parse/sync";

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MIN_CHUNK_WORDS = 800;
const MAX_CHUNK_WORDS = 1_500;
const TARGET_CHUNK_WORDS = 1_000;

export class SourceImportError extends Error { }

export function normalizePersianText(value: string) {
    return value
        .normalize("NFC")
        .replace(/[\u064A\u0649]/g, "ی")
        .replace(/\u0643/g, "ک")
        .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
        .replace(/[\u200c\u200d\u200e\u200f\ufeff]/g, " ")
        .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
        .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
        .replace(/\s+/g, " ")
        .trim();
}

export function repairRtlWordOrder(value: string) {
    return value.split("\n").map(line => {
        if (!/[\u0600-\u06ff]/.test(line) || /[A-Za-z]/.test(line)) return line;
        return line.trim().split(/\s+/).reverse().join(" ");
    }).join("\n");
}

export function removeRepeatedHeadersAndPageNumbers(value: string) {
    const lines = value.split(/\r?\n/);
    const counts = new Map<string, number>();
    for (const line of lines) {
        const normalized = normalizePersianText(line);
        if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
    return lines.filter(line => {
        const normalized = normalizePersianText(line);
        if (!normalized) return true;
        if (/^[\d۰-۹٠-٩\s.\-–—/]+$/.test(normalized)) return false;
        return normalized.length > 100 || (counts.get(normalized) ?? 0) < 3;
    }).join("\n");
}

function jsonText(value: unknown): string[] {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap(jsonText);
    if (value && typeof value === "object") {
        return Object.entries(value).flatMap(([key, child]) => [key, ...jsonText(child)]);
    }
    return [];
}

export async function extractSourceText(buffer: Buffer, fileName: string, maxBytes = MAX_SOURCE_BYTES) {
    if (buffer.byteLength > maxBytes) {
        throw new SourceImportError(`حجم فایل از سقف ${(maxBytes / 1024 / 1024).toLocaleString("fa-IR")} مگابایت بیشتر است.`);
    }
    const extension = fileName.toLowerCase().split(".").pop();
    if (extension === "txt" || extension === "md") return buffer.toString("utf8");
    if (extension === "json") {
        try {
            return jsonText(JSON.parse(buffer.toString("utf8"))).join("\n");
        } catch {
            throw new SourceImportError("ساختار فایل JSON معتبر نیست.");
        }
    }
    if (extension === "csv") {
        try {
            const rows = parseCsv(buffer.toString("utf8"), { relax_quotes: true, skip_empty_lines: true }) as unknown[][];
            return rows.map(row => row.map(cell => String(cell ?? "")).join(" | ")).join("\n");
        } catch {
            throw new SourceImportError("ساختار فایل CSV معتبر نیست.");
        }
    }
    if (extension === "docx") {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } catch {
            throw new SourceImportError("خواندن فایل DOCX ناموفق بود؛ فایل سالم و غیررمزگذاری‌شده انتخاب کنید.");
        }
    }
    if (extension === "pdf") {
        try {
            const { default: pdfParse } = await import("pdf-parse");
            const result = await pdfParse(buffer);
            if (!result.text.trim()) {
                throw new SourceImportError("متنی از PDF استخراج نشد؛ این فایل اسکن است، OCR لازم است.");
            }
            return result.text;
        } catch (error) {
            if (error instanceof SourceImportError) throw error;
            throw new SourceImportError("خواندن PDF ناموفق بود؛ اگر سند تصویری است، اسکن است و OCR لازم است.");
        }
    }
    throw new SourceImportError("فقط فایل‌های TXT، MD، JSON، CSV، DOCX و PDF پشتیبانی می‌شوند.");
}

export function splitSourceText(value: string) {
    const words = value.match(/\S+/g) ?? [];
    if (!words.length) return [];
    const chunks: string[] = [];
    for (let offset = 0; offset < words.length;) {
        const remaining = words.length - offset;
        let size = Math.min(TARGET_CHUNK_WORDS, remaining);
        if (remaining > MAX_CHUNK_WORDS && remaining - size < MIN_CHUNK_WORDS) {
            size = remaining - MIN_CHUNK_WORDS;
        }
        chunks.push(words.slice(offset, offset + size).join(" "));
        offset += size;
    }
    if (chunks.length > 1) {
        const lastWords = chunks[chunks.length - 1].split(/\s+/).length;
        const previousWords = chunks[chunks.length - 2].split(/\s+/).length;
        if (lastWords < MIN_CHUNK_WORDS && previousWords + lastWords <= MAX_CHUNK_WORDS) {
            chunks[chunks.length - 2] += ` ${chunks.pop()}`;
        }
    }
    return chunks;
}

export function sourceChunkTitle(text: string) {
    return text.split(/\s+/).slice(0, 8).join(" ");
}

export const SOURCE_MAX_BYTES = MAX_SOURCE_BYTES;
