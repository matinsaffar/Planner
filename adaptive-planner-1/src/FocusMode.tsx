import React, { useEffect, useRef, useState } from "react";
import { sound } from "./sound";

interface Props {
  task: any;
  onFinish: (task: any) => void;
  onBreak: (task: any, remainingMinutes: number) => void;
  onClose: () => void;
}

export default function FocusMode({ task, onFinish, onBreak, onClose }: Props) {
  const [totalSeconds, setTotalSeconds] = useState((task.duration || 30) * 60);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!paused) setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [paused]);

  const remaining = Math.max(0, totalSeconds - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const remainingMinutes = Math.ceil(remaining / 60);
  const pct = Math.min(100, (elapsed / totalSeconds) * 100);
  const isOvertime = remaining === 0;

  function togglePause() { setPaused((p) => !p); sound.pause(); }
  function extend(minutes: number) { setTotalSeconds((s) => s + minutes * 60); sound.step(); }

  return (
    <div className="focus-screen">
      <button className="close-x" onClick={onClose}>×</button>
      <h2>{task.title}</h2>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>Focus mode · {Math.round(totalSeconds / 60)} min planned</p>
      <div className="focus-time" style={isOvertime ? { color: "var(--danger)" } : {}}>{mm}:{ss}</div>
      <div style={{ width: 240, height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden", marginBottom: 18 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: isOvertime ? "var(--danger)" : "linear-gradient(90deg,var(--accent),var(--accent2))", transition: "width 1s linear" }} />
      </div>

      <div className="mini-row" style={{ marginBottom: 18 }}>
        <button className="mini-btn" onClick={() => extend(5)}>+5 min</button>
        <button className="mini-btn" onClick={() => extend(10)}>+10 min</button>
        <button className="mini-btn" onClick={() => extend(15)}>+15 min</button>
      </div>

      <div className="split-btn">
        <div className="fin" onClick={() => onFinish(task)}>FINISH</div>
        <div className="pp" onClick={togglePause}>{paused ? "RESUME" : "PAUSE"}</div>
      </div>
      <div className="mini-row">
        <button className="mini-btn" onClick={() => onBreak(task, remainingMinutes)}>Break task here</button>
      </div>
    </div>
  );
}
