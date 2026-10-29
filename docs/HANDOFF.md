# RTL Playground — Developer Handoff Document

## 1. Current State
- All 4 core simulation & generation engines are implemented and fully verified with automated tests:
  - `src/engine/circuit_graph.js`
  - `src/engine/logic_simulator.js`
  - `src/engine/sequential_engine.js`
  - `src/engine/verilog_generator.js`
- Automated test suite runs cleanly in Node.js via `node tests/tests.js` (26/26 tests passing).
- Local Git repository initialized with `.gitignore` and `package.json`.

## 2. What Has Been Tested
- Boolean logic truth tables for all 7 standard gates (AND, OR, NOT, NAND, NOR, XOR, XNOR).
- Multi-gate circuits (Half adder, cascading NOT->AND, fan-out driving multiple gates).
- 2:1 Multiplexer across all 8 input combinations.
- D Flip-Flop: simultaneous pre-edge D sampling, rising edge update, falling edge retention, unconnected/null D policy.
- Cycle detection: DFS 3-color cycle detection rejecting combinational feedback while allowing DFF sequential feedback.
- Connection constraints: strict rejection of multiple drivers on input pins, self-connections, and dangling inputs.
- Verilog generator: valid structural/dataflow synthesizable code matching simulation semantics.
- Graph serialization & deserialization.

## 3. Test Pass/Fail Status
- Total tests: 26
- Passing: 26
- Failing: 0

## 4. Current Incomplete Work
- UI layer:
  - `src/styles/main.css`
  - `src/ui/panels.js`
  - `src/ui/component_library.js`
  - `src/ui/circuit_editor.js`
  - `src/ui/truth_table.js`
  - `src/ui/waveform_viewer.js`
- Content layer:
  - `src/modules/presets.js`
  - `src/modules/lessons.js`
- Application Entry Point:
  - `index.html`
  - `src/app.js`
- Test Runner:
  - `tests/test_runner.html`
- Documentation:
  - `README.md`

## 5. Known Bugs and Limitations
- Asynchronous latches (e.g. cross-coupled NOR SR latch) are intentionally rejected by the cycle detector in v1.
- Truth table generator caps at 4 inputs (16 rows) to keep UI responsive.
- Requires serving via HTTP (e.g., `python -m http.server 8080` or `npx serve .`) because of ES module imports.

## 6. Important Files & Responsibilities
- `src/engine/circuit_graph.js` — Single source of truth for all components, pins, connections, cycle detection, and serialization.
- `src/engine/logic_simulator.js` — Combinational evaluator using topological sort.
- `src/engine/sequential_engine.js` — Clock stepper, DFF state manager, waveform snapshot history.
- `src/engine/verilog_generator.js` — Synthesizable Verilog emitter.
- `tests/tests.js` — Self-contained ES module test suite for engine and integration checks.
- `AGENTS.md` — Agent working rules and architecture overview.
- `CLAUDE.md` — Quick agent reference.
- `docs/DECISIONS.md` — Architectural decision log.
- `docs/PROGRESS.md` — Live milestone tracking.

## 7. Exact Commands to Run
```bash
# Run automated engine tests in Node:
node tests/tests.js

# Launch local web server to run the browser app:
python -m http.server 8080
# or:
npx serve .
```

## 8. Next Recommended Action
Proceed with UI implementation:
1. Create `src/styles/main.css` with dark engineering theme and reusable CSS custom properties.
2. Build `src/ui/circuit_editor.js` (SVG rendering for gates, pins, wire paths, dragging, and live signal color states: green=1, gray=0, red-dashed=null).
3. Build `src/ui/component_library.js` (component drag/click palette).
4. Build `src/ui/panels.js` and `src/ui/truth_table.js`.
5. Build `src/ui/waveform_viewer.js` (Canvas waveform display).
6. Create `src/modules/presets.js` and `src/modules/lessons.js`.
7. Assemble `index.html` and `src/app.js`.
8. Create `tests/test_runner.html` for in-browser automated verification.
