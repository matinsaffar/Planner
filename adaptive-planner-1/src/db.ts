// Persistence layer backed by Supabase (hosted Postgres) so the same data
// is shared live across every device you log into (iPhone + MacBook).
// Row Level Security (see supabase-schema.sql) ensures only your logged-in
// account can read or write your rows, even though the Vercel URL is public.

import { supabase } from "./supabaseClient";

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function all(table: string, filters: Record<string, any> = {}): Promise<any[]> {
  let query = supabase.from(table).select("*");
  for (const [k, v] of Object.entries(filters)) {
    if (Array.isArray(v) && v[0] === "lt") query = query.lt(k, v[1]);
    else if (Array.isArray(v) && v[0] === "in") query = query.in(k, v[1]);
    else query = query.eq(k, v);
  }
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function insertRow(table: string, row: Record<string, any>) {
  const uidv = await userId();
  const { error } = await supabase.from(table).insert({ ...row, user_id: uidv });
  if (error) console.error(error);
}

export async function updateRow(table: string, id: string, patch: Record<string, any>) {
  const { error } = await supabase.from(table).update(patch).eq("id", id);
  if (error) console.error(error);
}

export async function upsertRow(table: string, row: Record<string, any>) {
  const uidv = await userId();
  const { error } = await supabase.from(table).upsert({ ...row, user_id: uidv });
  if (error) console.error(error);
}

export async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.error(error);
}
