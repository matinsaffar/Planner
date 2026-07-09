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

export function formatJalaali(dateStr: string): string {
  const j = toJalaali(dateStr);
  return `${j.jd} ${jalaaliMonthNames[j.jm - 1]} ${j.jy}`;
}
