import React, { useState } from "react";
import { createPortal } from "react-dom";
import { todayStr } from "./seed";
import { toJalaali, jalaaliMonthNames, formatJalaali } from "./jalaali";
import JalaaliPicker from "./JalaaliPicker";

interface Props {
  selectedDate: string;
  onSelect: (d: string) => void;
}

export default function DayScroller({ selectedDate, onSelect }: Props) {
  const [showCalendar, setShowCalendar] = useState(false);
  const today = todayStr(0);
  const yesterday = todayStr(-1);
  const tomorrow = todayStr(1);
  const plus2 = todayStr(2);
  const plus3 = todayStr(3);

  function dayLabel(d: string) {
    const j = toJalaali(d);
    return jalaaliMonthNames[j.jm - 1].slice(0, 3) + " " + j.jd;
  }

  return (
    <div className="glass section day-nav-bar" style={{ margin: "0 16px 12px", padding: "14px 12px" }}>
      <div className="day-nav-center">
        <button className={"day-pill fixed size-sm" + (yesterday === selectedDate ? " sel" : "")}
          onClick={() => onSelect(yesterday)}>Yesterday</button>
        <button className={"day-pill fixed size-lg" + (today === selectedDate ? " sel" : "")}
          onClick={() => onSelect(today)}>Today</button>
        <button className={"day-pill fixed size-md" + (tomorrow === selectedDate ? " sel" : "")}
          onClick={() => onSelect(tomorrow)}>Tomorrow</button>
        <button className={"day-pill fixed size-md" + (plus2 === selectedDate ? " sel" : "")}
          onClick={() => onSelect(plus2)}>{dayLabel(plus2)}</button>
        <button className={"day-pill fixed size-md" + (plus3 === selectedDate ? " sel" : "")}
          onClick={() => onSelect(plus3)}>{dayLabel(plus3)}</button>
      </div>

      <button className="mini-btn cal-jump-btn" onClick={() => setShowCalendar(true)}>📅</button>

      {showCalendar && createPortal(
        <div className="overlay" onClick={() => setShowCalendar(false)}>
          <div className="sheet glass" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button className="close-x-btn" onClick={() => setShowCalendar(false)}>✕</button>
            <h3>Jump to a date</h3>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Currently viewing {formatJalaali(selectedDate)}</p>
            <JalaaliPicker value={selectedDate} onChange={(d: string) => { onSelect(d); setShowCalendar(false); }} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
