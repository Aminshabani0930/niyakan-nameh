import { z } from "zod";
import { CATEGORY_KEYS, FORMATS, STATUSES } from "./categories";

export const ItemSchema = z.object({
  title: z.string().min(1),
  caption: z.string().default(""),
  script: z.string().default(""),
  category: z.enum(CATEGORY_KEYS),
  format: z.enum(FORMATS),
  status: z.enum(STATUSES).default("IDEA"),
  publishDate: z.coerce.date(),
});
