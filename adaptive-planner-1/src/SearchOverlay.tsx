import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { formatJalaali } from "./jalaali";
import EmptyState from "./EmptyState";

interface Props {
  tasks: any[];
  goals: any[];
  reminders: any[];
  onOpenTask: (t: any) => void;
  onOpenGoal?: (g: any) => void;
  onOpenReminder?: (r: any) => void;
  onClose: () => void;
}

export default function SearchOverlay({ tasks, goals, reminders, onOpenTask, onOpenGoal, onOpenReminder, onClose }: Props) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return { tasks: [], goals: [], reminders: [] };
    return {
      tasks: tasks.filter((t: any) => t.title?.toLowerCase().includes(term)).slice(0, 20),
      goals: goals.filter((g: any) => g.title?.toLowerCase().includes(term)).slice(0, 20),
      reminders: reminders.filter((r: any) => r.title?.toLowerCase().includes(term)).slice(0, 20),
    };
  }, [q, tasks, goals, reminders]);

  const totalCount = results.tasks.length + results.goals.length + results.reminders.length;

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="sheet glass search-sheet" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <button className="close-x-btn" onClick={onClose}>✕</button>
        <div className="search-input-row">
          <span className="search-icon">🔎</span>
          <input
            autoFocus
            type="text"
            placeholder="Search tasks, goals, reminders..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="search-input"
          />
        </div>

        {q.trim() && totalCount === 0 && (
          <div style={{ marginTop: 20 }}><EmptyState type="search" fallback={`No matches for "${q}".`} /></div>
        )}

        {results.tasks.length > 0 && (
          <div className="search-group">
            <h4>Tasks</h4>
            {results.tasks.map((t: any) => (
              <div key={t.id} className="search-result-row" onClick={() => { onOpenTask(t); onClose(); }}>
                <span className="t">{t.title}</span>
                <span className="d">{t.date ? formatJalaali(t.date) : "Unscheduled"} · {t.status}</span>
              </div>
            ))}
          </div>
        )}

        {results.goals.length > 0 && (
          <div className="search-group">
            <h4>Goals</h4>
            {results.goals.map((g: any) => (
              <div key={g.id} className="search-result-row" onClick={() => { onOpenGoal && onOpenGoal(g); onClose(); }}>
                <span className="t">{g.title}</span>
                <span className="d">{g.deadline ? formatJalaali(g.deadline) : "No deadline"} · {g.status}</span>
              </div>
            ))}
          </div>
        )}

        {results.reminders.length > 0 && (
          <div className="search-group">
            <h4>Reminders</h4>
            {results.reminders.map((r: any) => (
              <div key={r.id} className="search-result-row" onClick={() => { onOpenReminder && onOpenReminder(r); onClose(); }}>
                <span className="t">{r.title}</span>
                <span className="d">{r.date ? formatJalaali(r.date) : ""} {r.time || ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
