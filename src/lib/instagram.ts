import type { Format } from "./categories";

const G = "https://graph.facebook.com/v21.0";

function config() {
  const id = process.env.IG_USER_ID;
  const token = process.env.IG_ACCESS_TOKEN;
  if (!id || !token) throw new Error("تنظیمات اینستاگرام (IG_USER_ID و IG_ACCESS_TOKEN) کامل نیست");
  return { id, token };
}

async function call(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST") {
  const { token } = config();
  const p = new URLSearchParams({ ...params, access_token: token });
  const res = method === "GET"
    ? await fetch(`${G}/${path}?${p}`)
    : await fetch(`${G}/${path}`, { method, body: p });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}

async function waitReady(containerId: string) {
  for (let i = 0; i < 40; i++) {
    const status = await call(containerId, { fields: "status_code" }, "GET");
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error("پردازش مدیا ناموفق بود");
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error("پردازش مدیا زمان زیادی برد، دوباره تلاش کنید");
}

const isVideoUrl = (url: string) => /\.(mp4|mov)(\?|$)/i.test(url) || url.includes("/video/");

export async function publish(
  format: Format,
  mediaUrl: string,
  caption: string,
  mediaUrls: string[] = [],
) {
  const { id } = config();
  const urls = (mediaUrls.length > 0 ? mediaUrls : [mediaUrl]).filter(Boolean);

  if (format === "CAROUSEL" || urls.length > 1) {
    if (urls.length < 2) throw new Error("برای کاروسل حداقل دو تصویر یا ویدیو لازم است");

    const children: string[] = [];
    for (const url of urls.slice(0, 10)) {
      const params: Record<string, string> = isVideoUrl(url)
        ? { video_url: url, is_carousel_item: "true" }
        : { image_url: url, is_carousel_item: "true" };
      const child = await call(`${id}/media`, params);
      await waitReady(child.id);
      children.push(child.id);
    }

    const container = await call(`${id}/media`, {
      media_type: "CAROUSEL",
      children: children.join(","),
      caption,
    });
    await waitReady(container.id);
    return call(`${id}/media_publish`, { creation_id: container.id });
  }

  const video = isVideoUrl(mediaUrl);
  const params: Record<string, string> =
    format === "REEL"
      ? { media_type: "REELS", video_url: mediaUrl, caption }
      : format === "STORY"
        ? video
          ? { media_type: "STORIES", video_url: mediaUrl }
          : { media_type: "STORIES", image_url: mediaUrl }
        : { image_url: mediaUrl, caption };

  const container = await call(`${id}/media`, params);
  await waitReady(container.id);
  return call(`${id}/media_publish`, { creation_id: container.id });
}

export async function postInsights(mediaId: string, format: string) {
  const metric = format === "STORY"
    ? "reach,replies,shares,total_interactions"
    : "reach,likes,comments,saved,shares,total_interactions";
  return call(`${mediaId}/insights`, { metric }, "GET");
}

export async function accountInsights() {
  const { id } = config();
  const insights = await call(`${id}/insights`, {
    metric: "reach,profile_views", period: "day", metric_type: "total_value",
  }, "GET");
  const acc = await call(id, { fields: "followers_count,media_count" }, "GET");
  return { insights, acc };
}
