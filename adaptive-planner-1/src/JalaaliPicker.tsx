import React, { useState } from "react";
import { toJalaali, jalaaliToGregorianStr, jalaaliMonthNames, jalaaliMonthLength, jalaaliWeekdayLabels, persianWeekdayIndex } from "./jalaali";
import { todayStr } from "./seed";

interface Props {
  value: string;
  onChange: (dateStr: string) => void;
  disablePast?: boolean;
}

export default function JalaaliPicker({ value, onChange, disablePast = false }: Props) {
  const [mode, setMode] = useState<"gregorian" | "jalaali">("jalaali");
  const initial = toJalaali(value || todayStr(0));
  const [jy, setJy] = useState(initial.jy);
  const [jm, setJm] = useState(initial.jm);

  const selJalaali = toJalaali(value);
  const monthLen = jalaaliMonthLength(jy, jm);
  const cells = Array.from({ length: monthLen }, (_, i) => i + 1);
  const minDate = todayStr(0);
  // The 1st of the month rarely falls on Saturday — pad with blank cells
  // so every day sits under its real weekday column instead of the grid
  // just listing 1..N left-to-right regardless of what day it actually is.
  const leadingBlanks = persianWeekdayIndex(jalaaliToGregorianStr(jy, jm, 1));

  function prevMonth() { if (jm === 1) { setJm(12); setJy(jy - 1); } else setJm(jm - 1); }
  function nextMonth() { if (jm === 12) { setJm(1); setJy(jy + 1); } else setJm(jm + 1); }

  return (
    <div>
      <div className="cal-toggle">
        <button className={mode === "jalaali" ? "active" : ""} onClick={() => setMode("jalaali")}>Persian</button>
        <button className={mode === "gregorian" ? "active" : ""} onClick={() => setMode("gregorian")}>Gregorian</button>
      </div>
      {mode === "gregorian" ? (
        <input type="date" value={value} min={disablePast ? minDate : undefined} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div>
          <div className="jalaali-nav">
            <button onClick={prevMonth}>‹</button>
            <span>{jalaaliMonthNames[jm - 1]} {jy}</span>
            <button onClick={nextMonth}>›</button>
          </div>
          <div className="jalaali-weekday-row">
            {jalaaliWeekdayLabels.map((w) => <span key={w} className="jalaali-weekday-label">{w}</span>)}
          </div>
          <div className="jalaali-grid">
            {Array.from({ length: leadingBlanks }, (_, i) => <div key={"blank" + i} className="jalaali-cell blank" />)}
            {cells.map((d) => {
              const isSel = selJalaali.jy === jy && selJalaali.jm === jm && selJalaali.jd === d;
              const cellDate = jalaaliToGregorianStr(jy, jm, d);
              const isPast = disablePast && cellDate < minDate;
              return (
                <div key={d}
                  className={"jalaali-cell" + (isSel ? " sel" : "") + (isPast ? " disabled" : "")}
                  onClick={() => { if (!isPast) onChange(cellDate); }}>
                  {d}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
