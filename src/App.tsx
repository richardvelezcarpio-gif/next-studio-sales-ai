import { useEffect, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  BarChart3,
  Users,
  Columns3,
  Clock3,
  MessageSquare,
  Settings as Gear,
  Plus,
  Search,
  ChevronRight,
  Phone,
  Mail,
  ExternalLink,
  Copy,
  CalendarDays,
  Trash2,
  Download,
  Upload,
  Check,
  Menu,
  X,
} from "lucide-react";
import { label, services, sources, stages, t } from "./i18n";
import { storage } from "./services/storage";
import type { FollowUp, Language, Lead, Stage } from "./types";
import { AIBadge, Insights, Playbook, intelligence } from "./Phase2";
import { AIHub } from "./Phase3";
import { Automations, Communications, Tasks } from "./Phase4";
import { prospectsRepository } from "./services/db/prospects";
import {
  followUpsRepository,
  type CloudFollowUp,
} from "./services/db/followUps";
import { useAuth } from "./auth/AuthProvider";
import { AIMessageAssistant } from "./components/AIMessageAssistant";
import { QuickFollowUp, QuickTask } from "./components/QuickActions";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { MarkLostModal, MarkWonModal } from "./components/DealClosingModals";
import { salesActions } from "./services/sales/nextBestAction";
import { closeProbability } from "./services/sales/closeProbability";
const id = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const money = (n = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const date = (d?: string) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString() : "—";
function App() {
  const { user, configured } = useAuth();
  const [lang, setLang] = useState<Language>(storage.language());
  const [db, setDb] = useState(storage.get());
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!user || !configured) return;
    setDb((x) => ({ ...x, leads: [] }));
    prospectsRepository
      .getAll()
      .then((leads) => setDb((x) => ({ ...x, leads })))
      .catch((error) => {
        console.error("Unable to load prospects", error);
        setDb((x) => ({ ...x, leads: [] }));
        setToast("Unable to load prospects");
      });
  }, [user, configured]);
  const save = async (next: typeof db) => {
    const prior = db.leads,
      added = next.leads.filter((l) => !prior.some((p) => p.id === l.id)),
      removed = prior.filter((p) => !next.leads.some((l) => l.id === p.id)),
      changed = next.leads.filter((l) => {
        const p = prior.find((x) => x.id === l.id);
        return p && JSON.stringify(p) !== JSON.stringify(l);
      });
    try {
      let cloudLeads = next.leads;
      if (configured && user) {
        for (const l of added) {
          const created = await prospectsRepository.create(l);
          cloudLeads = cloudLeads.map((x) => (x.id === l.id ? created : x));
        }
        for (const l of changed) await prospectsRepository.update(l.id, l);
        for (const l of removed) await prospectsRepository.remove(l.id);
      }
      const saved = { ...next, leads: cloudLeads };
      setDb(saved);
      storage.save({ ...saved, leads: configured ? [] : saved.leads });
    } catch (error) {
      console.error("Unable to save prospect", error);
      setToast("Unable to save prospect");
    }
  };
  const persistProspectStrict = async (lead: Lead) => {
    const saved = await prospectsRepository.update(lead.id, lead);
    setDb((current) => {
      const next = { ...current, leads: current.leads.map((item) => item.id === saved.id ? saved : item) };
      storage.save({ ...next, leads: configured ? [] : next.leads });
      return next;
    });
    return saved;
  };
  const notify = (x: string) => {
    setToast(x);
    setTimeout(() => setToast(""), 2400);
  };
  return (
    <BrowserRouter>
      <Shell
        lang={lang}
        setLang={(l) => {
          setLang(l);
          storage.setLanguage(l);
        }}
      >
        <Routes>
          <Route path="*" element={<Dashboard db={db} lang={lang} />} />
          <Route
            path="/dashboard"
            element={<Dashboard db={db} lang={lang} />}
          />
          <Route path="/actions" element={<SalesActions db={db} lang={lang} />} />
          <Route
            path="/leads"
            element={<Leads db={db} save={save} lang={lang} notify={notify} />}
          />
          <Route
            path="/leads/:id"
            element={<Detail db={db} save={save} persistProspectStrict={persistProspectStrict} lang={lang} notify={notify} />}
          />
          <Route
            path="/pipeline"
            element={
              <Pipeline db={db} save={save} persistProspectStrict={persistProspectStrict} lang={lang} notify={notify} />
            }
          />
          <Route
            path="/follow-ups"
            element={<FollowUpsCloud db={db} lang={lang} />}
          />
          <Route
            path="/tasks"
            element={<Tasks db={db} lang={lang} notify={notify} />}
          />
          <Route
            path="/communications"
            element={<Communications db={db} lang={lang} notify={notify} />}
          />
          <Route
            path="/automations"
            element={<Automations lang={lang} notify={notify} />}
          />
          <Route
            path="/messages"
            element={
              <Messages db={db} save={save} lang={lang} notify={notify} />
            }
          />
          <Route
            path="/playbook"
            element={<Playbook db={db} lang={lang} notify={notify} />}
          />
          <Route path="/insights" element={<Insights db={db} lang={lang} />} />
          <Route
            path="/ai"
            element={<AIHub db={db} lang={lang} notify={notify} />}
          />
          <Route
            path="/settings"
            element={
              <SettingsPage db={db} save={save} lang={lang} notify={notify} />
            }
          />
        </Routes>
      </Shell>
      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
        </div>
      )}
    </BrowserRouter>
  );
}
function Shell({
  children,
  lang,
  setLang,
}: {
  children: React.ReactNode;
  lang: Language;
  setLang: (l: Language) => void;
}) {
  const [mobile, setMobile] = useState(false);
  const nav = [
    ["/dashboard", "dashboard", BarChart3],
    ["/leads", "leads", Users],
    ["/pipeline", "pipeline", Columns3],
    ["/follow-ups", "followups", Clock3],
    ["/tasks", "Tasks", Check],
    ["/communications", "Communications", Mail],
    ["/messages", "messages", MessageSquare],
    ["/playbook", "playbook", Copy],
    ["/automations", "Automations", Clock3],
    ["/insights", "insights", BarChart3],
    ["/ai", "AI Center", BarChart3],
    ["/settings", "settings", Gear],
  ] as const;
  return (
    <div className="app">
      <aside className={mobile ? "side open" : "side"}>
        <div className="brand">
          <span className="brand-mark">N</span>
          <div>
            NEXT STUDIO<small>Sales AI</small>
          </div>
          <button className="mobile-only" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([to, key, Icon]) => (
            <NavLink key={to} to={to} onClick={() => setMobile(false)}>
              <Icon size={19} />
              {["AI Center", "Tasks", "Communications", "Automations"].includes(
                key,
              )
                ? key
                : (t as any)(lang, key)}
            </NavLink>
          ))}
        </nav>
        <div className="workspace">
          Next Studio<small>Sales Workspace</small>
        </div>
      </aside>
      <main>
        <header>
          <button className="mobile-only icon" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div>
            <strong>Next Studio Sales AI</strong>
            <span>Turn conversations into customers.</span>
          </div>
          <select
            className="language"
            value={lang}
            onChange={(e) => setLang(e.target.value as Language)}
            aria-label="Language"
          >
            <option value="en">🇺🇸 English</option>
            <option value="es">🇪🇨 Español</option>
          </select>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
