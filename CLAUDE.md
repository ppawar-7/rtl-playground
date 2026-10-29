# CLAUDE.md — Claude Agent Entrypoint

Read these files in order before starting any work:

1. **AGENTS.md** — Architecture, conventions, commands, and rules
2. **docs/HANDOFF.md** — Where development stopped and what to do next
3. **docs/PROGRESS.md** — Completed features, test status, known bugs
4. **docs/DECISIONS.md** — Technical decisions and rationale

## Quick Reference

- Project: RTL Playground (part of PD Playground capstone)
- Stack: HTML/CSS/Vanilla JS (ES Modules), no frameworks
- Run: `python -m http.server 8080` then open `http://localhost:8080`
- Tests: Open `tests/test_runner.html` via HTTP server, or `node tests/tests.js`
- Git: Local only, commit after each phase, never push without permission
- **Never modify the STA Playground project**

## Before Ending Your Session

Update `docs/PROGRESS.md` and `docs/HANDOFF.md` to reflect actual state.
