import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Trash2 } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import type { Language, Lead } from "../../types";
import { buildCreativePrompt } from "../../services/creative/promptBuilder";
import { formatSpecs, type BrandKit, type CreativeAsset, type CreativeGenerationRequest } from "../../services/creative/creativeTypes";
import { generateCreativeImage } from "../../services/creative/creativeClient";
import { brandKitsRepository } from "../../services/db/brandKits";
import { creativeAssetsRepository } from "../../services/db/creativeAssets";
import { creativeStorage } from "../../services/storage/creativeStorage";
import { requestOpenAI } from "../../services/ai/openAISalesAI";

const text = (lang: Language, en: string, es: string) => lang === "es" ? es : en;
const defaultBrand: BrandKit = { id: "", name: "Next Studio", primaryColor: "#0874d1", secondaryColor: "#0f2a54", accentColor: "#48b6e8", backgroundColor: "#ffffff", website: "", defaultCta: "Get Started", visualStyle: "Premium", notes: "" };
const defaultRequest: CreativeGenerationRequest = { creativeType: "social_post", format: "square", brand: "Next Studio", goal: "leads", language: "en", style: "premium", mode: "marketing", template: "Next Studio Premium", cta: "Get Started" };
const creativeTypes = ["social_post", "promotion", "service", "facebook_ad", "instagram_post", "story", "reel_cover", "announcement", "lead_generation", "event", "quote", "custom"] as const;
const styles = ["premium", "clean", "modern", "technology", "elegant", "corporate", "bold", "minimal", "luxury", "energetic", "friendly"] as const;
const templates = ["Next Studio Premium", "Clean SaaS", "Bold Promotion", "Minimal Business", "Technology Launch"];

