import { all, insertRow, uid } from "./db";

const TEHRAN_TZ = "Asia/Tehran";

export function todayStr(offset = 0): string {
  const now = new Date();
  const tehranNow = new Date(now.toLocaleString("en-US", { timeZone: TEHRAN_TZ }));
  tehranNow.setDate(tehranNow.getDate() + offset);
  const y = tehranNow.getFullYear();
  const m = String(tehranNow.getMonth() + 1).padStart(2, "0");
  const d = String(tehranNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysUntil(dateStr: string): number {
  const today = todayStr(0);
  const a = new Date(today + "T00:00:00");
  const b = new Date(dateStr + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

let seedInFlight = false;

export async function seedIfEmpty() {
  if (seedInFlight) return;
  if (sessionStorage.getItem("planner_seeded") === "1") return;
  seedInFlight = true;
  try {
    const existing = await all("categories");
    if (existing.length > 0) { sessionStorage.setItem("planner_seeded", "1"); return; }
    sessionStorage.setItem("planner_seeded", "1");
  } finally {
    seedInFlight = false;
  }
}
