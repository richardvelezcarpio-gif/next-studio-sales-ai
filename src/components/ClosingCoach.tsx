import { useEffect, useState } from "react";
import type { Language, Lead, Task } from "../types";
import type { CloudFollowUp } from "../services/db/followUps";
import { tasksRepository } from "../services/db/tasks";
import { followUpsRepository } from "../services/db/followUps";
import { communicationsRepository } from "../services/db/communications";
import { requestOpenAI } from "../services/ai/openAISalesAI";
import { localClosingAdvice, type ClosingAdvice } from "../services/sales/closingCoach";
import { closeProbability } from "../services/sales/closeProbability";
import { leadProbability, riskReasons } from "../services/sales/revenueForecast";
import { salesActions } from "../services/sales/nextBestAction";

const labels = (lang: Language) => lang === "es" ? ["Qué Está Pasando", "Riesgo Principal", "Mejor Estrategia de Cierre", "Próximo Paso", "Enfoque del Mensaje"] : ["What's Happening", "Main Risk", "Best Closing Approach", "Next Step", "Message Angle"];
export function ClosingCoach({ lead, lang, onDraft }: { lead: Lead; lang: Language; onDraft: () => void }) {
  const [advice, setAdvice] = useState<ClosingAdvice | null>(null);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<"openai" | "local" | null>(null);
  useEffect(() => {
    setAdvice(null);
    setProvider(null);
  }, [lead.id, lead.stage, lead.quoteStatus, lead.updatedAt, lead.potentialValue]);
  const generate = async () => {
    setBusy(true);
    let tasks: Task[] = [], follows: CloudFollowUp[] = [], communications: unknown[] = [], drafts: unknown[] = [];
    try { [tasks, follows, communications, drafts] = await Promise.all([tasksRepository.getByProspectId(lead.id), followUpsRepository.getByProspectId(lead.id), communicationsRepository.getCommunicationsByProspectId(lead.id), communicationsRepository.getDraftsByProspectId(lead.id)]); } catch { /* local advice still works with the persisted lead */ }
    const fallback = localClosingAdvice(lead, lang, tasks, follows);
    const closing = closeProbability(lead);
    const response = await requestOpenAI<ClosingAdvice>("closing_coach", { firstName: lead.firstName, businessName: lead.business || undefined, service: lead.service, stage: lead.stage, quoteStatus: lead.quoteStatus, estimatedValue: lead.potentialValue, probability: leadProbability(lead), expectedCloseDate: lead.expectedCloseDate || undefined, nextStep: lead.nextStep || undefined, lastActivityAt: lead.lastActivityAt || lead.updatedAt || undefined, tasks: tasks.map((task) => ({ title: task.title, dueDate: task.dueDate, status: task.status })), followUps: follows.map((follow) => ({ type: follow.type, dueAt: follow.dueAt, status: follow.status })), communicationsCount: communications.length, draftsCount: drafts.length, positiveSignals: closing.positiveSignals, risks: riskReasons(lead, tasks, follows), nextBestAction: salesActions([lead], lang)[0]?.recommendation, language: lang });
    const result = response.result;
    const complete = result && [result.happening, result.mainRisk, result.approach, result.nextStep, result.messageAngle].every(Boolean);
    setAdvice(complete ? result : fallback);
    setProvider(complete && response.provider === "openai" ? "openai" : "local");
    setBusy(false);
  };
  const text = labels(lang);
  return <section className="panel closing-coach"><h2>{lang === "es" ? "Coach IA de Cierre" : "AI Closing Coach"}</h2>{advice ? <div className="coach-advice">{[[text[0], advice.happening], [text[1], advice.mainRisk], [text[2], advice.approach], [text[3], advice.nextStep], [text[4], advice.messageAngle]].map(([title, value]) => <div key={title}><b>{title}</b><p>{value}</p></div>)}</div> : <p>{lang === "es" ? "Genera una recomendación basada solo en la información disponible de esta oportunidad." : "Generate advice using only the available information for this opportunity."}</p>}<footer><button className="primary" disabled={busy} onClick={generate}>{busy ? (lang === "es" ? "Generando..." : "Generating...") : (lang === "es" ? "Generar Recomendación de Cierre" : "Generate Closing Advice")}</button><button onClick={onDraft}>{lang === "es" ? "Preparar Mensaje de Cierre" : "Draft Closing Message"}</button>{provider && <small>{provider === "openai" ? "OpenAI" : (lang === "es" ? "Motor local" : "Local engine")}</small>}</footer></section>;
}
