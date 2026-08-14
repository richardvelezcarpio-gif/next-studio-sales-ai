import type { Lead } from "../../types";

const value = (lead: Lead) => lead.potentialValue || 0;
const reason = (lead: Lead) => lead.closingNotes?.match(/Lost reason:\s*([^\n]+)/i)?.[1]?.trim() || null;

export const dealInsights = (leads: Lead[]) => {
  const won = leads.filter((lead) => lead.stage === "won");
  const lost = leads.filter((lead) => lead.stage === "lost");
  const wonValue = won.reduce((sum, lead) => sum + value(lead), 0);
  const lostValue = lost.reduce((sum, lead) => sum + value(lead), 0);
  const closed = won.length + lost.length;
  const durations = won.flatMap((lead) => {
    const start = new Date(lead.createdAt).getTime();
    const end = lead.wonAt ? new Date(lead.wonAt).getTime() : NaN;
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? [(end - start) / 86400000] : [];
  });
  const reasons = lost.reduce<Record<string, { count: number; value: number }>>((all, lead) => {
    const key = reason(lead) || "Unknown";
    all[key] = { count: (all[key]?.count || 0) + 1, value: (all[key]?.value || 0) + value(lead) };
    return all;
  }, {});
  const lostReasons = Object.entries(reasons)
    .map(([name, data]) => ({ name, ...data, percent: lost.length ? (data.count / lost.length) * 100 : 0 }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  return {
    wonCount: won.length,
    lostCount: lost.length,
    wonValue,
    lostValue,
    winRate: closed ? (won.length / closed) * 100 : 0,
    averageWonDeal: won.length ? wonValue / won.length : 0,
    averageDaysToClose: durations.length ? durations.reduce((sum, days) => sum + days, 0) / durations.length : null,
    lostReasons,
    topLostReason: lostReasons[0] || null,
  };
};
