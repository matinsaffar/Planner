import React, { useState } from "react";
import { uid } from "./db";
import { sound } from "./sound";
import { formatJalaali } from "./jalaali";
import JalaaliPicker from "./JalaaliPicker";
import TimeOfDayPicker from "./TimeOfDayPicker";
import TitleSuggestInput from "./TitleSuggestInput";
import WeeklySlotsPicker, { WeeklySlot } from "./WeeklySlotsPicker";
import { todayStr } from "./seed";

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function diffMinutes(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 1440;
  return diff;
}

export default function BlockFlow({ onSave, onClose, defaultDate, allBlocks = [], checkTimeConflict, onReplaceAndContinue }: any) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [repeat, setRepeat] = useState("none");
  const [repeatSlots, setRepeatSlots] = useState<WeeklySlot[]>([]);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [conflictMsg, setConflictMsg] = useState("");
  const [conflictObj, setConflictObj] = useState<any>(null);

  const isCustomWeekly = repeat === "custom";

  function handleSave() {
    if (isCustomWeekly) {
      onSave({ id: uid(), title, date: date || todayStr(0), repeat: "custom", repeat_slots: repeatSlots, repeat_weeks: repeatWeeks });
      sound.save();
      return;
    }
    if (checkTimeConflict) {
      const conflict = checkTimeConflict(date, start, end);
      if (conflict) {
        setConflictObj(conflict);
        setConflictMsg("This time overlaps with something already scheduled. Please pick a different time or replace it below.");
        return;
      }
    }
    setConflictObj(null); setConflictMsg("");
    onSave({ id: uid(), title, date, start, end, repeat });
    sound.save();
  }

  async function handleReplaceAndSave() {
    if (onReplaceAndContinue && conflictObj) await onReplaceAndContinue(conflictObj);
    setConflictObj(null); setConflictMsg("");
    onSave({ id: uid(), title, date, start, end, repeat });
    sound.save();
  }

  const history = allBlocks.map((b: any) => ({ title: b.title, duration: diffMinutes(b.start_time || b.start, b.end_time || b.end) }));

  return (
    <div className="page-modal">
      <div className="page-modal-header">
        <h3>New Occupied Block</h3>
        <button className="close-x" style={{ position: "static" }} onClick={onClose}>×</button>
      </div>
      <div className="page-modal-body">
        <div className="step-content">
          <div className="field"><label>Title</label>
            <TitleSuggestInput
              value={title} onChange={setTitle} placeholder="e.g. Class, Commute"
              history={history}
              onPickDuration={(d: number) => setEnd(addMinutes(start, d))}
            /></div>
          <div className="field"><label>Repeat</label>
            <div className="notify-options">
              <button type="button" className={"notify-chip" + (repeat === "none" ? " active" : "")} onClick={() => setRepeat("none")}>Doesn't repeat</button>
              <button type="button" className={"notify-chip" + (repeat === "weekly" ? " active" : "")} onClick={() => setRepeat("weekly")}>Weekly</button>
              <button type="button" className={"notify-chip" + (repeat === "custom" ? " active" : "")} onClick={() => setRepeat("custom")}>Specific weekdays…</button>
            </div>
          </div>
          {isCustomWeekly ? (
            <div className="field">
              <label>Days &amp; times</label>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -2, marginBottom: 10 }}>
                e.g. a class held Saturdays 9:00–10:30 and Mondays 7:45–9:15 — add each day separately, they can have completely different times.
              </p>
              <WeeklySlotsPicker slots={repeatSlots} onChange={setRepeatSlots} weeks={repeatWeeks} onWeeksChange={setRepeatWeeks} />
            </div>
          ) : (
            <>
              <div className="field"><label>Day ({formatJalaali(date)})</label>
                <JalaaliPicker value={date} onChange={setDate} disablePast /></div>
              <div className="field"><label>Start</label>
                <TimeOfDayPicker value={start} onChange={setStart} /></div>
              <div className="field"><label>End</label>
                <TimeOfDayPicker value={end} onChange={setEnd} /></div>
            </>
          )}
          {conflictObj && (
            <div className="conflict-preview" style={{ margin: "8px 0" }}>
              <span className="conflict-preview-title">⚠ Overlaps with "{conflictObj.item.title}"</span>
              <span className="conflict-preview-meta">
                {conflictObj.type === "block" ? `${conflictObj.item.start_time || conflictObj.item.start}–${conflictObj.item.end_time || conflictObj.item.end}` : conflictObj.item.time}
              </span>
              <button className="btn btn-danger" style={{ marginTop: 8, fontSize: 12 }} onClick={handleReplaceAndSave}>Replace it and save</button>
            </div>
          )}
          {conflictMsg && <p style={{ fontSize: 12, color: "#ef6461", fontWeight: 700 }}>⚠ {conflictMsg}</p>}
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!title || (isCustomWeekly && repeatSlots.length === 0)} onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
