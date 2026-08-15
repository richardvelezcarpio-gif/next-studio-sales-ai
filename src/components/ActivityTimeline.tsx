import { useEffect, useState } from "react";
import type { Lead, Language } from "../types";
import { tasksRepository } from "../services/db/tasks";
import { followUpsRepository } from "../services/db/followUps";
import { communicationsRepository } from "../services/db/communications";
import { statusLabel } from "../i18n";
export type ActivityTimelineItem = {
  id: string;
  type: "prospect_created" | "task" | "follow_up" | "communication" | "draft" | "deal_won" | "deal_lost";
  title: string;
  description?: string;
  timestamp: string;
  status?: string;
  source: string;
};
export function ActivityTimeline({
  prospect,
  refreshKey = 0,
  lang,
}: {
  prospect: Lead;
  refreshKey?: number;
  lang: Language;
}) {
  const [items, setItems] = useState<ActivityTimelineItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    Promise.all([
      tasksRepository.getByProspectId(prospect.id),
      followUpsRepository.getByProspectId(prospect.id),
      communicationsRepository.getCommunicationsByProspectId(prospect.id),
      communicationsRepository.getDraftsByProspectId(prospect.id),
    ])
      .then(([tasks, follows, communications, drafts]) =>
        setItems(
          [
            {
              id: `prospect-${prospect.id}`,
              type: "prospect_created" as const,
              title: lang === "es" ? "Prospecto creado" : "Prospect created",
              timestamp: prospect.createdAt,
              source: "prospect",
            },
            ...(prospect.wonAt ? [{
              id: `won-${prospect.id}`,
              type: "deal_won" as const,
              title: lang === "es" ? "Venta Ganada" : "Deal Won",
              description: `${lang === "es" ? "Valor" : "Value"}: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(prospect.potentialValue)}${prospect.closingNotes ? ` · ${prospect.closingNotes}` : ""}`,
              timestamp: prospect.wonAt,
              status: "won",
              source: "prospect",
            }] : []),
            ...(prospect.lostAt ? [{
              id: `lost-${prospect.id}`,
              type: "deal_lost" as const,
              title: lang === "es" ? "Venta Perdida" : "Deal Lost",
              description: [prospect.competitor && `${lang === "es" ? "Competidor" : "Competitor"}: ${prospect.competitor}`, prospect.closingNotes].filter(Boolean).join(" · ") || undefined,
              timestamp: prospect.lostAt,
              status: "lost",
              source: "prospect",
            }] : []),
            ...tasks.map((t) => ({
              id: `task-${t.id}`,
              type: "task" as const,
              title: t.title,
              description: t.description,
              timestamp: t.updatedAt || t.createdAt,
              status: t.status,
              source: "tasks",
            })),
            ...follows.map((f) => ({
              id: `follow-${f.id}`,
              type: "follow_up" as const,
              title: `${statusLabel(lang, "channel", f.type)} ${lang === "es" ? "seguimiento" : "follow-up"}`,
              description: f.note,
              timestamp: f.completedAt || f.dueAt || f.createdAt,
              status: f.status,
              source: "follow_ups",
            })),
            ...communications.map((c) => ({
              id: `communication-${c.id}`,
              type: "communication" as const,
              title: c.subject || statusLabel(lang, "channel", c.channel),
              description: c.content,
              timestamp: c.sentAt || c.createdAt,
              status: c.status,
              source: "communications",
            })),
            ...drafts.map((d) => ({
              id: `draft-${d.id}`,
              type: "draft" as const,
              title: `${lang === "es" ? "Borrador" : "Draft"} · ${statusLabel(lang, "channel", d.channel)}`,
              description: d.subject || d.content,
              timestamp: d.updatedAt || d.createdAt,
              status: "draft",
              source: "drafts",
            })),
          ].sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          ),
        ),
      )
      .catch(() =>
        setError(
          lang === "es"
            ? "No se pudo cargar la actividad."
            : "Unable to load activity.",
        ),
      )
      .finally(() => setLoading(false));
  }, [prospect.id, prospect.createdAt, prospect.wonAt, prospect.lostAt, prospect.closingNotes, prospect.competitor, prospect.potentialValue, refreshKey, lang]);
  if (loading)
    return (
      <p>{lang === "es" ? "Cargando actividad..." : "Loading activity..."}</p>
    );
  if (error) return <p className="ai-note">{error}</p>;
  return (
    <div className="timeline">
      {items.map((x) => (
        <div key={x.id}>
          <span className="dot" />
          <div>
            <b>{x.title}</b>
            {x.description && <small>{x.description}</small>}
            <small>
              {new Date(x.timestamp).toLocaleString(lang === "es" ? "es-ES" : "en-US")}{" "}
              {x.status && ` · ${x.status === "draft" ? (lang === "es" ? "Borrador" : "Draft") : x.type === "task" ? statusLabel(lang, "task", x.status) : x.type === "follow_up" ? statusLabel(lang, "followUp", x.status) : x.type === "deal_won" ? (lang === "es" ? "Ganado" : "Won") : x.type === "deal_lost" ? (lang === "es" ? "Perdido" : "Lost") : x.status}`}
            </small>
          </div>
        </div>
      ))}
      {!items.length && (
        <p>{lang === "es" ? "Aún no hay actividad." : "No activity yet."}</p>
      )}
    </div>
  );
}
