# PD Playground — RTL Educational Learning Coverage Matrix

> **Evaluation Standard**: Comprehensive Beginner-to-Intermediate Digital RTL Curriculum  
> **Release Baseline**: `v0.2.0-rc1` (Commit `af20466` + subpath hardening on `integrate/full-rtl-playground`)  
> **Curriculum Scope**: 24 Guided Interactive Lessons (12 Single-Bit + 12 Multi-Bit Advanced)  
> **Reconciliation Status**: Reconciled & Audited (October 29, 2026)

---

## 1. Executive Summary & Category Totals

The PD Playground curriculum has been audited against **46 distinct topics** across 6 core digital design disciplines:

| Discipline Category | Total Topics | Interactively Assessed | Demonstrated / Visualized | Partially Supported | Out of Scope |
|:---|:---:|:---:|:---:|:---:|:---:|
| **A. Foundational Concepts** | 6 | 6 | 0 | 0 | 0 |
| **B. RTL Hardware Description Language** | 9 | 6 | 3 | 0 | 0 |
| **C. Sequential Circuit Design** | 8 | 8 | 0 | 0 | 0 |
| **D. Intermediate Digital Design** | 8 | 5 | 1 | 1 | 1 |
| **E. Simulation and Verification** | 8 | 3 | 5 | 0 | 0 |
| **F. Synthesis & ASIC Connection** | 7 | 1 | 5 | 0 | 1 |
| **TOTAL** | **46** | **28 (60.9%)** | **14 (30.4%)** | **1 (2.2%)** | **3 (6.5%)** |

### Pedagogical Classification Legend:
* 🎯 **Interactively Assessed**: Student directly constructs or configures circuits/parameters in one of the 24 guided lessons, validated by automated behavioral checking scripts.
* 👁️ **Demonstrated / Visualized**: Implemented in interactive visualizers (carry chain, ALU bit-strips, state diagram, waveforms) or live synchronized Verilog generation.
* 🟡 **Partially Supported**: Core architectural primitives implemented (e.g. multi-register shift arrays); dedicated SRAM macro blocks reserved for Phase 8.
* ⚪ **Out of Scope**: Advanced post-silicon / enterprise protocols (e.g. AXI valid/ready handshakes, analog drive strengths) intentionally decoupled to keep beginner-to-intermediate learning focused.

---

## 2. Topic-by-Topic Audit

### A. Foundational Concepts (6 Topics)

| # | Topic | Classification | Implementation Details & Evidence | Assessment Mechanism |
|:---:|:---|:---:|:---|:---|
| 1 | **Digital number systems & binary** | 🎯 Assessed | `vector_model.js`, `arithmetic_engine.js`. Hex, binary, and 2's complement decimal formatting. | Lesson 13 (Slicing) & Lesson 16 (Signed Flags). |
| 2 | **Logic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR)** | 🎯 Assessed | `circuit_graph.js`, `component_library.js`. Full 7-gate library with ANSI symbols and active wire colors. | Lesson 1 (Logic Gates) & preset circuits. |
| 3 | **Boolean algebra & identities** | 🎯 Assessed | De Morgan's laws and Boolean reduction across gate trees and XOR/XNOR circuits. | Automated truth-table parity checking. |
| 4 | **Truth tables** | 🎯 Assessed | `truth_table.js`. Live $2^N$ combinational truth table generator with interactive input toggling. | Tested across all gate presets and Half/Full Adders. |
| 5 | **Combinational logic** | 🎯 Assessed | `logic_simulator.js`. Topological sorting with cycle detection (`circuit_graph.js`). | Lessons 1–3, 5, 9, 13–16. |
| 6 | **Digital circuit I/O behavior** | 🎯 Assessed | Dynamic input toggles, floating wire null-propagation (`?`), and fan-out visualization. | Built-in canvas interaction across all presets. |

### B. RTL Hardware Description Language (HDL) (9 Topics)

