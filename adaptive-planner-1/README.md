# Adaptive Daily Planner (Supabase-backed)

A local-first-feeling, premium personal planner built with Vite + React +
TypeScript. Data is stored in a free Supabase (hosted Postgres) project so
your iPhone and MacBook share the exact same live data, protected by
Row Level Security and email magic-link login.

## Features
- Persian (Jalaali) calendar picker for reminders, plans, and blocks.
- Subtle synthesized sound design (start, pause, finish, drag, drop,
  deadline, save, break) with a global mute toggle.
- End-of-day review: on app open, un-started tasks from previous days
  are surfaced in one review sheet (finish / delay / cancel / backlog).
- Drag-and-drop of "Unstarted" tasks onto the Day Timeline.
- Full object model: Tasks, Reminders, Occupied Blocks, Goals (Deadline,
  Phase, Metric), Categories/Subcategories with vitality levels.
- Magic-link email sign-in — only you can access or modify your data.

## Setup — see the step-by-step guide in the chat response for a plain-language
walkthrough. Quick reference:

1. Create a free project at supabase.com.
2. Paste `supabase-schema.sql` into the SQL editor and run it.
3. In Authentication > Providers, ensure Email OTP (magic link) is enabled.
4. Copy `.env.example` to `.env` and fill in your Project URL + anon key.
5. `npm install && npm run dev`
6. Push to GitHub, import into Vercel, add the same two env vars there.
7. Open your Vercel URL on phone + MacBook, sign in with your email on both.
