import type { BrandKit, CreativeGenerationRequest } from "./creativeTypes";
import { formatSpecs } from "./creativeTypes";
export const buildCreativePrompt = (request: CreativeGenerationRequest, brand?: BrandKit | null) => {
  const spec = formatSpecs[request.format];
  return [`Create a premium ${request.style} marketing visual for ${request.brand || brand?.name || "Next Studio"}.`, request.service && `Service focus: ${request.service}.`, request.audience && `Audience: ${request.audience}.`, `Campaign goal: ${request.goal}.`, request.visualDirection && `Visual direction: ${request.visualDirection}.`, `Composition optimized for ${spec.ratio}.`, "Use white, blue and navy SaaS brand guardrails, professional lighting, clean modern composition, high contrast, and generous negative space.", request.mode === "marketing" ? "Do not render commercial text, small typography, logos, UI screenshots, watermarks, or crowded collages; leave clean space for a controlled overlay." : "Avoid embedded text, watermarks, UI screenshots, and crowded collages."].filter(Boolean).join(" ");
};
