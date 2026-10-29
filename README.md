# RTL Playground

**Interactive RTL Design Learning Platform**  
*Part of the PD Playground University Capstone Project: An Interactive Learning Tool for ASIC Physical Design*

---

## 1. Overview

**RTL Playground** is an educational digital logic design and RTL exploration environment built for beginners. Students construct digital circuits visually, simulate combinational and sequential signal propagation, observe live color-coded voltage states, generate synthesizable IEEE 1364-2001 Verilog HDL in real-time, generate truth tables, analyze clock-synchronized waveform timing diagrams, and complete guided educational exercises with automated behavioral validation.

The project is zero-dependency, local-first, and compatible with GitHub Pages.

---

## 2. Core Capabilities

### A. Interactive Logic Circuit Workspace
- **Component Palette**: Digital Inputs (interactive 0/1 toggle), Digital Outputs, Clock source, 7 standard gates (`AND`, `OR`, `NOT`, `NAND`, `NOR`, `XOR`, `XNOR`), 2:1 Multiplexers (`MUX2`), and Positive-Edge-Triggered D Flip-Flops (`DFF`).
- **Interactive SVG Canvas**: Move and arrange gates with smooth Bézier wire connections.
- **Connection Rules**: Strict multi-driver protection (one driver per input pin) and self-connection rejection.

### B. Digital Logic Simulation Engine
- **Deterministic Evaluation**: Topological sort ordering ensuring correct signal propagation across arbitrary multi-gate depths.
- **Signal Model**: Three-state educational signal model:
  - Logic `1` (HIGH, green `#22c55e`)
  - Logic `0` (LOW, gray `#64748b`)
  - Logic `null` (Unresolved/Unconnected, red dashed `#f43f5e`)
- **Cycle Detection**: DFS 3-color cycle detection algorithm rejecting invalid combinational feedback loops while safely allowing sequential feedback through flip-flops.

### C. Sequential Simulation & Timing Waveforms
- **Positive-Edge D Flip-Flops**: Flip-flops sample their $D$ inputs simultaneously *before* any $Q$ outputs update (hardware nonblocking `<= ` semantics).
- **State Retention**: Flip-flops strictly preserve their state across falling edges and clock holds.
- **Waveform Viewer**: Canvas-based multi-signal digital timing diagram with step markers ($T_0, T_1, \dots$), manual single-stepping, and automatic clock run/pause.

### D. Synthesizable Verilog HDL Generation
- **Automatic Code Generation**: Emits clean, synthesizable Verilog matching the exact circuit graph.
- **Ports & Signals**: Generates proper port directions (`input wire`, `output wire`, `output reg`), continuous `assign` statements for combinational gates, and `always @(posedge clk)` sequential blocks for registers.
- **Error Guard**: Invalid or cyclic circuits display descriptive warning comments rather than misleading synthesizable HDL.

### E. Combinational Truth Table Generator
- **Truth Table Synthesis**: Automatically iterates all $2^n$ binary combinations for up to 4 inputs (16 states).
- **State Preservation**: Safely isolates simulation state to keep user's live canvas inputs and register contents intact.
- **Active Row Highlighting**: Live canvas input combinations are highlighted in real time.

### F. Guided Educational Lessons
1. **Understanding Logic Gates**: Learn Boolean logic by wiring and verifying an AND gate.
2. **Building a Half Adder**: Implement arithmetic SUM ($A \oplus B$) and CARRY ($A \cdot B$).
3. **Understanding a 2:1 Multiplexer**: Implement conditional data routing ($Y = \text{Sel} ? B : A$).
4. **Introduction to Sequential Logic**: Explore clock edges, setup sampling, and flip-flop state retention.
- **Behavioral Validation**: Lessons evaluate circuit correctness by testing truth-table outcomes and clock sequences, rewarding creative student solutions rather than checking internal component counts.

---

## 3. Architecture & File Structure

```
rtl-playground/
├── index.html                     # Application entrypoint
├── package.json                   # Node ES module configuration
├── AGENTS.md                      # Multi-agent persistent collaboration guidelines
├── CLAUDE.md                      # Quick Claude agent guide
├── README.md                      # Project documentation
├── docs/
│   ├── IMPLEMENTATION_PLAN.md    # Technical architecture & design plan
│   ├── PROGRESS.md               # Current milestones, completed phases, and test logs
│   ├── HANDOFF.md                # Developer handoff notes for upcoming sessions
│   └── DECISIONS.md              # Architectural decisions log
├── src/
│   ├── app.js                    # Main controller connecting engine and UI
│   ├── engine/
│   │   ├── circuit_graph.js      # Canonical circuit graph model & cycle detector
│   │   ├── logic_simulator.js    # Combinational evaluator with topological sort
│   │   ├── sequential_engine.js  # Clock stepper, DFF state machine & snapshot history
│   │   └── verilog_generator.js  # Synthesizable Verilog HDL generator
│   ├── ui/
│   │   ├── circuit_editor.js     # SVG canvas, gate rendering, wiring & signal display
│   │   ├── component_library.js  # Component palette sidebar
│   │   ├── waveform_viewer.js    # Canvas timing waveform visualizer
│   │   ├── truth_table.js        # Truth table generator
│   │   └── panels.js             # Panel tabs, inspector & health checker
│   ├── modules/
│   │   ├── presets.js            # Predefined circuit templates
│   │   └── lessons.js            # Interactive guided lessons & validators
│   └── styles/
│       └── main.css              # Dark EDA stylesheet with CSS variables
└── tests/
    ├── tests.js                  # Automated test suite (Node & browser compatible)
    └── test_runner.html          # Visual in-browser test runner
```

---

## 4. Running the Application

Because RTL Playground uses native JavaScript ES Modules (`import`/`export`), it must be served through an HTTP server (not directly opened via `file://`).

### Option 1: Python HTTP Server (Recommended)
```bash
# From the project root:
cd C:\Users\pranil\Documents\PD-Playground\rtl-playground
python -m http.server 8080
```
Open **`http://localhost:8080`** in Google Chrome, Microsoft Edge, or Mozilla Firefox.

### Option 2: Node.js / npx
```bash
npx serve .
```

---

## 5. Running Automated Tests

### Command Line (Node.js)
```bash
node tests/tests.js
```
*Current test suite: **26 passing, 0 failing**.*

### In-Browser Test Runner
With the local HTTP server running, open:  
**`http://localhost:8080/tests/test_runner.html`**

---

## 6. Known Limitations & Future Work

1. **Single-Bit Logic**: Only 1-bit scalar wires are supported in v1 (multi-bit buses/vectors planned for future iterations).
2. **Combinational Feedback**: Combinational cycles are strictly disallowed. Cross-coupled asynchronous latches (e.g. NOR SR latch) will be introduced in a future phase with level-sensitive simulation.
3. **External Verilog Simulators**: `iverilog` was not installed on the host environment; syntax correctness has been verified against IEEE 1364-2001 standard rules.
4. **Physical Design Integration**: RTL Playground currently focuses purely on functional RTL logic. Future milestones will interface with STA Playground for cell delay calculation and timing closure.

---

## 7. Capstone Project Attribution
Developed as part of the **PD Playground** senior capstone design project (Stevens Institute of Technology).  
Co-requisite project: [STA Playground](https://ppawar-7.github.io/sta-playground/).
