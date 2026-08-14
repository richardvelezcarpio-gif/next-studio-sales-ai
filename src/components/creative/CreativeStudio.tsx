import { useCallback, useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import type { Language, Lead } from "../../types";
import { buildCreativePrompt } from "../../services/creative/promptBuilder";
import { formatSpecs, type BrandKit, type CreativeAsset, type CreativeGenerationRequest } from "../../services/creative/creativeTypes";
import { generateCreativeImage } from "../../services/creative/creativeClient";
import { brandKitsRepository } from "../../services/db/brandKits";
import { creativeAssetsRepository } from "../../services/db/creativeAssets";
import { creativeStorage } from "../../services/storage/creativeStorage";
import { requestOpenAI } from "../../services/ai/openAISalesAI";
import { servicesRepository, type CloudService } from "../../services/db/services";

const text = (lang: Language, en: string, es: string) => lang === "es" ? es : en;
const defaultBrand: BrandKit = { id: "", name: "Next Studio", primaryColor: "#0874d1", secondaryColor: "#0f2a54", accentColor: "#48b6e8", backgroundColor: "#ffffff", website: "", defaultCta: "Get Started", visualStyle: "Premium", notes: "" };
const defaultRequest: CreativeGenerationRequest = { creativeType: "social_post", format: "square", brand: "Next Studio", goal: "leads", language: "en", style: "premium", mode: "marketing", template: "Next Studio Premium", cta: "Get Started" };
const creativeTypes = ["social_post", "promotion", "service", "facebook_ad", "instagram_post", "story", "reel_cover", "announcement", "lead_generation", "event", "quote", "custom"] as const;
const styles = ["premium", "clean", "modern", "technology", "elegant", "corporate", "bold", "minimal", "luxury", "energetic", "friendly"] as const;
const templates = ["Next Studio Premium", "Clean SaaS", "Bold Promotion", "Minimal Business", "Technology Launch"];

async function compose(imageUrl: string, request: CreativeGenerationRequest, brand: BrandKit, logoUrl?: string) {
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
    if (logoUrl) { try { const logo = new Image(); logo.src = logoUrl; await new Promise<void>((resolve,reject)=>{logo.onload=()=>resolve();logo.onerror=()=>reject(new Error("logo"))}); const ratio=Math.min(spec.width*.16/logo.width,spec.height*.09/logo.height); context.drawImage(logo,spec.width*.77,spec.height*.06,logo.width*ratio,logo.height*ratio); } catch { context.fillStyle="#fff";context.font=`600 ${Math.round(spec.width*.025)}px sans-serif`;context.fillText(brand.name,spec.width*.07,spec.height*.95); } }
    else { context.fillStyle="#fff";context.font=`600 ${Math.round(spec.width*.025)}px sans-serif`;context.fillText(brand.name,spec.width*.07,spec.height*.95); }
  }
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to compose creative")), "image/png"));
}

