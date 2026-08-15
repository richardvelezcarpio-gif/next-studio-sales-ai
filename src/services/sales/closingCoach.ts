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
  if (lead.stage === "won") return {
    happening: es ? "La oportunidad está cerrada como Ganada." : "This opportunity is closed as Won.",
    mainRisk: es ? "Confirmar que los compromisos postventa no queden pendientes." : "Make sure post-sale commitments do not remain pending.",
    approach: es ? "Enfocar la conversación en onboarding, producción, entrega y satisfacción." : "Focus the conversation on onboarding, production, delivery, and satisfaction.",
    nextStep: lead.nextStep || (es ? "Confirmar pago, onboarding o fecha de inicio." : "Confirm payment, onboarding, or the start date."),
    messageAngle: es ? "Agradece la confianza y confirma los próximos pasos operativos." : "Thank them for their trust and confirm the operational next steps.",
  };
  if (lead.stage === "lost") return {
    happening: es ? "La oportunidad está cerrada como Perdida." : "This opportunity is closed as Lost.",
    mainRisk: es ? "No corresponde continuar intentando cerrar la venta ahora." : "It is not appropriate to continue trying to close this sale now.",
    approach: es ? "Documentar el motivo y definir una estrategia de reactivación futura si aplica." : "Document the reason and define a future reactivation strategy if appropriate.",
    nextStep: lead.nextStep || (es ? "Registrar el motivo de pérdida y revisar una fecha de recontacto." : "Record the loss reason and consider a future recontact date."),
    messageAngle: es ? "Mantén un cierre respetuoso y deja la puerta abierta para el futuro." : "Keep the close respectful and leave the door open for the future.",
  };
  if (lead.quoteStatus === "accepted") return {
    happening: es ? `El cliente aceptó la cotización${lead.potentialValue ? ` de $${lead.potentialValue.toLocaleString()}` : ""}.` : `The customer accepted the quote${lead.potentialValue ? ` for $${lead.potentialValue.toLocaleString()}` : ""}.`,
    mainRisk: es ? "La aceptación todavía no confirma el pago, contrato o inicio." : "Acceptance does not yet confirm payment, contract, or project start.",
    approach: es ? "Convertir la aceptación en un compromiso operativo concreto." : "Turn acceptance into a concrete operational commitment.",
    nextStep: lead.nextStep || (es ? "Confirmar pago, depósito, contrato o inicio del proyecto." : "Confirm payment, deposit, contract, or project start."),
    messageAngle: es ? "Agradece la aceptación y solicita el siguiente requisito operativo, sin pedir aprobación nuevamente." : "Thank them for accepting and request the next operational requirement without asking for approval again.",
  };
  const probability = leadProbability(lead);
  const risks = riskReasons(lead, tasks, followUps);
  const closing = closeProbability(lead);
  const stage = ({ new: es ? "nuevo" : "new", contacted: es ? "contactado" : "contacted", replied: es ? "respondió" : "replied", information_sent: es ? "información enviada" : "information sent", interested: es ? "interesado" : "interested", appointment: es ? "cita" : "appointment", quote_sent: es ? "cotización enviada" : "quote sent" } as Record<string, string>)[lead.stage] || lead.stage.replace(/_/g, " ");
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
