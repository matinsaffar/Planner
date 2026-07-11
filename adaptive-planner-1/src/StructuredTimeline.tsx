import React, { useRef, useState, useEffect } from "react";
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
  onEditBlock?: (block: any) => void;
  onDeleteBlock?: (blockId: string) => void;
  cardOpacity?: number;
}

const START_HOUR = 0;
const END_HOUR = 23;
const HOUR_HEIGHT = 64;

function fmtHour(h: number) {
  return String(h % 24).padStart(2, "0") + ":00";
}

// Minutes-of-day in Asia/Tehran regardless of the device's local timezone.
// Uses Intl to read hour/minute in Tehran, then converts to 0..1439.
function tehranMinutes(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h * 60 + m;
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}


export default function StructuredTimeline({ tasksWithTime, unstarted, blocks = [], subInfo, onOpenTask, onDropTask, onReplaceConflict, onEditBlock, onDeleteBlock, cardOpacity = 1 }: Props) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [ghostTop, setGhostTop] = useState<number | null>(null);
  const [ghostLabel, setGhostLabel] = useState("");
  const [timelineHeightPct, setTimelineHeightPct] = useState(62);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [conflictDetails, setConflictDetails] = useState<{ type: string; item: any } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStateRef = useRef<{ startY: number; startPct: number } | null>(null);

  // === Real-time clock in Asia/Tehran, minute-of-day (0..1439). Ticks every
  // 15 s so the sand overlay grows visibly without wasted renders. ===
  const [nowMinTehran, setNowMinTehran] = useState<number>(() => tehranMinutes());
  useEffect(() => {
    const id = setInterval(() => setNowMinTehran(tehranMinutes()), 15000);
    return () => clearInterval(id);
  }, []);

  // Prevent iOS/Safari from navigating when a drag payload (task UUID)
  // is dropped outside the timeline.
  useEffect(() => {
    const stop = (e: DragEvent) => { e.preventDefault(); };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);



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
      const next = Math.min(78, Math.max(30, dragStateRef.current.startPct + deltaPct));
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
          {/* Hours fully before "now" read as dimmed/desaturated; hours still
              ahead get a faint accent wash instead so the two zones contrast
              clearly. Heights are derived straight from nowMinTehran, so
              both bands advance every tick without extra state. */}
          {(() => {
            const totalPx = (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT;
            const pastPx = Math.max(0, Math.min(totalPx, (nowMinTehran - START_HOUR * 60) * (HOUR_HEIGHT / 60)));
            return (
              <>
                {pastPx > 0 && <div className="tl-hour-band past" style={{ top: 0, height: pastPx }} />}
                {pastPx < totalPx && <div className="tl-hour-band future" style={{ top: pastPx, height: totalPx - pastPx }} />}
              </>
            );
          })()}
          <div
            className="tl-now-line"
            style={{ top: Math.max(0, Math.min(
              (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT,
              (nowMinTehran - START_HOUR * 60) * (HOUR_HEIGHT / 60)
            )) }}
          />
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
              <div
                key={b.id}
                className="tl-block"
                style={{ position: "absolute", top, left: 8, right: 8, height, opacity: cardOpacity, zIndex: 2 }}
                role="button"
                tabIndex={0}
                title="Tap to edit or delete this occupied block"
                onClick={(e) => { e.stopPropagation(); onEditBlock?.(b); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEditBlock?.(b); } }}
              >
                <div className="time">🔒 {b.start_time}–{b.end_time}</div>
                <div className="title">{b.title}</div>
                {onDeleteBlock && (
                  <button
                    className="mini-btn"
                    style={{ position: "absolute", top: 4, right: 4, padding: "2px 8px", fontSize: 11 }}
                    onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${b.title}"?`)) onDeleteBlock(b.id); }}
                    aria-label="Delete block"
                  >
                    ✕
                  </button>
                )}
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

            // === Sand-clock progress (Tehran time). Compute task start/end in
            // minutes-of-day and clamp against nowMinTehran to derive percent
            // passed. Finished tasks aren't overridden by this. ===
            let taskStartMin = 0, taskEndMin = 0;
            if (t.time) {
              const [th, tm] = t.time.split(":").map(Number);
              taskStartMin = th * 60 + tm;
            } else if (t.started_at) {
              const d = new Date(t.started_at);
              taskStartMin = d.getHours() * 60 + d.getMinutes();
            }
            taskEndMin = taskStartMin + (t.duration || 30);
            const passedMin = Math.max(0, Math.min(taskEndMin - taskStartMin, nowMinTehran - taskStartMin));
            const progressPct = taskEndMin > taskStartMin ? (passedMin / (taskEndMin - taskStartMin)) * 100 : 0;
            const isPast = !isFinished && nowMinTehran >= taskEndMin;
            const isInProgress = !isFinished && nowMinTehran >= taskStartMin && nowMinTehran < taskEndMin;
            // Below ~56px there isn't room for the normal 3-line stack
            // (time / title / subcategory chip) without the flex box
            // clipping something — collapse to a single condensed row
            // instead so short tasks (e.g. a 30-min slot) stay fully
            // readable rather than getting silently cut off.
            const isCompact = visibleHeight < 56;

            return (
              <div key={t.id} draggable={!isFinished}
                className={"tl-item" + (hasOverlap && !isFinished ? " overlap" : "") + (isFinished ? " finished" : "") + (bg ? " custom-color" : "") + (isPast ? " past" : "") + (isInProgress ? " in-progress" : "") + (isCompact ? " compact" : "")}
                style={{ position: "absolute", top, left: 8, right: 8, height: visibleHeight,
                  background: bg || undefined, cursor: isFinished ? "pointer" : "grab", zIndex: isFinished ? 1 : 2,
                  outline: hasOverlap && !isFinished ? "2px solid var(--danger)" : "none", opacity: cardOpacity }}
                onDragStart={(e) => {
                  if (isFinished) return;
                  e.dataTransfer.setData("taskId", t.id);
                  e.dataTransfer.setData("text/plain", t.id);
                  e.dataTransfer.effectAllowed = "move";
                  sound.drag();
                }}
                onClick={() => onOpenTask(t)}>
                {(isInProgress || isPast) && !isFinished && (
                  <div className="tl-progress-overlay" style={{ height: `${Math.min(100, progressPct)}%` }}>
                    <div className="grain" />
                  </div>
                )}
                {isCompact ? (
                  <div className="tl-compact-row">
                    <span className="time">{t.time || "—"}</span>
                    <span className="title">{t.title}</span>
                    {hasOverlap && !isFinished && <span aria-label="Overlaps another item">⚠️</span>}
                  </div>
                ) : (
                  <>
                    <div className="time">{t.time || "—"} · {statusLabel}{hasOverlap && !isFinished ? " · ⚠️ overlap" : ""}</div>
                    <div className="title">{t.title}</div>
                    {sub && <div className="sub-tag-chip" style={{ background: sub.color, color: contrastText(sub.color) }}>{sub.icon} {sub.title}</div>}
                  </>
                )}
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
