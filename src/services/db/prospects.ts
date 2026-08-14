import { supabase } from "../../lib/supabase";
import type { Lead } from "../../types";
type Row = Record<string, any>;
const fields =
  "id,first_name,last_name,business_name,phone,email,preferred_language,source,service_interest,stage,estimated_value,ai_score,priority,interest_level,next_follow_up,probability,expected_close_date,next_step,last_activity_at,won_at,lost_at,competitor,closing_notes,created_at,updated_at";
const report = (action: string, error: any) =>
  console.error(`Supabase prospects ${action} failed`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });
export const toLead = (r: Row): Lead => ({
  id: r.id,
  firstName: r.first_name || "",
  lastName: r.last_name || "",
  business: r.business_name || "",
  phone: r.phone || "",
  email: r.email || "",
  whatsapp: r.phone || "",
  instagram: "",
  facebook: "",
  website: "",
  businessType: "",
  city: "",
  state: "",
  source: r.source || "other",
  service: r.service_interest || "other",
  stage: r.stage || "new",
  potentialValue: Number(r.estimated_value || 0),
  preferredLanguage: r.preferred_language || "en",
  aiScore: r.ai_score ?? undefined,
  priority: r.priority ?? undefined,
  interestLevel: r.interest_level ?? undefined,
    nextFollowUp: r.next_follow_up?.slice(0, 10),
    probability: r.probability ?? null,
    expectedCloseDate: r.expected_close_date ?? null,
    nextStep: r.next_step ?? null,
    lastActivityAt: r.last_activity_at ?? null,
    wonAt: r.won_at ?? null,
    lostAt: r.lost_at ?? null,
    competitor: r.competitor ?? null,
    closingNotes: r.closing_notes ?? null,
  quoteStatus: "not_sent",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
export const toRow = (l: Lead): Row => ({
  first_name: l.firstName,
  last_name: l.lastName,
  business_name: l.business,
  phone: l.phone,
  email: l.email,
  preferred_language: l.preferredLanguage,
  source: l.source,
  service_interest: l.service,
  stage: l.stage,
  estimated_value: l.potentialValue,
  ai_score: l.aiScore,
  priority: l.priority,
  interest_level: l.interestLevel,
    next_follow_up: l.nextFollowUp
      ? new Date(l.nextFollowUp).toISOString()
      : null,
    probability: l.probability ?? null,
    expected_close_date: l.expectedCloseDate ?? null,
    next_step: l.nextStep ?? null,
    last_activity_at: l.lastActivityAt ?? null,
    won_at: l.wonAt ?? null,
    lost_at: l.lostAt ?? null,
    competitor: l.competitor ?? null,
    closing_notes: l.closingNotes ?? null,
  updated_at: new Date().toISOString(),
});
const client = () => {
  if (!supabase) throw Error("Cloud not configured");
  return supabase;
};
export const prospectsRepository = {
  getAll: async () => {
    const db = client();
    const {
      data: { user },
      error: userError,
    } = await db.auth.getUser();
    if (userError || !user) {
      const error = userError || new Error("No authenticated Supabase user");
      report("session", error);
      throw error;
    }
    const { data, error } = await db
      .from("prospects")
      .select(fields)
      .order("created_at", { ascending: false });
    if (error) {
      report("select", error);
      throw error;
    }
    return (data || []).map(toLead);
  },
  create: async (lead: Lead) => {
    const { data, error } = await client()
      .from("prospects")
      .insert(toRow(lead))
      .select(fields)
      .single();
    if (error) {
      report("insert", error);
      throw error;
    }
    return toLead(data);
  },
  update: async (id: string, lead: Lead) => {
    const { data, error } = await client()
      .from("prospects")
      .update(toRow(lead))
      .eq("id", id)
      .select(fields)
      .single();
    if (error) {
      report("update", error);
      throw error;
    }
    return toLead(data);
  },
  remove: async (id: string) => {
    const { error } = await client().from("prospects").delete().eq("id", id);
    if (error) {
      report("delete", error);
      throw error;
    }
  },
};
