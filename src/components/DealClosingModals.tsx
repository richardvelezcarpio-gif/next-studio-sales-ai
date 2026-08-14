import { useState } from "react";
import type { Lead, Language } from "../types";
type Props = {
  lead: Lead;
  lang: Language;
  onCancel: () => void;
  onConfirm: (patch: Partial<Lead>) => Promise<void>;
};
export function MarkWonModal({ lead, lang, onCancel, onConfirm }: Props) {
  const [value, setValue] = useState(String(lead.potentialValue)),
    [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [notes, setNotes] = useState(""),
    [error, setError] = useState("");
  const save = async () => {
    try {
      await onConfirm({
        stage: "won",
        potentialValue: Number(value) || 0,
        wonAt: new Date(date).toISOString(),
        closingNotes: notes || null,
      });
      onCancel();
    } catch {
      setError(lang === "es" ? "No se pudo guardar este cambio. Inténtalo nuevamente." : "Unable to save this change. Please try again.");
    }
  };
  return (
    <div className="modal-bg">
      <div className="modal">
        <h2>{lang === "es" ? "Marcar como Ganado" : "Mark as Won"}</h2>
        {error && <p className="ai-note">{error}</p>}
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <textarea
          placeholder={lang === "es" ? "Notas" : "Notes"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <footer>
          <button onClick={onCancel}>
            {lang === "es" ? "Cancelar" : "Cancel"}
          </button>
          <button className="primary" onClick={save}>
            {lang === "es" ? "Confirmar" : "Confirm"}
          </button>
        </footer>
      </div>
    </div>
  );
}
export function MarkLostModal({ lang, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState("Price"),
    [competitor, setCompetitor] = useState(""),
    [notes, setNotes] = useState(""),
    [error, setError] = useState("");
  const save = async () => {
    try {
      await onConfirm({
        stage: "lost",
        lostAt: new Date().toISOString(),
        competitor: competitor || null,
        closingNotes: `Lost reason: ${reason}${notes ? `\nNotes: ${notes}` : ""}`,
      });
      onCancel();
    } catch {
      setError(lang === "es" ? "No se pudo guardar este cambio. Inténtalo nuevamente." : "Unable to save this change. Please try again.");
    }
  };
  return (
    <div className="modal-bg">
      <div className="modal">
        <h2>{lang === "es" ? "Marcar como Perdido" : "Mark as Lost"}</h2>
        {error && <p className="ai-note">{error}</p>}
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          {[
            "Price",
            "No response",
            "Competitor",
            "Not ready",
            "Budget",
            "Timing",
            "Chose another option",
            "Other",
          ].map((x) => (
            <option value={x}>{x}</option>
          ))}
        </select>
        <input
          placeholder={lang === "es" ? "Competidor" : "Competitor"}
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value)}
        />
        <textarea
          placeholder={lang === "es" ? "Notas" : "Notes"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <footer>
          <button onClick={onCancel}>
            {lang === "es" ? "Cancelar" : "Cancel"}
          </button>
          <button className="primary" onClick={save}>
            {lang === "es" ? "Confirmar" : "Confirm"}
          </button>
        </footer>
      </div>
    </div>
  );
}