function Dashboard({
  db,
  lang,
}: {
  db: ReturnType<typeof storage.get>;
  lang: Language;
}) {
  const nav = useNavigate();
  const recommendations = salesActions(db.leads).slice(0, 5);
  const count = (s: Stage) => db.leads.filter((l) => l.stage === s).length;
  const cards = [
    [t(lang, "total"), db.leads.length, Users],
    [t(lang, "contacted"), count("contacted"), MessageSquare],
    [t(lang, "interested"), count("interested"), ChevronRight],
    [t(lang, "appointments"), count("appointment"), CalendarDays],
    [t(lang, "quotes"), count("quote_sent"), BarChart3],
    [t(lang, "won"), count("won"), Check],
    [
      t(lang, "potential"),
      money(
        db.leads
          .filter((l) => !["lost", "won"].includes(l.stage))
          .reduce((a, l) => a + l.potentialValue, 0),
      ),
      BarChart3,
    ],
    [
      t(lang, "revenue"),
      money(
        db.leads
          .filter((l) => l.stage === "won")
          .reduce((a, l) => a + (l.finalSaleAmount || l.potentialValue), 0),
      ),
      BarChart3,
    ],
  ] as const;
  const follows = db.followUps.filter(
    (f) => f.date === today() && !f.completed,
  );
  return (
    <>
      <PageTitle title={t(lang, "dashboard")} />
      <section className="kpis">
        {cards.map(([x, n, I]) => (
          <article className="kpi" key={x}>
            <div>
              <span>{x}</span>
              <b>{n}</b>
            </div>
            <I />
          </article>
        ))}
      </section>
      <section className="grid-two">
        <Panel title={t(lang, "funnel")}>
          <div className="funnel">
            {stages
              .filter((s) => s !== "lost" && s !== "information_sent")
              .map((s) => (
                <div key={s}>
                  <span>{label(lang, "stage", s)}</span>
                  <i>
                    <em
                      style={{
                        width: `${db.leads.length ? Math.max(8, (count(s) / db.leads.length) * 100) : 0}%`,
                      }}
                    />
                  </i>
                  <b>{count(s)}</b>
                </div>
              ))}
          </div>
        </Panel>
        <Panel title={t(lang, "today")}>
          <FollowList data={follows} db={db} lang={lang} />
        </Panel>
      </section>
      <Panel title={lang === "es" ? "Acciones de Venta de Hoy" : "Today's Sales Actions"}>
        {recommendations.length ? <div className="follow-list">{recommendations.map(a=>{const l=db.leads.find(x=>x.id===a.prospectId);return <article key={a.prospectId}><div><b>{l?.firstName} {l?.lastName}</b><span>{a.recommendation} · {money(a.potentialValue)}</span></div><button onClick={()=>nav('/leads/'+a.prospectId)}>{lang==='es'?'Abrir':'Open'}</button></article>})}</div> : <p>{lang==='es'?'Todo está al día.':'You’re all caught up.'}</p>}
        <button onClick={()=>nav('/actions')}>{lang==='es'?'Ver todas las acciones':'View All Sales Actions'}</button>
      </Panel>
      <Panel title={t(lang, "activity")}>
        <div className="timeline">
          {db.activities.slice(0, 6).map((a) => (
            <div key={a.id}>
              <span className="dot" />
              <div>
                <b>{a.title}</b>
                <small>{new Date(a.createdAt).toLocaleString()}</small>
              </div>
            </div>
          ))}
          {!db.activities.length && <Empty lang={lang} />}
        </div>
      </Panel>
    </>
  );
}
function SalesActions({db,lang}:{db:ReturnType<typeof storage.get>;lang:Language}){const nav=useNavigate(),actions=salesActions(db.leads);const [prospect,setProspect]=useState<Lead>();const [task,setTask]=useState<Lead>();const [follow,setFollow]=useState<Lead>();return <><PageTitle title={lang==='es'?'Centro de Acciones':'Sales Action Center'}/><section className="panel"><div className="sales-actions">{actions.map(a=>{const lead=db.leads.find(l=>l.id===a.prospectId);return <article className="sales-action-card" key={a.prospectId}><span className={`task-badge priority-${a.priority}`}>{a.priority}</span><div><b>{lead?`${lead.firstName} ${lead.lastName}`:''}</b><p>{a.reason}</p><small>{a.recommendation} · {money(a.potentialValue)}</small></div><div className="button-row"><button className="primary" onClick={()=>nav('/leads/'+a.prospectId)}>{lang==='es'?'Abrir prospecto':'Open Prospect'}</button>{lead&&<><button onClick={()=>setTask(lead)}>{lang==='es'?'Crear Tarea':'Create Task'}</button><button onClick={()=>setFollow(lead)}>{lang==='es'?'Crear Seguimiento':'Create Follow-up'}</button><button onClick={()=>setProspect(lead)}>{lang==='es'?'Preparar mensaje':'Draft Message'}</button></>}</div></article>})}{!actions.length&&<p>{lang==='es'?'Todo está al día.':'You’re all caught up.'}</p>}</div></section>{prospect&&<AIMessageAssistant prospect={prospect} open onClose={()=>setProspect(undefined)} lang={lang}/>} {task&&<QuickTask prospect={task} lang={lang} onClose={()=>setTask(undefined)}/>} {follow&&<QuickFollowUp prospect={follow} lang={lang} onClose={()=>setFollow(undefined)}/>}</>}
function PageTitle({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        <p>Next Studio · Sales Workspace</p>
      </div>
      {children}
    </div>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Empty({ lang }: { lang: Language }) {
  return (
    <div className="empty">
      <Users />
      <b>{t(lang, "empty")}</b>
      <span>{t(lang, "emptyCopy")}</span>
    </div>
  );
}
function Leads({
  db,
  save,
  lang,
  notify,
}: {
  db: ReturnType<typeof storage.get>;
  save: any;
  lang: Language;
  notify: (x: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [service, setService] = useState("");
  const [priority, setPriority] = useState("");
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const leads = db.leads.filter(
    (l) =>
      `${l.firstName} ${l.lastName} ${l.business} ${l.phone} ${l.email}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!stage || l.stage === stage) &&
      (!source || l.source === source) &&
      (!service || l.service === service) &&
      (!priority || intelligence(l, db).priority === priority),
  );
  return (
    <>
      <PageTitle title={t(lang, "leads")}>
        <button className="primary" onClick={() => setOpen(true)}>
          <Plus size={17} />
          {t(lang, "add")}
        </button>
      </PageTitle>
      <div className="toolbar">
        <label>
          <Search size={17} />
          <input
            placeholder={t(lang, "search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Filter
          value={stage}
          onChange={setStage}
          title={t(lang, "stage")}
          options={stages.map((x) => [x, label(lang, "stage", x)])}
        />
        <Filter
          value={source}
          onChange={setSource}
          title={t(lang, "source")}
          options={sources.map((x) => [x, label(lang, "source", x)])}
        />
        <Filter
          value={service}
          onChange={setService}
          title={t(lang, "service")}
          options={services.map((x) => [x, label(lang, "service", x)])}
        />
        <Filter
          value={priority}
          onChange={setPriority}
          title="AI Priority"
          options={["critical", "high", "medium", "low"].map((x) => [x, x])}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {[
                t(lang, "name"),
                t(lang, "business"),
                t(lang, "source"),
                t(lang, "service"),
                t(lang, "stage"),
                "AI Score",
                "Next Follow-up",
                t(lang, "value"),
                "",
              ].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} onClick={() => nav("/leads/" + l.id)}>
                <td>
                  <b>
                    {l.firstName} {l.lastName}
                  </b>
                  {l.demo && <small>Demo</small>}
                </td>
                <td>{l.business || "—"}</td>
                <td>{label(lang, "source", l.source)}</td>
                <td>{label(lang, "service", l.service)}</td>
                <td>
                  <Badge lang={lang} stage={l.stage} />
                </td>
                <td>
                  <AIBadge lead={l} db={db} lang={lang} />
                </td>
                <td>{date(l.nextFollowUp)}</td>
                <td>{money(l.potentialValue)}</td>
                <td>
                  <ChevronRight />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!leads.length && <Empty lang={lang} />}
      </div>
      {open && (
        <LeadModal
          lang={lang}
          onClose={() => setOpen(false)}
          onSave={(l) => {
            save({
              ...db,
              leads: [...db.leads, l],
              activities: [
                {
                  id: id(),
                  leadId: l.id,
                  title: "Lead created",
                  createdAt: new Date().toISOString(),
                },
                ...db.activities,
              ],
            });
            setOpen(false);
            notify(t(lang, "toastCreated"));
          }}
        />
      )}
    </>
  );
}
function Filter({
  value,
  onChange,
  title,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  title: string;
  options: string[][];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{title}</option>
      {options.map(([v, n]) => (
        <option key={v} value={v}>
          {n}
        </option>
      ))}
    </select>
  );
}
function LeadModal({
  lang,
  onClose,
  onSave,
}: {
  lang: Language;
  onClose: () => void;
  onSave: (l: Lead) => void;
}) {
  const [f, setF] = useState<Partial<Lead>>({
    source: "instagram",
    service: "website",
    stage: "new",
    preferredLanguage: "en",
    potentialValue: 0,
  });
  const set = (k: keyof Lead, v: string | number) => setF({ ...f, [k]: v });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.firstName || !f.phone) return;
    onSave({
      id: id(),
      firstName: f.firstName,
      lastName: f.lastName || "",
      business: f.business || "",
      phone: f.phone,
      email: f.email || "",
      whatsapp: f.whatsapp || f.phone,
      instagram: f.instagram || "",
      facebook: f.facebook || "",
      website: f.website || "",
      businessType: f.businessType || "",
      city: f.city || "",
      state: f.state || "",
      source: f.source!,
      service: f.service!,
      stage: "new",
      potentialValue: Number(f.potentialValue || 0),
      preferredLanguage: f.preferredLanguage!,
      quoteStatus: "not_sent",
      createdAt: new Date().toISOString(),
    });
  };
  const fields: [keyof Lead, string, string?][] = [
    ["firstName", "First Name*"],
    ["lastName", "Last Name"],
    ["business", "Business / Company"],
    ["phone", "Phone*"],
    ["email", "Email"],
    ["whatsapp", "WhatsApp Number"],
    ["instagram", "Instagram"],
    ["website", "Website"],
    ["businessType", "Business Type"],
    ["city", "City"],
    ["state", "State"],
    ["potentialValue", "Potential Value", "number"],
  ];
  return (
    <div className="modal-bg">
      <form className="modal" onSubmit={submit}>
        <div>
          <h2>{t(lang, "add")}</h2>
          <button type="button" className="icon" onClick={onClose}>
            <X />
          </button>
        </div>
        <section className="form-grid">
          {fields.map(([k, n, type]) => (
            <label key={k}>
              {n}
              <input
                required={n.endsWith("*")}
                type={type || "text"}
                value={String(f[k] || "")}
                onChange={(e) => set(k, e.target.value)}
              />
            </label>
          ))}
          <label>
            {t(lang, "source")}
            <select
              value={f.source}
              onChange={(e) => set("source", e.target.value)}
            >
              {sources.map((x) => (
                <option value={x}>{label(lang, "source", x)}</option>
              ))}
            </select>
          </label>
          <label>
            {t(lang, "service")}
            <select
              value={f.service}
              onChange={(e) => set("service", e.target.value)}
            >
              {services.map((x) => (
                <option value={x}>{label(lang, "service", x)}</option>
              ))}
            </select>
          </label>
          <label>
            {t(lang, "preferred")}
            <select
              value={f.preferredLanguage}
              onChange={(e) => set("preferredLanguage", e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
        </section>
        <footer>
          <button type="button" onClick={onClose}>
            {t(lang, "cancel")}
          </button>
          <button className="primary">{t(lang, "save")}</button>
        </footer>
      </form>
    </div>
  );
}
function Badge({ lang, stage }: { lang: Language; stage: Stage }) {
  return (
    <span className={"badge " + stage}>{label(lang, "stage", stage)}</span>
  );
}
function Pipeline({
  db,
  save,
  persistProspectStrict,
  lang,
  notify,
}: {
  db: ReturnType<typeof storage.get>;
  save: any;
  persistProspectStrict: (lead: Lead) => Promise<Lead>;
  lang: Language;
  notify: (x: string) => void;
}) {
  const nav = useNavigate();
  const [closing,setClosing]=useState<{lead:Lead;stage:'won'|'lost'}|null>(null);
  const move = (lead: Lead, stage: Stage) => {
    if (lead.stage === stage) return;
    if(stage==='won'||stage==='lost'){setClosing({lead,stage});return}
    save({
      ...db,
      leads: db.leads.map((l) => (l.id === lead.id ? { ...l, stage } : l)),
      activities: [
        {
          id: id(),
          leadId: lead.id,
          title: `Stage changed from ${lead.stage} to ${stage}`,
          createdAt: new Date().toISOString(),
        },
        ...db.activities,
      ],
    });
    notify(t(lang, "toastStage"));
  };
  return (
    <>
      <PageTitle title={t(lang, "pipeline")} />
      <div className="kanban">
        {stages.map((s) => (
          <section
            className="column"
            key={s}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const l = db.leads.find(
                (x) => x.id === e.dataTransfer.getData("lead"),
              );
              if (l) move(l, s);
            }}
          >
            <h3>
              {label(lang, "stage", s)}{" "}
              <small>{db.leads.filter((l) => l.stage === s).length}</small>
            </h3>
            {db.leads
              .filter((l) => l.stage === s)
              .map((l) => (
                <article
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("lead", l.id)}
                  className="lead-card"
                  key={l.id}
                >
                  <b>
                    {l.firstName} {l.lastName}
                  </b>
                  <span>{l.business}</span>
                  <small>
                    {label(lang, "service", l.service)} ·{" "}
                    {money(l.potentialValue)}
                  </small>
                  <div>
                    <button
                      onClick={() =>
                        window.open(
                          `https://wa.me/${(l.whatsapp || l.phone).replace(/\D/g, "")}`,
                        )
                      }
                    >
                      <MessageSquare size={15} />
                    </button>
                    <button onClick={() => nav("/leads/" + l.id)}>
                      <ExternalLink size={15} />
                    </button>
                  </div>
                </article>
              ))}
          </section>
        ))}
      </div>
      {closing?.stage === "won" && (
        <MarkWonModal
          lead={closing.lead}
          lang={lang}
          onCancel={() => setClosing(null)}
          onConfirm={async (patch) => {
            await persistProspectStrict({ ...closing.lead, ...patch });
          }}
        />
      )}
      {closing?.stage === "lost" && (
        <MarkLostModal
          lead={closing.lead}
          lang={lang}
          onCancel={() => setClosing(null)}
          onConfirm={async (patch) => {
            await persistProspectStrict({ ...closing.lead, ...patch });
          }}
        />
      )}
    </>
  );
}
function Detail({
  db,
  save,
  persistProspectStrict,
  lang,
  notify,
}: {
  db: ReturnType<typeof storage.get>;
  save: any;
  persistProspectStrict: (lead: Lead) => Promise<Lead>;
  lang: Language;
  notify: (x: string) => void;
}) {
  const { id: leadId } = useParams();
  const nav = useNavigate();
  const lead = db.leads.find((l) => l.id === leadId);
  const [note, setNote] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [quickFollowOpen, setQuickFollowOpen] = useState(false);
  const [closeModal,setCloseModal]=useState<'won'|'lost'|null>(null);
  const [activityRefreshKey,setActivityRefreshKey]=useState(0);
  const handleActivityChanged=()=>setActivityRefreshKey(x=>x+1);
  if (!lead) return <Empty lang={lang} />;
  const recommendation = salesActions([lead])[0];
  const closing=closeProbability(lead); const displayedProbability=lead.probability??closing.probability;
  const message = (cat: string) => {
    const x = db.templates.find((q) => q.category === cat);
    if (!x) return "";
    const l = lead.preferredLanguage;
    return (l === "en" ? x.en : x.es)
      .replace(/\{firstName\}/g, lead.firstName)
      .replace(/\{businessName\}/g, lead.business)
      .replace(/\{service\}/g, label(l, "service", lead.service))
      .replace(/\{landingUrl\}/g, db.settings.landingUrls[lead.service] || "")
      .replace(/\{digitalCardUrl\}/g, db.settings.digitalCardUrl)
      .replace(/\{bookingUrl\}/g, db.settings.bookingUrl);
  };
  const copy = (cat: string) =>
    navigator.clipboard.writeText(message(cat)).then(() => {
      save({
        ...db,
        activities: [
          {
            id: id(),
            leadId: lead.id,
            title: "Message copied",
            createdAt: new Date().toISOString(),
          },
          ...db.activities,
        ],
      });
      notify(t(lang, "toastCopied"));
    });
  const update = (x: Partial<Lead>) =>
    save({
      ...db,
      leads: db.leads.map((l) => (l.id === lead.id ? { ...l, ...x } : l)),
    });
  const action = (url: string, title: string) => {
    window.open(url, "_blank");
    save({
      ...db,
      activities: [
        {
          id: id(),
          leadId: lead.id,
          title,
          createdAt: new Date().toISOString(),
        },
        ...db.activities,
      ],
    });
  };
  return (
    <>
      <PageTitle title={lead.firstName + " " + lead.lastName}>
        <button onClick={() => nav("/leads")}>{t(lang, "leads")}</button>
      </PageTitle>
      <section className="lead-head">
        <div>
          <Panel title={lang==='es'?'Inteligencia de Cierre':'Closing Intelligence'}><div className="facts"><span>{lang==='es'?'Valor potencial':'Potential Value'}<b>{money(lead.potentialValue)}</b></span><span>{lang==='es'?'Probabilidad estimada':'Estimated Close Probability'}<b>{displayedProbability}% · {closing.confidence}</b></span><span>{lang==='es'?'Etapa actual':'Current Stage'}<b>{label(lang,'stage',lead.stage)}</b></span><span>{lang==='es'?'Próximo paso':'Next Step'}<b>{lead.nextStep||recommendation?.recommendation||'—'}</b></span></div>{closing.risks.length>0&&<p className="ai-note">{lang==='es'?'En Riesgo: ':'At Risk: '}{closing.risks.join(' · ')}</p>}<p>{lang==='es'?'Acción recomendada: ':'Recommended Closing Action: '}{recommendation?.recommendation||closing.recommendation}</p></Panel>
          <span>{lead.business}</span>
          <h1>{money(lead.potentialValue)}</h1>
        </div>
        <select
          value={lead.stage}
          onChange={(e) => {
            update({ stage: e.target.value as Stage });
            notify(t(lang, "toastStage"));
          }}
        >
          {stages.map((s) => (
            <option value={s}>{label(lang, "stage", s)}</option>
          ))}
        </select>
      </section>
      <div className="detail-grid">
        <div>
          {recommendation && <Panel title={lang==='es'?'Próxima Mejor Acción':'Next Best Action'}><div className="ai-note"><b>{recommendation.priority.toUpperCase()}</b><p>{recommendation.recommendation}</p><small>{recommendation.reason} · {money(recommendation.potentialValue)}</small></div><div className="button-row"><button onClick={()=>setQuickFollowOpen(true)}>{lang==='es'?'Crear seguimiento':'Create Follow-up'}</button><button onClick={()=>setQuickTaskOpen(true)}>{lang==='es'?'Crear tarea':'Create Task'}</button>{lead.phone&&<button onClick={()=>window.open(`https://wa.me/${(lead.whatsapp||lead.phone).replace(/\D/g,'')}`)}>WhatsApp</button>}{lead.email&&<button onClick={()=>window.open(`mailto:${lead.email}`)}>Email</button>}</div></Panel>}
          {recommendation && <Panel title={lang==='es'?'Próxima Mejor Acción':'Next Best Action'}><button onClick={()=>setAssistantOpen(true)}>{lang==='es'?'Preparar mensaje':'Draft Message'}</button></Panel>}
          <div className="button-row"><button className="primary" onClick={()=>setCloseModal('won')}>{lang==='es'?'Marcar Ganado':'Mark Won'}</button><button onClick={()=>setCloseModal('lost')}>{lang==='es'?'Marcar Perdido':'Mark Lost'}</button></div>
          <Panel title={t(lang, "actions")}>
            <div className="action-grid">
              <button
                onClick={() =>
                  action(
                    `https://wa.me/${(lead.whatsapp || lead.phone).replace(/\D/g, "")}`,
                    "WhatsApp opened",
                  )
                }
              >
                <MessageSquare />
                Open WhatsApp
              </button>
              <button
                onClick={() => action(`tel:${lead.phone}`, "Call opened")}
              >
                <Phone />
                Call
              </button>
              <button
                onClick={() => action(`mailto:${lead.email}`, "Email opened")}
              >
                <Mail />
                Email
              </button>
              <button onClick={() => copy("initial")}>
                <Copy />
                Copy Message
              </button>
              <button
                onClick={() => {
                  const u = db.settings.landingUrls[lead.service];
                  if (u) action(u, "Landing page opened");
                  else notify("Landing page not configured");
                }}
              >
                <ExternalLink />
                {t(lang, "landing")}
              </button>
              <button onClick={() => copy("card")}>
                <Copy />
                {t(lang, "card")}
              </button>
              <button
                onClick={() =>
                  action(db.settings.bookingUrl, "Appointment link opened")
                }
              >
                <CalendarDays />
                {t(lang, "book")}
              </button>
              <button
                onClick={() => {
                  const d = prompt("YYYY-MM-DD", today());
                  if (d) {
                    save({
                      ...db,
                      followUps: [
                        ...db.followUps,
                        {
                          id: id(),
                          leadId: lead.id,
                          date: d,
                          reason: "Follow-up",
                          notes: "",
                          completed: false,
                        },
                      ],
                      leads: db.leads.map((l) =>
                        l.id === lead.id ? { ...l, nextFollowUp: d } : l,
                      ),
                    });
                    notify(t(lang, "toastFollow"));
                  }
                }}
              >
                <Clock3 />
                {t(lang, "follow")}
              </button>
            </div>
          </Panel>
          <Panel title={t(lang, "playbook")}>
            <div className="playbook">
              {[
                "initial",
                "voice",
                "landing",
                "card",
                "followup",
                "appointment",
                "quote",
              ].map((x, i) => (
                <article key={x}>
                  <span>{i + 1}</span>
                  <div>
                    <b>
                      {db.templates.find((q) => q.category === x)?.name ||
                        "Quote"}
                    </b>
                    <p>
                      {x === "quote"
                        ? "Prepare and send a tailored quote."
                        : message(x)}
                    </p>
                  </div>
                  <button onClick={() => copy(x)}>
                    <Copy size={15} />
                  </button>
                </article>
              ))}
            </div>
          </Panel>
        </div>
        <div>
          <Panel title={t(lang, "details")}>
            <div className="facts">
              <span>
                {t(lang, "phone")}
                <b>{lead.phone}</b>
              </span>
              <span>
                {t(lang, "email")}
                <b>{lead.email || "—"}</b>
              </span>
              <span>
                {t(lang, "preferred")}
                <b>{lead.preferredLanguage === "en" ? "English" : "Español"}</b>
              </span>
              <span>
                {t(lang, "quote")}
                <select
                  value={lead.quoteStatus}
                  onChange={(e) =>
                    update({
                      quoteStatus: e.target.value as Lead["quoteStatus"],
                    })
                  }
                >
                  <option value="not_sent">Not Sent</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </span>
            </div>
          </Panel>
          <Panel title={t(lang, "notes")}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
            />
            <button
              className="primary"
              onClick={() => {
                if (note.trim()) {
                  save({
                    ...db,
                    notes: [
                      {
                        id: id(),
                        leadId: lead.id,
                        body: note,
                        createdAt: new Date().toISOString(),
                      },
                      ...db.notes,
                    ],
                  });
                  setNote("");
                }
              }}
            >
              Add Note
            </button>
            {db.notes
              .filter((n) => n.leadId === lead.id)
              .map((n) => (
                <div className="note" key={n.id}>
                  {n.body}
                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </div>
              ))}
          </Panel>
          <Panel title={lang === "es" ? "Historial de Actividad" : "Activity Timeline"}>
            <ActivityTimeline prospect={lead} lang={lang} refreshKey={activityRefreshKey} />
          </Panel>
          <Panel title={t(lang, "activity")}>
            <div className="timeline">
              {db.activities
                .filter((a) => a.leadId === lead.id)
                .map((a) => (
                  <div key={a.id}>
                    <span className="dot" />
                    <div>
                      <b>{a.title}</b>
                      <small>{new Date(a.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
        </div>
      </div>
      <AIMessageAssistant prospect={lead} open={assistantOpen} onClose={()=>setAssistantOpen(false)} onSaved={handleActivityChanged} lang={lang}/>
      {quickTaskOpen&&<QuickTask prospect={lead} lang={lang} onSuccess={handleActivityChanged} onClose={()=>setQuickTaskOpen(false)}/>} {quickFollowOpen&&<QuickFollowUp prospect={lead} lang={lang} onSuccess={handleActivityChanged} onClose={()=>setQuickFollowOpen(false)}/>}
      {closeModal === "won" && (
        <MarkWonModal
          lead={lead}
          lang={lang}
          onCancel={() => setCloseModal(null)}
          onConfirm={async (patch) => {
            await persistProspectStrict({ ...lead, ...patch });
            handleActivityChanged();
          }}
        />
      )}
      {closeModal === "lost" && (
        <MarkLostModal
          lead={lead}
          lang={lang}
          onCancel={() => setCloseModal(null)}
          onConfirm={async (patch) => {
            await persistProspectStrict({ ...lead, ...patch });
            handleActivityChanged();
          }}
        />
      )}
    </>
  );
}
function FollowList({
  data,
  db,
  lang,
}: {
  data: FollowUp[];
  db: ReturnType<typeof storage.get>;
  lang: Language;
}) {
  const nav = useNavigate();
  if (!data.length) return <Empty lang={lang} />;
  return (
    <div className="follow-list">
      {data.map((f) => {
        const l = db.leads.find((x) => x.id === f.leadId);
        return (
          l && (
            <article key={f.id}>
              <div>
                <b>
                  {l.firstName} {l.lastName}
                </b>
                <span>
                  {l.business} · {date(f.date)}
                </span>
              </div>
              <button onClick={() => nav("/leads/" + l.id)}>
                {t(lang, "open")}
              </button>
            </article>
          )
        );
      })}
    </div>
  );
}
function FollowUps({
  db,
  save,
  lang,
  notify,
}: {
  db: ReturnType<typeof storage.get>;
  save: any;
  lang: Language;
  notify: (x: string) => void;
}) {
  const groups = [
    ["Overdue", db.followUps.filter((f) => !f.completed && f.date < today())],
    ["Today", db.followUps.filter((f) => !f.completed && f.date === today())],
    ["Upcoming", db.followUps.filter((f) => !f.completed && f.date > today())],
  ] as const;
  return (
    <>
      <PageTitle title={t(lang, "followups")} />
      {groups.map(([title, list]) => (
        <Panel title={title} key={title}>
          <div className="follow-list followups-cloud-list">
            {list.map((f) => {
              const l = db.leads.find((x) => x.id === f.leadId);
              return (
                l && (
                  <article key={f.id}>
                    <div>
                      <b>
                        {l.firstName} {l.lastName}{" "}
                        {f.date < today() && (
                          <span className="overdue">Overdue</span>
                        )}
                      </b>
                      <span>
                        {l.business} · {label(lang, "service", l.service)} ·{" "}
                        {date(f.date)}
                      </span>
                      <small>{f.notes || f.reason}</small>
                    </div>
                    <button
                      onClick={() =>
                        window.open(
                          `https://wa.me/${(l.whatsapp || l.phone).replace(/\D/g, "")}`,
                        )
                      }
                    >
                      <MessageSquare size={16} />
                    </button>
                    <button
                      className="primary"
                      onClick={() => {
                        save({
                          ...db,
                          followUps: db.followUps.map((x) =>
                            x.id === f.id ? { ...x, completed: true } : x,
                          ),
                          activities: [
                            {
                              id: id(),
                              leadId: l.id,
                              title: "Follow-up completed",
                              createdAt: new Date().toISOString(),
                            },
                            ...db.activities,
                          ],
                        });
                        notify(t(lang, "complete"));
                      }}
                    >
                      {t(lang, "complete")}
                    </button>
                  </article>
                )
              );
            })}
            {!list.length && <Empty lang={lang} />}
          </div>
        </Panel>
      ))}
    </>
  );
}
void FollowUps;
function FollowUpsCloud({
  db,
  lang,
}: {
  db: ReturnType<typeof storage.get>;
  lang: Language;
}) {
  const { user, configured } = useAuth();
  const [items, setItems] = useState<CloudFollowUp[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>();
  const blank = () => ({
    prospectId: db.leads[0]?.id || "",
    dueAt: new Date().toISOString().slice(0, 16),
    type: "call",
    note: "",
  });
  useEffect(() => {
    if (configured && user)
      followUpsRepository
        .getAll()
        .then(setItems)
        .catch(() =>
          setError(
            lang === "es"
              ? "No se pudieron cargar los seguimientos"
              : "Unable to load follow-ups",
          ),
        );
  }, [configured, user, lang]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const x = {
        prospectId: form.prospectId,
        dueAt: new Date(form.dueAt).toISOString(),
        type: form.type,
        note: form.note,
        status: "pending" as const,
      };
      const r = form.id
        ? await followUpsRepository.update(form.id, x)
        : await followUpsRepository.create(x);
      setItems((a) =>
        form.id ? a.map((i) => (i.id === r.id ? r : i)) : [r, ...a],
      );
      setForm(undefined);
    } catch {
      setError(
        lang === "es"
          ? "No se pudo guardar el seguimiento"
          : "Unable to save follow-up",
      );
    }
  };
  const update = async (x: CloudFollowUp, p: Partial<CloudFollowUp>) => {
    try {
      const r = await followUpsRepository.update(x.id, { ...x, ...p });
      setItems((a) => a.map((i) => (i.id === r.id ? r : i)));
    } catch {
      setError(lang === "es" ? "No se pudo actualizar" : "Unable to update");
    }
  };
  const remove = async (x: CloudFollowUp) => {
    if (
      !confirm(lang === "es" ? "¿Eliminar seguimiento?" : "Delete follow-up?")
    )
      return;
    try {
      await followUpsRepository.remove(x.id);
      setItems((a) => a.filter((i) => i.id !== x.id));
    } catch {
      setError(lang === "es" ? "No se pudo eliminar" : "Unable to delete");
    }
  };
  const now = new Date(),
    groups = [
      [
        lang === "es" ? "Vencidos" : "Overdue",
        items.filter(
          (x) =>
            x.status !== "completed" &&
            x.dueAt &&
            new Date(x.dueAt) < now &&
            x.dueAt.slice(0, 10) !== today(),
        ),
      ],
      [
        lang === "es" ? "Hoy" : "Today",
        items.filter(
          (x) => x.status !== "completed" && x.dueAt?.slice(0, 10) === today(),
        ),
      ],
      [
        lang === "es" ? "Próximos" : "Upcoming",
        items.filter(
          (x) =>
            x.status !== "completed" &&
            x.dueAt &&
            x.dueAt.slice(0, 10) > today(),
        ),
      ],
      [
        lang === "es" ? "Completados" : "Completed",
        items.filter((x) => x.status === "completed"),
      ],
    ] as const;
  return (
    <>
      <PageTitle title={t(lang, "followups")}>
        <button className="primary" onClick={() => setForm(blank())}>
          <Plus size={16} />
          {lang === "es" ? "Crear seguimiento" : "Create follow-up"}
        </button>
      </PageTitle>
      {error && <p className="ai-note">{error}</p>}
      {groups.map(([name, list]) => (
        <Panel title={name} key={name}>
          <div className="follow-list">
            {list.map((x) => {
              const l = db.leads.find((q) => q.id === x.prospectId);
              return (
                <article key={x.id} className="followup-card">
                  <div className="followup-card__content">
                    <b>
                      {l
                        ? `${l.firstName} ${l.lastName}`
                        : lang === "es"
                          ? "Prospecto eliminado"
                          : "Deleted prospect"}
                    </b>
                    <span>
                      {x.type} · {x.dueAt && new Date(x.dueAt).toLocaleString()}{" "}
                      · {x.status}
                    </span>
                    <small>{x.note}</small>
                  </div>
                  <div className="followup-card__actions"><button
                    className="primary"
                    onClick={() =>
                      update(x, {
                        status:
                          x.status === "completed" ? "pending" : "completed",
                        completedAt:
                          x.status === "completed"
                            ? undefined
                            : new Date().toISOString(),
                      })
                    }
                  >
                    {x.status === "completed"
                      ? lang === "es"
                        ? "Reabrir"
                        : "Reopen"
                      : lang === "es"
                        ? "Completar"
                        : "Complete"}
                  </button>
                  <button
                    onClick={() => {
                      const due = prompt(
                        lang === "es"
                          ? "Nueva fecha/hora YYYY-MM-DDTHH:mm"
                          : "New date/time YYYY-MM-DDTHH:mm",
                        x.dueAt?.slice(0, 16),
                      );
                      if (due)
                        update(x, {
                          dueAt: new Date(due).toISOString(),
                          status: "pending",
                        });
                    }}
                  >
                    {lang === "es" ? "Reprogramar" : "Reschedule"}
                  </button>
                  <button
                    onClick={() =>
                      setForm({ ...x, dueAt: x.dueAt?.slice(0, 16) })
                    }
                  >
                    {lang === "es" ? "Editar" : "Edit"}
                  </button>
                  <button onClick={() => remove(x)}>
                    <Trash2 size={15} />
                  </button>
                  </div>
                </article>
              );
            })}
            {!list.length && <Empty lang={lang} />}
          </div>
        </Panel>
      ))}
      {form && (
        <div className="modal-bg">
          <form className="modal" onSubmit={save}>
            <h2>
              {form.id
                ? lang === "es"
                  ? "Editar seguimiento"
                  : "Edit follow-up"
                : lang === "es"
                  ? "Crear seguimiento"
                  : "Create follow-up"}
            </h2>
            <section className="form-grid">
              <label>
                {lang === "es" ? "Prospecto" : "Prospect"}
                <select
                  required
                  value={form.prospectId}
                  onChange={(e) =>
                    setForm({ ...form, prospectId: e.target.value })
                  }
                >
                  {db.leads.map((l) => (
                    <option value={l.id}>
                      {l.firstName} {l.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {lang === "es" ? "Fecha y hora" : "Date and time"}
                <input
                  required
                  type="datetime-local"
                  value={form.dueAt}
                  onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                />
              </label>
              <label>
                {lang === "es" ? "Tipo" : "Type"}
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {["call", "email", "whatsapp", "meeting", "other"].map(
                    (x) => (
                      <option value={x}>{x}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="wide">
                {lang === "es" ? "Nota" : "Note"}
                <textarea
                  value={form.note || ""}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </label>
            </section>
            <footer>
              <button type="button" onClick={() => setForm(undefined)}>
                {lang === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button className="primary">
                {lang === "es" ? "Guardar" : "Save"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
function Messages({
  db,
  save,
  lang,
  notify,
}: {
  db: ReturnType<typeof storage.get>;
  save: any;
  lang: Language;
  notify: (x: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <>
      <PageTitle title={t(lang, "templates")} />
      <div className="template-grid">
        {db.templates.map((x) => (
          <article className="template" key={x.id}>
            <div>
              <span>{x.category}</span>
              <h3>{x.name}</h3>
            </div>
            {editing === x.id ? (
              <>
                <textarea
                  defaultValue={lang === "en" ? x.en : x.es}
                  onBlur={(e) => {
                    save({
                      ...db,
                      templates: db.templates.map((q) =>
                        q.id === x.id ? { ...q, [lang]: e.target.value } : q,
                      ),
                    });
                    setEditing(null);
                    notify(t(lang, "toastUpdated"));
                  }}
                  autoFocus
                />
              </>
            ) : (
              <p>{lang === "en" ? x.en : x.es}</p>
            )}
            <footer>
              <button
                onClick={() =>
                  navigator.clipboard
                    .writeText(lang === "en" ? x.en : x.es)
                    .then(() => notify(t(lang, "toastCopied")))
                }
              >
                <Copy size={15} />
                {t(lang, "copy")}
              </button>
              <button onClick={() => setEditing(x.id)}>Edit</button>
            </footer>
          </article>
        ))}
      </div>
    </>
  );
}
function SettingsPage({
  db,
  save,
  lang,
  notify,
}: {
  db: ReturnType<typeof storage.get>;
  save: any;
  lang: Language;
  notify: (x: string) => void;
}) {
  const set = (k: string, v: string) =>
    save({ ...db, settings: { ...db.settings, [k]: v } });
  const demo = () => {
    if (db.leads.length && !confirm("Load demo data alongside existing leads?"))
      return;
    const names = [
      ["Maya", "Harbor Coffee", "es"],
      ["Jordan", "Atlas Fitness", "en"],
      ["Elena", "Luna Boutique", "es"],
      ["Noah", "Bright Dental", "en"],
      ["Sofia", "Casa Verde", "es"],
      ["Liam", "Northline Auto", "en"],
    ] as const;
    const leads = names.map(
      ([firstName, business, preferredLanguage], i): Lead => ({
        id: id(),
        firstName,
        lastName: "Demo",
        business,
        phone: `+1555000${100 + i}`,
        email: "",
        whatsapp: `1555000${100 + i}`,
        instagram: "",
        facebook: "",
        website: "",
        businessType: "",
        city: "",
        state: "",
        source: i % 2 ? "instagram" : "referral",
        service: services[i % services.length],
        stage: stages[i],
        potentialValue: (i + 1) * 800,
        preferredLanguage: preferredLanguage as Language,
        quoteStatus: "not_sent",
        createdAt: new Date().toISOString(),
        demo: true,
      }),
    );
    save({ ...db, leads: [...db.leads, ...leads] });
    notify(t(lang, "toastCreated"));
  };
  const importFile = (file?: File) =>
    file?.text().then((raw) => {
      try {
        storage.import(raw);
        location.reload();
      } catch {
        alert("Invalid backup");
      }
    });
  return (
    <>
      <PageTitle title={t(lang, "settings")} />
      <div className="settings-grid">
        <Panel title="Profile">
          <div className="form-grid">
            {[
              ["name", "Name"],
              ["company", "Company"],
              ["phone", "Phone"],
              ["email", "Email"],
              ["website", "Website"],
            ].map(([k, n]) => (
              <label>
                {n}
                <input
                  value={(db.settings as any)[k]}
                  onChange={(e) => set(k, e.target.value)}
                />
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="Sales Links">
          <div className="form-grid">
            {[
              ["digitalCardUrl", "Digital Card URL"],
              ["bookingUrl", "Booking URL"],
            ].map(([k, n]) => (
              <label>
                {n}
                <input
                  value={(db.settings as any)[k]}
                  onChange={(e) => set(k, e.target.value)}
                />
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="Services">
          <div className="form-grid">
            {services.map((s) => (
              <label key={s}>
                {label(lang, "service", s)}
                <input
                  placeholder="Landing URL"
                  value={db.settings.landingUrls[s] || ""}
                  onChange={(e) =>
                    save({
                      ...db,
                      settings: {
                        ...db.settings,
                        landingUrls: {
                          ...db.settings.landingUrls,
                          [s]: e.target.value,
                        },
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="Data">
          <div className="data-actions">
            <button
              onClick={() => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(
                  new Blob([storage.export()], { type: "application/json" }),
                );
                a.download = "next-studio-sales-backup.json";
                a.click();
                notify("Data exported");
              }}
            >
              <Download />
              {t(lang, "export")}
            </button>
            <label>
              <Upload />
              {t(lang, "import")}
              <input
                type="file"
                accept="application/json"
                onChange={(e) => importFile(e.target.files?.[0])}
              />
            </label>
            <button onClick={demo}>
              <Plus />
              {t(lang, "demo")}
            </button>
            <button
              onClick={() => {
                save({ ...db, leads: db.leads.filter((x) => !x.demo) });
                notify(t(lang, "removeDemo"));
              }}
            >
              <Trash2 />
              {t(lang, "removeDemo")}
            </button>
            <button
              className="danger"
              onClick={() => {
                if (
                  confirm(
                    "This permanently clears all application data. Continue?",
                  )
                ) {
                  storage.reset();
                  location.reload();
                }
              }}
            >
              <Trash2 />
              {t(lang, "reset")}
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
export default App;
