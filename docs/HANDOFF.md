# RTL Playground — Developer Handoff Document

## 1. What is Already Implemented

RTL Playground has completed the **Phase 6 Autonomous Integration Baseline** on branch `integrate/phase6-stress`:
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
    - Continuous dataflow assignment style (`assign`) for combinational nets.
    - Procedural behavioral style (`generateProcedural`) featuring `always @(*)` and `case (sel)` blocks.
    - Clean clocked `always @(posedge clk)` processes with nonblocking assignments (`<=`) for `DFF`, `DFFE`, `DFFSR`, and `DFFESR`.
- **Dual WebAssembly HDL Verification Pipelines**:
  - **Yosys Synthesis Check** (`tests/verilog_verification/run_yosys_verification.js`):
    - 11 modules (`gates`, `half_adder`, `full_adder`, `mux2`, `mux_case`, `dff`, `dffe`, `dffsr`, `dffesr`, `shift_reg`, `multi_dff`) verified for AST parsing, hierarchy elaboration, process mapping, and design rules (`check -assert`).
  - **Icarus Verilog Simulation** (`tests/verilog_verification/run_iverilog_simulation.js`):
    - All 11 benchmark testbenches executed with IEEE 1364 event-driven simulation via `@veriflow/iverilog-wasm` (`ivlpp`, `ivl`, `vvp`).
  - **Cross-Engine Differential Simulation** (`tests/verilog_verification/run_differential_simulation.js`):
    - 34 cycle-by-cycle assertions proving bit-for-bit equivalence between JavaScript simulation and compiled Verilog simulation with 0 mismatches.
- **Automated Stress Testing Infrastructure (`tests/stress/`)**:
  - Deterministic PRNG circuit generation, multi-gate DAG scaling, memory profiling, and failure reproduction.
  - Port-isolated browser worker (`STRESS_HTTP_PORT`, `STRESS_CDP_PORT`).
- **Interactive RTL Educational Features**:
  - Verilog Explainer bar with 6 concept cards (`assign`, `always @(*)`, `if/else`, `case`, `always @(posedge clk)`, `= vs <=`).
  - Component-to-code synchronized highlighting.
  - Dual Coding Perspective switcher.
  - RTL Hardware Mapping inspector card with standard cell mappings.
  - 12 Guided Lessons (`src/modules/lessons.js`) with behavioral validation.
  - 16 Educational Presets (`src/modules/presets.js`).
- **Architectural Bridge Specification**:
  - Complete architectural design specification for integration with STA Playground (`docs/RTL_TO_STA_BRIDGE_DESIGN.md`).

---

## 2. What Has Actually Been Tested

1. **Host-Environment Unit & Integration Tests**:
   - `node tests/tests.js`: **49 test cases** covering gate truth tables, fan-out, DFF nonblocking edge updates, clock filtering, cycle detection, multi-level logic trees, Verilog generation, serialization, `DFFE` enable retention/load, `DFFSR` synchronous reset timing, `DFFESR` reset priority over enable, heterogeneous 4-stage pipeline, all 16 presets, and all 12 lessons.
2. **Real Verilog HDL Compilation via Yosys**:
   - `node tests/verilog_verification/run_yosys_verification.js`: all 11 modules compiled to AST, elaborated, checked (`check -assert`), and synthesized with 0 errors.
3. **Event-Driven Icarus Verilog Simulation**:
   - `node tests/verilog_verification/run_iverilog_simulation.js`: all 11 testbenches executed with 0 assertion errors.
4. **Cross-Engine Differential Simulation**:
   - `node tests/verilog_verification/run_differential_simulation.js`: 34 checks passed with 0 mismatches.
5. **Automated Real Browser CDP Testing in Microsoft Edge**:
   - `node tests/browser_smoke_test.js`: launches headless Microsoft Edge, validates in-browser test runner (`test_runner.html`, 49 passed), loads main app (`index.html`), tests all 16 presets, live input toggling, truth table generation, waveform viewer clock stepping, explainer construct chips, procedural Verilog toggle, all 12 lessons (both starter failure and correct solution), and manual circuit construction (palette click, canvas placement, pin wiring, live toggle, inspector selection, and deletion). 0 uncaught page exceptions.
