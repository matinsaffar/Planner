import React, { useState } from "react";
import { uid } from "./db";
import { sound } from "./sound";
import { todayStr } from "./seed";
import { formatJalaali } from "./jalaali";
import JalaaliPicker from "./JalaaliPicker";
import TimeOfDayPicker from "./TimeOfDayPicker";
import TitleSuggestInput from "./TitleSuggestInput";
import NotifyPicker from "./NotifyPicker";
import { NotifyOffset } from "./notifications";

export default function ReminderFlow({ onSave, onClose, allReminders = [], checkTimeConflict, onReplaceAndContinue }: any) {
  const steps = ["Title", "Date & Time", "Notify", "Notes"];
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [dayChoice, setDayChoice] = useState<"today" | "tomorrow" | "other">("today");
  const [date, setDate] = useState(todayStr(0));
  const [showCalendar, setShowCalendar] = useState(false);
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [notify, setNotify] = useState<NotifyOffset>("15min");
  const [notifyCustomTime, setNotifyCustomTime] = useState("09:00");
  const [conflictMsg, setConflictMsg] = useState("");
  const [conflictObj, setConflictObj] = useState<any>(null);

  function next() { sound.step(); setStep((s) => Math.min(steps.length - 1, s + 1)); }
  function back() { sound.step(); setStep((s) => Math.max(0, s - 1)); }
  function pickDay(choice: "today" | "tomorrow" | "other") {
    setDayChoice(choice);
    if (choice === "today") { setDate(todayStr(0)); setShowCalendar(false); }
    else if (choice === "tomorrow") { setDate(todayStr(1)); setShowCalendar(false); }
    else setShowCalendar(true);
  }

  return (
    <div className="page-modal">
      <div className="page-modal-header">
        <h3>New Reminder · {steps[step]}</h3>
        <button className="close-x" style={{ position: "static" }} onClick={onClose}>×</button>
      </div>
      <div className="step-progress">{steps.map((_, i) => <div key={i} className={i <= step ? "done" : ""} />)}</div>
      <div className="page-modal-body">
        <div className="step-content" key={step}>
          {step === 0 && (
            <div>
              <div className="field"><label>Title</label>
                <TitleSuggestInput value={title} onChange={setTitle} placeholder="e.g. Advisor meeting"
                  history={allReminders.map((r: any) => ({ title: r.title }))} /></div>
              <div className="btn-row"><button className="btn btn-primary" disabled={!title} onClick={next}>Continue</button></div>
            </div>
          )}
          {step === 1 && (
            <div>
              <div className="field">
                <label>Day</label>
                <div className="day-buttons">
                  <button className={dayChoice === "today" ? "active" : ""} onClick={() => pickDay("today")}>Today</button>
                  <button className={dayChoice === "tomorrow" ? "active" : ""} onClick={() => pickDay("tomorrow")}>Tomorrow</button>
                  <button className={dayChoice === "other" ? "active" : ""} onClick={() => pickDay("other")}>Other date</button>
                </div>
              </div>
              {showCalendar && (
                <div className="field"><label>Choose a date ({formatJalaali(date)})</label>
                  <JalaaliPicker value={date} onChange={setDate} disablePast /></div>
              )}
              <div className="field"><label>Time</label>
                <TimeOfDayPicker value={time} onChange={setTime} /></div>
              {conflictObj && (
                <div className="conflict-preview" style={{ margin: "8px 0" }}>
                  <span className="conflict-preview-title">⚠ Overlaps with "{conflictObj.item.title}"</span>
                  <span className="conflict-preview-meta">
                    {conflictObj.type === "block" ? `${conflictObj.item.start_time || conflictObj.item.start}–${conflictObj.item.end_time || conflictObj.item.end}` : conflictObj.item.time}
                  </span>
                  <button className="btn btn-danger" style={{ marginTop: 8, fontSize: 12 }} onClick={async () => {
                    if (onReplaceAndContinue) await onReplaceAndContinue(conflictObj);
                    setConflictObj(null); setConflictMsg("");
                    next();
                  }}>Replace it and continue</button>
                </div>
              )}
              {conflictMsg && <p style={{ fontSize: 12, color: "#ef6461", fontWeight: 700, marginTop: -4 }}>⚠ {conflictMsg}</p>}
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" onClick={() => {
                  if (checkTimeConflict) {
                    const conflict = checkTimeConflict(date, time);
                    if (conflict) {
                      setConflictObj(conflict);
                      setConflictMsg("This time overlaps with something already scheduled. Please pick a different time or replace it below.");
                      return;
                    }
                  }
                  setConflictObj(null); setConflictMsg("");
                  next();
                }}>Continue</button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <NotifyPicker value={notify} onChange={setNotify} customTime={notifyCustomTime} onCustomTimeChange={setNotifyCustomTime} />
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" onClick={next}>Continue</button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <div className="field"><label>Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" onClick={() => { onSave({ id: uid(), title, date, time, notes, notify, notifyCustomTime }); sound.save(); }}>Save Reminder</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
