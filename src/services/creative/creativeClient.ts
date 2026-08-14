import { supabase } from "../../lib/supabase";
import type { CreativeGenerationRequest } from "./creativeTypes";
export const generateCreativeImage = async (prompt: string, request: CreativeGenerationRequest) => {
  const { data: { session } } = await supabase!.auth.getSession();
  if (!session?.access_token) throw new Error("Authentication is required");
  const size = { square: "1024x1024", portrait: "1024x1536", story: "1024x1536", landscape: "1536x1024" }[request.format];
  const response = await fetch("/api/images/generate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ prompt, size, format: request.format, creativeType: request.creativeType, style: request.style, mode: request.mode, count: 1 }), signal: AbortSignal.timeout(65000) });
  const data = await response.json();
  if (!response.ok || !data?.success || typeof data.image !== "string") throw new Error(data?.error || "Image service is unavailable");
  return data as { image: string; provider: string; model: string };
};
