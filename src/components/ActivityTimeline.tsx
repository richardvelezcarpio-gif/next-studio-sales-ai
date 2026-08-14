import { useEffect, useState } from "react";
import type { Lead, Language } from "../types";
import { tasksRepository } from "../services/db/tasks";
import { followUpsRepository } from "../services/db/followUps";
import { communicationsRepository } from "../services/db/communications";
export type ActivityTimelineItem = {
  id: string;
  type: "prospect_created" | "task" | "follow_up" | "communication" | "draft";
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
              title: `${f.type} ${lang === "es" ? "seguimiento" : "follow-up"}`,
              description: f.note,
              timestamp: f.completedAt || f.dueAt || f.createdAt,
              status: f.status,
              source: "follow_ups",
            })),
            ...communications.map((c) => ({
              id: `communication-${c.id}`,
              type: "communication" as const,
              title: c.subject || c.channel,
              description: c.content,
              timestamp: c.sentAt || c.createdAt,
              status: c.status,
              source: "communications",
            })),
            ...drafts.map((d) => ({
              id: `draft-${d.id}`,
              type: "draft" as const,
              title: `${lang === "es" ? "Borrador" : "Draft"} · ${d.channel}`,
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
  }, [prospect.id, prospect.createdAt, refreshKey, lang]);
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
              {new Date(x.timestamp).toLocaleString()}{" "}
              {x.status && ` · ${x.status}`}
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
