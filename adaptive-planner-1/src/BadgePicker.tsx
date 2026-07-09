import React from "react";
import { GOAL_BADGES } from "./badges";

interface Props {
  value: string | null;
  onChange: (b: string) => void;
}

export default function BadgePicker({ value, onChange }: Props) {
  return (
    <div className="badge-picker-grid">
      {GOAL_BADGES.map((b) => (
        <button key={b} type="button"
          className={"badge-picker-item" + (value === b ? " sel" : "")}
          onClick={() => onChange(b)}>
          {b}
        </button>
      ))}
    </div>
  );
}
