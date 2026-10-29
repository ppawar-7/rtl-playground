# RTL Playground

**Interactive RTL Design Learning Platform**  
*Part of the PD Playground University Capstone Project: An Interactive Learning Tool for ASIC Physical Design*

---

## 1. Overview

**RTL Playground** is an interactive digital logic design and RTL exploration environment engineered for students and VLSI beginners. Students visually construct digital circuits, simulate combinational and sequential signal propagation, inspect clock-edge state transitions, generate synthesizable IEEE 1364 Verilog HDL in real time, analyze truth tables and timing waveforms, and complete 12 guided educational lessons with automated behavioral validation.

The application features:
- **Zero Framework / Zero Build Step**: 100% vanilla ES modules and static web assets.
- **Dual HDL Verification**: Self-contained WebAssembly Yosys compiler and WebAssembly Icarus Verilog simulator for instant AST, elaboration, and event-driven simulation.
- **Cross-Engine Differential Verification**: Automated cycle-accurate parity checks between browser simulation and compiled Verilog.
- **Long-Duration Deterministic Stress Testing**: Automated DAG circuit generator, memory scaling profiler, and seed-reproducible test harness.

---

## 2. Core Capabilities

### A. Interactive Logic Circuit Workspace
- **Component Palette**:
  - Digital Inputs (interactive 0/1 toggle) and Digital Outputs.
  - Clock source component (`CLOCK`).
  - 7 Standard Gates: `AND`, `OR`, `NOT`, `NAND`, `NOR`, `XOR`, `XNOR`.
  - Multiplexer: 2:1 MUX (`MUX2`).
  - 4 Sequential Registers:
    - Standard D Flip-Flop (`DFF`: inputs `D`, `CLK`)
    - Register with Clock Enable (`DFFE`: inputs `D`, `CLK`, `EN`)
    - Register with Synchronous Reset (`DFFSR`: inputs `D`, `CLK`, `RST`)
    - Register with Enable & Synchronous Reset (`DFFESR`: inputs `D`, `CLK`, `EN`, `RST`, with documented Reset > Enable priority)
- **Interactive SVG Canvas**: Component dragging, quadratic Bézier wire routing (drag-and-drop or click-to-connect), live signal coloring (`1` green, `0` gray, `null` red dashed).
- **Design Rule Checks**: Strict multi-driver rejection and self-connection prevention.

### B. Digital Logic Simulation Engine
- **Combinational Topological Evaluator**: Order-independent evaluation with safe simulation state isolation.
- **Cycle Detection**: 3-color DFS cycle detector rejecting illegal combinational feedback while safely permitting sequential feedback through registers.
- **Sequential Nonblocking Semantics**: Simultaneous pre-edge sampling on rising clock edges ($0 \to 1$), enforcing true hardware nonblocking semantics ($<=$).
- **State Retention**: Flip-flops retain state across falling clock edges and inactive enable periods.

### C. Interactive Verilog Explainer & Dual RTL Perspectives
- **Interactive Construct Explainer Bar**: 6 concept cards with synthesizable code patterns and ASIC cell mappings:
  1. Continuous assignments (`assign`)
  2. Combinational `always @(*)`
  3. Conditional logic (`if/else` and `? :`)
  4. Multiplexer selection using `case (sel)`
  5. Positive-edge-triggered `always @(posedge clk)`
  6. Blocking (`=`) versus nonblocking (`<=`) semantics
- **Component-to-Code Highlighting**: Selecting any component highlights its corresponding lines in the generated Verilog panel.
- **Dual Coding Perspectives**: Toggle between **Continuous Dataflow (`assign`)** and **Procedural Behavioral (`always @(*)`, `case`)** views.
- **RTL Hardware Mapping Inspector**: Displays synthesis construct, target standard cell (e.g. `AND2X1`, `MUX2X1`, `DFFEX1`, `DFFESRX1`), and timing model.

### D. Educational Presets (16 Total)
- **Basic Gates**: AND Gate, OR Gate, NOT Gate
- **Arithmetic**: 1-Bit Half Adder, 1-Bit Full Adder
- **Multiplexers**: 2:1 MUX (Conditional `? :`), 2:1 MUX (Continuous `assign`), 2:1 MUX (Procedural `case`)
- **Sequential Elements**: DFF Demo, DFF with Enable (`DFFE`), DFF with Synchronous Reset (`DFFSR`), DFF with Enable & Reset (`DFFESR`)
- **Gate-Level Architectures**: Register with Clock Enable (Recirculating MUX), Register with Synchronous Reset (AND/NOT)
- **Pipelines**: 2-Stage Shift Register Pipeline, Blocking vs Nonblocking Semantic Comparison

### E. Interactive Guided Lessons (12 Total)
1. Understanding Logic Gates
2. Building a Half Adder
3. Understanding a 2:1 Multiplexer
4. Introduction to Sequential Logic
5. Conditional Selection (MUX)
6. Register with Clock Enable
7. Register with Synchronous Reset
8. Clock Edge Timing & Pipelines
9. 1-Bit Full Adder Construction ($A, B, C_{in} \to Sum, C_{out}$)
10. Register with Clock Enable & Retention (`DFFE`)
11. Synchronous Reset with Documented Priority (`DFFESR`)
12. Blocking vs Nonblocking Pipeline Semantics

