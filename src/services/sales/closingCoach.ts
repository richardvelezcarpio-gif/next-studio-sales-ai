import type { Lead, Language, Task } from "../../types";
import type { CloudFollowUp } from "../db/followUps";
import { closeProbability } from "./closeProbability";
import { leadProbability, riskReasons } from "./revenueForecast";

export type ClosingAdvice = {
  happening: string;
  mainRisk: string;
  approach: string;
  nextStep: string;
  messageAngle: string;
};

export const localClosingAdvice = (
  lead: Lead,
  lang: Language,
  tasks: Task[] = [],
  followUps: CloudFollowUp[] = [],
): ClosingAdvice => {
  const es = lang === "es";
  const probability = leadProbability(lead);
  const risks = riskReasons(lead, tasks, followUps);
  const closing = closeProbability(lead);
  const stage = lead.stage.replace(/_/g, " ");
  const mainRisk = risks[0] || (es ? "No hay un riesgo principal confirmado todavía." : "No confirmed primary risk yet.");
  const nextStep = lead.nextStep || closing.recommendation;
  return {
    happening: es
      ? `La oportunidad está en la etapa ${stage} con una probabilidad estimada de ${probability}%.`
      : `The opportunity is in ${stage} with an estimated close probability of ${probability}%.`,
    mainRisk,
    approach: risks.length
      ? (es ? "Aborda el riesgo confirmado y pide un siguiente paso concreto." : "Address the confirmed risk and ask for a concrete next step.")
      : (es ? "Confirma el proceso de decisión y mantén una conversación enfocada." : "Confirm the decision process and keep the conversation focused."),
    nextStep,
    messageAngle: es
      ? "Pregunta si hay alguna duda pendiente antes de avanzar, sin asumir objeciones ni ofrecer descuentos."
      : "Ask whether any questions remain before moving forward, without assuming objections or offering discounts.",
  };
};
