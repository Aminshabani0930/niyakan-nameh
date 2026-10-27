import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { addDays } from "date-fns";

export const TZ = "Asia/Tehran";

export function dayRange(offsetDays = 0, spanDays = 1) {
  const z = toZonedTime(new Date(), TZ);
  const start = new Date(z.getFullYear(), z.getMonth(), z.getDate() + offsetDays);
  const end = addDays(start, spanDays);
  return { gte: fromZonedTime(start, TZ), lt: fromZonedTime(end, TZ) };
}

export function dayStart(offsetDays = 0) {
  return dayRange(offsetDays, 1).gte;
}

export function fa(date: Date | string) {
  return new Date(date).toLocaleDateString("fa-IR", { timeZone: TZ });
}
