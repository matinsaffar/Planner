import React, { useRef, useState, useEffect } from "react";
import { FocusSession, computeElapsedSeconds } from "./focusSession";

interface Props {
  session: FocusSession;
  onRestore: () => void;
}

// Minimized view of an active focus session: a small header + timer strip
// docked near the bottom of the screen. Tapping it, or dragging it upward,
// restores the full FocusMode screen. It keeps its own 1s tick so the timer
// stays live while minimized, same as the full screen.
export default function FocusDrawer({ session, onRestore }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const dragStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const task = session.task_snapshot;
  const elapsed = computeElapsedSeconds(session);
  const remaining = Math.max(0, session.total_seconds - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = Math.min(100, (elapsed / session.total_seconds) * 100);
  const isOvertime = remaining === 0;

  function handleTouchStart(e: React.TouchEvent) { dragStartY.current = e.touches[0].clientY; }
  function handleTouchMove(e: React.TouchEvent) {
    if (dragStartY.current == null) return;
    const dy = dragStartY.current - e.touches[0].clientY;
    setDragOffset(Math.max(0, dy));
  }
  function handleTouchEnd() {
    const dy = dragOffset;
    dragStartY.current = null;
    setDragOffset(0);
    if (dy > 28) onRestore();
  }

  return (
    <div
      className="focus-drawer glass"
      style={{ transform: dragOffset ? `translateY(${-dragOffset}px)` : undefined }}
      role="button"
      tabIndex={0}
      onClick={onRestore}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRestore(); } }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label={`Resume focus session: ${task.title}, ${mm}:${ss} remaining`}
    >
      <div className="focus-drawer-handle" />
      <div className="focus-drawer-row">
        <div className="focus-drawer-info">
          <div className="focus-drawer-title">{task.title}</div>
          <div className="focus-drawer-sub">{session.paused ? "⏸ Paused — tap to resume view" : "● In focus"}</div>
        </div>
        <div className="focus-drawer-time" style={isOvertime ? { color: "var(--danger)" } : {}}>{mm}:{ss}</div>
      </div>
      <div className="focus-drawer-bar">
        <div style={{ width: `${pct}%`, background: isOvertime ? "var(--danger)" : undefined }} />
      </div>
    </div>
  );
}
