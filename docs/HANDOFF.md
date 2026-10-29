# RTL Playground — Developer Handoff Document

## 1. What is Already Implemented

RTL Playground has completed **Phase 6: Interactive RTL Coding Fundamentals**:
- **Core Simulation Engines**:
  - Combinational evaluation with topological sort (`src/engine/logic_simulator.js`).
  - Graph model with cycle detection, pin tracking, multi-driver rejection, serialization, and clock validation (`src/engine/circuit_graph.js`).
  - First-class support for 4 sequential register types:
    - Standard D Flip-Flop (`DFF`: inputs `D`, `CLK`)
    - Register with Clock Enable (`DFFE`: inputs `D`, `CLK`, `EN`)
    - Register with Synchronous Reset (`DFFSR`: inputs `D`, `CLK`, `RST`)
    - Register with Clock Enable + Synchronous Reset (`DFFESR`: inputs `D`, `CLK`, `EN`, `RST`)
  - Sequential engine (`src/engine/sequential_engine.js`) enforcing simultaneous pre-edge sampling on rising clock edges ($0 \to 1$):
    - `DFFE`: samples $D$ when $EN=1$; retains previous state $Q$ when $EN=0$.
    - `DFFSR`: synchronously resets $Q \leftarrow 0$ when $RST=1$ on rising clock edge.
    - `DFFESR`: explicit documented priority where Reset overrides Enable: `rst == 1 ? 0 : en == 1 ? d : q`.
    - Waveform viewer integration capturing clock, enable, reset, data, and output history.
  - Synthesizable Verilog HDL Generator (`src/engine/verilog_generator.js`):
    - Generates continuous assignment Verilog (`assign`) for all combinational nets.
    - Generates procedural Verilog (`generateProcedural`) featuring `always @(*)` and `case (sel)` blocks.
    - Generates clean, synthesizable clocked `always @(posedge clk)` processes with nonblocking assignments (`<=`) for `DFF`, `DFFE`, `DFFSR`, and `DFFESR`.
- **Real Verilog HDL Verification Pipeline**:
  - Automated Verilog generator and self-checking testbench generator (`tests/verilog_verification/generate_verification_suites.js`) covering 11 modules:
    - Combinational: `gates.v`, `half_adder.v`, `full_adder.v`, `mux2.v`, `mux_case.v`
    - Sequential: `dff.v`, `dffe.v`, `dffsr.v`, `dffesr.v`, `shift_reg.v`, `multi_dff.v`
  - Self-contained WebAssembly Yosys verification runner (`tests/verilog_verification/run_yosys_verification.js`) using `@yowasp/yosys` compiling AST, elaborating hierarchy, running process optimization, and asserting correctness (`check -assert`) with 0 errors.
- **Interactive RTL Educational Features**:
  - **Verilog Explainer Bar & Interactive Cards**:
    - 6 validated educational RTL constructs:
      1. Continuous assignments (`assign`)
      2. Combinational `always @(*)`
      3. Conditional logic (`if/else`)
      4. Multiplexer selection using `case`
      5. Positive-edge-triggered `always @(posedge clk)`
      6. Blocking (`=`) vs nonblocking (`<=`) assignments
    - Real-time synchronization: clicking or selecting any component on the canvas automatically activates the corresponding explainer construct card and highlights the exact Verilog lines in the generated code panel.
    - Dual Verilog View switcher: toggle between continuous assignment style (`assign`) and procedural style (`always @(*)` / `case`).
  - **RTL Hardware Mapping Inspector**:
    - Displays synthesizable construct, Verilog template, physical standard cell library mapping (e.g. `AND2X1`, `MUX2X1`, `DFFX1`, `DFFEX1`, `DFFSRX1`, `DFFESRX1`), and timing model.
  - **12 Guided Lessons (`src/modules/lessons.js`)**:
    - Lesson 1: Logic Gates Basics
    - Lesson 2: Half Adder Implementation
    - Lesson 3: 2:1 Multiplexer
    - Lesson 4: Sequential D Flip-Flop
    - Lesson 5: Conditional Selection (MUX)
    - Lesson 6: Register with Clock Enable
    - Lesson 7: Register with Synchronous Reset
    - Lesson 8: Clock Edge Timing & Pipelines
    - Lesson 9: Full Adder Construction
    - Lesson 10: Clock Enable & Retention (DFFE)
    - Lesson 11: Synchronous Reset Priority (DFFESR)
    - Lesson 12: Blocking vs Nonblocking Pipeline Semantics
  - **16 Educational Presets (`src/modules/presets.js`)**:
    - Basic Gates (AND, OR, NOT)
    - Arithmetic (Half Adder, Full Adder)
    - Multiplexers (2:1 MUX Conditional `? :`, 2:1 MUX Procedural `case`)
    - Sequential Registers (DFF Demo, DFF with Enable `DFFE`, DFF with Synchronous Reset `DFFSR`, DFF with Enable & Reset `DFFESR`)
    - Advanced Architectural Demos (2-Stage Shift Register Pipeline, Blocking vs Nonblocking Pipeline Comparison)
- **Architectural Bridge Specification**:
  - Complete architectural design specification for integration with STA Playground (`docs/RTL_TO_STA_BRIDGE_DESIGN.md`).

---

## 2. What Has Actually Been Tested

