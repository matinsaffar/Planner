import React, { useState } from "react";
import { formatJalaali } from "./jalaali";
import JalaaliPicker from "./JalaaliPicker";
import { todayStr } from "./seed";

export default function TaskDetail({ task, subInfo, catInfo, isPastDue, onStart, onFinishDirect, onDelay, onCancel, onClose, onEdit, onToggleSubtask }: any) {
  const [delayMode, setDelayMode] = useState(false);
  const [delayChoice, setDelayChoice] = useState<"tomorrow" | "other">("tomorrow");
  const [delayDate, setDelayDate] = useState(todayStr(1));
  const sub = subInfo(task.category, task.subcategory);
  const PRIORITY_RANK: Record<string, number> = { High: 0, Normal: 1, Low: 2 };
  const subtasks = [...(task.subtasks || [])].sort(
    (a: any, b: any) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
  );

  function pickDelay(choice: "tomorrow" | "other") {
    setDelayChoice(choice);
    if (choice === "tomorrow") setDelayDate(todayStr(1));
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet glass" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <button className="close-x" onClick={onClose}>×</button>
        <div style={{ height: 80, borderRadius: 16, background: sub ? sub.color : "var(--accent)", marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>
          {sub?.gif ? <img src={sub.gif} alt="" style={{ height: "100%", objectFit: "cover", width: "100%", borderRadius: 16 }} /> : (sub ? sub.icon : "📌")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h3 style={{ marginBottom: 4 }}>{task.title}</h3>
          <button className="mute-btn" onClick={() => onEdit(task)}>Edit</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>
          {catInfo(task.category)?.name} · <span className="badge">{sub?.title}</span> · {task.duration} min · {formatJalaali(task.date)}
        </p>
        {task.notes && <p style={{ fontSize: 13 }}>{task.notes}</p>}
        {subtasks.length > 0 && (
          <div className="focus-subtask-list" style={{ maxWidth: "none", margin: "0 0 14px" }}>
            <div className="focus-subtask-label">
              Subtasks · {subtasks.filter((s: any) => s.done).length}/{subtasks.length}
            </div>
            {subtasks.map((s: any) => (
              <label key={s.id} className={"focus-subtask-item" + (s.done ? " done" : "")}>
                <input
                  type="checkbox"
                  checked={!!s.done}
                  onChange={() => onToggleSubtask && onToggleSubtask(s.id)}
                />
                <span className={`priority-dot priority-${s.priority}`} />
                <span className="focus-subtask-title">{s.title}</span>
              </label>
            ))}
          </div>
        )}
        {!delayMode ? (
          <div className="btn-row">
            {isPastDue && task.status !== "Finished" ? (
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={onFinishDirect}>FINISHED</button>
            ) : (
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={onStart}>START</button>
            )}
            <button className="btn btn-ghost" onClick={() => setDelayMode(true)}>DELAY</button>
            <button className="btn btn-danger" onClick={onCancel}>CANCEL</button>
          </div>
        ) : (
          <div>
            <div className="field">
              <label>Delay to</label>
              <div className="day-buttons">
                <button className={delayChoice === "tomorrow" ? "active" : ""} onClick={() => pickDelay("tomorrow")}>Tomorrow</button>
                <button className={delayChoice === "other" ? "active" : ""} onClick={() => pickDelay("other")}>Other date</button>
              </div>
            </div>
            {delayChoice === "other" && (
              <div className="field"><label>Choose a date ({formatJalaali(delayDate)})</label>
                <JalaaliPicker value={delayDate} onChange={setDelayDate} disablePast /></div>
            )}
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => setDelayMode(false)}>Back</button>
              <button className="btn btn-primary" onClick={() => onDelay(delayDate)}>Confirm Delay to {formatJalaali(delayDate)}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
