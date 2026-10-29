# RTL Playground — Developer Handoff Document

## 1. Current State
- The entire application (Phases 1 through 4) is fully built and operational locally:
  - **Simulation Engine**: Combinational evaluation (`logic_simulator.js`), graph data model (`circuit_graph.js`), positive-edge sequential engine with simultaneous sampling (`sequential_engine.js`), and synthesizable Verilog HDL emitter (`verilog_generator.js`).
  - **Interactive Circuit Editor**: SVG-based digital canvas (`circuit_editor.js`) with drag-and-drop component positioning, pin wiring with Bézier routing, input value toggle click handlers, component/wire deletion, and dynamic signal coloring (green=1, gray=0, red-dashed=null).
  - **Panels & UI Shell**: Modern dark EDA layout (`main.css`, `panels.js`, `index.html`) with component palette (`component_library.js`), circuit inspector & health alerts, and bottom tabs.
  - **Verilog Panel**: Real-time generation with copy-to-clipboard button.
  - **Truth Table**: Interactive generator (`truth_table.js`) supporting up to 4 inputs (16 combinations) with active row highlight, safely isolated from canvas state.
  - **Waveform Viewer**: Canvas-based timing visualizer (`waveform_viewer.js`) rendering clock, D, Q, and I/O waveforms with manual clock stepping and auto-run modes.
  - **Guided Lessons**: 4 structured lessons (`lessons.js`) with explanations, learning objectives, tasks, starter circuits, and automated behavioral truth-table checkers.
  - **Presets**: 6 prebuilt example circuits (`presets.js`).
  - **Test Suite**: Automated tests (`tests/tests.js` and `tests/test_runner.html`), 26/26 passing in Node.js.
  - **Documentation**: `README.md`, `AGENTS.md`, `CLAUDE.md`, and complete `docs/` artifacts.

## 2. What Has Been Tested
- **Automated Tests (`node tests/tests.js`)**:
  - Truth tables for all 7 standard logic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR).
  - Multi-gate propagation: cascaded NOT->AND gates and fan-out driving multiple gates.
  - 1-Bit Half Adder: SUM ($A \oplus B$) and CARRY ($A \cdot B$).
  - 2:1 Multiplexer: full coverage across all 8 input combinations ($A, B, \text{Sel}$).
  - Positive-edge-triggered D Flip-Flop: simultaneous pre-edge D sampling, rising edge update, falling edge retention, and unconnected/null D propagation policy.
  - Combinational feedback loop rejection using DFS 3-color cycle detection.
  - DFF sequential feedback loop allowance.
  - Connection constraint validation: multiple driver rejection, self-connection rejection, and unconnected input propagation.
  - Truth table generator consistency with direct logic simulation.
  - Synthesizable Verilog generation for combinational logic, multi-gate arithmetic, and sequential always blocks.
  - Circuit serialization and deserialization.

## 3. Test Pass/Fail Status
- **Automated Engine Tests**: 26 Passed, 0 Failed.
- **External Verilog Simulators**: `iverilog` is not installed on this host system; external simulation was skipped and documented honestly.

## 4. Current Incomplete Work / Future Phases
- All v1 planned features across Phases 1, 2, 3, and 4 are complete.
- Future roadmap items (for integration into the wider PD Playground suite):
  1. Multi-bit vector bus signals (e.g. 4-bit, 8-bit buses).
  2. Level-sensitive latch simulation (to support asynchronous SR latches without false cycle errors).
  3. Structural netlist export to interface with the companion STA Playground for static timing and wire delay calculations.
  4. Integration into a unified PD Playground navigation shell.

## 5. Known Limitations
- Truth table generator caps at 4 independent inputs ($2^4 = 16$ rows) to maintain UI responsiveness and clarity.
- Circuits with combinational feedback loops are intentionally rejected by design in v1.
- Because ES modules are used, the application must be served over HTTP (`python -m http.server` or `npx serve`), not via `file://`.

## 6. Important Files & Responsibilities
- `src/app.js` — Top-level coordinator connecting the graph, simulator, sequential engine, editor, panels, and lessons.
- `src/engine/circuit_graph.js` — Canonical circuit graph data model, cycle detector, and connection validator.
- `src/engine/logic_simulator.js` — Combinational Boolean evaluator with topological sort.
- `src/engine/sequential_engine.js` — Clock toggling, DFF simultaneous sampling, and waveform snapshot history.
- `src/engine/verilog_generator.js` — Synthesizable Verilog generator.
- `src/ui/circuit_editor.js` — SVG canvas, component dragging, wiring, and live signal color states.
- `src/ui/waveform_viewer.js` — Canvas timing waveform visualizer and clock stepper.
- `src/ui/truth_table.js` — Combinational truth table generator.
- `src/modules/lessons.js` — Interactive guided lessons and behavioral validators.
- `src/modules/presets.js` — Predefined circuits (Half Adder, MUX, DFF Demo, etc.).
- `src/styles/main.css` — Modern dark theme styling with CSS variables.
- `tests/tests.js` — Self-contained test suite (Node & browser compatible).
- `tests/test_runner.html` — In-browser visual test runner.
- `AGENTS.md` & `CLAUDE.md` — Agent instructions and project conventions.

## 7. Exact Commands to Run
```bash
# Navigate to project:
cd C:\Users\pranil\Documents\PD-Playground\rtl-playground

# Run automated engine tests in Node:
node tests/tests.js

# Launch local HTTP server to run the web application:
python -m http.server 8080
# Or using Node:
npx serve .

# Then open in any modern browser:
# Main Application: http://localhost:8080
# In-Browser Test Runner: http://localhost:8080/tests/test_runner.html
```

## 8. Next Recommended Action
For future sessions:
- Test the interactive website in Chrome/Edge by starting `python -m http.server 8080`.
- Verify the 4 interactive lessons by clicking through the "Lessons" tab in the left sidebar.
- Plan the bridge interface between RTL Playground and STA Playground (e.g., exporting the circuit graph as a gate-level structural netlist with fan-out counts for delay estimation).
