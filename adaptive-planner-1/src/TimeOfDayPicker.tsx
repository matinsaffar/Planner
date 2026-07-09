import React, { useEffect, useRef } from "react";
import { sound } from "./sound";

const ITEM_H = 40;

function WheelColumn({ values, value, onChange, pad }: { values: number[]; value: number; onChange: (v: number) => void; pad?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const lastPlayed = useRef<number>(value);

  useEffect(() => {
    const idx = values.indexOf(value);
    if (ref.current && idx >= 0) ref.current.scrollTop = idx * ITEM_H;
  }, []);

  useEffect(() => {
    const idx = values.indexOf(value);
    if (ref.current && idx >= 0) {
      const target = idx * ITEM_H;
      if (Math.abs(ref.current.scrollTop - target) > 2) ref.current.scrollTop = target;
    }
  }, [value]);

  const scrollTimeout = useRef<any>(null);
  function handleScroll() {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    const v = values[clamped];
    if (v !== lastPlayed.current) { sound.step(); lastPlayed.current = v; }
    if (v !== value) onChange(v);
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (ref.current) ref.current.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
    }, 90);
  }

  return (
    <div className="wheel-col" ref={ref} onScroll={handleScroll}>
      <div style={{ height: ITEM_H * 2 }} />
      {values.map((v) => (
        <div key={v} className={"wheel-item" + (v === value ? " center" : "")} style={{ height: ITEM_H }}>
          {pad ? String(v).padStart(2, "0") : v}
        </div>
      ))}
      <div style={{ height: ITEM_H * 2 }} />
    </div>
  );
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
}

export default function TimeOfDayPicker({ value, onChange, onClear }: Props) {
  const isCleared = onClear && !value;
  const [h, m] = value ? value.split(":").map(Number) : [9, 0];
  const hourValues = Array.from({ length: 24 }, (_, i) => i);
  const minuteValues = Array.from({ length: 12 }, (_, i) => i * 5);
  const roundedMin = m - (m % 5);

  function setHour(nh: number) { onChange(`${String(nh).padStart(2, "0")}:${String(m).padStart(2, "0")}`); }
  function setMinute(nm: number) { onChange(`${String(h).padStart(2, "0")}:${String(nm).padStart(2, "0")}`); }

  return (
    <div className="wheel-frame">
      <div className="wheel-highlight"></div>
      <div className="wheel-picker" style={{ opacity: isCleared ? 0.35 : 1, pointerEvents: isCleared ? "none" : "auto", transition: "opacity .2s" }}>
        <WheelColumn values={hourValues} value={h} onChange={(v) => { setHour(v); }} pad />
        <div className="wheel-unit">hr</div>
        <WheelColumn values={minuteValues} value={roundedMin} onChange={(v) => { setMinute(v); }} pad />
        <div className="wheel-unit">min</div>
      </div>
      {onClear && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button className={"mini-btn" + (isCleared ? " sel" : "")} onClick={() => { if (isCleared) onChange("09:00"); else onClear(); }}>
            {isCleared ? "✓ No specific time" : "No specific time"}
          </button>
        </div>
      )}
    </div>
  );
}
