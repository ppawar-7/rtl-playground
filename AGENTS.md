# AGENTS.md — Repository Instructions for Coding Agents

## Project Overview

**RTL Playground** is an interactive educational web application for learning RTL (Register-Transfer Level) digital design. Students visually build logic circuits, simulate them, view auto-generated Verilog, explore truth tables, visualize waveforms, and complete guided exercises.

This is a standalone module of the **PD Playground** capstone project. A separate **STA Playground** already exists — **never modify it**.

## Technology Stack

- **HTML5 / CSS3 / Vanilla JavaScript** (ES Modules)
- No frameworks, no build tools, no backend
- Deployable on GitHub Pages (static files only)
- Must be served via local HTTP server for ES module support

## Architecture

```
Engine Layer (pure JS, no DOM)     UI Layer (DOM/SVG)        Content Layer
├── circuit_graph.js               ├── circuit_editor.js     ├── presets.js
├── logic_simulator.js             ├── component_library.js  └── lessons.js
├── sequential_engine.js           ├── waveform_viewer.js
└── verilog_generator.js           ├── truth_table.js
                                   └── panels.js
```

**Critical rule**: Engine modules must have ZERO DOM dependencies. They must be testable in Node.js without a browser.

**Single source of truth**: `CircuitGraph` is the canonical data model. All simulation, visualization, Verilog generation, and truth tables read from it.

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Application entry point |
| `src/app.js` | Application controller — wires engine + UI |
| `src/engine/circuit_graph.js` | Graph data model (components, pins, connections) |
| `src/engine/logic_simulator.js` | Combinational Boolean logic evaluation |
| `src/engine/sequential_engine.js` | Clock + D flip-flop state machine |
| `src/engine/verilog_generator.js` | Synthesizable Verilog HDL generation |
| `src/ui/circuit_editor.js` | SVG canvas, drag/drop, wiring, signal display |
| `src/ui/component_library.js` | Component palette sidebar |
| `src/ui/waveform_viewer.js` | Waveform display (Canvas-based) |
| `src/ui/truth_table.js` | Truth table generator and display |
| `src/ui/panels.js` | Layout and panel/tab management |
| `src/modules/presets.js` | Predefined example circuits |
| `src/modules/lessons.js` | Guided exercises with behavioral validation |
| `src/styles/main.css` | All styles via CSS custom properties |
| `tests/tests.js` | Automated test suite |
| `tests/test_runner.html` | Browser-based test runner |

## Coding Conventions

- ES modules (`import`/`export`) for all JS files
- Classes for major components (CircuitGraph, LogicSimulator, etc.)
- Simple event emitter pattern for graph change notifications
- CSS custom properties (variables) for all visual theming
- Descriptive variable/function names; JSDoc comments for public methods
- No external dependencies

## Running the Application

```bash
# From the project root directory:
python -m http.server 8080
# Then open http://localhost:8080 in a browser

# Alternative with Node:
npx serve .
```

## Running Tests

```bash
# Browser tests: open tests/test_runner.html via HTTP server
# Node.js engine tests:
node tests/tests.js
```

## Git Workflow

- Local-only repository (do NOT push to GitHub without permission)
- Commit after each completed and tested phase
- Descriptive commit messages
- Never force-push or rewrite history

## Protected Files

- **Never modify** the STA Playground project
- **Always update** `docs/PROGRESS.md` and `docs/HANDOFF.md` after completing work
- **Always update** `docs/DECISIONS.md` when making significant technical choices

## Handoff Documents

Before ending any development session, ensure:
1. `docs/PROGRESS.md` — reflects actual completed features and test status
2. `docs/HANDOFF.md` — contains exact state of development and next steps
3. `docs/DECISIONS.md` — records any new technical decisions

Read these documents first when starting a new session.

## Important Technical Rules

1. Flip-flops sample D values simultaneously on rising edge (before any Q updates)
2. Null/undefined inputs propagate as `null` — never silently retain old values
3. Combinational feedback loops must be detected and rejected
4. Multiple drivers on a single input pin must be rejected
5. Generated Verilog must match simulation behavior exactly
6. Truth tables use the same simulation engine as live visualization
7. Lesson validation checks behavior (truth tables), not circuit structure
8. Truth tables limited to ≤4 Boolean inputs in v1
