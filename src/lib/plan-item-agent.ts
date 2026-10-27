import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { generatePlannedContent, aiErrorMessage } from "@/lib/ai";
import { getSettingsOrDefault } from "@/lib/settings";

export async function generatePlanItem(id: string) {
  const item = await db.planItem.findUnique({ where: { id } });
  if (!item) throw new Error("آیتم برنامه پیدا نشد.");
  const claimed = await db.planItem.updateMany({
    where: { id, status: { in: ["PLANNED", "FAILED"] } },
    data: { status: "GENERATING", errorMessage: null },
  });
  if (claimed.count === 0) throw new Error("این آیتم در وضعیت قابل تولید نیست.");

  try {
    const claimedItem = await db.planItem.findUniqueOrThrow({ where: { id } });
    const settings = await getSettingsOrDefault();
    const generated = await generatePlannedContent({
      topic: claimedItem.topic,
      publishDate: claimedItem.publishDate,
      type: claimedItem.type,
      tone: claimedItem.tone,
      notes: claimedItem.notes,
      imageStyle: settings.imageStyle,
      carouselSlides: settings.carouselSlides,
    });
    const caption = [generated.caption, generated.hashtags.join(" ")].filter(Boolean).join("\n\n");
    return await db.$transaction(async transaction => {
      const content = await transaction.contentItem.create({
        data: {
          title: generated.title,
          caption,
          script: generated.slides.length
            ? generated.slides.map((slide, index) => `${index + 1}. ${slide}`).join("\n\n")
            : generated.script,
          category: generated.category,
          format: claimedItem.type,
          status: "IDEA",
          publishDate: claimedItem.publishDate,
          recordDate: addDays(claimedItem.publishDate, -2),
          mediaUrl: generated.imageUrl,
          mediaUrls: generated.imageUrls,
          source: "AI",
          imageError: generated.imageError,
        },
      });
      return transaction.planItem.update({
        where: { id },
        data: {
          status: "DRAFT",
          contentId: content.id,
          errorMessage: generated.imageError,
        },
        include: { content: true },
      });
    });
  } catch (error) {
    const message = aiErrorMessage(error);
    await db.planItem.update({
      where: { id },
      data: { status: "FAILED", errorMessage: message },
    });
    throw new Error(message);
  }
}
