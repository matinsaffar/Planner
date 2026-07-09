import React from "react";
import { NOTIFY_OPTIONS, NotifyOffset } from "./notifications";
import TimeOfDayPicker from "./TimeOfDayPicker";

interface Props {
  value: NotifyOffset;
  onChange: (v: NotifyOffset) => void;
  customTime: string;
  onCustomTimeChange: (v: string) => void;
}

export default function NotifyPicker({ value, onChange, customTime, onCustomTimeChange }: Props) {
  const needsTime = value === "1day" || value === "sameday";
  return (
    <div className="field">
      <label>Notify me</label>
      <div className="notify-options">
        {NOTIFY_OPTIONS.map((opt) => (
          <button key={opt.value} type="button"
            className={"notify-chip" + (value === opt.value ? " active" : "")}
            onClick={() => onChange(opt.value)}>
            {opt.label}
          </button>
        ))}
      </div>
      {needsTime && (
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>
            {value === "1day" ? "Time (day before)" : "Time (same day)"}
          </label>
          <TimeOfDayPicker value={customTime} onChange={onCustomTimeChange} />
        </div>
      )}
    </div>
  );
}
