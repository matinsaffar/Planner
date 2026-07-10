import React, { useState } from "react";
import { uid } from "./db";
import { formatJalaali } from "./jalaali";
import { sound } from "./sound";
import JalaaliPicker from "./JalaaliPicker";
import { todayStr } from "./seed";
import EmptyState from "./EmptyState";
import BadgePicker from "./BadgePicker";

export default function SubcategoryDetail({ sub, category, tasks, goals, onClose, onSaveGoal, onDeleteGoal, onOpenTask, onCreateTask, onAchieveGoal }: any) {
  const [badgePromptGoal, setBadgePromptGoal] = useState<any>(null);
  const [achievingId, setAchievingId] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [gTitle, setGTitle] = useState("");
  const [gType, setGType] = useState("Deadline");
  const [gDeadline, setGDeadline] = useState(todayStr(14));
  const [gTarget, setGTarget] = useState(1);

  const upcoming = tasks.filter((t: any) => t.status !== "Finished" && t.status !== "Cancelled");
  const finished = tasks.filter((t: any) => t.status === "Finished");

  function computeStreak(checkins: string[]): number {
    if (!checkins || checkins.length === 0) return 0;
    const sorted = [...checkins].sort().reverse();
    const today = todayStr(0);
    let streak = 0;
    let cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const dStr = cursor.toISOString().slice(0, 10);
      if (sorted.includes(dStr)) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else if (dStr === today) { cursor.setDate(cursor.getDate() - 1); continue; }
      else break;
    }
    return streak;
  }

  function checkInToday(g: any) {
    const today = todayStr(0);
    const checkins = g.checkins || [];
    if (checkins.includes(today)) return;
    onSaveGoal({ ...g, checkins: [...checkins, today], progress: (g.progress || 0) + 1 });
  }

  function openNewGoal() {
    setEditingGoal(null); setGTitle(""); setGType("Deadline"); setGDeadline(todayStr(14)); setGTarget(1);
    setShowGoalForm(true);
  }
  function openEditGoal(g: any) {
    setEditingGoal(g); setGTitle(g.title); setGType(g.type); setGDeadline(g.deadline || todayStr(14)); setGTarget(g.target || 1);
    setShowGoalForm(true);
  }
  function saveGoal() {
    onSaveGoal({
      id: editingGoal?.id || uid(), category: category.id, subcategory: sub.id,
      type: gType, title: gTitle, start_date: editingGoal?.start_date || todayStr(0),
      deadline: gDeadline, status: editingGoal?.status || "In Progress",
      target: gTarget, progress: editingGoal?.progress || 0,
    });
    setShowGoalForm(false); sound.save();
  }

  return (
    <div className="page-modal">
      <div className="page-modal-header">
        <h3>{sub.icon} {sub.title}</h3>
        <button className="close-x" style={{ position: "static" }} onClick={onClose}>×</button>
      </div>
      <div className="page-modal-body" style={{ alignItems: "stretch" }}>
        <div className="step-content" style={{ maxWidth: 480 }}>
          <div className="glass section">
            <h2>Goals <button className="expand-btn" onClick={openNewGoal}>+ New goal</button></h2>
            {goals.length === 0 && <EmptyState type="goals" fallback="No goals set for this subcategory yet." />}
            {goals.filter((g: any) => !g.achieved).map((g: any) => {
              const streak = g.type === "Metric" ? computeStreak(g.checkins || []) : 0;
              const checkedToday = g.type === "Metric" && (g.checkins || []).includes(todayStr(0));
              return (
                <div key={g.id} className={"goal-row" + (achievingId === g.id ? " achieving-out" : "")}>
                  <div className="goal-row-title" style={{ cursor: "pointer" }} onClick={() => openEditGoal(g)}>{g.title}</div>
                  <div className="days">
                    {g.type} · {g.deadline ? formatJalaali(g.deadline) : "—"} · {g.status}
                    {g.type === "Metric" && <span className="streak-badge">🔥 {streak} day{streak === 1 ? "" : "s"}</span>}
                  </div>
                  {g.type === "Metric" && (
                    <button
                      className={"btn " + (checkedToday ? "btn-ghost" : "btn-primary")}
                      style={{ marginTop: 6, alignSelf: "flex-start", fontSize: 12, padding: "6px 14px" }}
                      disabled={checkedToday}
                      onClick={(e) => { e.stopPropagation(); checkInToday(g); }}>
                      {checkedToday ? "✓ Checked in today" : "Check in today"}
                    </button>
                  )}
                  <button className="btn btn-achieve" onClick={(e) => { e.stopPropagation(); setBadgePromptGoal(g); }}>🏆 Mark Achieved</button>
                </div>
              );
            })}

            {goals.some((g: any) => g.achieved) && (
              <div className="hall-of-goals" style={{ marginTop: 16, borderRadius: 16, padding: 14 }}>
                <h3 style={{ marginTop: 0 }}>🏛️ Hall of Goals</h3>
                <div className="hall-grid">
                  {goals.filter((g: any) => g.achieved).map((g: any) => (
                    <div key={g.id} className="hall-card">
                      <div className="hall-badge">{g.badge || "🏆"}</div>
                      <div className="hall-title">{g.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass section">
            <h2>Upcoming <button className="expand-btn" onClick={onCreateTask}>+ New task</button></h2>
            {upcoming.length === 0 && <EmptyState type="tasksDay" fallback="Nothing upcoming." />}
            {upcoming.map((t: any) => (
              <div key={t.id} className="meeting-row" style={{ cursor: "pointer" }} onClick={() => onOpenTask(t)}>
                <span>{t.title}</span>
                <span className="badge">{formatJalaali(t.date)} {t.time || ""}</span>
              </div>
            ))}
          </div>

          <div className="glass section">
            <h2>Finished</h2>
            {finished.length === 0 && <EmptyState type="finished" />}
            {finished.map((t: any) => (
              <div key={t.id} className="meeting-row" style={{ opacity: 0.5, textDecoration: "line-through" }}>
                <span>{t.title}</span>
                <span className="badge">{formatJalaali(t.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Moved OUT of any .glass container: .glass uses backdrop-filter, which per
          spec creates a new containing block for descendant position:fixed elements —
          that was clipping this overlay behind the header/Upcoming section. As a direct
          child of .page-modal it now covers the full screen correctly. */}
      {badgePromptGoal && (
        <div className="overlay" style={{ zIndex: 500 }} onClick={() => setBadgePromptGoal(null)}>
          <div className="sheet glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <h3>🏆 Choose a badge</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Pick a badge to celebrate "{badgePromptGoal.title}".</p>
            <BadgePicker value={null} onChange={(b) => {
              const goalId = badgePromptGoal.id;
              setBadgePromptGoal(null);
              setAchievingId(goalId);
              setTimeout(() => { onAchieveGoal(goalId, b); setAchievingId(null); }, 450);
            }} />
            <div className="btn-row"><button className="btn btn-ghost" onClick={() => setBadgePromptGoal(null)}>Cancel</button></div>
          </div>
        </div>
      )}

      {showGoalForm && (
        <div className="overlay" onClick={() => setShowGoalForm(false)}>
          <div className="sheet glass" onClick={(e) => e.stopPropagation()}>
            <h3>{editingGoal ? "Edit Goal" : "New Goal"}</h3>
            <div className="field"><label>Title</label>
              <input value={gTitle} onChange={(e) => setGTitle(e.target.value)} /></div>
            <div className="field"><label>Type</label>
              <select value={gType} onChange={(e) => setGType(e.target.value)}>
                <option>Deadline</option><option>Phase</option><option>Metric</option>
              </select></div>
            <div className="field"><label>Deadline ({formatJalaali(gDeadline)})</label>
              <JalaaliPicker value={gDeadline} onChange={setGDeadline} disablePast /></div>
            {gType === "Metric" && (
              <div className="field"><label>Target count</label>
                <input type="number" value={gTarget} onChange={(e) => setGTarget(Number(e.target.value))} /></div>
            )}
            <div className="btn-row">
              {editingGoal && <button className="btn btn-danger" onClick={() => { onDeleteGoal(editingGoal.id); setShowGoalForm(false); }}>Delete</button>}
              <button className="btn btn-ghost" onClick={() => setShowGoalForm(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!gTitle} onClick={saveGoal}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
