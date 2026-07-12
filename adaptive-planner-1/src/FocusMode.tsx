import React, { useEffect, useState } from "react";
import { sound } from "./sound";
import {
  FocusSession,
  computeElapsedSeconds,
  togglePauseFocusSession,
  extendFocusSession,
  setFocusMinimized,
  endFocusSession,
} from "./focusSession";

interface Props {
  session: FocusSession;
  onFinish: (task: any) => void;
  onBreak: (task: any, remainingMinutes: number) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
}

const PRIORITY_RANK: Record<string, number> = { High: 0, Normal: 1, Low: 2 };

// Full-screen focus timer. Unlike the old version, this never owns the
// clock itself — `session` is the shared row from `focus_sessions`, kept in
// sync across every device via Realtime (see App.tsx + focusSession.ts).
// This component just re-renders once a second and re-derives elapsed time
// from the session's timestamps, and writes user actions (pause, extend,
// minimize) back to that row so every other open device sees them too.
export default function FocusMode({ session, onFinish, onBreak, onToggleSubtask }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const task = session.task_snapshot;
  const elapsed = computeElapsedSeconds(session);
  const remaining = Math.max(0, session.total_seconds - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const remainingMinutes = Math.ceil(remaining / 60);
  const pct = Math.min(100, (elapsed / session.total_seconds) * 100);
  const isOvertime = remaining === 0;
  const subtasks = [...(task.subtasks || [])].sort(
    (a: any, b: any) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
  );

  async function togglePause() { sound.pause(); await togglePauseFocusSession(session); }
  async function extend(minutes: number) { sound.step(); await extendFocusSession(session, minutes); }
  async function minimize() { await setFocusMinimized(true); }

  async function finish() {
    await endFocusSession();
    onFinish(task);
  }
  async function takeBreak() {
    await endFocusSession();
    onBreak(task, remainingMinutes);
  }

  return (
    <div className="focus-screen">
      {/* Closing no longer discards the session — it just docks it as a
          drawer at the bottom (see FocusDrawer + App.tsx). The timer keeps
          running underneath, on this device and any other open one. */}
      <button className="close-x" onClick={minimize} aria-label="Minimize focus session">×</button>
      <h2>{task.title}</h2>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Focus mode · {Math.round(session.total_seconds / 60)} min planned
        {task.extended_minutes > 0 && <span style={{ color: "var(--accent-warm)", fontWeight: 700 }}> (+{task.extended_minutes}m added)</span>}
      </p>
      <div className="focus-time" style={isOvertime ? { color: "var(--danger)" } : {}}>{mm}:{ss}</div>
      <div style={{ width: 240, height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden", marginBottom: 18 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: isOvertime ? "var(--danger)" : "linear-gradient(90deg,var(--accent),var(--accent2))", transition: "width 1s linear" }} />
      </div>

      {subtasks.length > 0 && (
        <div className="focus-subtask-list">
          <div className="focus-subtask-label">
            Subtasks · {subtasks.filter((s: any) => s.done).length}/{subtasks.length}
          </div>
          {subtasks.map((s: any) => (
            <label key={s.id} className={"focus-subtask-item" + (s.done ? " done" : "")}>
              <input
                type="checkbox"
                checked={!!s.done}
                onChange={() => onToggleSubtask && onToggleSubtask(task.id, s.id)}
              />
              <span className={`priority-dot priority-${s.priority}`} />
              <span className="focus-subtask-title">{s.title}</span>
            </label>
          ))}
        </div>
      )}

      <div className="mini-row" style={{ marginBottom: 18 }}>
        <button className="mini-btn" onClick={() => extend(15)}>+15 min</button>
        <button className="mini-btn" onClick={() => extend(30)}>+30 min</button>
        <button className="mini-btn" onClick={() => extend(45)}>+45 min</button>
      </div>

      <div className="split-btn">
        <div className="fin" onClick={finish}>FINISH</div>
        <div className="pp" onClick={togglePause}>{session.paused ? "RESUME" : "PAUSE"}</div>
      </div>
      <div className="mini-row">
        <button className="mini-btn" onClick={takeBreak}>Break task here</button>
      </div>
    </div>
  );
}
