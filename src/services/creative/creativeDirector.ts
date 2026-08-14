import { type BrandKit, type CreativeGenerationRequest } from "./creativeTypes";

export type CreativeDirection = { subject:string; environment:string; composition:string; camera:string; lighting:string; details:string; mood:string; colors:string; negativeSpace:string; avoid:string[]; finalImagePrompt:string };

const categories=[
  [/pizza|food|fruit|juice|coffee|restaurant|café|cafe|comida|fresa|mango/i,"commercial food or hospitality photography","an authentic dining or kitchen setting","fresh texture, appetizing material detail, and believable presentation"],
  [/construction|worker|siding|house|frame|building|construcci[oó]n|trabajador/i,"realistic jobsite and architectural photography","a believable outdoor work environment","accurate tools, materials, and natural work interaction"],
  [/fashion|model|dress|clothing|vestido|moda/i,"editorial fashion photography","a location suited to the requested fashion mood","natural pose, realistic fabric texture, and appropriate wardrobe detail"],
  [/car|auto|vehicle|sports car|deportivo/i,"automotive photography","a believable location suited to the requested vehicle scene","accurate perspective, realistic paint reflections, and grounded shadows"],
  [/beach|travel|hotel|playa|viaje/i,"destination and travel photography","the requested destination environment","atmospheric depth and authentic environmental detail"],
  [/card|tarjeta|phone|smartphone|website|digital/i,"commercial lifestyle or product photography","a realistic context supporting the requested product or interaction","accurate device perspective, natural hands, crisp reflections, and an integrated product hero"],
  [/interior|office|home|kitchen|dental|cocina|oficina/i,"interior and lifestyle photography","the requested interior environment","believable materials, spatial depth, and natural light behavior"],
] as const;
const formats={square:"balanced 1:1 framing with a clear focal subject",portrait:"editorial 4:5 vertical framing with natural visual flow",story:"cinematic 9:16 vertical framing with practical top and bottom safe space",landscape:"wide 16:9 environmental framing with depth and an intentional focal area"} as const;

export const createCreativeDirection=(request:CreativeGenerationRequest,brand?:BrandKit|null):CreativeDirection=>{
  const subject=request.visualDirection?.trim()||request.service?.trim()||"the requested subject";
  const category=categories.find(([match])=>match.test(subject))||[/.*/,"natural, context-appropriate photography or illustration","a believable setting that supports the requested subject","realistic textures, clear subject separation, and relevant environmental detail"] as const;
  const bright=/bright|light|clara|luminosa|sunlight|sin sombras fuertes/i.test(subject);
  const sharp=/sharp|crisp|n[ií]tida|detail|detalle/i.test(subject);
  const lighting=bright?"high-key natural or soft directional lighting, balanced exposure, clean whites, gentle realistic shadows, visible shadow detail, no crushed blacks":"lighting appropriate to the requested time, place, and mood, with balanced exposure and realistic shadows";
  const details=`${category[3]}${sharp?"; crisp focal detail, fine texture, clear edges, controlled depth of field, and high micro-contrast where appropriate":""}`;
  const negativeSpace=request.mode==="marketing"&&(request.hook||request.offer||request.cta)?"clean negative space positioned away from the focal subject for controlled overlay copy":"natural breathing room that does not distract from the requested subject";
  const colors=brand?`the selected ${brand.name} palette, used subtly and only where appropriate`:"colors faithful to the user request and scene";
  const avoid=["readable text","random logos","watermarks","fake labels","unreadable UI text","distorted anatomy","malformed devices","duplicate objects"];
  const composition=`${formats[request.format]}, using only appropriate tools such as rule of thirds, foreground depth, leading lines, or natural framing when they help the requested scene`;
  const camera=/person|woman|man|family|mujer|hombre|familia/i.test(subject)?"natural eye-level or lightly editorial camera angle, candid posture, believable interaction, and controlled depth of field":"a camera perspective appropriate to the requested subject, with natural scale and dimensional depth";
  const style=request.style==="auto"?category[1]:request.style;
  const marketingLayer=request.mode==="marketing"?`Marketing art direction: create a visually rich, finished advertisement with intentional visual hierarchy, a strong focal product or subject, dimensional foreground/midground/background separation, sophisticated spacing, controlled highlights, and supporting visual elements only when relevant to ${subject}. Avoid a simplistic single-object layout, empty composition, generic stock-photo appearance, or text inside the generated image.`:"";
  const finalImagePrompt=[`${style} image of ${subject}.`,`Environment: ${category[2]}.`,`Composition: ${composition}.`,`Camera: ${camera}.`,`Lighting: ${lighting}.`,`Details: ${details}.`,`Colors: ${colors}.`,`Negative space: ${negativeSpace}.`,marketingLayer,"High-resolution appearance and realistic proportions. Do not change the requested concept or introduce unrelated technology, devices, business imagery, dark palettes, or branding.",`Avoid: ${avoid.join(", ")}.`].filter(Boolean).join(" ");
  return {subject,environment:category[2],composition,camera,lighting,details,mood:"faithful to the user's requested mood",colors,negativeSpace,avoid,finalImagePrompt};
};
