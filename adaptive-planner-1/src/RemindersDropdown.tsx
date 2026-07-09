import React, { useState } from "react";
import { formatJalaali } from "./jalaali";
import { sound } from "./sound";

export default function RemindersDropdown({ reminders, onEdit, onHide, isNear }: any) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [hidingId, setHidingId] = useState<string | null>(null);
  const visible = reminders.filter((r: any) => !r.hidden);
  const nearest = visible[0];

  function requestHide(id: string) { setConfirmId(id); }
  function confirmHide() {
    if (!confirmId) return;
    setHidingId(confirmId);
    sound.finish();
    setTimeout(() => { onHide(confirmId); setHidingId(null); }, 400);
    setConfirmId(null);
  }

  if (visible.length === 0) return null;

  function row(r: any, big: boolean) {
    return (
      <div key={r.id}
        className={"meeting-row" + (isNear(r) ? " highlight-near" : "") + (hidingId === r.id ? " hiding" : "")}>
        <div>
          <div style={{ fontWeight: big ? 700 : 600, fontSize: 13 }}>{isNear(r) ? "⚠️ " : ""}{r.title}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{formatJalaali(r.date)} · {r.time}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="mini-btn" onClick={() => onEdit(r)}>Edit</button>
          <input type="checkbox" onChange={() => requestHide(r.id)} title="Mark as done" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass section" style={{ margin: "0 16px 16px" }}>
      <h2 onClick={() => { setOpen(!open); sound.navigate(); }} style={{ cursor: "pointer" }}>
        Reminders <span className="expand-btn">{open ? "Hide" : "Show all"}</span>
      </h2>
      {row(nearest, true)}
      {open && visible.slice(1).map((r: any) => row(r, false))}

      {confirmId && (
        <div className="overlay" onClick={() => setConfirmId(null)}>
          <div className="sheet glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 300, textAlign: "center" }}>
            <h3>Mark as done?</h3>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>This will hide the reminder from your list.</p>
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmHide}>Yes, done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
