import jalaali from "jalaali-js";

export function toJalaali(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function jalaaliToGregorianStr(jy: number, jm: number, jd: number): string {
  const g = jalaali.toGregorian(jy, jm, jd);
  const mm = String(g.gm).padStart(2, "0");
  const dd = String(g.gd).padStart(2, "0");
  return `${g.gy}-${mm}-${dd}`;
}

export const jalaaliMonthNames = [
  "Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar",
  "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand"
];

export function jalaaliMonthLength(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm);
}

// The Persian week starts on Saturday: Sat, Sun, Mon, Tue, Wed, Thu, Fri.
export const jalaaliWeekdayLabels = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
export const jalaaliWeekdayLabelsFull = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/** JS Date.getDay() is 0=Sunday..6=Saturday. Shift so 0=Saturday..6=Friday,
 * matching the Persian week used throughout the calendar UI. */
export function persianWeekdayIndex(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return (d.getDay() + 1) % 7;
}

/** The next date on/after anchorDateStr that falls on the given Persian
 * weekday (0=Sat..6=Fri). If anchorDateStr itself matches, returns it
 * unchanged — used to seed weekly-recurring slots (class schedules, etc.)
 * from "today" or a chosen start date. */
export function nextPersianWeekdayOnOrAfter(anchorDateStr: string, persianWeekday: number): string {
  const [y, m, d] = anchorDateStr.split("-").map(Number);
  const anchor = new Date(y, m - 1, d);
  const anchorIdx = (anchor.getDay() + 1) % 7;
  let delta = persianWeekday - anchorIdx;
  if (delta < 0) delta += 7;
  anchor.setDate(anchor.getDate() + delta);
  const yy = anchor.getFullYear();
  const mm = String(anchor.getMonth() + 1).padStart(2, "0");
  const dd = String(anchor.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** N weekly occurrences of a given Persian weekday, starting from its next
 * occurrence on/after anchorDateStr (weeks=1 → just that single date). */
export function weeklyOccurrences(anchorDateStr: string, persianWeekday: number, weeks: number): string[] {
  const first = nextPersianWeekdayOnOrAfter(anchorDateStr, persianWeekday);
  const [y, m, d] = first.split("-").map(Number);
  const dates: string[] = [];
  for (let w = 0; w < weeks; w++) {
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + w * 7);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    dates.push(`${yy}-${mm}-${dd}`);
  }
  return dates;
}

export function formatJalaali(dateStr: string): string {
  const j = toJalaali(dateStr);
  return `${j.jd} ${jalaaliMonthNames[j.jm - 1]} ${j.jy}`;
}
