import type { BrandKit, CreativeGenerationRequest } from "./creativeTypes";
import { formatSpecs } from "./creativeTypes";

const ctaFallbacks = {
  en: { leads: "Get a Quote", service: "Learn More", promotion: "Claim Offer", event: "Book Now", card: "Get Yours", default: "View Details" },
  es: { leads: "Cotiza Ahora", service: "Ver Servicio", promotion: "Aprovecha la Oferta", event: "Reserva Ahora", card: "Obtén la Tuya", default: "Ver Detalles" },
} as const;

export const resolveCreativeCta = (request: CreativeGenerationRequest, brand?: BrandKit | null) => {
  if (request.cta?.trim()) return request.cta.trim();
  if (brand?.defaultCta?.trim() && brand.defaultCta !== "Get Started") return brand.defaultCta.trim();
  const options = ctaFallbacks[request.language];
  if (request.creativeType === "promotion" || request.goal === "promotion") return options.promotion;
  if (request.creativeType === "service") return options.service;
  if (request.creativeType === "event" || request.goal === "event") return options.event;
  if (request.service?.toLowerCase().includes("card")) return options.card;
  if (request.goal === "leads" || request.creativeType === "lead_generation") return options.leads;
  return options.default;
};

export const enhanceVisualDirection = (direction?: string, service?: string) => {
  const intent = direction?.trim() || service?.trim() || "a modern business solution";
  return `${intent}. Translate this intent into high-end commercial art direction: premium advertising photography, sophisticated composition, professional lighting, refined materials, realistic detail, clear focal point, editorial depth, and elegant negative space for the controlled overlay.`;
};

const compositionByFormat = {
  square: "For 1:1, use a clear hero visual with balanced or premium asymmetrical composition and protected copy space.",
  portrait: "For 4:5, use an editorial vertical composition with the subject in the upper or central area and strategic copy space.",
  story: "For 9:16, use a cinematic vertical composition with strong hierarchy and protected top and bottom safe zones.",
  landscape: "For 16:9, place the subject to one side and reserve clean negative space on the opposite side for copy.",
} as const;

const serviceDirection = (service?: string) => {
  if (!service) return "";
  const value = service.toLowerCase();
  if (value.includes("website")) return "Use a premium device presentation in an elegant agency environment; any screen content must be abstract and unreadable.";
  if (value.includes("digital card")) return "Use a premium smartphone contact-sharing concept with abstract graphical QR-like shapes, never readable codes or text.";
  if (value.includes("print")) return "Show high-end print production with tactile paper, precise finishing, and polished materials.";
  if (value.includes("platform") || value.includes("ai")) return "Show a refined business technology and automation environment with abstract, unreadable interface surfaces.";
  if (value.includes("teleprompter")) return "Show a professional creator studio with camera, lighting, and premium content-production atmosphere.";
  return "";
};

export const buildCreativePrompt = (request: CreativeGenerationRequest, brand?: BrandKit | null) => {
  const spec = formatSpecs[request.format];
  return [
    `Create an agency-level, premium ${request.style || "premium"} commercial visual for ${request.brand || brand?.name || "Next Studio"}.`,
    request.service && `Service focus: ${request.service}.`,
    request.audience && `Audience: ${request.audience}.`,
    `Campaign goal: ${request.goal}.`,
    `Visual direction: ${enhanceVisualDirection(request.visualDirection, request.service)}`,
    serviceDirection(request.service),
    `Composition optimized for ${spec.ratio}.`,
    compositionByFormat[request.format],
    "Use a modern luxury campaign aesthetic: polished materials, refined visual hierarchy, commercial realism, subtle navy/blue depth, high contrast, and sophisticated lighting. Avoid generic stock photography, cheap templates, flat compositions, clipart, childish graphics, basic gradients, generic SaaS mockups, clutter, random objects, and low-detail backgrounds.",
    "DO NOT render readable text, logos, website copy, labels, UI text, fake typography, watermarks, or readable words. If screens, phones, laptops, signage, packaging, or websites appear, make their contents abstract, blurred, and non-readable graphical placeholders only. Leave clean negative space for the controlled text overlay.",
    "Avoid distorted letters, duplicate objects, malformed devices, warped screens, extra fingers, low resolution, oversaturated colors, and cartoon styling unless explicitly requested.",
  ].filter(Boolean).join(" ");
};
