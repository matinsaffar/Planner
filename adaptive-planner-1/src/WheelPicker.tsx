import React, { useEffect, useRef } from "react";
import { sound } from "./sound";

const ITEM_H = 40;

interface ColProps {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  pad?: boolean;
}

function WheelColumn({ values, value, onChange, pad }: ColProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<any>(null);
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
  totalMinutes: number;
  onChange: (minutes: number) => void;
}

export default function WheelPicker({ totalMinutes, onChange }: Props) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes - hours * 60;
  const roundedMinute = minutes - (minutes % 5);
  const hourValues = Array.from({ length: 13 }, (_, i) => i);
  const minuteValues = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="wheel-frame">
      <div className="wheel-highlight"></div>
      <div className="wheel-picker">
        <WheelColumn values={hourValues} value={hours} onChange={(h) => onChange(h * 60 + minutes)} />
        <div className="wheel-unit">hr</div>
        <WheelColumn values={minuteValues} value={roundedMinute} onChange={(m) => onChange(hours * 60 + m)} pad />
        <div className="wheel-unit">min</div>
      </div>
    </div>
  );
}
