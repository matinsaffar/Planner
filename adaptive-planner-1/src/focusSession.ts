// Cross-device focus sessions.
//
// One row per user in `focus_sessions` (see supabase-schema-focus.sql) holds
// the *live* state of the current focus timer: when it started, how much
// pause time has accumulated, and the current planned duration. The elapsed
// time is always DERIVED from those timestamps (computeElapsedSeconds), never
// counted up locally — that's what makes "open the PWA on my phone, then log
// in on my laptop and see the exact same timer" work: both devices compute
// the same number from the same row.
//
// Realtime (Postgres Changes) pushes every update to any other open device
// within ~200ms, so starting a task on one device flips FocusMode open on
// the other automatically, and pause/resume/extend/minimize stay in sync.
//
// Requires: `alter publication supabase_realtime add table focus_sessions;`
// (or toggle "Realtime" on for the table in the Supabase dashboard).

import { supabase } from "./supabaseClient";

export interface FocusSession {
  user_id: string;
  task_id: string;
  task_snapshot: any;
  started_at: number;           // ms epoch
  total_seconds: number;        // planned duration, grows with +5/+10/+15
  paused: boolean;
  paused_at: number | null;     // ms epoch when the current pause began
  accumulated_pause_ms: number; // total paused time from earlier pauses
  minimized: boolean;
  updated_at: number;
}

const TABLE = "focus_sessions";

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/** Call once on app load — restores an in-progress session (e.g. the user
 * started a task on their phone, then opened the laptop). */
export async function getActiveFocusSession(): Promise<FocusSession | null> {
  const uid = await currentUserId();
  const { data, error } = await supabase.from(TABLE).select("*").eq("user_id", uid).maybeSingle();
  if (error) { console.error(error); return null; }
  return (data as FocusSession) || null;
}

export async function startFocusSession(task: any): Promise<FocusSession | null> {
  const uid = await currentUserId();
  const startedAt = task.started_at || Date.now();
  const fullSeconds = (task.duration || 30) * 60;
  let totalSeconds = fullSeconds;
  // If the task had a scheduled time (e.g. 9:00, 90 min) and you actually
  // started it late (e.g. 9:30), the timer should count down to the
  // originally scheduled end time (10:30 → 60 min left), not restart a
  // fresh full-length countdown. Starting early doesn't grant extra time —
  // only lateness shrinks the window, never grows it.
  if (task.date && task.time) {
    const [y, m, d] = task.date.split("-").map(Number);
    const [hh, mm] = task.time.split(":").map(Number);
    const scheduledEndMs = new Date(y, m - 1, d, hh, mm).getTime() + fullSeconds * 1000;
    const secondsUntilScheduledEnd = Math.round((scheduledEndMs - startedAt) / 1000);
    totalSeconds = Math.max(0, Math.min(fullSeconds, secondsUntilScheduledEnd));
  }
  const row: FocusSession = {
    user_id: uid,
    task_id: task.id,
    task_snapshot: task,
    started_at: startedAt,
    total_seconds: totalSeconds,
    paused: false,
    paused_at: null,
    accumulated_pause_ms: 0,
    minimized: false,
    updated_at: Date.now(),
  };
  const { data, error } = await supabase.from(TABLE).upsert(row, { onConflict: "user_id" }).select().maybeSingle();
  if (error) { console.error(error); return null; }
  return data as FocusSession;
}

export async function updateFocusSession(patch: Partial<FocusSession>): Promise<FocusSession | null> {
  const uid = await currentUserId();
  const { data, error } = await supabase.from(TABLE)
    .update({ ...patch, updated_at: Date.now() })
    .eq("user_id", uid).select().maybeSingle();
  if (error) { console.error(error); return null; }
  return data as FocusSession;
}

export async function togglePauseFocusSession(s: FocusSession): Promise<FocusSession | null> {
  if (s.paused) {
    const extra = s.paused_at ? Date.now() - s.paused_at : 0;
    return updateFocusSession({ paused: false, paused_at: null, accumulated_pause_ms: s.accumulated_pause_ms + extra });
  }
  return updateFocusSession({ paused: true, paused_at: Date.now() });
}

export async function extendFocusSession(s: FocusSession, minutes: number): Promise<FocusSession | null> {
  const newExtended = (s.task_snapshot?.extended_minutes || 0) + minutes;
  // Best-effort: reflect the extension on the actual task row so the
  // Day Timeline draws the card longer with a "+Nm" marker. This isn't
  // fatal if it fails (e.g. task was deleted mid-session) — the session
  // timer itself is the source of truth for Focus Mode either way.
  await supabase.from("tasks").update({ extended_minutes: newExtended }).eq("id", s.task_id);
  return updateFocusSession({
    total_seconds: s.total_seconds + minutes * 60,
    task_snapshot: { ...s.task_snapshot, extended_minutes: newExtended },
  });
}

export async function setFocusMinimized(minimized: boolean): Promise<FocusSession | null> {
  return updateFocusSession({ minimized });
}

/** Ends the session everywhere (Finish / Break flows call this). */
export async function endFocusSession(): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase.from(TABLE).delete().eq("user_id", uid);
  if (error) console.error(error);
}

/** Pure function — the whole point of storing timestamps instead of a
 * counter. Any device, any clock skew tolerance aside, computes the same
 * elapsed time from the same row. */
export function computeElapsedSeconds(s: FocusSession): number {
  const now = Date.now();
  const pauseMs = s.accumulated_pause_ms + (s.paused && s.paused_at ? now - s.paused_at : 0);
  return Math.max(0, Math.floor((now - s.started_at - pauseMs) / 1000));
}

/** Subscribes to live changes on this user's focus session row. Returns an
 * unsubscribe function. Safe to call before auth resolves — it waits for
 * the user id, then subscribes. */
export function subscribeFocusSession(onChange: (session: FocusSession | null) => void): () => void {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let cancelled = false;
  (async () => {
    const uid = await currentUserId().catch(() => null);
    if (!uid || cancelled) return;
    channel = supabase
      .channel(`focus_sessions:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `user_id=eq.${uid}` },
        (payload: any) => {
          if (payload.eventType === "DELETE") onChange(null);
          else onChange(payload.new as FocusSession);
        }
      )
      .subscribe();
  })();
  return () => {
    cancelled = true;
    if (channel) supabase.removeChannel(channel);
  };
}
