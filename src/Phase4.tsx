import { useEffect, useState } from "react";
import {
  Check,
  FileText,
  MessageSquare,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { localEmailProvider } from "./services/communications/emailProvider";
import { communicationsRepository } from "./services/db/communications";
import { automationsRepository } from "./services/db/automations";
import { tasksRepository } from "./services/db/tasks";
import { useAuth } from "./auth/AuthProvider";
import type {
  AutomationRule,
  CommunicationMessage,
  Language,
  Task,
} from "./types";
const tx = (l: Language, en: string, es: string) => (l === "es" ? es : en);
const key = "nextStudioSalesOperations";
type Ops = {
  messages: CommunicationMessage[];
  tasks: Task[];
  rules: AutomationRule[];
};
const get = (): Ops => {
  try {
    return {
      messages: [],
      tasks: [],
      rules: [],
      ...JSON.parse(localStorage.getItem(key) || "{}"),
    };
  } catch {
    return { messages: [], tasks: [], rules: [] };
  }
};
const put = (x: Ops) => localStorage.setItem(key, JSON.stringify(x));
const uid = () => crypto.randomUUID();
export function Communications({
  db,
  lang,
  notify,
}: {
  db: any;
  lang: Language;
  notify: (s: string) => void;
}) {
  const { user, configured } = useAuth();
  const [ops, setOps] = useState(get());
  const [drafts, setDrafts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [leadId, setLeadId] = useState(db.leads[0]?.id || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const lead = db.leads.find((x: any) => x.id === leadId);
  useEffect(() => {
    if (!configured || !user) return;
    communicationsRepository
      .drafts()
      .then(setDrafts)
      .catch(() =>
        setError(
          tx(
            lang,
            "Unable to load drafts",
            "No se pudieron cargar los borradores",
          ),
        ),
      );
  }, [configured, user, lang]);
  const save = (x: Ops) => {
    setOps(x);
    put(x);
  };
  const draft = async () => {
    if (!lead) return;
    if (configured && user) {
      try {
        const saved = await communicationsRepository.createDraft({
          prospectId: lead.id,
          channel: "email",
          recipient: lead.email,
          subject,
          content: body,
        });
        setDrafts((x) => [saved, ...x]);
        notify(tx(lang, "Email draft created", "Borrador de correo creado"));
      } catch {
        setError(
          tx(lang, "Unable to save draft", "No se pudo guardar el borrador"),
        );
      }
      return;
    }
    const m = localEmailProvider.createDraft({
      prospectId: lead.id,
      channel: "email",
      direction: "outbound",
      subject,
      content: body,
    });
    save({ ...ops, messages: [m, ...ops.messages] });
    notify(tx(lang, "Email draft created", "Borrador de correo creado"));
  };
  const whatsapp = () => {
    if (!lead) return;
    window.open(
      `https://wa.me/${(lead.whatsapp || lead.phone).replace(/\D/g, "")}?text=${encodeURIComponent(body)}`,
      "_blank",
    );
    notify(tx(lang, "WhatsApp opened", "WhatsApp abierto"));
  };
  return (
    <>
      <Title lang={lang} en="Communications" es="Comunicaciones" />
      <div className="detail-grid">
        <section className="panel">
          {error && <p className="ai-note">{error}</p>}
          <h2>{tx(lang, "Email Composer", "Redactor de Correo")}</h2>
          <p className="ai-note">
            {tx(
              lang,
              "AI-generated. Review before sending.",
              "Generado por IA. Revísalo antes de enviarlo.",
            )}
          </p>
          <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            {db.leads.map((l: any) => (
              <option value={l.id}>
                {l.firstName} {l.lastName} ·{" "}
                {l.email || tx(lang, "No email", "Sin correo")}
              </option>
            ))}
          </select>
          <input
            placeholder={tx(lang, "Subject", "Asunto")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            placeholder={tx(
              lang,
              "Write or generate a message…",
              "Escribe o genera un mensaje…",
            )}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="button-row">
            <button className="primary" onClick={draft}>
              <FileText size={15} />
              {tx(lang, "Save Draft", "Guardar Borrador")}
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    tx(
                      lang,
                      "Review before sending? Local email provider cannot send email yet.",
                      "¿Revisar antes de enviar? El proveedor local aún no puede enviar correos.",
                    ),
                  )
                )
                  notify(
                    tx(
                      lang,
                      "Email kept as draft — Gmail is not connected.",
                      "El correo se mantuvo como borrador — Gmail no está conectado.",
                    ),
                  );
              }}
            >
              <Send size={15} />
              {tx(lang, "Preview & Send", "Previsualizar y Enviar")}
            </button>
            <button onClick={whatsapp}>
              <MessageSquare size={15} />
              {tx(lang, "Open WhatsApp", "Abrir WhatsApp")}
            </button>
          </div>
        </section>
        <section className="panel">
          <h2>
            {tx(lang, "Drafts & Email History", "Borradores e Historial")}
          </h2>
          <div className="ops-list">
            {(configured && user ? drafts : ops.messages).map((m: any) => (
              <article key={m.id}>
                <div>
                  <b>
                    {m.subject ||
                      tx(lang, "Untitled draft", "Borrador sin título")}
                  </b>
                  <span>
                    {m.status} · {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() =>
                    configured && user
                      ? communicationsRepository
                          .removeDraft(m.id)
                          .then(() =>
                            setDrafts((x) => x.filter((d) => d.id !== m.id)),
                          )
                          .catch(() =>
                            setError(
                              tx(
                                lang,
                                "Unable to delete draft",
                                "No se pudo eliminar el borrador",
                              ),
                            ),
                          )
                      : save({
                          ...ops,
                          messages: ops.messages.filter((x) => x.id !== m.id),
                        })
                  }
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))}
            {!(configured && user ? drafts : ops.messages).length && (
              <p>{tx(lang, "No drafts yet.", "Todavía no hay borradores.")}</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
export function Tasks({
  db,
  lang,
  notify,
}: {
  db: any;
  lang: Language;
  notify: (s: string) => void;
}) {
  const { user, configured } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(get().tasks);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    prospectId: "",
    dueDate: new Date().toISOString().slice(0, 10),
    priority: "medium" as Task["priority"],
  });
  useEffect(() => {
    if (!user || !configured) return;
    tasksRepository
      .getAll()
      .then(setTasks)
      .catch(() =>
        setError(
          tx(lang, "Unable to load tasks", "No se pudieron cargar las tareas"),
        ),
      );
  }, [user, configured, lang]);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const task: Task = {
      id: uid(),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      prospectId: form.prospectId || undefined,
      dueDate: form.dueDate,
      priority: form.priority,
      status: "open",
      source: "manual",
      createdAt: new Date().toISOString(),
    };
    try {
      const saved =
        configured && user ? await tasksRepository.create(task) : task;
      setTasks((x) => [saved, ...x]);
      if (!configured) put({ ...get(), tasks: [saved, ...get().tasks] });
      setOpen(false);
      setForm({
        title: "",
        description: "",
        prospectId: "",
        dueDate: new Date().toISOString().slice(0, 10),
        priority: "medium",
      });
      notify(tx(lang, "Task created", "Tarea creada"));
    } catch {
      setError(tx(lang, "Unable to save task", "No se pudo guardar la tarea"));
    }
  };
  const toggle = async (task: Task) => {
    const next = {
      ...task,
      status:
        task.status === "completed"
          ? ("open" as const)
          : ("completed" as const),
    };
    try {
      const saved =
        configured && user ? await tasksRepository.update(task.id, next) : next;
      setTasks((x) => x.map((t) => (t.id === task.id ? saved : t)));
      if (!configured)
        put({
          ...get(),
          tasks: get().tasks.map((t) => (t.id === task.id ? saved : t)),
        });
    } catch {
      setError(tx(lang, "Unable to save task", "No se pudo guardar la tarea"));
    }
  };
  const remove = async (task: Task) => {
    if (!confirm(tx(lang, "Delete this task?", "¿Eliminar esta tarea?")))
      return;
    try {
      if (configured && user) await tasksRepository.remove(task.id);
      setTasks((x) => x.filter((t) => t.id !== task.id));
      if (!configured)
        put({ ...get(), tasks: get().tasks.filter((t) => t.id !== task.id) });
    } catch {
      setError(
        tx(lang, "Unable to delete task", "No se pudo eliminar la tarea"),
      );
    }
  };
  return (
    <>
      <Title
        lang={lang}
        en="Tasks"
        es="Tareas"
        action={
          <button className="primary" onClick={() => setOpen(true)}>
            <Plus size={16} />
            {tx(lang, "Add Task", "Agregar tarea")}
          </button>
        }
      />
      <section className="panel">
        {error && <p className="ai-note">{error}</p>}
        <div className="task-list">
          {tasks.map((t) => {
            const lead = db.leads.find((l: any) => l.id === t.prospectId);
            return (
              <article key={t.id} className="task-card">
                <div className="task-card__content">
                  <b className="task-card__title">{t.title}</b>
                  {t.description && (
                    <p className="task-card__description">{t.description}</p>
                  )}
                  {lead && (
                    <span className="task-card__prospect">
                      {tx(lang, "Prospect", "Prospecto")}: {lead.firstName}{" "}
                      {lead.lastName}
                    </span>
                  )}
                  <div className="task-card__meta">
                    <span>
                      {tx(lang, "Due", "Vence")}: {t.dueDate || "—"}
                    </span>
                    <span className={`task-badge priority-${t.priority}`}>
                      {t.priority}
                    </span>
                    <span className={`task-badge status-${t.status}`}>
                      {t.status === "completed"
                        ? tx(lang, "Completed", "Completada")
                        : tx(lang, "Open", "Abierta")}
                    </span>
                  </div>
                </div>
                <div className="task-card__actions">
                  <button
                    className={t.status === "completed" ? "" : "primary"}
                    onClick={() => toggle(t)}
                  >
                    <Check size={15} />
                    {t.status === "completed"
                      ? tx(lang, "Reopen", "Reabrir")
                      : tx(lang, "Complete", "Completar")}
                  </button>
                  <button className="task-delete" onClick={() => remove(t)}>
                    <Trash2 size={15} />
                    {tx(lang, "Delete", "Eliminar")}
                  </button>
                </div>
              </article>
            );
          })}
          {!tasks.length && (
            <p>{tx(lang, "No tasks yet.", "Todavía no hay tareas.")}</p>
          )}
        </div>
      </section>
      {open && (
        <div className="modal-bg">
          <form className="modal" onSubmit={create}>
            <div>
              <h2>{tx(lang, "Create Task", "Crear tarea")}</h2>
              <button
                type="button"
                className="icon"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <section className="form-grid">
              <label>
                {tx(lang, "Task title", "Título de la tarea")}*
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label>
                {tx(lang, "Related prospect", "Prospecto relacionado")}
                <select
                  value={form.prospectId}
                  onChange={(e) =>
                    setForm({ ...form, prospectId: e.target.value })
                  }
                >
                  <option value="">{tx(lang, "None", "Ninguno")}</option>
                  {db.leads.map((l: any) => (
                    <option value={l.id}>
                      {l.firstName} {l.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {tx(lang, "Due date", "Fecha de vencimiento")}
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </label>
              <label>
                {tx(lang, "Priority", "Prioridad")}
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priority: e.target.value as Task["priority"],
                    })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="wide">
                {tx(lang, "Description / notes", "Descripción / notas")}
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
            </section>
            <footer>
              <button type="button" onClick={() => setOpen(false)}>
                {tx(lang, "Cancel", "Cancelar")}
              </button>
              <button className="primary">
                {tx(lang, "Create Task", "Crear tarea")}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
export function Automations({
  lang,
  notify,
}: {
  lang: Language;
  notify: (s: string) => void;
}) {
  const { user, configured } = useAuth();
  const [ops, setOps] = useState(get());
  const [rules, setRules] = useState<any[]>([]);
  const save = (x: Ops) => {
    setOps(x);
    put(x);
  };
  useEffect(() => {
    if (configured && user)
      automationsRepository
        .getAll()
        .then(setRules)
        .catch(() =>
          notify(
            tx(
              lang,
              "Unable to load automation rules",
              "No se pudieron cargar las reglas",
            ),
          ),
        );
  }, [configured, user, lang]);
  const add = async () => {
    const r: AutomationRule = {
      id: uid(),
      name: tx(
        lang,
        "Follow-up for inactive proposal",
        "Seguimiento para propuesta inactiva",
      ),
      trigger: "No Activity",
      condition: "Proposal > 3 days",
      action: "Create Follow-Up",
      active: true,
      timesTriggered: 0,
    };
    if (configured && user) {
      try {
        const saved = await automationsRepository.create({
          name: r.name,
          active: true,
          triggerType: r.trigger,
          condition: { description: r.condition },
          actionType: r.action,
        });
        setRules((x) => [saved, ...x]);
      } catch {
        notify(
          tx(
            lang,
            "Unable to save automation rule",
            "No se pudo guardar la regla",
          ),
        );
        return;
      }
    } else save({ ...ops, rules: [r, ...ops.rules] });
    notify(
      tx(lang, "Automation rule created", "Regla de automatización creada"),
    );
  };
  return (
    <>
      <Title
        lang={lang}
        en="Automations"
        es="Automatizaciones"
        action={
          <button className="primary" onClick={add}>
            <Plus size={16} />
            {tx(lang, "Create Rule", "Crear regla")}
          </button>
        }
      />
      <section className="panel">
        <p className="ai-note">
          {tx(
            lang,
            "Rules only create tasks, flags, recommendations, or drafts. They never send messages automatically.",
            "Las reglas solo crean tareas, alertas, recomendaciones o borradores. Nunca envían mensajes automáticamente.",
          )}
        </p>
        <div className="ops-list automation-list">
          {(configured && user
            ? rules.map((r: any) => ({
                ...r,
                trigger: r.trigger_type,
                condition: r.condition?.description || "",
                action: r.action_type,
                timesTriggered: r.times_triggered || 0,
                lastRun: r.last_run_at,
              }))
            : ops.rules
          ).map((r: any) => (
            <article key={r.id} className="automation-card">
              <div className="automation-card__content">
                <b>{r.name}</b>
                <span>
                  {r.trigger} · {r.condition} → {r.action}
                </span>
                <small>
                  {tx(lang, "Times triggered: ", "Veces activada: ")}
                  {r.timesTriggered}
                  {r.lastRun &&
                    ` · ${tx(lang, "Last run: ", "Última ejecución: ")}${new Date(r.lastRun).toLocaleString()}`}
                </small>
              </div>
              <div className="automation-card__controls"><label className="toggle">
                <span>
                  {r.active
                    ? tx(lang, "Active", "Activa")
                    : tx(lang, "Inactive", "Inactiva")}
                </span>
                <input
                  type="checkbox"
                  checked={r.active}
                  onChange={(e) =>
                    configured && user
                      ? automationsRepository
                          .update(r.id, { active: e.target.checked })
                          .then((saved) =>
                            setRules((all) =>
                              all.map((x) => (x.id === r.id ? saved : x)),
                            ),
                          )
                          .catch(() =>
                            notify(
                              tx(
                                lang,
                                "Unable to update automation rule",
                                "No se pudo actualizar la regla",
                              ),
                            ),
                          )
                      : save({
                          ...ops,
                          rules: ops.rules.map((x) =>
                            x.id === r.id
                              ? { ...x, active: e.target.checked }
                              : x,
                          ),
                        })
                  }
                />
              </label>
              {configured && user && (
                <>
                  <button
                    onClick={() => {
                      const name = prompt(
                        tx(lang, "Rule name", "Nombre de regla"),
                        r.name,
                      );
                      if (name)
                        automationsRepository
                          .update(r.id, { name })
                          .then((saved) =>
                            setRules((all) =>
                              all.map((x) => (x.id === r.id ? saved : x)),
                            ),
                          )
                          .catch(() =>
                            notify(
                              tx(
                                lang,
                                "Unable to update automation rule",
                                "No se pudo actualizar la regla",
                              ),
                            ),
                          );
                    }}
                  >
                    {tx(lang, "Edit", "Editar")}
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          tx(
                            lang,
                            "Delete this rule?",
                            "¿Eliminar esta regla?",
                          ),
                        )
                      )
                        automationsRepository
                          .remove(r.id)
                          .then(() =>
                            setRules((all) => all.filter((x) => x.id !== r.id)),
                          )
                          .catch(() =>
                            notify(
                              tx(
                                lang,
                                "Unable to delete automation rule",
                                "No se pudo eliminar la regla",
                              ),
                            ),
                          );
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}</div>
            </article>
          ))}
          {!(configured && user ? rules : ops.rules).length && (
            <p>
              {tx(
                lang,
                "No automation rules yet.",
                "Todavía no hay reglas de automatización.",
              )}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
function Title({
  lang,
  en,
  es,
  action,
}: {
  lang: Language;
  en: string;
  es: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{tx(lang, en, es)}</h1>
        <p>Next Studio · Sales Workspace</p>
      </div>
      {action}
    </div>
  );
}
