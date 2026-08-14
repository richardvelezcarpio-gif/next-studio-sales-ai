import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Language, Lead, Task } from "../types";
import { label } from "../i18n";
import { useAuth } from "../auth/AuthProvider";
import { tasksRepository } from "../services/db/tasks";
import { followUpsRepository, type CloudFollowUp } from "../services/db/followUps";
import { salesGoalsRepository, type SalesGoalRecord } from "../services/db/salesGoals";
import { leadProbability, monthKey, revenueForecast, riskReasons } from "../services/sales/revenueForecast";

const copy = (lang: Language) => lang === "es" ? {
  forecast: "Pronóstico", pipeline: "Valor del Pipeline", weighted: "Pronóstico Ponderado", expected: "Esperado Este Mes", won: "Ganado Este Mes", lost: "Perdido Este Mes", byStage: "Pronóstico por Etapa", closing: "Próximos a Cerrar", risk: "Ventas en Riesgo", open: "Abrir Oportunidad", goal: "Meta Mensual de Ventas", target: "Meta", remaining: "Restante", progress: "Progreso", gap: "Diferencia para la Meta", save: "Guardar Meta", setGoal: "Configura tu meta mensual de ventas.", noOpen: "No hay oportunidades abiertas.", noClosing: "No hay ventas próximas a cerrar actualmente.", noRisk: "No hay ventas en riesgo actualmente.", forecastValue: "Pronóstico", error: "No se pudo guardar la meta.", loading: "Cargando pronóstico...", lastActivity: "Última actividad", expectedClose: "Cierre esperado", stage: "Etapa", value: "Valor", probability: "Probabilidad", count: "Oportunidades" } : {
  forecast: "Forecast", pipeline: "Pipeline Value", weighted: "Weighted Forecast", expected: "Expected This Month", won: "Won This Month", lost: "Lost This Month", byStage: "Forecast by Stage", closing: "Closing Soon", risk: "Deals At Risk", open: "Open Deal", goal: "Monthly Sales Goal", target: "Goal", remaining: "Remaining", progress: "Progress", gap: "Gap to Goal", save: "Save Goal", setGoal: "Set your monthly sales goal.", noOpen: "No open opportunities.", noClosing: "No deals are currently close to closing.", noRisk: "No deals currently at risk.", forecastValue: "Forecast", error: "Unable to save the goal.", loading: "Loading forecast...", lastActivity: "Last activity", expectedClose: "Expected Close", stage: "Stage", value: "Value", probability: "Probability", count: "Opportunities" };
const money = (value = 0) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString() : "—";
const name = (lead: Lead) => `${lead.firstName} ${lead.lastName}`.trim();

function useForecastData(month: string) {
  const { user, configured } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [followUps, setFollowUps] = useState<CloudFollowUp[]>([]);
  const [goal, setGoal] = useState<SalesGoalRecord | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!configured || !user) { setTasks([]); setFollowUps([]); setGoal(null); return; }
    setLoading(true);
    Promise.all([tasksRepository.getAll(), followUpsRepository.getAll(), salesGoalsRepository.getByMonth(month)])
      .then(([nextTasks, nextFollowUps, nextGoal]) => { setTasks(nextTasks); setFollowUps(nextFollowUps); setGoal(nextGoal); })
      .finally(() => setLoading(false));
  }, [configured, user, month]);
  return { tasks, followUps, goal, setGoal, loading, configured: Boolean(configured && user) };
}

