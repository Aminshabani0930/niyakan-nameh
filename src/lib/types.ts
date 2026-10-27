import { FORMATS, STATUSES } from "./categories";
export type Format = (typeof FORMATS)[number];
export type Status = (typeof STATUSES)[number];
export type Item = {
  id: string; title: string; caption: string; script: string; category: string;
  format: Format; status: Status; publishDate: string;
  mediaUrl: string | null; mediaUrls: string[]; igMediaId: string | null;
  source: string; imageError: string | null;
};