export function CreativeStudio({ leads, lang }: { leads: Lead[]; lang: Language }) {
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
  const [regeneratingId, setRegeneratingId] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState<CreativeAsset | null>(null);
  const [services, setServices] = useState<CloudService[]>([]);
  const [error, setError] = useState("");
  const update = (patch: Partial<CreativeGenerationRequest>) => setRequest((current) => ({ ...current, ...patch }));

  const load = useCallback(async () => {
    if (!configured || !user) return;
    try {
      const [kits, items, cloudServices] = await Promise.all([brandKitsRepository.getAll(), creativeAssetsRepository.getAll(), servicesRepository.getAll()]);
      const kit = kits[0] || await brandKitsRepository.create(defaultBrand);
      setBrand(kit); setAssets(items); setServices(cloudServices);
      if (kit.logoPath) setLogoUrl(await creativeStorage.signedUrl(kit.logoPath)); else setLogoUrl("");
      const signed = await Promise.all(items.map(async (asset) => [asset.id, await creativeStorage.signedUrl(asset.storagePath)] as const));
      setUrls(Object.fromEntries(signed));
    } catch { setError(text(lang, "Cloud storage is not configured.", "El almacenamiento cloud no está configurado.")); }
  }, [configured, lang, user]);
  useEffect(() => { load(); }, [load]);

  const generateOne = async (target: CreativeGenerationRequest, source?: CreativeAsset) => {
    const targetPrompt = source?.prompt || buildCreativePrompt(target, brand);
    const generated = await generateCreativeImage(targetPrompt, target);
    const blob = await compose(generated.image, target, brand, logoUrl);
    const storagePath = await creativeStorage.upload(crypto.randomUUID(), blob);
    const spec = formatSpecs[target.format];
    const asset = await creativeAssetsRepository.create({ creativeType: target.creativeType, format: target.format, aspectRatio: spec.ratio, width: spec.width, height: spec.height, prompt: targetPrompt, headline: target.hook || null, supportingText: target.offer || null, cta: target.cta || null, storagePath, mimeType: "image/png", provider: generated.provider, model: generated.model, status: "ready", brandKitId: source?.brandKitId || brand.id || null, serviceId: source?.serviceId || target.serviceId || null, prospectId: source?.prospectId || target.prospectId || null });
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
  const regenerate = async (asset: CreativeAsset) => {
    if (busy || regeneratingId) return;
    setRegeneratingId(asset.id); setError("");
    try {
      await generateOne({ ...request, creativeType: asset.creativeType, format: asset.format, hook: asset.headline || "", offer: asset.supportingText || "", cta: asset.cta || brand.defaultCta || "" }, asset);
    } catch { setError(text(lang, "Unable to regenerate this creative. Please try again.", "No se pudo regenerar este creativo. Inténtalo nuevamente.")); }
    finally { setRegeneratingId(""); }
  };
  const remove = async (asset: CreativeAsset) => {
    if (!confirm(text(lang, "Delete this creative?", "¿Eliminar este creativo?"))) return;
    try { await creativeStorage.remove(asset.storagePath); await creativeAssetsRepository.remove(asset.id); setAssets((current) => current.filter((item) => item.id !== asset.id)); }
    catch { setError(text(lang, "Unable to delete this creative.", "No se pudo eliminar este creativo.")); }
  };
  const download = (asset: CreativeAsset) => { const anchor = document.createElement("a"); anchor.href = urls[asset.id] || ""; anchor.download = `next-studio-${asset.creativeType}-${asset.createdAt.slice(0, 10)}.png`; anchor.click(); };
  const saveBrand = async () => { try { setBrand(brand.id ? await brandKitsRepository.update(brand.id, brand) : await brandKitsRepository.create(brand)); } catch { setError(text(lang, "Unable to save Brand Kit.", "No se pudo guardar el Kit de Marca.")); } };
  const uploadLogo = async (file?: File) => {
    if (!file || uploadingLogo) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError(text(lang, "Use a PNG, JPEG, or WEBP logo up to 5 MB.", "Usa un logo PNG, JPEG o WEBP de hasta 5 MB.")); return; }
    setUploadingLogo(true); setError("");
    try { const path = await creativeStorage.uploadLogo(file); const saved = await brandKitsRepository.update(brand.id, { logoPath: path }); setBrand(saved); setLogoUrl(await creativeStorage.signedUrl(path)); }
    catch { setError(text(lang, "Unable to upload the logo.", "No se pudo subir el logo.")); }
    finally { setUploadingLogo(false); }
  };
  const removeLogo = async () => {
    if (!brand.logoPath || !confirm(text(lang, "Remove this logo?", "¿Eliminar este logo?"))) return;
    try { await creativeStorage.remove(brand.logoPath); const saved = await brandKitsRepository.update(brand.id, { logoPath: null }); setBrand(saved); setLogoUrl(""); }
    catch { setError(text(lang, "Unable to remove the logo.", "No se pudo eliminar el logo.")); }
  };
  const duplicate = (asset: CreativeAsset) => {
    update({ creativeType: asset.creativeType, format: asset.format, hook: asset.headline || "", offer: asset.supportingText || "", cta: asset.cta || "", visualDirection: asset.prompt, serviceId: asset.serviceId || undefined, prospectId: asset.prospectId || undefined });
    setSelectedAsset(null); setTab("create");
  };
  const visibleAssets = assets.filter((asset) => filter === "all" || (filter === "ad" ? asset.creativeType.includes("ad") : filter === "format" ? true : asset.creativeType === filter || asset.format === filter));
  const help = async () => { const fallback = { hook: request.service ? `${request.service} for your next step` : "Build your digital momentum", supporting: "A clear, premium solution for your business.", cta: request.cta || "Get Started", visual: "Clean premium SaaS visual with generous negative space" }; const result: any = await requestOpenAI("creative_copy", { service: request.service, goal: request.goal, audience: request.audience, language: lang, style: request.style }); const copy = result.result || fallback; update({ hook: copy.hook || fallback.hook, offer: copy.supporting || copy.supportingText || fallback.supporting, cta: copy.cta || fallback.cta, visualDirection: copy.visual || copy.visualDirection || fallback.visual }); };

  return <>
    <div className="page-title"><div><h1>{text(lang, "AI Creative Studio", "Estudio Creativo IA")}</h1><p>{text(lang, "Create AI-powered sales visuals", "Crea material visual comercial con IA")}</p></div></div>
    <div className="creative-tabs">{(["create", "generated", "brand", "templates"] as const).map((item) => <button key={item} className={tab === item ? "primary" : ""} onClick={() => setTab(item)}>{text(lang, item[0].toUpperCase() + item.slice(1), { create: "Crear", generated: "Generados", brand: "Kit de Marca", templates: "Plantillas" }[item])}</button>)}</div>
    {error && <p className="ai-note">{error}</p>}
    {tab === "create" && <div className="creative-layout"><section className="panel creative-form"><h2>{text(lang, "Create", "Crear")}</h2>
      <label>{text(lang, "Creative type", "Tipo de creativo")}<select value={request.creativeType} onChange={(event) => update({ creativeType: event.target.value as any })}>{creativeTypes.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select></label>
      <label>{text(lang, "Format", "Formato")}<select value={request.format} onChange={(event) => update({ format: event.target.value as any })}>{Object.entries(formatSpecs).map(([item, spec]) => <option key={item} value={item}>{item} · {spec.ratio}</option>)}</select></label>
      <label>{text(lang, "Style", "Estilo")}<select value={request.style} onChange={(event) => update({ style: event.target.value as any })}>{styles.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>{text(lang, "Mode", "Modo")}<select value={request.mode} onChange={(event) => update({ mode: event.target.value as any })}><option value="marketing">Marketing Creative</option><option value="visual">AI Visual</option></select></label>
      <label>{text(lang,"Service","Servicio")}<select value={request.serviceId||""} onChange={(event)=>{const service=services.find(x=>x.id===event.target.value);update({serviceId:service?.id,service:service?.name,offer:request.offer||service?.description})}}><option value="">{text(lang,"None","Ninguno")}</option>{services.map(service=><option key={service.id} value={service.id}>{service.name}{service.defaultPrice!=null?` · $${service.defaultPrice}`:""}</option>)}</select></label>
      <label>{text(lang,"Prospect","Prospecto")}<select value={request.prospectId||""} onChange={(event)=>update({prospectId:event.target.value||undefined})}><option value="">{text(lang,"None","Ninguno")}</option>{leads.map(lead=><option key={lead.id} value={lead.id}>{lead.firstName} {lead.lastName}{lead.business?` · ${lead.business}`:""}</option>)}</select></label>
      <label>{text(lang, "Main Hook", "Hook")}<input maxLength={70} value={request.hook || ""} onChange={(event) => update({ hook: event.target.value })} /></label>
      <label>{text(lang, "Offer / supporting text", "Oferta / texto")}<input maxLength={110} value={request.offer || ""} onChange={(event) => update({ offer: event.target.value })} /></label>
      <label>CTA<input value={request.cta || ""} onChange={(event) => update({ cta: event.target.value })} /></label>
      <label>{text(lang, "Visual direction", "Dirección visual")}<textarea value={request.visualDirection || ""} onChange={(event) => update({ visualDirection: event.target.value })} /></label>
      <button className="primary" disabled={busy} onClick={generate}>{busy ? text(lang, "Generating your creative...", "Generando tu creativo...") : text(lang, "Generate Image", "Generar Imagen")}</button>
      <button onClick={help}>{text(lang, "Help Me Create", "Ayúdame a Crear")}</button>
      <button disabled={busy} onClick={generateCampaignPack}>{busy && campaignProgress ? `${text(lang, "Generating Campaign Pack...", "Generando Paquete de Campaña...")} ${campaignProgress}` : text(lang, "Generate Campaign Pack", "Generar Paquete de Campaña")}</button>
    </section><section className={`creative-preview ${request.format}`}>{preview && <img src={preview} />}<div className="creative-overlay"><b>{request.hook || brand.name}</b><span>{request.offer}</span><em>{request.cta || brand.defaultCta}</em></div></section></div>}
    {tab === "generated" && <><div className="creative-tabs">{[["all","All","Todos"],["social_post","Social Post","Post Social"],["story","Story","Historia"],["ad","Ad","Anuncio"],["promotion","Promotion","Promoción"],["service","Service","Servicio"]].map(([value,en,es]) => <button key={value} className={filter === value ? "primary" : ""} onClick={() => setFilter(value)}>{text(lang,en,es)}</button>)}</div><section className="creative-history">{assets.length ? visibleAssets.length ? visibleAssets.map((asset) => <article className={`creative-card ${campaignIds.includes(asset.id) ? "campaign-asset" : ""}`} key={asset.id}>{urls[asset.id] && <img src={urls[asset.id]} />}<b>{asset.creativeType.replace(/_/g, " ")}</b><small>{asset.format} · {new Date(asset.createdAt).toLocaleDateString()} · {asset.provider}{asset.model ? ` / ${asset.model}` : ""}</small>{campaignIds.includes(asset.id) && <small>{text(lang,"Campaign Pack","Paquete de Campaña")}</small>}<div><button onClick={() => setSelectedAsset(asset)}>{text(lang,"Open","Abrir")}</button><button onClick={() => download(asset)}><Download size={15} /></button><button disabled={Boolean(regeneratingId)} onClick={() => regenerate(asset)}>{regeneratingId === asset.id ? text(lang, "Regenerating...", "Regenerando...") : text(lang, "Regenerate", "Regenerar")}</button><button onClick={() => duplicate(asset)}>{text(lang,"Duplicate","Duplicar")}</button><button className="danger" onClick={() => remove(asset)}><Trash2 size={15} /></button></div></article>) : <p>{text(lang,"No creatives match this filter.","No hay creativos que coincidan con este filtro.")}</p> : <p>{text(lang, "Create your first AI-powered marketing creative.", "Crea tu primer creativo de marketing con IA.")}</p>}</section></>}
    {selectedAsset && <div className="modal-bg"><section className="modal creative-detail"><h2>{text(lang,"Creative details","Detalles del creativo")}</h2>{urls[selectedAsset.id] && <img src={urls[selectedAsset.id]} />}<div className="facts"><span>{text(lang,"Date","Fecha")}<b>{new Date(selectedAsset.createdAt).toLocaleString()}</b></span><span>{text(lang,"Format","Formato")}<b>{selectedAsset.format}</b></span><span>{text(lang,"Type","Tipo")}<b>{selectedAsset.creativeType}</b></span><span>{text(lang,"Provider","Proveedor")}<b>{selectedAsset.provider} {selectedAsset.model || ""}</b></span></div>{[["Headline",selectedAsset.headline],["Supporting text",selectedAsset.supportingText],["CTA",selectedAsset.cta],["Caption",selectedAsset.caption],["Hashtags",selectedAsset.hashtags],["Prompt",selectedAsset.prompt]].map(([label,value]) => value && <div className="note" key={label}><b>{label}</b><p>{value}</p></div>)}<footer><button onClick={() => download(selectedAsset)}>{text(lang,"Download","Descargar")}</button><button onClick={() => regenerate(selectedAsset)}>{text(lang,"Regenerate","Regenerar")}</button><button onClick={() => duplicate(selectedAsset)}>{text(lang,"Duplicate","Duplicar")}</button><button onClick={() => navigator.clipboard.writeText(selectedAsset.caption || "")}>{text(lang,"Copy Caption","Copiar caption")}</button><button onClick={() => navigator.clipboard.writeText(selectedAsset.hashtags || "")}>{text(lang,"Copy Hashtags","Copiar hashtags")}</button><button className="danger" onClick={() => remove(selectedAsset)}>{text(lang,"Delete","Eliminar")}</button><button onClick={() => setSelectedAsset(null)}>{text(lang,"Close","Cerrar")}</button></footer></section></div>}
    {tab === "brand" && <section className="panel"><h2>{text(lang, "Brand Kit", "Kit de Marca")}</h2><section className="brand-logo"><b>{text(lang, "Logo", "Logo")}</b>{logoUrl ? <img src={logoUrl} alt={brand.name} /> : <span>{text(lang, "No logo uploaded", "No hay logo cargado")}</span>}<div><label className="button-like">{uploadingLogo ? text(lang, "Uploading...", "Subiendo...") : text(lang, brand.logoPath ? "Replace Logo" : "Upload Logo", brand.logoPath ? "Reemplazar Logo" : "Subir Logo")}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingLogo} onChange={(event) => uploadLogo(event.target.files?.[0])} /></label>{brand.logoPath && <button className="danger" disabled={uploadingLogo} onClick={removeLogo}>{text(lang, "Remove Logo", "Eliminar Logo")}</button>}</div></section><div className="form-grid">{(["name", "primaryColor", "secondaryColor", "accentColor", "backgroundColor", "website", "defaultCta", "visualStyle", "notes"] as const).map((key) => <label key={key}>{key}<input value={brand[key] || ""} onChange={(event) => setBrand((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div><button className="primary" onClick={saveBrand}>{text(lang, "Save", "Guardar")}</button></section>}
    {tab === "templates" && <section className="template-grid">{templates.map((template) => <article className="template" key={template}><span>{template}</span><h3>{text(lang, "Adaptable social layout", "Diseño social adaptable")}</h3><button onClick={() => { update({ template }); setTab("create"); }}>{text(lang, "Use template", "Usar plantilla")}</button></article>)}</section>}
  </>;
}
