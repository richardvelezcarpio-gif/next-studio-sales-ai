import type { Language, Lead } from "../types";
import { dealInsights } from "../services/sales/dealInsights";

const money = (value = 0) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
export function DealInsightsPanel({ leads, lang }: { leads: Lead[]; lang: Language }) {
  const es = lang === "es";
  const data = dealInsights(leads);
  const noData = es ? "Aún no hay suficientes datos." : "Not enough data yet.";
  const text = es ? { win: "Tasa de Cierre", average: "Venta Ganada Promedio", days: "Días Promedio para Cerrar", lost: "Valor de Ventas Perdidas", top: "Principal Razón de Pérdida", why: "Por Qué Perdemos Ventas", summary: "Ganadas vs Perdidas", won: "Ganadas", lostLabel: "Perdidas", unknown: "Sin especificar", deals: "ventas" } : { win: "Win Rate", average: "Average Won Deal", days: "Average Days to Close", lost: "Lost Deal Value", top: "Top Lost Reason", why: "Why We Lose Deals", summary: "Won vs Lost", won: "Won", lostLabel: "Lost", unknown: "Unknown", deals: "deals" };
  const reason = (name: string) => name === "Unknown" ? text.unknown : name;
  return <>
    <section className="kpis deal-insights-kpis">{[[text.win, data.wonCount + data.lostCount ? `${data.winRate.toFixed(1)}%` : "0%"], [text.average, data.wonCount ? money(data.averageWonDeal) : "—"], [text.days, data.averageDaysToClose == null ? "—" : `${data.averageDaysToClose.toFixed(1)} ${es ? "días" : "days"}`], [text.lost, money(data.lostValue)], [text.top, data.topLostReason ? reason(data.topLostReason.name) : "—"]].map(([title, value]) => <article className="kpi" key={title}><div><span>{title}</span><b>{value}</b></div></article>)}</section>
    <section className="grid-two"><section className="panel"><h2>{text.summary}</h2><div className="goal-stats compact"><span>{text.won}<b>{data.wonCount} · {money(data.wonValue)}</b></span><span>{text.lostLabel}<b>{data.lostCount} · {money(data.lostValue)}</b></span><span>{text.win}<b>{data.wonCount + data.lostCount ? `${data.winRate.toFixed(1)}%` : "—"}</b></span></div></section><section className="panel"><h2>{text.why}</h2>{data.lostReasons.length ? <div className="forecast-list">{data.lostReasons.map((item) => <article key={item.name}><div><b>{reason(item.name)}</b><small>{item.count} {text.deals}</small></div><span>{item.percent.toFixed(1)}%</span><span>{money(item.value)}</span></article>)}</div> : <p>{noData}</p>}</section></section>
  </>;
}
