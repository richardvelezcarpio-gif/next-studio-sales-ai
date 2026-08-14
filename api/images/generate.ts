import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const allowedSizes = new Set(["1024x1024", "1024x1536", "1536x1024"]);
const allowedFormats = new Set(["square", "portrait", "story", "landscape"]);
const allowedTypes = new Set(["social_post", "promotion", "service", "facebook_ad", "instagram_post", "story", "reel_cover", "announcement", "lead_generation", "event", "quote", "custom"]);
const allowedStyles = new Set(["premium", "clean", "modern", "technology", "elegant", "corporate", "bold", "minimal", "luxury", "energetic", "friendly"]);
const allowedModes = new Set(["visual", "marketing"]);
const safeError = (res: any, status: number, error: string) => res.status(status).json({ success: false, error });

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return safeError(res, 405, "Method not allowed");
  const authorization = String(req.headers?.authorization || "");
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return safeError(res, 401, "Authentication is required");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return safeError(res, 503, "Creative service authentication is not configured");
  const auth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await auth.auth.getUser(token);
  if (authError || !user) return safeError(res, 401, "Your session is invalid or expired");
  const body = req.body;
  if (!body || typeof body !== "object" || JSON.stringify(body).length > 12000) return safeError(res, 400, "Invalid creative request");
  const { prompt, size, format, creativeType, style, mode, count = 1 } = body;
  if (typeof prompt !== "string" || prompt.trim().length < 10 || prompt.length > 4000 || !allowedSizes.has(size) || !allowedFormats.has(format) || !allowedTypes.has(creativeType) || !allowedStyles.has(style) || !allowedModes.has(mode) || count !== 1) return safeError(res, 400, "Invalid creative request");
  if (!process.env.OPENAI_API_KEY) return safeError(res, 503, "Image service is unavailable");
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60000 });
    const image = await client.images.generate({ model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1", prompt: prompt.trim(), size, quality: "medium", output_format: "png", n: 1 } as any);
    const base64 = (image.data as any)?.[0]?.b64_json;
    if (!base64) return safeError(res, 502, "Image service did not return an image");
    return res.status(200).json({ success: true, image: `data:image/png;base64,${base64}`, provider: "openai", model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1" });
  } catch (error: any) {
    return safeError(res, error?.status === 429 ? 429 : 503, error?.status === 429 ? "Image generation is busy. Please try again." : "Image service is temporarily unavailable. Please try again.");
  }
}
