import React, { useRef, useState } from "react";
import { sound } from "./sound";
import { contrastText } from "./colorUtils";

interface Props {
  tasksWithTime: any[];
  unstarted: any[];
  blocks?: any[];
  subInfo: (cat: string, sub: string) => any;
  onOpenTask: (t: any) => void;
  onDropTask: (taskId: string, hour: number, minute: number) => Promise<{ ok: boolean; conflict?: { type: string; item: any } }>;
  onReplaceConflict?: () => void;
  cardOpacity?: number;
}

const START_HOUR = 0;
const END_HOUR = 23;
const HOUR_HEIGHT = 64;

function fmtHour(h: number) {
  return String(h % 24).padStart(2, "0") + ":00";
}

export default function StructuredTimeline({ tasksWithTime, unstarted, blocks = [], subInfo, onOpenTask, onDropTask, onReplaceConflict, cardOpacity = 1 }: Props) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [ghostTop, setGhostTop] = useState<number | null>(null);
  const [ghostLabel, setGhostLabel] = useState("");
  const [timelineHeightPct, setTimelineHeightPct] = useState(68);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [conflictDetails, setConflictDetails] = useState<{ type: string; item: any } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStateRef = useRef<{ startY: number; startPct: number } | null>(null);

  function yToTime(clientY: number) {
    if (!timelineRef.current) return { hour: START_HOUR, minute: 0, top: 0 };
    const rect = timelineRef.current.getBoundingClientRect();
    const relY = Math.max(0, clientY - rect.top + timelineRef.current.scrollTop);
    const totalMinutesFromStart = (relY / HOUR_HEIGHT) * 60;
    const maxMinutes = (END_HOUR - START_HOUR + 1) * 60 - 15;
    const clampedMinutes = Math.min(maxMinutes, totalMinutesFromStart);
    const hour = START_HOUR + Math.floor(clampedMinutes / 60);
    const minute = Math.round((clampedMinutes % 60) / 15) * 15 % 60;
    const top = (hour - START_HOUR) * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT;
    return { hour, minute, top };
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
    const { hour, minute, top } = yToTime(e.clientY);
    setGhostTop(top);
    setGhostLabel(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation(); setDragOver(false); setGhostTop(null);
    const taskId = e.dataTransfer.getData("taskId") || e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const { hour, minute } = yToTime(e.clientY);
    const result = await onDropTask(taskId, hour, minute);
    if (!result.ok && result.conflict) {
      setConflictDetails(result.conflict);
    } else {
      sound.drop();
    }
  }

  function timeToOffset(timeStr: string | null, startedAt: number | null): number {
    let h = START_HOUR, m = 0;
    if (timeStr) { [h, m] = timeStr.split(":").map(Number); }
    else if (startedAt) { const d = new Date(startedAt); h = d.getHours(); m = d.getMinutes(); }
    return ((h - START_HOUR) * 60 + m) * (HOUR_HEIGHT / 60);
  }

  function overlaps(a: any, b: any) {
    const aStart = timeToOffset(a.time, a.started_at);
    const aEnd = aStart + (a.duration || 30) * (HOUR_HEIGHT / 60);
    const bStart = timeToOffset(b.time, b.started_at);
    const bEnd = bStart + (b.duration || 30) * (HOUR_HEIGHT / 60);
    return aStart < bEnd && bStart < aEnd;
  }

  function startResize(e: React.MouseEvent) {
    dragStateRef.current = { startY: e.clientY, startPct: timelineHeightPct };
    const onMove = (ev: MouseEvent) => {
      if (!dragStateRef.current) return;
      const deltaPx = ev.clientY - dragStateRef.current.startY;
      const containerH = window.innerHeight * 0.75;
      const deltaPct = (deltaPx / containerH) * 100;
      const next = Math.min(85, Math.max(30, dragStateRef.current.startPct + deltaPct));
      setTimelineHeightPct(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const hourMarks = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="timeline-wrap">
      {overlapWarning && (
        <div className="overlay" onClick={() => setOverlapWarning(null)}>
          <div className="sheet glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320, textAlign: "center" }}>
            <h3>⚠️ Overlapping tasks</h3>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>{overlapWarning}</p>
            <button className="btn btn-primary" onClick={() => setOverlapWarning(null)}>Got it</button>
          </div>
        </div>
      )}
      {conflictDetails && (
        <div className="overlay" onClick={() => setConflictDetails(null)}>
          <div className="sheet glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, textAlign: "center" }}>
            <h3>⚠️ Time slot occupied</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
              This time already has {conflictDetails.type === "task" ? "a task" : conflictDetails.type === "block" ? "an occupied block" : "a reminder"} scheduled:
            </p>
            <div className="conflict-preview">
              <span className="conflict-preview-title">{conflictDetails.item.title}</span>
              <span className="conflict-preview-meta">
                {conflictDetails.type === "block"
                  ? `${conflictDetails.item.start_time || conflictDetails.item.start}–${conflictDetails.item.end_time || conflictDetails.item.end}`
                  : conflictDetails.item.time}
              </span>
            </div>
            <div className="btn-row" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={() => setConflictDetails(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { onReplaceConflict && onReplaceConflict(); setConflictDetails(null); }}>
                Replace with new task
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="glass section" style={{ flex: `0 0 ${timelineHeightPct}%`, display: "flex", flexDirection: "column", margin: "0 16px 0", overflow: "hidden" }}>
        <h2>Day Timeline</h2>
        <div
          ref={(el) => {
            (timelineRef as any).current = el;
            if (el && !(el as any)._scrolled) {
              (el as any)._scrolled = true;
              el.scrollTop = (7.75 - START_HOUR) * HOUR_HEIGHT - 60;
            }
          }}
          className={"timeline-scroll" + (dragOver ? " drop-active" : "")}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={() => { setDragOver(false); setGhostTop(null); }}
          onDrop={handleDrop}
          style={{ position: "relative", height: hourMarks.length * HOUR_HEIGHT }}
        >
          {hourMarks.map((h) => (
            <div key={h} style={{ position: "absolute", top: (h - START_HOUR) * HOUR_HEIGHT, left: 0, right: 0,
              borderTop: "1px solid var(--border)", pointerEvents: "none", zIndex: 0 }}>
              <span className="hour-label-chip">{fmtHour(h)}</span>
            </div>
          ))}
          {ghostTop !== null && (
            <div style={{ position: "absolute", top: ghostTop, left: 8, right: 8, height: 2,
              background: "var(--accent)", zIndex: 5 }}>
              <span style={{ position: "absolute", right: 0, top: -20, fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>
                {ghostLabel}
              </span>
            </div>
          )}
          {tasksWithTime.length === 0 && (
            <div className="empty" style={{ position: "absolute", top: 20, left: 20 }}>
              Drag a task here, or set a time when creating one.
            </div>
          )}
          {blocks.map((b: any) => {
            const [sh, sm] = (b.start_time || "00:00").split(":").map(Number);
            const [eh, em] = (b.end_time || "01:00").split(":").map(Number);
            const top = ((sh - START_HOUR) * 60 + sm) * (HOUR_HEIGHT / 60);
            const height = Math.max(20, ((eh * 60 + em) - (sh * 60 + sm)) * (HOUR_HEIGHT / 60));
            return (
              <div key={b.id} className="tl-block" style={{ position: "absolute", top, left: 8, right: 8, height, opacity: cardOpacity }}>
                <div className="time">🔒 {b.start_time}–{b.end_time}</div>
                <div className="title">{b.title}</div>
              </div>
            );
          })}
          {tasksWithTime.map((t: any) => {
            const sub = subInfo(t.category, t.subcategory);
            const top = timeToOffset(t.time, t.started_at);
            const height = Math.max(38, (t.duration || 30) * (HOUR_HEIGHT / 60));
            const hasOverlap = tasksWithTime.some((o: any) => o.id !== t.id && overlaps(t, o));
            const isFinished = t.status === "Finished";
            const statusLabel = t.status === "In Progress" ? "In progress" : isFinished ? "✓ Finished" : t.time ? "Scheduled" : "Dropped";
            const bg = t.color || null;
            const totalHeight = (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT;
            const spillsOver = top + height > totalHeight;
            const visibleHeight = spillsOver ? Math.max(20, totalHeight - top) : height;
            const overflowMinutes = spillsOver ? Math.round(((top + height) - totalHeight) / (HOUR_HEIGHT / 60)) : 0;
            return (
              <div key={t.id} draggable={!isFinished}
                className={"tl-item" + (hasOverlap && !isFinished ? " overlap" : "") + (isFinished ? " finished" : "") + (bg ? " custom-color" : "")}
                style={{ position: "absolute", top, left: 8, right: 8, height: visibleHeight,
                  background: bg || "var(--glass)", cursor: isFinished ? "pointer" : "grab", zIndex: isFinished ? 1 : 2,
                  outline: hasOverlap && !isFinished ? "2px solid var(--danger)" : "none", opacity: cardOpacity }}
                onDragStart={(e) => {
                  if (isFinished) return;
                  e.dataTransfer.setData("taskId", t.id);
                  e.dataTransfer.setData("text/plain", t.id);
                  e.dataTransfer.effectAllowed = "move";
                  sound.drag();
                }}
                onClick={() => onOpenTask(t)}>
                <div className="time">{t.time || "—"} · {statusLabel}{hasOverlap && !isFinished ? " · ⚠️ overlap" : ""}</div>
                <div className="title">{t.title}</div>
                {sub && <div className="sub-tag-chip" style={{ background: sub.color, color: contrastText(sub.color) }}>{sub.icon} {sub.title}</div>}
                {spillsOver && (
                  <div className="spill-badge">↷ continues {overflowMinutes}m into tomorrow</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="resize-handle" onMouseDown={startResize}><div className="bar"></div></div>

      <div className="glass section unstarted-panel" style={{ flex: 1, margin: "0 16px 16px" }}>
        <h2>Unscheduled Tasks <span className="badge">{unstarted.length}</span></h2>
        {unstarted.length === 0 && <div className="empty">Nothing waiting — great job.</div>}
        <div className="unstarted-grid">
          {unstarted.map((t: any) => {
            const sub = subInfo(t.category, t.subcategory);
            const bg = t.color || null;
            return (
              <div key={t.id} draggable
                className={`task-card vital-${sub ? sub.vitality : "Normal"}` + (bg ? " custom-color" : "") + (draggingId === t.id ? " dragging" : "")}
                style={{ background: bg || "var(--glass)", minWidth: 80 + Math.min(t.duration, 100) }}
                onDragStart={(e) => {
                  e.dataTransfer.setData("taskId", t.id);
                  e.dataTransfer.setData("text/plain", t.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDraggingId(t.id);
                  sound.drag();
                }}
                onDragEnd={() => setDraggingId(null)}
                onClick={() => onOpenTask(t)}>
                <div className="t">{t.title}</div>
                {sub && <div className="sub-tag-chip" style={{ background: sub.color, color: contrastText(sub.color) }}>{sub.icon} {sub.title}</div>}
                <div className="d">{t.duration} min</div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
          Drag a card up into the timeline to schedule it — drag the handle above to resize this view.
        </p>
      </div>
    </div>
  );
}
