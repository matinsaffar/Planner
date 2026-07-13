import React, { useState, useMemo } from "react";
import {
  toJalaali, jalaaliToGregorianStr, jalaaliMonthNames, jalaaliMonthLength,
  jalaaliWeekdayLabels, persianWeekdayIndex, jalaaliWeekdayLabelsFull,
} from "./jalaali";
import { todayStr } from "./seed";

interface DensityInfo {
  total: number;
  finished: number;
  hasOverdue: boolean;
}

interface Props {
  tasks: any[];
  onSelectDate: (dateStr: string) => void;
  initialDate?: string;
}

// A month at a glance: each day gets a small dot sized/colored by how many
// tasks land on it, so you can spot a packed week or a wide-open one before
// diving into the day-by-day timeline. Tapping a day jumps straight to it
// (via onSelectDate — App.tsx switches to the Tasks tab on that date).
export default function MonthDensityCalendar({ tasks, onSelectDate, initialDate }: Props) {
  const todayDateStr = todayStr(0);
  const todayJ = toJalaali(todayDateStr);
  const base = toJalaali(initialDate || todayDateStr);
  const [jy, setJy] = useState(base.jy);
  const [jm, setJm] = useState(base.jm);

  function prevMonth() { if (jm === 1) { setJm(12); setJy(jy - 1); } else setJm(jm - 1); }
  function nextMonth() { if (jm === 12) { setJm(1); setJy(jy + 1); } else setJm(jm + 1); }
  function goToday() { setJy(todayJ.jy); setJm(todayJ.jm); }

  const monthLen = jalaaliMonthLength(jy, jm);
  const leadingBlanks = persianWeekdayIndex(jalaaliToGregorianStr(jy, jm, 1));
  const cells = Array.from({ length: monthLen }, (_, i) => i + 1);
  const isCurrentMonth = jy === todayJ.jy && jm === todayJ.jm;

  const densityByDate = useMemo(() => {
    const map: Record<string, DensityInfo> = {};
    for (const t of tasks) {
      if (!t.date || t.status === "Cancelled") continue;
      if (!map[t.date]) map[t.date] = { total: 0, finished: 0, hasOverdue: false };
      const info = map[t.date];
      info.total++;
      if (t.status === "Finished") info.finished++;
      else if (t.date < todayDateStr && t.status !== "Broken") info.hasOverdue = true;
    }
    return map;
  }, [tasks, todayDateStr]);

  function densityLevel(info?: DensityInfo): 0 | 1 | 2 | 3 {
    if (!info || info.total === 0) return 0;
    if (info.total <= 2) return 1;
    if (info.total <= 4) return 2;
    return 3;
  }

  const monthTotal = useMemo(() => {
    let count = 0;
    for (const d of cells) {
      const dateStr = jalaaliToGregorianStr(jy, jm, d);
      count += densityByDate[dateStr]?.total || 0;
    }
    return count;
  }, [cells, jy, jm, densityByDate]);

  return (
    <div className="month-density-cal">
      <div className="jalaali-nav">
        <button type="button" onClick={prevMonth} aria-label="Previous month">‹</button>
        <span onClick={goToday} title="Jump to current month" style={{ cursor: "pointer" }}>
          {jalaaliMonthNames[jm - 1]} {jy}{!isCurrentMonth && <span className="month-density-jump"> · today</span>}
        </span>
        <button type="button" onClick={nextMonth} aria-label="Next month">›</button>
      </div>
      <div className="jalaali-weekday-row">
        {jalaaliWeekdayLabels.map((w, i) => <span key={w} className="jalaali-weekday-label" title={jalaaliWeekdayLabelsFull[i]}>{w}</span>)}
      </div>
      <div className="month-density-grid">
        {Array.from({ length: leadingBlanks }, (_, i) => <div key={"blank" + i} className="month-density-cell blank" />)}
        {cells.map((d) => {
          const dateStr = jalaaliToGregorianStr(jy, jm, d);
          const info = densityByDate[dateStr];
          const level = densityLevel(info);
          const isToday = dateStr === todayDateStr;
          const allDone = !!info && info.total > 0 && info.finished === info.total;
          return (
            <button
              key={d}
              type="button"
              className={
                "month-density-cell" +
                (isToday ? " today" : "") +
                (info?.hasOverdue ? " overdue" : "") +
                (allDone ? " all-done" : "")
              }
              onClick={() => onSelectDate(dateStr)}
              aria-label={`${d} ${jalaaliMonthNames[jm - 1]}${info ? `, ${info.total} task${info.total === 1 ? "" : "s"}` : ""}`}
            >
              <span className="month-density-daynum">{d}</span>
              {level > 0 && <span className={`month-density-dot level-${level}`} />}
            </button>
          );
        })}
      </div>
      <div className="month-density-legend">
        <span className="month-density-legend-count">{monthTotal} task{monthTotal === 1 ? "" : "s"} this month</span>
        <span><i className="month-density-dot level-1" /> light</span>
        <span><i className="month-density-dot level-2" /> busy</span>
        <span><i className="month-density-dot level-3" /> packed</span>
        <span><i className="month-density-dot overdue-dot" /> overdue</span>
      </div>
    </div>
  );
}