async function compose(imageUrl: string, request: CreativeGenerationRequest, brand: BrandKit) {
  const spec = formatSpecs[request.format];
  const source = new Image();
  source.src = imageUrl;
  await new Promise<void>((resolve, reject) => { source.onload = () => resolve(); source.onerror = () => reject(new Error("Unable to load generated image")); });
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to compose creative");
  const scale = Math.max(spec.width / source.width, spec.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  context.drawImage(source, (spec.width - width) / 2, (spec.height - height) / 2, width, height);
  if (request.mode === "marketing") {
    const overlay = context.createLinearGradient(0, 0, 0, spec.height);
    overlay.addColorStop(0, "#071a35bd"); overlay.addColorStop(.55, "#071a3520"); overlay.addColorStop(1, "#071a35dc");
    context.fillStyle = overlay; context.fillRect(0, 0, spec.width, spec.height);
    context.fillStyle = brand.primaryColor; context.fillRect(spec.width * .07, spec.height * .08, spec.width * .12, 8);
    context.fillStyle = "#fff"; context.font = `700 ${Math.round(spec.width * .075)}px sans-serif`;
    context.fillText((request.hook || brand.name).slice(0, 55), spec.width * .07, spec.height * .25, spec.width * .84);
    context.font = `500 ${Math.round(spec.width * .034)}px sans-serif`;
    context.fillText((request.offer || "").slice(0, 85), spec.width * .07, spec.height * .34, spec.width * .82);
    context.fillStyle = brand.accentColor; context.fillRect(spec.width * .07, spec.height * .82, spec.width * .38, spec.height * .075);
    context.fillStyle = "#09254a"; context.font = `700 ${Math.round(spec.width * .03)}px sans-serif`;
    context.fillText((request.cta || brand.defaultCta || "Get Started").slice(0, 25), spec.width * .1, spec.height * .87);
  }
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to compose creative")), "image/png"));
}

export function CreativeStudio({ lang }: { leads: Lead[]; lang: Language }) {
  const { configured, user } = useAuth();
  const [tab, setTab] = useState<"create" | "generated" | "brand" | "templates">("create");
  const [request, setRequest] = useState<CreativeGenerationRequest>({ ...defaultRequest, language: lang });
  const [brand, setBrand] = useState<BrandKit>(defaultBrand);
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState("");
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const update = (patch: Partial<CreativeGenerationRequest>) => setRequest((current) => ({ ...current, ...patch }));

  const load = useCallback(async () => {
    if (!configured || !user) return;
    try {
      const [kits, items] = await Promise.all([brandKitsRepository.getAll(), creativeAssetsRepository.getAll()]);
      const kit = kits[0] || await brandKitsRepository.create(defaultBrand);
      setBrand(kit); setAssets(items);
      const signed = await Promise.all(items.map(async (asset) => [asset.id, await creativeStorage.signedUrl(asset.storagePath)] as const));
      setUrls(Object.fromEntries(signed));
    } catch { setError(text(lang, "Cloud storage is not configured.", "El almacenamiento cloud no está configurado.")); }
  }, [configured, lang, user]);
  useEffect(() => { load(); }, [load]);

  const generateOne = async (target: CreativeGenerationRequest) => {
    const targetPrompt = buildCreativePrompt(target, brand);
    const generated = await generateCreativeImage(targetPrompt, target);
    const blob = await compose(generated.image, target, brand);
    const storagePath = await creativeStorage.upload(crypto.randomUUID(), blob);
    const spec = formatSpecs[target.format];
    const asset = await creativeAssetsRepository.create({ creativeType: target.creativeType, format: target.format, aspectRatio: spec.ratio, width: spec.width, height: spec.height, prompt: targetPrompt, headline: target.hook || null, supportingText: target.offer || null, cta: target.cta || null, storagePath, mimeType: "image/png", provider: generated.provider, model: generated.model, status: "ready", brandKitId: brand.id || null });
    const localUrl = URL.createObjectURL(blob);
    setAssets((current) => [asset, ...current]);
    setUrls((current) => ({ ...current, [asset.id]: localUrl }));
    setPreview(localUrl);
    return asset;
  };
  const generate = async () => {
    if (!configured || !user) { setError(text(lang, "Cloud storage is not configured.", "El almacenamiento cloud no está configurado.")); return; }
    if (busy) return;
    setBusy(true); setError("");
    try {
      await generateOne(request); setTab("generated");
    } catch { setError(text(lang, "Unable to generate or save this creative. Please try again.", "No se pudo generar o guardar este creativo. Inténtalo nuevamente.")); }
    finally { setBusy(false); }
  };
  const generateCampaignPack = async () => {
    if (!configured || !user || busy) return;
    setBusy(true); setError(""); setCampaignIds([]);
    const formats: CreativeGenerationRequest["format"][] = ["square", "portrait", "story"];
    const completed: string[] = []; const failed: string[] = [];
    for (let index = 0; index < formats.length; index += 1) {
      setCampaignProgress(`${index + 1}/3`);
      try { const asset = await generateOne({ ...request, format: formats[index] }); completed.push(asset.id); }
      catch { failed.push(formats[index]); }
    }
    setCampaignIds(completed); setCampaignProgress(""); setBusy(false); setTab("generated");
    if (failed.length) setError(text(lang, `${completed.length} of 3 generated successfully. Retry: ${failed.join(", ")}.`, `${completed.length} de 3 se generaron correctamente. Reintenta: ${failed.join(", ")}.`));
  };
  const remove = async (asset: CreativeAsset) => {
    if (!confirm(text(lang, "Delete this creative?", "¿Eliminar este creativo?"))) return;
    try { await creativeStorage.remove(asset.storagePath); await creativeAssetsRepository.remove(asset.id); setAssets((current) => current.filter((item) => item.id !== asset.id)); }
    catch { setError(text(lang, "Unable to delete this creative.", "No se pudo eliminar este creativo.")); }
  };
  const download = (asset: CreativeAsset) => { const anchor = document.createElement("a"); anchor.href = urls[asset.id] || ""; anchor.download = `next-studio-${asset.creativeType}-${asset.createdAt.slice(0, 10)}.png`; anchor.click(); };
  const saveBrand = async () => { try { setBrand(brand.id ? await brandKitsRepository.update(brand.id, brand) : await brandKitsRepository.create(brand)); } catch { setError(text(lang, "Unable to save Brand Kit.", "No se pudo guardar el Kit de Marca.")); } };
  const help = async () => { const fallback = { hook: request.service ? `${request.service} for your next step` : "Build your digital momentum", supporting: "A clear, premium solution for your business.", cta: request.cta || "Get Started", visual: "Clean premium SaaS visual with generous negative space" }; const result: any = await requestOpenAI("creative_copy", { service: request.service, goal: request.goal, audience: request.audience, language: lang, style: request.style }); const copy = result.result || fallback; update({ hook: copy.hook || fallback.hook, offer: copy.supporting || copy.supportingText || fallback.supporting, cta: copy.cta || fallback.cta, visualDirection: copy.visual || copy.visualDirection || fallback.visual }); };
  const caption = async (asset: CreativeAsset) => { const fallback = `${asset.headline || brand.name}\n${asset.cta || "Get Started"}`; const result: any = await requestOpenAI("creative_caption", { headline: asset.headline, supportingText: asset.supportingText, cta: asset.cta, language: lang }); const copy = result.result || {}; const saved = await creativeAssetsRepository.update(asset.id, { caption: copy.caption || fallback, hashtags: copy.hashtags || "#NextStudio #Business #Digital" }); setAssets((current) => current.map((item) => item.id === saved.id ? saved : item)); };

  return <>
    <div className="page-title"><div><h1>{text(lang, "AI Creative Studio", "Estudio Creativo IA")}</h1><p>{text(lang, "Create AI-powered sales visuals", "Crea material visual comercial con IA")}</p></div></div>
    <div className="creative-tabs">{(["create", "generated", "brand", "templates"] as const).map((item) => <button key={item} className={tab === item ? "primary" : ""} onClick={() => setTab(item)}>{text(lang, item[0].toUpperCase() + item.slice(1), { create: "Crear", generated: "Generados", brand: "Kit de Marca", templates: "Plantillas" }[item])}</button>)}</div>
    {error && <p className="ai-note">{error}</p>}
    {tab === "create" && <div className="creative-layout"><section className="panel creative-form"><h2>{text(lang, "Create", "Crear")}</h2>
      <label>{text(lang, "Creative type", "Tipo de creativo")}<select value={request.creativeType} onChange={(event) => update({ creativeType: event.target.value as any })}>{creativeTypes.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select></label>
      <label>{text(lang, "Format", "Formato")}<select value={request.format} onChange={(event) => update({ format: event.target.value as any })}>{Object.entries(formatSpecs).map(([item, spec]) => <option key={item} value={item}>{item} · {spec.ratio}</option>)}</select></label>
      <label>{text(lang, "Style", "Estilo")}<select value={request.style} onChange={(event) => update({ style: event.target.value as any })}>{styles.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>{text(lang, "Mode", "Modo")}<select value={request.mode} onChange={(event) => update({ mode: event.target.value as any })}><option value="marketing">Marketing Creative</option><option value="visual">AI Visual</option></select></label>
      <label>{text(lang, "Main Hook", "Hook")}<input maxLength={70} value={request.hook || ""} onChange={(event) => update({ hook: event.target.value })} /></label>
      <label>{text(lang, "Offer / supporting text", "Oferta / texto")}<input maxLength={110} value={request.offer || ""} onChange={(event) => update({ offer: event.target.value })} /></label>
      <label>CTA<input value={request.cta || ""} onChange={(event) => update({ cta: event.target.value })} /></label>
      <label>{text(lang, "Visual direction", "Dirección visual")}<textarea value={request.visualDirection || ""} onChange={(event) => update({ visualDirection: event.target.value })} /></label>
      <button className="primary" disabled={busy} onClick={generate}>{busy ? text(lang, "Generating your creative...", "Generando tu creativo...") : text(lang, "Generate Image", "Generar Imagen")}</button>
      <button onClick={help}>{text(lang, "Help Me Create", "Ayúdame a Crear")}</button>
      <button disabled={busy} onClick={generateCampaignPack}>{busy && campaignProgress ? `${text(lang, "Generating Campaign Pack...", "Generando Paquete de Campaña...")} ${campaignProgress}` : text(lang, "Generate Campaign Pack", "Generar Paquete de Campaña")}</button>
    </section><section className={`creative-preview ${request.format}`}>{preview && <img src={preview} />}<div className="creative-overlay"><b>{request.hook || brand.name}</b><span>{request.offer}</span><em>{request.cta || brand.defaultCta}</em></div></section></div>}
    {tab === "generated" && <section className="creative-history">{assets.length ? assets.map((asset) => <article className={`creative-card ${campaignIds.includes(asset.id) ? "campaign-asset" : ""}`} key={asset.id}>{urls[asset.id] && <img src={urls[asset.id]} />}<b>{asset.creativeType.replace(/_/g, " ")}</b><small>{asset.format} · {new Date(asset.createdAt).toLocaleDateString()} · {asset.provider}</small><div><button onClick={() => download(asset)}><Download size={15} /></button><button onClick={() => { update({ format: asset.format, hook: asset.headline || "", offer: asset.supportingText || "", cta: asset.cta || "" }); setTab("create"); }}>{text(lang, "Variation", "Variación")}</button><button onClick={() => caption(asset)}>{text(lang, "Caption", "Caption")}</button><button onClick={() => navigator.clipboard.writeText(asset.caption || "")}><Copy size={15} /></button><button className="danger" onClick={() => remove(asset)}><Trash2 size={15} /></button></div></article>) : <p>{text(lang, "Create your first AI-powered marketing creative.", "Crea tu primer creativo de marketing con IA.")}</p>}</section>}
    {tab === "brand" && <section className="panel"><h2>{text(lang, "Brand Kit", "Kit de Marca")}</h2><div className="form-grid">{(["name", "primaryColor", "secondaryColor", "accentColor", "backgroundColor", "website", "defaultCta", "visualStyle", "notes"] as const).map((key) => <label key={key}>{key}<input value={brand[key] || ""} onChange={(event) => setBrand((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div><button className="primary" onClick={saveBrand}>{text(lang, "Save", "Guardar")}</button></section>}
    {tab === "templates" && <section className="template-grid">{templates.map((template) => <article className="template" key={template}><span>{template}</span><h3>{text(lang, "Adaptable social layout", "Diseño social adaptable")}</h3><button onClick={() => { update({ template }); setTab("create"); }}>{text(lang, "Use template", "Usar plantilla")}</button></article>)}</section>}
  </>;
}
