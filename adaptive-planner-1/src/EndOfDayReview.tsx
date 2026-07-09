import React, { useState } from "react";
import JalaaliPicker from "./JalaaliPicker";
import { formatJalaali } from "./jalaali";
import { sound } from "./sound";

interface Task {
  id: string; title: string; category: string; subcategory: string;
  duration: number; date: string; status: string;
}

interface Props {
  tasks: Task[];
  onResolve: (id: string, action: "finish" | "delay" | "cancel" | "backlog", delayDate?: string) => void;
  onClose: () => void;
}

export default function EndOfDayReview({ tasks, onResolve, onClose }: Props) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [delayTarget, setDelayTarget] = useState<string | null>(null);
  const [delayDate, setDelayDate] = useState(new Date().toISOString().slice(0, 10));

  function choose(id: string, action: "finish" | "delay" | "cancel" | "backlog") {
    if (action === "delay") { setDelayTarget(id); return; }
    setChoices((c) => ({ ...c, [id]: action }));
    onResolve(id, action);
    sound.save();
  }
  function confirmDelay() {
    if (!delayTarget) return;
    setChoices((c) => ({ ...c, [delayTarget]: "delay" }));
    onResolve(delayTarget, "delay", delayDate);
    setDelayTarget(null);
    sound.save();
  }

  return (
    <div className="overlay">
      <div className="sheet">
        <h3>Reviewing your previous day</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -6, marginBottom: 14 }}>
          A few tasks never got started. No judgment — just decide what happens to each one.
        </p>
        {tasks.map((t) => (
          <div className="review-item" key={t.id}>
            <div className="title">{t.title} <span className="badge">{t.duration} min</span></div>
            <div className="review-actions">
              <button className={choices[t.id] === "finish" ? "chosen" : ""} onClick={() => choose(t.id, "finish")}>Mark finished</button>
              <button className={choices[t.id] === "delay" ? "chosen" : ""} onClick={() => choose(t.id, "delay")}>Delay</button>
              <button className={choices[t.id] === "cancel" ? "chosen" : ""} onClick={() => choose(t.id, "cancel")}>Cancel</button>
              <button className={choices[t.id] === "backlog" ? "chosen" : ""} onClick={() => choose(t.id, "backlog")}>Keep unscheduled</button>
            </div>
          </div>
        ))}
        {delayTarget && (
          <div style={{ marginTop: 10, padding: 12, background: "var(--surface2)", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Delay to: {formatJalaali(delayDate)}</p>
            <JalaaliPicker value={delayDate} onChange={setDelayDate} />
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => setDelayTarget(null)}>Back</button>
              <button className="btn btn-primary" onClick={confirmDelay}>Confirm</button>
            </div>
          </div>
        )}
        <div className="btn-row">
          <button className="btn btn-primary" disabled={tasks.some(t => !choices[t.id])} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
