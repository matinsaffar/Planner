import React, { useMemo, useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  history: { title: string; duration?: number }[];
  onPickDuration?: (d: number) => void;
  placeholder?: string;
}

export default function TitleSuggestInput({ value, onChange, history, onPickDuration, placeholder }: Props) {
  const [focused, setFocused] = useState(false);

  const uniqueTitles = useMemo(() => {
    const seen = new Map<string, number | undefined>();
    for (const h of history) {
      if (h.title && !seen.has(h.title)) seen.set(h.title, h.duration);
    }
    return Array.from(seen.entries());
  }, [history]);

  const suggestions = useMemo(() => {
    if (!value) return uniqueTitles.slice(0, 5);
    const q = value.toLowerCase();
    return uniqueTitles.filter(([t]) => t.toLowerCase().includes(q) && t.toLowerCase() !== q).slice(0, 5);
  }, [value, uniqueTitles]);

  function pick(title: string, duration?: number) {
    onChange(title);
    if (duration && onPickDuration) onPickDuration(duration);
    setFocused(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder={placeholder}
        autoFocus
      />
      {focused && suggestions.length > 0 && (
        <div className="title-suggest-dropdown">
          {suggestions.map(([t, d]) => (
            <div key={t} className="title-suggest-item" onMouseDown={() => pick(t, d)}>
              <span>{t}</span>
              {d ? <span className="title-suggest-dur">{Math.floor(d / 60)}h {d % 60}m</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