| # | Topic | Classification | Implementation Details & Evidence | Assessment Mechanism |
|:---:|:---|:---:|:---|:---|
| 7 | **Modules and ports** | 👁️ Demonstrated | `verilog_generator.js`, `advanced_verilog.js`. Synthesizable IEEE 1364 module headers and port lists. | Synchronized Verilog panel updates on canvas edits. |
| 8 | **Signals and data types (`wire`, `reg`)** | 👁️ Demonstrated | Generation of `wire` for continuous assigns and `reg` for procedural targets. Explainer Cards 1 & 2. | Verified via YoWASP Yosys compilation (17 modules). |
| 9 | **Operators and expressions** | 👁️ Demonstrated | Bitwise (`&, \|, ^, ~`), logical (`&&, \|\|, !`), reduction, arithmetic (`+, -`), and conditional (`?:`). | ALU Visualizer & live Verilog viewer. |
| 10 | **Continuous assignments (`assign`)** | 🎯 Assessed | Continuous dataflow generation in `verilog_generator.js`. Explainer Card 1. | Lesson 5 (Conditional MUX) & Lesson 9 (Full Adder). |
| 11 | **Procedural blocks (`always @(*)`, `always @(posedge clk)`)** | 🎯 Assessed | Dual-perspective toggle: continuous `assign` vs behavioral `always @(*)` / `case`. | Lesson 12 & Explainer Cards 2 & 5. |
| 12 | **Vectors and signedness** | 🎯 Assessed | `vector_model.js`. Multi-bit vectors `[W-1:0]`, BigInt representation up to 64 bits, 2's complement sign extension. | Lesson 13 (Slicing) & Lesson 14 (Concatenation). |
| 13 | **Conditional (`if/else`) and `case`** | 🎯 Assessed | Synthesizable procedural `case` and nested `if/else` generation in `verilog_generator.js`. | Preset `mux-case` and Lesson 5. |
| 14 | **Blocking (`=`) vs Nonblocking (`<=`)** | 🎯 Assessed | Dual semantic execution in `sequential_engine.js` (two-phase nonblocking state update) and Explainer Card 5. | Lesson 12 & preset `blocking-vs-nonblocking`. |
| 15 | **Synthesizable RTL conventions** | 🎯 Assessed | Strict synthesis templates in `SynthesizableTemplates.js`. Zero inferred latches verified by Yosys. | Lesson 23 (Latch Inference & Synthesis Rules). |

### C. Sequential Circuit Design (8 Topics)

| # | Topic | Classification | Implementation Details & Evidence | Assessment Mechanism |
|:---:|:---|:---:|:---|:---|
| 16 | **Flip-flops and latches** | 🎯 Assessed | Native `DFF`, `DFFE`, `DFFSR`, `DFFESR` primitives in `circuit_graph.js` and `sequential_engine.js`. | Lessons 4, 10, 11, 17, 18. |
| 17 | **Registers and clock edges** | 🎯 Assessed | Positive-edge-triggered state capture, falling-edge immunity, and clock stepping in `SequentialEngine`. | Step Clock button and waveform timing traces. |
| 18 | **Clock and reset behavior** | 🎯 Assessed | Synchronous reset (`rst`) behavior; clear state on clock edge without combinational race conditions. | Lesson 7 & Lesson 18. |
| 19 | **Register clock enables** | 🎯 Assessed | Data recirculation and enable gating without clock-tree slicing. | Lessons 6, 10, 17. |
| 20 | **Synchronous reset priority** | 🎯 Assessed | Strict reset-over-enable evaluation order (`if (rst) ... else if (en) ...`). | Lesson 11 & Lesson 18. |
| 21 | **Counters (Binary, Modulo-N, Up/Down)** | 🎯 Assessed | `counter_engine.js`. Up/down counting, modulo rollover, and terminal count (`tc`) flag. | Lesson 19 (Modulo-6 Counter). |
| 22 | **Shift registers (SISO, SIPO, PISO, Universal)** | 🎯 Assessed | `UniversalShiftRegister` with Hold, Shift Left, Shift Right, and Parallel Load. | Lesson 8 & Lesson 20. |
| 23 | **Finite State Machines (Moore & Mealy)** | 🎯 Assessed | `fsm_engine.js`. Interactive SVG state transition diagram, Moore/Mealy output evaluation, and 2-process synthesizable Verilog. | Lesson 21 (Moore 101 Detector) & Lesson 22 (Moore vs Mealy Timing). |

### D. Intermediate Digital Design (8 Topics)

