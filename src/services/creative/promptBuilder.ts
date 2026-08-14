import type { BrandKit, CreativeGenerationRequest } from "./creativeTypes";
import { formatSpecs } from "./creativeTypes";

export const resolveCreativeCta = (request: CreativeGenerationRequest, _brand?: BrandKit | null) => request.cta?.trim() || "";

export const enhanceVisualDirection = (direction?: string, service?: string) => {
  const intent = direction?.trim() || service?.trim() || "the requested subject";
  return `${intent}. Preserve the requested subject, setting, mood, and visual intent; improve only clarity, composition, lighting, and detail.`;
};

const compositionByFormat = {
  square: "For 1:1, frame the requested subject clearly with balanced composition.",
  portrait: "For 4:5, use a natural editorial vertical composition that suits the requested subject.",
  story: "For 9:16, use a vertical composition with sensible top and bottom safe space when the subject allows it.",
  landscape: "For 16:9, use a wide composition that supports the requested scene.",
} as const;

export const buildCreativePrompt = (request: CreativeGenerationRequest, brand?: BrandKit | null) => {
  const spec = formatSpecs[request.format];
  return [
    `Create a high-quality ${request.style === "auto" ? "prompt-led" : request.style} image that faithfully follows the user's visual direction.`,
    brand && `Apply the selected ${brand.name} brand style only: its color palette, visual style, and logo treatment when appropriate.`,
    request.service && `Service context: ${request.service}.`,
    request.audience && `Audience: ${request.audience}.`,
    `Campaign goal: ${request.goal}.`,
    `Visual direction: ${enhanceVisualDirection(request.visualDirection, request.service)}`,
    `Composition optimized for ${spec.ratio}.`,
    compositionByFormat[request.format],
    "Use sharp focus, high detail, balanced exposure, natural or appropriate professional lighting, clean composition, realistic proportions, and a high-resolution appearance. Do not add branding, technology, dark colors, corporate styling, devices, interfaces, or any specific artistic direction unless requested.",
    "DO NOT render readable text, logos, website copy, labels, UI text, fake typography, watermarks, or readable words. If screens, phones, laptops, signage, packaging, or websites appear, make their contents abstract, blurred, and non-readable graphical placeholders only.",
    "Avoid distorted letters, duplicate objects, malformed devices, warped screens, extra fingers, low resolution, oversaturated colors, and cartoon styling unless explicitly requested.",
  ].filter(Boolean).join(" ");
};