export function ForecastPage({ leads, lang }: { leads: Lead[]; lang: Language }) {
  const nav = useNavigate();
  const [month, setMonth] = useState(monthKey());
  const { tasks, followUps, goal, setGoal, loading, configured } = useForecastData(month);
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const text = copy(lang);
  const forecast = useMemo(() => revenueForecast(leads, month), [leads, month]);
  useEffect(() => setTarget(goal ? String(goal.revenueGoal) : ""), [goal]);
  const saveGoal = async () => {
    if (!configured) return;
    setSaving(true); setError("");
    try { setGoal(await salesGoalsRepository.save({ id: goal?.id, month, revenueGoal: Number(target) || 0 })); }
    catch { setError(text.error); }
    finally { setSaving(false); }
  };
  const goalValue = goal?.revenueGoal || 0;
  const remaining = Math.max(goalValue - forecast.wonThisMonth, 0);
  const progress = goalValue ? (forecast.wonThisMonth / goalValue) * 100 : 0;
  const gap = Math.max(goalValue - forecast.projectedRevenue, 0);
  const risks = forecast.open.map((lead) => ({ lead, reasons: riskReasons(lead, tasks, followUps) })).filter((item) => item.reasons.length);
  return <>
    <div className="page-title"><div><h1>{text.forecast}</h1><p>Next Studio · Sales Workspace</p></div><input aria-label="Forecast month" type="month" value={month.slice(0, 7)} onChange={(event) => setMonth(`${event.target.value}-01`)} /></div>
    <section className="kpis forecast-kpis">
      {[[text.pipeline, forecast.pipelineValue], [text.weighted, forecast.weightedForecast], [text.expected, forecast.expectedThisMonth], [text.won, forecast.wonThisMonth], [text.lost, forecast.lostThisMonth]].map(([title, value]) => <article className="kpi" key={String(title)}><div><span>{title}</span><b>{money(Number(value))}</b></div></article>)}
    </section>
    <section className="panel forecast-goal"><h2>{text.goal}</h2>
      {configured && <div className="goal-form"><label><span>{text.target}</span><input type="number" min="0" value={target} onChange={(event) => setTarget(event.target.value)} /></label><button className="primary" disabled={saving} onClick={saveGoal}>{text.save}</button></div>}
      {!goalValue ? <p>{text.setGoal}</p> : <div className="goal-stats"><span>{text.target}<b>{money(goalValue)}</b></span><span>{text.won}<b>{money(forecast.wonThisMonth)}</b></span><span>{text.remaining}<b>{money(remaining)}</b></span><span>{text.progress}<b>{Math.min(progress, 100).toFixed(1)}%</b></span><span>{text.forecastValue}<b>{money(forecast.projectedRevenue)}</b></span><span>{text.gap}<b>{money(gap)}</b></span></div>}
      {error && <p className="ai-note">{error}</p>}
    </section>
    <section className="grid-two"><section className="panel"><h2>{text.byStage}</h2>{forecast.stageRows.length ? <div className="forecast-list">{forecast.stageRows.map((row) => <article key={row.stage}><div><b>{label(lang, "stage", row.stage)}</b><small>{row.count} {text.count.toLowerCase()}</small></div><span>{money(row.value)}</span><span>{money(row.weighted)}</span></article>)}</div> : <p>{text.noOpen}</p>}</section>
      <section className="panel"><h2>{text.closing}</h2>{forecast.closingSoon.length ? <DealList leads={forecast.closingSoon} lang={lang} onOpen={(lead) => nav(`/leads/${lead.id}`)} /> : <p>{text.noClosing}</p>}</section></section>
    <section className="panel"><h2>{text.risk}</h2>{risks.length ? <div className="forecast-list">{risks.map(({ lead, reasons }) => <article key={lead.id}><div><b>{name(lead)}</b><small>{reasons.join(" · ")}</small></div><span>{money(lead.potentialValue)}</span><button onClick={() => nav(`/leads/${lead.id}`)}>{text.open}</button></article>)}</div> : <p>{text.noRisk}</p>}</section>
    {loading && <p className="forecast-loading">{text.loading}</p>}
  </>;
}

function DealList({ leads, lang, onOpen }: { leads: Lead[]; lang: Language; onOpen: (lead: Lead) => void }) {
  const text = copy(lang);
  return <div className="forecast-list">{leads.map((lead) => <article key={lead.id}><div><b>{name(lead)}</b><small>{lead.business || label(lang, "stage", lead.stage)}</small></div><span>{money(lead.potentialValue)}</span><span>{leadProbability(lead)}%</span><span>{date(lead.expectedCloseDate)}</span><button onClick={() => onOpen(lead)}>{text.open}</button></article>)}</div>;
}

export function DashboardForecast({ leads, lang }: { leads: Lead[]; lang: Language }) {
  const nav = useNavigate();
  const month = monthKey();
  const { tasks, followUps, goal } = useForecastData(month);
  const forecast = useMemo(() => revenueForecast(leads, month), [leads, month]);
  const text = copy(lang);
  const risks = forecast.open.map((lead) => ({ lead, reasons: riskReasons(lead, tasks, followUps) })).filter((item) => item.reasons.length).slice(0, 3);
  const progress = goal?.revenueGoal ? (forecast.wonThisMonth / goal.revenueGoal) * 100 : 0;
  return <>
    <section className="panel dashboard-forecast"><h2>{text.forecast}</h2><div className="goal-stats compact"><span>{text.weighted}<b>{money(forecast.weightedForecast)}</b></span><span>{text.won}<b>{money(forecast.wonThisMonth)}</b></span><span>{text.progress}<b>{goal ? `${Math.min(progress, 100).toFixed(1)}%` : "—"}</b></span></div><button onClick={() => nav("/forecast")}>{lang === "es" ? "Ver Pronóstico" : "View Forecast"}</button></section>
    <section className="grid-two"><section className="panel"><h2>{text.closing}</h2>{forecast.closingSoon.length ? <DealList leads={forecast.closingSoon.slice(0, 3)} lang={lang} onOpen={(lead) => nav(`/leads/${lead.id}`)} /> : <p>{text.noClosing}</p>}</section><section className="panel"><h2>{text.risk}</h2>{risks.length ? <div className="forecast-list">{risks.map(({ lead, reasons }) => <article key={lead.id}><div><b>{name(lead)}</b><small>{reasons[0]}</small></div><button onClick={() => nav(`/leads/${lead.id}`)}>{lang === "es" ? "Abrir" : "Open"}</button></article>)}</div> : <p>{text.noRisk}</p>}</section></section>
  </>;
}
