import type { Lead, Stage, Task } from "../../types";
import type { CloudFollowUp } from "../db/followUps";
import { closeProbability } from "./closeProbability";

const closed = new Set<Stage>(["won", "lost"]);
const advanced = new Set<Stage>(["appointment", "quote_sent"]);
const validDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
export const monthKey = (value = new Date()) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-01`;
const inMonth = (value: string | null | undefined, month: string) => {
  const date = validDate(value);
  return Boolean(date && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === month.slice(0, 7));
};
export const leadProbability = (lead: Lead) =>
  lead.probability == null ? closeProbability(lead).probability : lead.probability;
export const riskReasons = (
  lead: Lead,
  tasks: Task[] = [],
  followUps: CloudFollowUp[] = [],
  now = new Date(),
) => {
  if (closed.has(lead.stage)) return [];
  const reasons = [...closeProbability(lead).risks];
  const today = now.getTime();
  const isOverdue = (value?: string) => {
    const date = validDate(value);
    return Boolean(date && date.getTime() < today);
  };
  if (isOverdue(lead.expectedCloseDate || undefined)) reasons.push("Expected close date passed");
  if (tasks.some((task) => task.prospectId === lead.id && task.status !== "completed" && isOverdue(task.dueDate))) reasons.push("Overdue task");
  if (followUps.some((followUp) => followUp.prospectId === lead.id && followUp.status !== "completed" && isOverdue(followUp.dueAt))) reasons.push("Overdue follow-up");
  const last = validDate(lead.lastActivityAt || lead.updatedAt || lead.createdAt);
  if (advanced.has(lead.stage) && last && (today - last.getTime()) / 86400000 >= 5) reasons.push("Advanced stage without recent activity");
  return [...new Set(reasons)];
};

export type Forecast = ReturnType<typeof revenueForecast>;
export const revenueForecast = (leads: Lead[], month = monthKey()) => {
  const open = leads.filter((lead) => !closed.has(lead.stage));
  const expected = open.filter((lead) => inMonth(lead.expectedCloseDate, month));
  const won = leads.filter((lead) => lead.stage === "won" && inMonth(lead.wonAt, month));
  const lost = leads.filter((lead) => lead.stage === "lost" && inMonth(lead.lostAt, month));
  const sum = (items: Lead[]) => items.reduce((total, lead) => total + lead.potentialValue, 0);
  const weighted = (items: Lead[]) => items.reduce((total, lead) => total + lead.potentialValue * (leadProbability(lead) / 100), 0);
  const stageRows = (["new", "contacted", "replied", "information_sent", "interested", "appointment", "quote_sent"] as Stage[])
    .map((stage) => {
      const items = open.filter((lead) => lead.stage === stage);
      return { stage, count: items.length, value: sum(items), weighted: weighted(items) };
    })
    .filter((row) => row.count > 0);
  const closingSoon = open
    .filter((lead) => {
      const probability = leadProbability(lead);
      const closeDate = validDate(lead.expectedCloseDate);
      const days = closeDate ? (closeDate.getTime() - Date.now()) / 86400000 : Infinity;
      return (days >= 0 && days <= 30) || (advanced.has(lead.stage) && probability >= 55);
    })
    .sort((a, b) => (validDate(a.expectedCloseDate)?.getTime() || Infinity) - (validDate(b.expectedCloseDate)?.getTime() || Infinity) || leadProbability(b) - leadProbability(a) || b.potentialValue - a.potentialValue);
  return {
    month,
    open,
    pipelineValue: sum(open),
    weightedForecast: weighted(open),
    expectedThisMonth: weighted(expected),
    wonThisMonth: sum(won),
    lostThisMonth: sum(lost),
    projectedRevenue: sum(won) + weighted(expected),
    stageRows,
    closingSoon,
  };
};
