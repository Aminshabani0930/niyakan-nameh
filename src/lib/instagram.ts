const G = "https://graph.facebook.com/v21.0";
const ID = process.env.IG_USER_ID!;
const TOKEN = process.env.IG_ACCESS_TOKEN!;

async function call(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST") {
  const p = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = method === "GET"
    ? await fetch(`${G}/${path}?${p}`)
    : await fetch(`${G}/${path}`, { method, body: p });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}

export async function publish(format: "POST" | "STORY" | "REEL", mediaUrl: string, caption: string) {
  const isVideo = /\.(mp4|mov)(\?|$)/i.test(mediaUrl) || mediaUrl.includes("/video/");
  const params: Record<string, string> =
    format === "REEL" ? { media_type: "REELS", video_url: mediaUrl, caption }
    : format === "STORY"
      ? isVideo ? { media_type: "STORIES", video_url: mediaUrl } : { media_type: "STORIES", image_url: mediaUrl }
      : { image_url: mediaUrl, caption };

  const container = await call(`${ID}/media`, params);

  let finished = false;
  for (let i = 0; i < 40; i++) {
    const s = await call(container.id, { fields: "status_code" }, "GET");
    if (s.status_code === "FINISHED") { finished = true; break; }
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error("پردازش مدیا ناموفق بود");
    await new Promise(r => setTimeout(r, 5000));
  }
  if (!finished) throw new Error("پردازش مدیا زمان زیادی برد، دوباره تلاش کنید");
  return call(`${ID}/media_publish`, { creation_id: container.id });
}

export async function postInsights(mediaId: string, format: string) {
  const metric = format === "STORY"
    ? "reach,replies,shares,total_interactions"
    : "reach,likes,comments,saved,shares,total_interactions";
  return call(`${mediaId}/insights`, { metric }, "GET");
}

export async function accountInsights() {
  const insights = await call(`${ID}/insights`, {
    metric: "reach,profile_views", period: "day", metric_type: "total_value",
  }, "GET");
  const acc = await call(ID, { fields: "followers_count,media_count" }, "GET");
  return { insights, acc };
}
