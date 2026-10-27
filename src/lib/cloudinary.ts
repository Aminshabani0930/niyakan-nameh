import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function signUpload(resourceType: "image" | "video") {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = "niyakan-nameh";
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder }, process.env.CLOUDINARY_API_SECRET!);
  return {
    timestamp, folder, signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    resourceType,
  };
}

/**
 * تصویر تولیدشده توسط GapGPT معمولاً به‌صورت base64 برمی‌گردد؛
 * اینستاگرام به URL عمومی نیاز دارد، پس آن را در Cloudinary نگه می‌داریم.
 */
export async function uploadBase64Image(base64: string, mimeType = "image/png") {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("برای ذخیره‌ی تصویر، تنظیمات Cloudinary را کامل کنید");
  }
  const result = await cloudinary.uploader.upload(`data:${mimeType};base64,${base64}`, {
    folder: "niyakan-nameh/ai",
    resource_type: "image",
    transformation: [{ width: 1080, height: 1350, crop: "limit", quality: "auto" }],
  });
  if (!result.secure_url) throw new Error("آپلود تصویر در Cloudinary ناموفق بود");
  return result.secure_url;
}

export async function uploadImageUrl(url: string) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary is not configured");
  }
  if (!url.startsWith("https://")) throw new Error("Image URL must use HTTPS");
  const result = await cloudinary.uploader.upload(url, {
    folder: "niyakan-nameh/ai",
    resource_type: "image",
    transformation: [{ width: 1080, height: 1350, crop: "limit", quality: "auto" }],
  });
  if (!result.secure_url) throw new Error("Cloudinary did not return a secure URL");
  return result.secure_url;
}
