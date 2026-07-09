// Local notification scheduling using the Web Notifications API.
// Works in Chrome, Firefox, Safari (16.4+), and as an installed PWA.
// Notifications are scheduled client-side via setTimeout while the app/tab
// is open; for a true background PWA experience a service worker with
// Push API would be required, but this covers same-session reminders
// reliably across all major browsers without needing a push server.

export type NotifyOffset = "1day" | "sameday" | "15min" | "30min" | "none";

export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

function fireNotification(title: string, body: string) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, icon: "/icon.png", badge: "/icon.png" });
    n.onclick = () => window.focus();
  } catch (e) {
    console.error("Notification failed", e);
  }
}

const scheduledTimers = new Map<string, number>();

export function computeNotifyTime(dateStr: string, timeStr: string | null, offset: NotifyOffset, sameDayTime?: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (offset === "sameday") {
    const t = sameDayTime || timeStr || "09:00";
    const [hh, mm] = t.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm);
  }
  if (offset === "1day") {
    const t = sameDayTime || "09:00";
    const [hh, mm] = t.split(":").map(Number);
    const dt = new Date(y, m - 1, d, hh, mm);
    dt.setDate(dt.getDate() - 1);
    return dt;
  }
  if (!timeStr) return null;
  const [hh, mm] = timeStr.split(":").map(Number);
  const base = new Date(y, m - 1, d, hh, mm);
  if (offset === "15min") base.setMinutes(base.getMinutes() - 15);
  if (offset === "30min") base.setMinutes(base.getMinutes() - 30);
  return base;
}

export function scheduleNotification(id: string, title: string, body: string, fireAt: Date) {
  cancelNotification(id);
  const delay = fireAt.getTime() - Date.now();
  if (delay <= 0 || delay > 2147000000) return; // skip past-due or beyond setTimeout's max range
  const timer = window.setTimeout(() => fireNotification(title, body), delay);
  scheduledTimers.set(id, timer);
}

export function cancelNotification(id: string) {
  const existing = scheduledTimers.get(id);
  if (existing) {
    window.clearTimeout(existing);
    scheduledTimers.delete(id);
  }
}

export const NOTIFY_OPTIONS: { value: NotifyOffset; label: string }[] = [
  { value: "none", label: "No notification" },
  { value: "1day", label: "1 day before" },
  { value: "sameday", label: "Same day" },
  { value: "30min", label: "30 minutes before" },
  { value: "15min", label: "15 minutes before" },
];