### F. Waveform Viewer & Truth Table Generator
- **Waveform Viewer**: Canvas-based digital timing diagrams tracking `CLK`, `D`, `Q`, `EN`, and `RST` signals across clock steps with step markers ($T_0, T_1, \dots$).
- **Truth Table Generator**: Exhaustive $2^n$ binary state generator (up to 16 rows for $\le 4$ inputs) with dynamic active-state row highlighting.

---

## 3. Architecture & File Structure

```
rtl-playground/
├── index.html                           # Application entrypoint
├── package.json                         # Node ES module configuration & test scripts
├── AGENTS.md                            # Multi-agent persistent collaboration guidelines
├── README.md                            # Project documentation
├── docs/
│   ├── INTEGRATION_REPORT.md            # Comprehensive integration audit report
│   ├── RELEASE_CANDIDATE_CHECKLIST.md   # Release candidate verification checklist
│   ├── RTL_TO_STA_BRIDGE_DESIGN.md      # Architectural design for STA Playground bridge
│   ├── PROGRESS.md                      # Milestone tracker & test results
│   ├── HANDOFF.md                       # Developer handoff documentation
│   └── DECISIONS.md                     # Architectural Decision Records (ADRs 001–016)
├── src/
│   ├── app.js                          # Main application controller
│   ├── engine/
│   │   ├── circuit_graph.js            # Graph model, pin tracking, cycle detection
│   │   ├── logic_simulator.js          # Combinational Boolean evaluator
│   │   ├── sequential_engine.js        # Clock stepper, registers, waveform history
│   │   └── verilog_generator.js        # Synthesizable continuous & procedural Verilog
│   ├── ui/
│   │   ├── circuit_editor.js           # SVG canvas editor & wire routing
│   │   ├── component_library.js        # Component palette sidebar
│   │   ├── waveform_viewer.js          # Canvas timing waveform visualizer
│   │   ├── truth_table.js              # Interactive truth table renderer
│   │   └── panels.js                   # Verilog explainer, style toggle & inspector
│   ├── modules/
│   │   ├── presets.js                  # 16 educational circuit presets
│   │   └── lessons.js                  # 12 guided lessons with behavioral validators
│   └── styles/
│       └── main.css                    # Dark EDA stylesheet with CSS variables
└── tests/
    ├── tests.js                        # 49 unit & integration tests (Node & browser)
    ├── test_runner.html                # Visual in-browser test runner
    ├── browser_smoke_test.js           # Headless Microsoft Edge CDP automated audit
    ├── verilog_verification/           # Real HDL verification suites
    │   ├── generate_verification_suites.js # Synthesizable Verilog & testbench generator
    │   ├── run_yosys_verification.js       # WebAssembly Yosys synthesis checks (11 modules)
    │   ├── run_iverilog_simulation.js      # WebAssembly Icarus Verilog simulation (11 modules)
    │   └── run_differential_simulation.js  # Cross-engine differential verification (34 checks)
    └── stress/                         # Automated long-duration stress-testing harness
        ├── stress_runner.js            # Main test orchestrator
        ├── circuit_generator.js        # Deterministic PRNG circuit synthesizer
        ├── reference_evaluator.js      # Independent 3-valued Boolean reference model
        └── browser_ui_worker.js        # Port-isolated Edge CDP worker
```

---

## 4. Running the Application

Because RTL Playground uses native JavaScript ES Modules, it must be served via a local HTTP server:

```bash
# Option 1: Python HTTP Server (port 8088 recommended)
python -m http.server 8088

# Option 2: Node.js / npx
npx serve -p 8088 .
```

Open **`http://localhost:8088`** in any modern web browser.

---

## 5. Running Verification Suites

All verification suites run entirely locally without requiring external C++ toolchains or root privileges:

```bash
# 1. Run unit and cross-module integration tests (49 tests):
npm test

# 2. Run real Verilog HDL synthesis verification via WebAssembly Yosys (11 modules):
npm run test:yosys

# 3. Run functional Verilog simulation via WebAssembly Icarus Verilog (11 modules):
npm run test:iverilog

# 4. Run cross-engine differential simulation (34 parity checks, 0 mismatches):
npm run test:differential

# 5. Run automated Microsoft Edge browser tests (via Chrome DevTools Protocol):
npm run test:browser

# 6. Run a short smoke run of the stress-testing harness (30s):
npm run test:stress -- --duration=30s --yield-ms=40
```

---

## 6. Verification Status Summary

- **Unit & Integration Suite**: **49 Passed, 0 Failed**
- **Yosys Synthesis Checks**: **11 Passed, 0 Failed**
- **Icarus Verilog Event-Driven Simulation**: **11 Passed, 0 Failed**
- **Differential Equivalence Checks**: **34 Passed, 0 Mismatches**
- **In-Browser Test Runner**: **49 Passed, 0 Failed**
- **Browser Interaction Audit**: **16/16 Presets & 12/12 Lessons Verified, 0 Exceptions**
- **Stress-Testing Smoke Check**: **445 Batches, 1,557 Circuits, 0 Errors**

---

## 7. Capstone Project Attribution

Developed as part of the **PD Playground** senior capstone design project (Stevens Institute of Technology).  
Co-requisite project: [STA Playground](https://ppawar-7.github.io/sta-playground/).
