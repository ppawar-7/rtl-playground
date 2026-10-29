# RTL Playground — Development Progress

## Current Status: Audit Complete — 32 Tests Passing, 0 Failing, Full Browser Verification in Edge

Last Updated: 2026-10-28 23:58 EDT

---

## Engineering Audit & Verification Summary
- **Automated Tests**: **32 Passed, 0 Failed** (`node tests/tests.js`).
- **Browser Automation Audit**: Verified in headless Microsoft Edge via Chrome DevTools Protocol (`node tests/browser_smoke_test.js`):
  - Zero uncaught page exceptions.
  - All 6 presets load and evaluate properly.
  - All 4 guided lessons validated behaviorally.
  - Interactive canvas input toggling, wiring, and dragging verified.
  - Generated Verilog syntax and truth table generation verified.
  - Waveform canvas stepping and auto-run verified.
  - Audit report published at `docs/ENGINEERING_AUDIT.md`.
  - Browser audit screenshot saved at `tests/audit_screenshot.png`.

---

## Phase Breakdown

### Phase 1: Core Foundation (Circuit Graph, Simulation Engine, Editor & Visualization)
- [x] `src/engine/circuit_graph.js` — Canonical circuit graph data model with pin tracking, cycle detection, multi-driver rejection, serialization, and clock validation
- [x] `src/engine/logic_simulator.js` — Combinational Boolean evaluator with topological sort & safe state isolation
- [x] Automated tests for logic gates, fan-out, cascaded gates, cycle detection, invalid connections
- [x] `src/styles/main.css` — CSS variables, dark engineering theme, responsive layout
- [x] `src/ui/circuit_editor.js` — SVG canvas, component drag/drop, pin wire routing (drag & click-click modes), interactive input toggling, live signal coloring
- [x] `src/ui/component_library.js` — Component palette sidebar
- [x] `src/ui/panels.js` — 3-column + bottom tab layout
- [x] `index.html` — Application shell with semantic panels
- [x] `src/app.js` — Main application controller wiring engine and UI

### Phase 2: RTL Understanding (Verilog Generation, Truth Table, Presets)
- [x] `src/engine/verilog_generator.js` — Synthesizable Verilog HDL generation with clean `output wire` continuous assigns, clock grouping, and unique signal identifier disambiguation
- [x] Verilog generator tests (AND, Half Adder, DFF, duplicate label handling, error handling)
- [x] `src/ui/truth_table.js` — Interactive truth table display (up to 4 inputs), preserving simulation state and highlighting active combination
- [x] `src/modules/presets.js` — Predefined circuits (AND, OR, NOT, Half Adder, 2:1 MUX, DFF Demo; SR Latch excluded per Decision 007)

### Phase 3: Sequential Logic (Clock Stepping, Flip-Flops, Waveforms)
- [x] `src/engine/sequential_engine.js` — Positive-edge triggered DFF evaluation with simultaneous pre-edge D sampling, state retention, unconnected D propagation, and strict clock connectivity enforcement
- [x] Sequential engine tests (rising edge update, falling edge retention, unconnected D, shift register nonblocking semantics, unclocked DFF immunity)
- [x] `src/ui/waveform_viewer.js` — Canvas-based multi-signal waveform viewer with step markers ($T_0, T_1, \dots$), manual clock stepping, auto-run loop, safe fallback geometry, and clock synchronization

### Phase 4: Educational Lessons & Validation
- [x] `src/modules/lessons.js` — Guided lessons (Logic Gates, Half Adder, 2:1 MUX, Sequential DFF) with behavioral truth-table validation and structural checks
- [x] Lesson UI integration in sidebar (lesson instructions, task details, starter circuit loading, feedback banner)
- [x] `tests/tests.js` — 32 automated unit & integration tests
- [x] `tests/test_runner.html` — In-browser visual test runner interface
- [x] `tests/browser_smoke_test.js` — Automated Edge CDP browser testing suite
- [x] `docs/ENGINEERING_AUDIT.md` — Formal engineering audit report
- [x] `README.md` — Project documentation, architecture, how-to-run, limitations, and capstone attribution

---

## Known Bugs & Limitations
1. Single-bit signals only (multi-bit buses/vectors planned for next milestone).
2. Combinational feedback loops are strictly rejected (asynchronous SR latches unsupported by design in v1).
3. Truth tables restricted to $\le 4$ independent inputs ($2^4 = 16$ rows) to maintain UI responsiveness and clarity.
4. External Verilog compilers (`iverilog` / `verilator`) not installed on host machine path (marked UNVERIFIED VIA COMPILER).
