import React, { useState } from "react";
import { uid } from "./db";
import { sound } from "./sound";
import { todayStr } from "./seed";
import { formatJalaali } from "./jalaali";
import JalaaliPicker from "./JalaaliPicker";
import WheelPicker from "./WheelPicker";
import TimeOfDayPicker from "./TimeOfDayPicker";
import TitleSuggestInput from "./TitleSuggestInput";
import NotifyPicker from "./NotifyPicker";
import { NotifyOffset } from "./notifications";

const PALETTE_TASK = ["#7dd3c0", "#a78bfa", "#f4a261", "#ef6461", "#4f9d69", "#e8a4c9", "#5b8bd6", "#c9a24b"];
const REPEAT_OPTIONS = [
  { value: "none", label: "Doesn't repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "weekdays", label: "Weekdays" },
];

export default function PlanFlow({ categories, subcategories, goals, allTasks = [], addCategory, addSubcategory, onSave, onClose, defaultDate, presetCategory, presetSubcategory, checkTimeConflict, onReplaceAndContinue }: any) {
  const steps = ["Category", "Subcategory", "Vitality", "Title", "Duration", "Date", "Repeat & Notify", "Goals", "Subtasks", "Color", "Review"];
  const [step, setStep] = useState(presetCategory && presetSubcategory ? 2 : 0);
  const [category, setCategory] = useState<string | null>(presetCategory || null);
  const [subcategory, setSubcategory] = useState<string | null>(presetSubcategory || null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [dayChoice, setDayChoice] = useState<"today" | "tomorrow" | "other">("today");
  const [date, setDate] = useState(defaultDate || todayStr(0));
  const [showCalendar, setShowCalendar] = useState(false);
  const [time, setTime] = useState("");
  const [linkedGoals, setLinkedGoals] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [subtaskPriority, setSubtaskPriority] = useState("Normal");
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [conflictMsg, setConflictMsg] = useState("");
  const [conflictObj, setConflictObj] = useState<any>(null);
  const [repeat, setRepeat] = useState<string>("none");
  const [notify, setNotify] = useState<NotifyOffset>("15min");
  const [notifyCustomTime, setNotifyCustomTime] = useState("09:00");

  const catObj = categories.find((c: any) => c.id === category);
  const subsOfCat = subcategories.filter((s: any) => s.category_id === category);
  const subObj = subcategories.find((s: any) => s.id === subcategory);
  const relevantGoals = goals.filter((g: any) => g.category === category && g.subcategory === subcategory);

  function next() { sound.step(); setStep((s) => Math.min(steps.length - 1, s + 1)); }
  function back() { sound.step(); setStep((s) => Math.max(0, s - 1)); }

  function pickDay(choice: "today" | "tomorrow" | "other") {
    setDayChoice(choice);
    if (choice === "today") { setDate(todayStr(0)); setShowCalendar(false); }
    else if (choice === "tomorrow") { setDate(todayStr(1)); setShowCalendar(false); }
    else setShowCalendar(true);
  }

  function addSubtask() {
    if (!subtaskInput) return;
    setSubtasks([...subtasks, { id: uid(), title: subtaskInput, priority: subtaskPriority, done: false }]);
    setSubtaskInput("");
  }
  function removeSubtask(id: string) { setSubtasks(subtasks.filter((s) => s.id !== id)); }

  function finalize() {
    onSave({
      id: uid(), title, category, subcategory, duration, date, time: time || null,
      status: "Planned", subtasks, goals: linkedGoals, notes: "", color: customColor,
      repeat, notify, notifyCustomTime
    });
    sound.save();
  }

  return (
    <div className="page-modal">
      <div className="page-modal-header">
        <h3>New Plan · {steps[step]}</h3>
        <button className="close-x" style={{ position: "static" }} onClick={onClose}>×</button>
      </div>
      <div className="step-progress">
        {steps.map((_, i) => <div key={i} className={i <= step ? "done" : ""} />)}
      </div>
      <div className="page-modal-body">
        <div className="step-content" key={step}>

          {step === 0 && (
            <div>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 14 }}>Which area of life is this for?</p>
              {categories.length === 0 && <p className="empty">No categories yet — create your first one below.</p>}
              {categories.map((c: any) => (
                <button key={c.id} className="opt-btn" onClick={() => { setCategory(c.id); next(); }}>
                  {c.icon} {c.name}
                </button>
              ))}
              <div className="field">
                <label>Create a new category</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name" />
                  <button className="btn btn-ghost" style={{ flex: "0 0 auto" }} onClick={async () => {
                    if (!newCatName) return;
                    const id = await addCategory(newCatName, "📁");
                    setCategory(id); setNewCatName(""); next();
                  }}>Add</button>
                </div>
              </div>
            </div>
          )}

          {step === 1 && catObj && (
            <div>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 14 }}>Pick a subcategory within {catObj.name}.</p>
              {subsOfCat.length === 0 && <p className="empty">No subcategories yet in {catObj.name}.</p>}
              {subsOfCat.map((s: any) => (
                <button key={s.id} className="opt-btn" style={{ borderLeft: `3px solid ${s.color}` }}
                  onClick={() => { setSubcategory(s.id); next(); }}>
                  {s.icon} {s.title} <span className="badge">{s.vitality}</span>
                </button>
              ))}
              <div className="field">
                <label>Create a new subcategory</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={newSubName} onChange={(e) => setNewSubName(e.target.value)} placeholder="Subcategory title" />
                  <button className="btn btn-ghost" style={{ flex: "0 0 auto" }} onClick={async () => {
                    if (!newSubName) return;
                    const id = await addSubcategory(category!, newSubName, "Normal");
                    setSubcategory(id); setNewSubName(""); next();
                  }}>Add</button>
                </div>
              </div>
              <div className="btn-row"><button className="btn btn-ghost" onClick={back}>Back</button></div>
            </div>
          )}

          {step === 2 && subObj && (
            <div>
              <p style={{ fontSize: 14, color: "var(--ink)" }}>
                <b>{subObj.title}</b> has vitality level <b>{subObj.vitality}</b>.
              </p>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>
                {subObj.vitality === "Normal"
                  ? "This task will appear with standard visual weight."
                  : "This task will stand out visually as important, and be prioritized in your homepage ranking."}
              </p>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" onClick={next}>Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="field"><label>Task title</label>
                <TitleSuggestInput
                  value={title} onChange={setTitle} placeholder="What needs doing?"
                  history={allTasks.filter((t: any) => t.category === category && t.subcategory === subcategory).map((t: any) => ({ title: t.title, duration: t.duration }))}
                  onPickDuration={(d: number) => setDuration(d)}
                /></div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" disabled={!title} onClick={next}>Continue</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Estimated duration</p>
              <WheelPicker totalMinutes={duration} onChange={setDuration} />
              <p style={{ fontSize: 13, color: "var(--ink)", marginTop: 8 }}>{Math.floor(duration / 60)}h {duration % 60}m</p>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" onClick={next}>Continue</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="field">
                <label>When?</label>
                <div className="day-buttons">
                  <button className={dayChoice === "today" ? "active" : ""} onClick={() => pickDay("today")}>Today</button>
                  <button className={dayChoice === "tomorrow" ? "active" : ""} onClick={() => pickDay("tomorrow")}>Tomorrow</button>
                  <button className={dayChoice === "other" ? "active" : ""} onClick={() => pickDay("other")}>Other date</button>
                </div>
              </div>
              {showCalendar && (
                <div className="field">
                  <label>Choose a date ({formatJalaali(date)})</label>
                  <JalaaliPicker value={date} onChange={setDate} disablePast />
                </div>
              )}
              <div className="field"><label>Optional time</label>
                <TimeOfDayPicker value={time} onChange={setTime} onClear={() => setTime("")} /></div>
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
                  if (time && checkTimeConflict) {
                    const conflict = checkTimeConflict(date, time, duration);
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

          {step === 6 && (
            <div>
              <div className="field">
                <label>Repeat</label>
                <div className="notify-options">
                  {REPEAT_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      className={"notify-chip" + (repeat === opt.value ? " active" : "")}
                      onClick={() => setRepeat(opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <NotifyPicker value={notify} onChange={setNotify} customTime={notifyCustomTime} onCustomTimeChange={setNotifyCustomTime} />
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" onClick={next}>Continue</button>
              </div>
            </div>
          )}

          {step === 7 && (
            <div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
                Optionally link this task to a goal in {subObj?.title} — this connects your daily work to longer-term progress, but does not create the goal automatically.
              </p>
              {relevantGoals.length === 0 && <p className="empty">No goals exist in this subcategory yet — you can skip this step.</p>}
              {relevantGoals.map((g: any) => (
                <label key={g.id} className="opt-btn" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={linkedGoals.includes(g.id)}
                    onChange={(e) => setLinkedGoals(e.target.checked ? [...linkedGoals, g.id] : linkedGoals.filter((x) => x !== g.id))} />
                  {g.title}
                </label>
              ))}
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" onClick={next}>{relevantGoals.length === 0 ? "Skip" : "Continue"}</button>
              </div>
            </div>
          )}

          {step === 8 && (
            <div>
              <div className="field"><label>Subtasks (optional)</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={subtaskInput} onChange={(e) => setSubtaskInput(e.target.value)} placeholder="Add subtask" />
                  <select value={subtaskPriority} onChange={(e) => setSubtaskPriority(e.target.value)} style={{ width: 100 }}>
                    <option>Low</option><option>Normal</option><option>High</option>
                  </select>
                  <button className="btn btn-ghost" style={{ flex: "0 0 auto" }} onClick={addSubtask}>Add</button>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {subtasks.map((s) => (
                  <div key={s.id} className="subtask-chip">
                    <span className={`priority-dot priority-${s.priority}`} />
                    {s.title}
                    <span style={{ cursor: "pointer", color: "var(--muted)" }} onClick={() => removeSubtask(s.id)}>×</span>
                  </div>
                ))}
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" onClick={next}>Continue</button>
              </div>
            </div>
          )}

          {step === 9 && (
            <div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
                Optionally pick a custom color for this task's card — otherwise it uses the liquid-glass default look.
              </p>
              <div className="color-swatches">
                <div className={"swatch" + (customColor === null ? " sel" : "")}
                  style={{ background: "var(--glass)", border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}
                  onClick={() => setCustomColor(null)}>✕</div>
                {PALETTE_TASK.map((c) => (
                  <div key={c} className={"swatch" + (customColor === c ? " sel" : "")} style={{ background: c }} onClick={() => setCustomColor(c)} />
                ))}
                <input type="color" value={customColor || "#7dd3c0"} onChange={(e) => setCustomColor(e.target.value)}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer" }} />
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" onClick={next}>Continue</button>
              </div>
            </div>
          )}

          {step === 10 && (
            <div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Review before saving:</p>
              <div className="review-item">
                <div className="title">{title}</div>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>
                  {catObj?.name} · {subObj?.title} · {Math.floor(duration / 60)}h {duration % 60}m<br/>
                  {formatJalaali(date)} {time && `at ${time}`}<br/>
                  {subtasks.length} subtask{subtasks.length === 1 ? "" : "s"} · {linkedGoals.length} goal link{linkedGoals.length === 1 ? "" : "s"}<br/>
                  {repeat !== "none" ? `Repeats ${repeat}` : "One-time"} · {notify !== "none" ? "Notification on" : "No notification"}
                </p>
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={back}>Back</button>
                <button className="btn btn-primary" onClick={finalize}>Save Plan</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
