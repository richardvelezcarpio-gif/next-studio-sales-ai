import { supabase } from "../../lib/supabase";

export type SalesGoalRecord = {
  id: string;
  month: string;
  revenueGoal: number;
  dealsGoal?: number | null;
};

const client = () => {
  if (!supabase) throw new Error("Cloud not configured");
  return supabase;
};

const map = (row: Record<string, unknown>): SalesGoalRecord => ({
  id: String(row.id),
  month: String(row.month),
  revenueGoal: Number(row.revenue_goal || 0),
  dealsGoal: row.deals_goal == null ? null : Number(row.deals_goal),
});

export const salesGoalsRepository = {
  getByMonth: async (month: string) => {
    const { data, error } = await client()
      .from("sales_goals")
      .select("id,month,revenue_goal,deals_goal")
      .eq("month", month)
      .maybeSingle();
    if (error) throw error;
    return data ? map(data) : null;
  },
  save: async ({ id, month, revenueGoal, dealsGoal }: Omit<SalesGoalRecord, "id"> & { id?: string }) => {
    const row = {
      month,
      revenue_goal: revenueGoal,
      deals_goal: dealsGoal ?? null,
      updated_at: new Date().toISOString(),
    };
    const query = id
      ? client().from("sales_goals").update(row).eq("id", id)
      : client().from("sales_goals").insert(row);
    const { data, error } = await query
      .select("id,month,revenue_goal,deals_goal")
      .single();
    if (error) throw error;
    return map(data);
  },
};