6. **Stress Testing Smoke Check**:
   - `node tests/stress/stress_runner.js`: 445 batches executed, 1,557 circuits generated, 4,573 simulations, 8,900 sequential steps, 222 Yosys compilations, 0 failures.

---

## 3. Which Tests Pass or Fail

- **Automated Tests (`node tests/tests.js`)**: **49 Passed, 0 Failed**.
- **Real Verilog Yosys Verification (`node tests/verilog_verification/run_yosys_verification.js`)**: **11 Passed, 0 Failed**.
- **Icarus Verilog Simulation (`node tests/verilog_verification/run_iverilog_simulation.js`)**: **11 Passed, 0 Failed**.
- **Cross-Engine Differential Simulation (`node tests/verilog_verification/run_differential_simulation.js`)**: **34 Passed, 0 Failed (0 mismatches)**.
- **Browser Automation Suite (`node tests/browser_smoke_test.js`)**: **All Passed, 0 Uncaught Page Exceptions**.
- **In-Browser Test Runner (`tests/test_runner.html`)**: **49 Passed, 0 Failed**.
- **Stress Testing Smoke Check (`node tests/stress/stress_runner.js`)**: **445 Batches Passed, 0 Failed**.

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
4. **Background process preservation**: Background long-duration stress test (PID 22852) is currently testing the Phase 5 baseline on port 8080/8181. Integration tests use port 8088 / 8182 / 9334 to prevent collisions.

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
- `tests/stress/`: Long-duration deterministic stress testing harness.
- `tests/verilog_verification/`: Real HDL verification scripts for Yosys and Icarus Verilog.
- `docs/INTEGRATION_REPORT.md`: Comprehensive integration audit report.
- `docs/RELEASE_CANDIDATE_CHECKLIST.md`: Formal release candidate sign-off checklist.
- `docs/DECISIONS.md`: Architectural decision records (ADRs 001–016).
- `docs/PROGRESS.md`: Feature matrix, phase tracker, and test metrics.
- `docs/HANDOFF.md`: Current handoff documentation.

---

## 7. Exact Commands to Run

```bash
# Navigate to project worktree:
cd C:\Users\pranil\Documents\PD-Playground\rtl-playground-integration

# 1. Run unit & regression tests in Node.js (49 tests):
npm test
# or: node tests/tests.js

# 2. Run real Verilog HDL verification via WebAssembly Yosys (11 benchmarks):
npm run test:yosys
# or: node tests/verilog_verification/run_yosys_verification.js

# 3. Run event-driven Verilog simulation via WebAssembly Icarus Verilog (11 benchmarks):
npm run test:iverilog
# or: node tests/verilog_verification/run_iverilog_simulation.js

# 4. Run cross-engine differential simulation (JS Engine vs Compiled Verilog):
npm run test:differential
# or: node tests/verilog_verification/run_differential_simulation.js

# 5. Run automated browser tests in Microsoft Edge (via CDP on port 8088):
npm run test:browser
# or: node tests/browser_smoke_test.js

# 6. Run a bounded smoke check of the stress testing harness (30s):
$env:STRESS_HTTP_PORT = "8182"; $env:STRESS_CDP_PORT = "9334"
node tests/stress/stress_runner.js --duration=30s --yield-ms=40 --report-dir=tests/stress/reports/integration_smoke
```

---

## 8. Next Recommended Development Task

- **Phase 7: Multi-Bit Vector & Bus Support or STA Bridge Implementation**:
  - Implement `src/bridge/sta_exporter.js` based on `docs/RTL_TO_STA_BRIDGE_DESIGN.md` to export annotated timing graphs and SDC constraints directly to STA Playground.
  - Add bus widths (e.g. `[3:0]`, `[7:0]`) for multi-bit registers, adders, and vector operations.
