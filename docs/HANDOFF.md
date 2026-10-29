# RTL Playground — Developer Handoff Document

## 1. What is Already Implemented

RTL Playground has completed Phase 5 development:
- **Core Simulation Engines**:
  - Combinational evaluation with topological sort (`src/engine/logic_simulator.js`).
  - Graph model with cycle detection, pin tracking, multi-driver rejection, serialization, and clock validation (`src/engine/circuit_graph.js`).
  - Sequential engine enforcing nonblocking simultaneous D sampling on rising edges and clock-connected filtering (`src/engine/sequential_engine.js`).
  - Synthesizable Verilog HDL generator with valid port net types, clock grouping, unique identifier disambiguation, and clean zero-unused-wire emission (`src/engine/verilog_generator.js`).
- **Real Verilog HDL Verification Pipeline**:
  - Automated Verilog generator and self-checking testbench generator (`tests/verilog_verification/generate_verification_suites.js`).
  - Self-contained WebAssembly Yosys verification runner (`tests/verilog_verification/run_yosys_verification.js`) using `@yowasp/yosys` without system modifications.
- **RTL Educational UI & Features**:
  - "RTL Reference Guide" drawer tab with 6 interactive concept cards (Continuous `assign`, Conditional `? :`, `case` statements, Clocked `always @(posedge clk)`, Blocking vs Nonblocking, Clock Enable & Synchronous Reset).
  - Synchronized line-by-line Verilog highlighting: selecting a canvas component highlights its corresponding lines in the generated Verilog pane.
  - "RTL Hardware Mapping" inspector card: displays synthesizable construct, Verilog pattern, physical standard cell target (e.g. `AND2X1`, `MUX2X1`, `DFFX1`), and timing model.
  - 8 Guided Lessons with behavioral and structural validators (`src/modules/lessons.js`): Logic Gates, Half Adder, 2:1 MUX, Sequential DFF, Conditional Selection (MUX), Register with Clock Enable, Register with Synchronous Reset, Clock Edge Timing & Pipelines.
  - 9 Educational Presets (`src/modules/presets.js`): AND, OR, NOT, Half Adder, 2:1 MUX, DFF Demo, Register with Clock Enable, Register with Synchronous Reset, 2-Stage Shift Register Pipeline.
- **Architectural Bridge Specification**:
  - Complete architectural design specification for integration with STA Playground (`docs/RTL_TO_STA_BRIDGE_DESIGN.md`).

---

## 2. What Has Actually Been Tested

1. **Host-Environment Unit & Integration Tests**:
   - `node tests/tests.js`: 37 test cases covering truth tables, multi-gate cascades, fan-out, DFF nonblocking edge updates, clock filtering, cycle detection, multi-level logic trees, Verilog generation, serialization, all 9 presets, and all 8 lessons.
2. **Real Verilog HDL Compilation via Yosys**:
   - `node tests/verilog_verification/run_yosys_verification.js`: all 6 modules (`gates.v`, `half_adder.v`, `mux2.v`, `dff.v`, `shift_reg.v`, `multi_dff.v`) compiled to AST, elaborated, checked (`check -assert`), and synthesized with 0 errors.
3. **Automated Real Browser CDP Testing in Microsoft Edge**:
   - `node tests/browser_smoke_test.js`: launches headless Microsoft Edge, validates in-browser test runner (`test_runner.html`), loads main app (`index.html`), tests all 9 presets, live input toggling, truth table generation, waveform viewer clock stepping, all 8 lessons (both starter failure and correct solution), and manual circuit construction (palette click, canvas placement, pin wiring, live toggle, inspector selection, and deletion).

---

## 3. Which Tests Pass or Fail

- **Automated Tests (`node tests/tests.js`)**: **37 Passed, 0 Failed**.
- **Real Verilog Yosys Verification (`node tests/verilog_verification/run_yosys_verification.js`)**: **6 Passed, 0 Failed**.
- **Browser Automation Suite (`node tests/browser_smoke_test.js`)**: **All Passed, 0 Uncaught Page Exceptions**.
- **In-Browser Test Runner (`tests/test_runner.html`)**: **37 Passed, 0 Failed**.

---

## 4. What is Currently Incomplete

- Multi-bit bus/vector wiring (e.g., 4-bit, 8-bit registers and adders) — planned for Phase 6.
- Implementation of the export adapter to STA Playground (`src/bridge/sta_exporter.js`) designed in `docs/RTL_TO_STA_BRIDGE_DESIGN.md`.

---

## 5. Known Bugs & Limitations

1. **Single-bit signals only**: All canvas nets represent 1-bit wires.
2. **Combinational feedback loops rejected**: Strict cycle detection prevents asynchronous latches by design (Decision 007).
3. **Truth table size limit**: Restricted to $\le 4$ independent inputs ($2^4 = 16$ rows) to maintain UI responsiveness.
4. **External Icarus Verilog setup**: Icarus Verilog is not on system PATH; Yosys WebAssembly handles local AST/synthesis checks. If external `iverilog` binary simulation is required, `winget install Icarus.Verilog` can be executed once user approves.

---

## 6. Important Files & Responsibilities

- `src/engine/circuit_graph.js`: Canonical circuit graph model, component/pin management, cycle detection, clock validation.
- `src/engine/logic_simulator.js`: Combinational Boolean evaluator with topological sort.
- `src/engine/sequential_engine.js`: Positive-edge triggered DFF evaluation with simultaneous pre-edge sampling and clock filtering.
- `src/engine/verilog_generator.js`: Synthesizable IEEE 1364 Verilog generator.
- `src/ui/circuit_editor.js`: SVG canvas editor, component rendering, dragging, pin wiring, selection, input toggle.
- `src/ui/panels.js`: Panel layout, tab switching, inspector rendering with RTL synthesis mapping, synchronized Verilog line highlighting.
- `src/modules/lessons.js`: 8 guided educational lessons with behavioral validation.
- `src/modules/presets.js`: 9 educational circuit presets.
- `docs/RTL_TO_STA_BRIDGE_DESIGN.md`: Complete architectural specification for bridging RTL Playground to STA Playground.
- `docs/DECISIONS.md`: Architectural decision records (ADRs 001–012).
- `docs/PROGRESS.md`: Feature matrix, phase tracker, and test metrics.

---

## 7. Exact Commands to Run

```bash
# Navigate to project:
cd C:\Users\pranil\Documents\PD-Playground\rtl-playground

# 1. Run unit tests in Node.js (37 tests):
node tests/tests.js

# 2. Run real Verilog HDL verification via WebAssembly Yosys (6 benchmarks):
node tests/verilog_verification/run_yosys_verification.js

# 3. Launch local HTTP server (port 8080):
python -m http.server 8080

# 4. Run automated browser tests in Microsoft Edge (requires local server on 8080):
node tests/browser_smoke_test.js

# 5. Open in any browser:
# Main Application: http://localhost:8080
# In-Browser Test Runner: http://localhost:8080/tests/test_runner.html
```

---

## 8. Next Recommended Development Task

- **Phase 6: Multi-Bit Vector & Bus Support or STA Bridge Implementation**:
  - Implement `src/bridge/sta_exporter.js` based on `docs/RTL_TO_STA_BRIDGE_DESIGN.md` to export annotated timing graphs and SDC constraints directly to STA Playground.
  - Add bus widths (e.g. `[3:0]`) for arithmetic units and multi-bit registers.