1. **Host-Environment Unit & Integration Tests**:
   - `node tests/tests.js`: **43 test cases** covering truth tables, multi-gate cascades, fan-out, DFF nonblocking edge updates, clock filtering, cycle detection, multi-level logic trees, Verilog continuous & procedural generation, serialization, `DFFE` enable retention/load, `DFFSR` synchronous reset timing, `DFFESR` reset priority over enable, all 16 presets, and all 12 lessons.
2. **Real Verilog HDL Compilation via Yosys**:
   - `node tests/verilog_verification/run_yosys_verification.js`: all 11 modules (`gates.v`, `half_adder.v`, `full_adder.v`, `mux2.v`, `mux_case.v`, `dff.v`, `dffe.v`, `dffsr.v`, `dffesr.v`, `shift_reg.v`, `multi_dff.v`) compiled to AST, elaborated, checked (`check -assert`), and synthesized with 0 errors.
3. **Automated Real Browser CDP Testing in Microsoft Edge**:
   - `node tests/browser_smoke_test.js`: launches headless Microsoft Edge, validates in-browser test runner (`test_runner.html`, 43 passed), loads main app (`index.html`), tests all 16 presets, live input toggling, truth table generation, waveform viewer clock stepping, explainer construct chips, procedural Verilog toggle, all 12 lessons (both starter failure and correct solution), and manual circuit construction (palette click, canvas placement, pin wiring, live toggle, inspector selection, and deletion). 0 uncaught page exceptions.

---

## 3. Which Tests Pass or Fail

- **Automated Tests (`node tests/tests.js`)**: **43 Passed, 0 Failed**.
- **Real Verilog Yosys Verification (`node tests/verilog_verification/run_yosys_verification.js`)**: **11 Passed, 0 Failed**.
- **Browser Automation Suite (`node tests/browser_smoke_test.js`)**: **All Passed, 0 Uncaught Page Exceptions**.
- **In-Browser Test Runner (`tests/test_runner.html`)**: **43 Passed, 0 Failed**.

---

## 4. What is Currently Incomplete

- Multi-bit bus/vector wiring (e.g., 4-bit, 8-bit registers and adders) — planned for Phase 7.
- Full FSM state machine editor with state diagram visualization — planned for Phase 7/8.
- Implementation of the export adapter to STA Playground (`src/bridge/sta_exporter.js`) designed in `docs/RTL_TO_STA_BRIDGE_DESIGN.md`.

---

## 5. Known Bugs & Limitations

1. **Single-bit signals only**: All canvas nets represent 1-bit wires.
2. **Combinational feedback loops rejected**: Strict cycle detection prevents asynchronous latches by design (Decision 007).
3. **Truth table size limit**: Restricted to $\le 4$ independent inputs ($2^4 = 16$ rows) to maintain UI responsiveness.
4. **External Icarus Verilog setup**: Icarus Verilog is not on system PATH; Yosys WebAssembly handles local AST/synthesis checks. If external `iverilog` binary simulation is required, `winget install Icarus.Verilog` can be executed once user approves.

---

## 6. Important Files & Responsibilities

- `src/engine/circuit_graph.js`: Canonical circuit graph model, component/pin management, sequential component definitions (`DFF`, `DFFE`, `DFFSR`, `DFFESR`), cycle detection, clock validation.
- `src/engine/logic_simulator.js`: Combinational Boolean evaluator with topological sort.
- `src/engine/sequential_engine.js`: Positive-edge triggered DFF evaluation with simultaneous pre-edge sampling, enable gating, and synchronous reset priority.
- `src/engine/verilog_generator.js`: Synthesizable IEEE 1364 Verilog generator supporting both continuous `assign` and procedural `always @(*)` / `case` styles.
- `src/ui/circuit_editor.js`: SVG canvas editor, pin geometry for all components, dragging, wiring, selection, input toggle.
- `src/ui/component_library.js`: Component palette with dedicated buttons for logic gates and all register types.
- `src/ui/panels.js`: Panel layout, interactive Verilog explainer cards, RTL hardware mapping inspector, continuous vs procedural style switcher.
- `src/modules/lessons.js`: 12 guided educational lessons with behavioral validation.
- `src/modules/presets.js`: 16 educational circuit presets.
- `docs/DECISIONS.md`: Architectural decision records (ADRs 001–014).
- `docs/PROGRESS.md`: Feature matrix, phase tracker, and test metrics.
- `docs/HANDOFF.md`: Current handoff documentation.

---

## 7. Exact Commands to Run

```bash
# Navigate to project worktree:
cd C:\Users\pranil\Documents\PD-Playground\rtl-playground-phase6

# 1. Run unit tests in Node.js (43 tests):
node tests/tests.js

# 2. Run real Verilog HDL verification via WebAssembly Yosys (11 benchmarks):
node tests/verilog_verification/run_yosys_verification.js

# 3. Launch local HTTP server (port 8088 to avoid port 8080 collision):
python -m http.server 8088

# 4. Run automated browser tests in Microsoft Edge:
node tests/browser_smoke_test.js

# 5. Open in any browser:
# Main Application: http://localhost:8088
# In-Browser Test Runner: http://localhost:8088/tests/test_runner.html
```

---

## 8. Next Recommended Development Task

- **Phase 7: Multi-Bit Vector & Bus Support or STA Bridge Implementation**:
  - Implement `src/bridge/sta_exporter.js` based on `docs/RTL_TO_STA_BRIDGE_DESIGN.md` to export annotated timing graphs and SDC constraints directly to STA Playground.
  - Add bus widths (e.g. `[3:0]`, `[7:0]`) for multi-bit registers, adders, and vector operations.
