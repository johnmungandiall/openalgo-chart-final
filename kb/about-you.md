# About you — the USER this agent works for. Not about the code.

Tag each item [confirmed] (you told me) or [inferred] (my guess).

## Style
- You write in **romanized Telugu mixed with English**, and expect the same back —
  a Telugu answer drew no correction; keep the technical nouns in English
  [confirmed, 2026-10-03].
- **Short and direct.** Answer first, then the minimum detail [inferred from the
  "how to start" / "commit" turns].
- You say **"you do"** and expect it done — never hand a runnable step back to you
  [confirmed, 2026-10-03].

## Tech
- Windows machine; project at `C:\dev\openalgo-chart-final` [confirmed].
- Stack: React 19 + TypeScript + Vite, `lightweight-charts` v5, zustand, Tauri 2
  desktop, Supabase for the licensing backend [confirmed — this session's work].
- Chrome profile `johnxpres@gmail.com` is yours; same address is the git author and
  the Supabase org owner [confirmed].
- `npm.ps1` is blocked on this machine, so **`npm.cmd` / `npx.cmd`** is the way
  [confirmed — a plain `npm -v` failed].

## Goals
- Ship **Open Chart** as a paid desktop product: 14-day trial, then activation keys,
  gated by the Supabase licensing backend [confirmed — the activation system, the
  installer work and the SaaS branch].
- Get the chart app running against a live gateway and a live licensing project
  [confirmed].

## Rules
- Do the work in the project, verify it live, then report [confirmed].
- Never expose credentials: a Supabase access token or anon key is passed to the
  tools, never printed back or written into a note/commit [confirmed].
- When a project the app depends on is gone, **replace it with the user's live one**
  rather than asking them to recreate the old one [confirmed, 2026-10-03].