| # | Topic | Classification | Implementation Details & Evidence | Assessment Mechanism |
|:---:|:---|:---:|:---|:---|
| 24 | **Multiplexers & Decoders** | 🎯 Assessed | 2:1 MUX (gate-level and behavioral), 4:1 MUX presets, parameterized data selectors. | Lesson 3, Lesson 5, and Presets. |
| 25 | **Adders & ALUs** | 🎯 Assessed | 1-bit Half Adder, 1-bit Full Adder with $P/G$ logic, 4-bit Ripple Carry Adder, and 8-operation ALU with status flags ($Z, C, V, N$). | Lessons 2, 9, 15, 16. |
| 26 | **Parameterized modules** | 👁️ Demonstrated | Parameterized `#(parameter WIDTH = 4)` Verilog generation for adders, registers, counters, and ALUs. | Generated Verilog code inspection in Advanced Lab. |
| 27 | **Memories & register files** | 🟡 Partial | Multi-register pipeline and shift arrays implemented. Static RAM / multiport register files planned for Phase 8. | Educational notes in Sequential Lab. |
| 28 | **Pipelining basics** | 🎯 Assessed | 2-stage and 4-stage sequential pipelines demonstrating cycle-by-cycle data advancement. | Lesson 8 (Pipelines) & Lesson 12. |
| 29 | **Latency versus throughput** | 🎯 Assessed | Cycle latency vs combinational propagation timing explained across Moore vs Mealy and shift register stages. | Lesson 22 (Moore vs Mealy). |
| 30 | **Valid/ready handshakes** | ⚪ Out of Scope | Advanced bus protocol handshaking (AXI/Wishbone) deferred to future protocols lab. | N/A |
| 31 | **Modular design and hierarchy** | 🎯 Assessed | Full Adder cascaded into Ripple-Carry Adder; 2-process FSM architecture. | Lesson 15 & FSM Studio. |

### E. Simulation and Verification (8 Topics)

| # | Topic | Classification | Implementation Details & Evidence | Assessment Mechanism |
|:---:|:---|:---:|:---|:---|
| 32 | **Testbenches** | 🎯 Assessed | 17 standalone self-checking testbenches in `tests/verilog_verification/*.v`. | Lesson 24 (Self-Checking Verilog Testbenches). |
| 33 | **Clock generation in simulation** | 🎯 Assessed | Clock oscillator constructs (`forever #5 clk = ~clk;`) and step-clock interactive controls. | Lesson 24 & Interactive Clock Stepper. |
| 34 | **Directed testing** | 👁️ Demonstrated | Deterministic vector application across all truth tables and ALU opcodes. | 49 unit tests + 8 advanced suites. |
| 35 | **Self-checking tests** | 🎯 Assessed | Testbenches compare actual vs expected outputs and assert error messages automatically. | Lesson 24 & 17 Icarus Verilog testbenches. |
| 36 | **Waveform interpretation** | 👁️ Demonstrated | `waveform_viewer.js` and `advanced_waveforms.js`. Live multi-channel digital traces with hexadecimal bus values. | Digital Waveform canvases in both portals. |
| 37 | **Simulation assertions** | 👁️ Demonstrated | IEEE 1364 `$error` and JS assertion checks. | `test_differential.js` (106 checks). |
| 38 | **Common RTL bugs** | 👁️ Demonstrated | Missing default cases, blocking assignments in sequential blocks, bus width mismatches, combinational loops. | Built-in circuit validator warnings. |
| 39 | **Simulation vs synthesis differences** | 👁️ Demonstrated | Contrasts zero-delay behavioral simulation with synthesized gate netlists and inferred latches. | Lesson 23 & Explainer Panel. |

### F. Synthesis and Physical Design (ASIC) Connection (7 Topics)

| # | Topic | Classification | Implementation Details & Evidence | Assessment Mechanism |
|:---:|:---|:---:|:---|:---|
| 40 | **Meaning of synthesis** | 👁️ Demonstrated | Real synthesis execution via YoWASP Yosys WASM (AST elaboration, `proc`, `opt`, `check -assert`). | Run via `npm run test:yosys`. |
| 41 | **Inferred hardware & latches** | 🎯 Assessed | Explains and demonstrates transparent latch inference caused by incomplete conditional assignments. | Lesson 23 (Latch Inference). |
| 42 | **Simplified gate-level mapping** | 👁️ Demonstrated | Yosys cell statistics ($dff, $mux, $eq, $not) reported in verification output. | Yosys synthesis logs in test reports. |
| 43 | **Resource sharing vs duplication** | 👁️ Demonstrated | Demonstrates ALU sharing of adder/subtractor logic vs dedicated parallel hardware. | Educational notes in Datapath Lab. |
| 44 | **Register boundaries & timing paths** | 👁️ Demonstrated | Setup and hold timing path boundaries explained between launch and capture flip-flops. | Explainer Card 6 & STA Bridge Design Doc. |
| 45 | **Area, timing, and power trade-offs** | 👁️ Demonstrated | Ripple-carry adder (low area, high latency) vs carry-lookahead concepts explained. | Physical design notes across all lessons. |
| 46 | **Why correct RTL can violate timing** | ⚪ Out of Scope* | Explains combinational path length, gate fanout, capacitive wire loading, and clock skew. (*Physical timing analysis handled in companion STA Playground). | Explainer Card 6 & `RTL_TO_STA_BRIDGE_DESIGN.md`. |
