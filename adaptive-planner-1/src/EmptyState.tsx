import React, { useMemo } from "react";

const MESSAGES: Record<string, string[]> = {
  tasksToday: [
    "Nothing planned for today. Even legends need a rest day.",
    "Your to-do list is on vacation. Lucky it.",
    "Empty today. Suspiciously peaceful, isn't it?",
    "Zero tasks. The universe is giving you a freebie.",
  ],
  tasksDay: [
    "Nothing scheduled here yet. A blank canvas awaits.",
    "This day is wide open — mysterious, like an unopened fortune cookie.",
    "No tasks yet. Perfect time to add one, or nap. We won't judge.",
  ],
  goals: [
    "No goals yet — dream a little, then write it down.",
    "This space is goal-free. For now.",
    "No goals set. Even mountains started as pebbles.",
  ],
  reminders: [
    "No reminders. Nothing to forget, technically.",
    "Your reminders list is quieter than a library at midnight.",
    "No upcoming reminders. Suspicious silence detected.",
  ],
  subtasks: [
    "No subtasks yet. Keep it simple, or break it down — your call.",
    "Nothing here yet. One step at a time, or zero steps, also valid.",
  ],
  search: [
    "No matches found. Even Sherlock would be stumped.",
    "Nothing turned up. Try a different word, or blame autocorrect.",
  ],
  categories: [
    "No categories yet. Time to build your empire, one folder at a time.",
    "This space is empty. Add a category to get the party started.",
  ],
  finished: [
    "Nothing finished yet. The story is just getting started.",
    "No completed tasks here — yet. Patience, young padawan.",
  ],
  generic: [
    "Nothing here yet.",
    "This space is waiting for something great.",
  ],
};

const ICONS: Record<string, string> = {
  tasksToday: "🌤️", tasksDay: "🗒️", goals: "🎯", reminders: "🔔",
  subtasks: "🧩", search: "🔍", categories: "📁", finished: "🏁", generic: "✨",
};

interface Props {
  type?: keyof typeof MESSAGES;
  fallback?: string;
}

export default function EmptyState({ type = "generic", fallback }: Props) {
  const message = useMemo(() => {
    const pool = MESSAGES[type] || MESSAGES.generic;
    return fallback || pool[Math.floor(Math.random() * pool.length)];
  }, [type, fallback]);

  const icon = ICONS[type] || ICONS.generic;

  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p className="empty">{message}</p>
    </div>
  );
}
