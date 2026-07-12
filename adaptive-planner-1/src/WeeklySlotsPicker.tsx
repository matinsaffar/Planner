import React from "react";
import { jalaaliWeekdayLabels } from "./jalaali";

export interface WeeklySlot {
  id: string;
  weekday: number;    // 0=Saturday..6=Friday (Persian week, matches JalaaliPicker)
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
}

interface Props {
  slots: WeeklySlot[];
  onChange: (slots: WeeklySlot[]) => void;
  weeks: number;
  onWeeksChange: (n: number) => void;
}

let counter = 0;
function newSlotId() { counter += 1; return "slot" + Date.now().toString(36) + counter; }

// Lets someone build up a weekly pattern like "Saturdays 9:00–10:30 AND
// Mondays 7:45–9:15, for 16 weeks" (a semester class), or just a handful of
// one-off different-day/different-time slots when weeks=1 (an occupied
// block on Monday 16:00–22:00 and a separate one Thursday 23:00–4:00,
// neither repeating). Both are the same UI — weeks=1 just means "generate
// each slot once, on its next occurrence, and stop".
export default function WeeklySlotsPicker({ slots, onChange, weeks, onWeeksChange }: Props) {
  function addSlot() {
    onChange([...slots, { id: newSlotId(), weekday: 0, startTime: "09:00", endTime: "10:00" }]);
  }
  function updateSlot(id: string, patch: Partial<WeeklySlot>) {
    onChange(slots.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeSlot(id: string) {
    onChange(slots.filter((s) => s.id !== id));
  }

  return (
    <div className="weekly-slots-picker">
      {slots.length === 0 && (
        <p className="empty">No days added yet — add one below for each weekday/time this repeats on.</p>
      )}
      {slots.map((s) => (
        <div key={s.id} className="weekly-slot-row">
          <div className="weekday-chip-row">
            {jalaaliWeekdayLabels.map((label, i) => (
              <button key={i} type="button" className={"weekday-chip" + (s.weekday === i ? " active" : "")}
                onClick={() => updateSlot(s.id, { weekday: i })}>
                {label}
              </button>
            ))}
          </div>
          <div className="weekly-slot-times">
            <input type="time" value={s.startTime} onChange={(e) => updateSlot(s.id, { startTime: e.target.value })} />
            <span className="weekly-slot-dash">–</span>
            <input type="time" value={s.endTime} onChange={(e) => updateSlot(s.id, { endTime: e.target.value })} />
            <button type="button" className="mini-btn weekly-slot-remove" onClick={() => removeSlot(s.id)} aria-label="Remove this day">✕</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost" style={{ width: "100%", marginTop: slots.length ? 10 : 0 }} onClick={addSlot}>
        + Add a day &amp; time
      </button>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Repeat for how many weeks?</label>
        <input
          type="number" min={1} max={52} value={weeks}
          onChange={(e) => onWeeksChange(Math.max(1, Math.min(52, Number(e.target.value) || 1)))}
        />
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
          {weeks === 1
            ? "Each day above happens once, on its next occurrence — nothing repeats afterward."
            : `Each day above repeats weekly for ${weeks} continuous weeks (e.g. a full semester).`}
        </p>
      </div>
    </div>
  );
}
