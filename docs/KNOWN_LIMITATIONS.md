# PD Playground — Known Limitations & Architectural Scope

> **Document Purpose**: Explicitly define the educational modeling approximations, technical constraints, and operational boundaries of the PD Playground RTL educational platform.  
> **Release Baseline**: `v0.2.0` (Branch: `integrate/full-rtl-playground`)  
> **Date**: October 29, 2026

---

## 1. Simulation & Logic Modeling Approximations

### A. Three-State Logic vs IEEE 1364 Four-State / Strengths
* **PD Playground Model**: Internal Boolean simulation represents signals using a 3-state domain: `0`, `1`, and `null` (representing uninitialized, floating, or high-Z).
* **HDL Comparison**: Full IEEE 1364 Verilog supports four states (`0`, `1`, `X`, `Z`) across 8 driving strengths (e.g., `supply`, `strong`, `pull`, `weak`, `highz`).
* **Educational Rationale**: For beginner-to-intermediate RTL students, introducing multi-level analog signal conflicts adds confusion without pedagogical benefit. Unconnected or floating pins propagate `null` (rendered as red dashed wires with `?`), teaching students to avoid unassigned inputs.

### B. Topological Evaluation vs Stratified Delta-Cycle Event Queue
* **PD Playground Model**: Combinational circuits evaluate via Directed Acyclic Graph (DAG) topological sorting. Sequential updates use a strict two-phase nonblocking scheduler:
  1. *Sample Phase*: All active register inputs ($D, EN, RST$) sample pre-edge values simultaneously.
  2. *Commit Phase*: All state variables ($Q$) update simultaneously.
  3. *Propagate Phase*: Combinational fanouts evaluate to steady state.
* **HDL Comparison**: Commercial simulators (e.g. ModelSim, VCS, Icarus Verilog) employ an event-driven scheduler with stratified queues (Active, Inactive, Nonblocking Assign Update, Monitor) and sub-nanosecond delta cycles.
* **Educational Rationale**: The two-phase nonblocking model perfectly reproduces synthesizable synchronous digital design behavior without introducing simulation delta-cycle race artifacts.

### C. Zero-Delay Combinational Gates
* **PD Playground Model**: Logic gates evaluate with zero propagation delay ($t_{pd} = 0$). Dynamic hazards (glitches/hazards due to path delay differences) are not simulated on the gate canvas.
* **ASIC Timing Rationale**: Timing path delay, setup/hold slack, and clock frequency limits are the domain of Static Timing Analysis (STA). Physical timing analysis is modeled in the companion **STA Playground** (`ppawar-7-sta-playground`) and documented in `docs/RTL_TO_STA_BRIDGE_DESIGN.md`.

---

## 2. Hardware Datapath & Vector Constraints

### A. Bus Bit-Width Limits
* **Supported Range**: 1 to 64 bits per vector bus (`VectorSignal`).
* **Implementation**: Built upon JavaScript native `BigInt` arithmetic, ensuring bit-for-bit mathematical accuracy without IEEE 754 floating-point precision loss.
* **Boundaries**: Attempting to instantiate a vector with width $< 1$ or $> 64$ throws a `RangeError`. Educational datapaths focus on 4-bit, 8-bit, 16-bit, and 32-bit standard microarchitectures.

### B. Combinational Loops
* **Handling**: Combinational loops without register isolation (e.g., an inverter output tied directly to its input) are detected during topological sort and cleanly rejected with an educational error explaining why cyclic combinational paths produce race conditions and meta-stability in hardware.
* **Sequential Feedback**: Feedback loops that pass through a clocked flip-flop (`DFF`, `DFFE`, `DFFSR`, `DFFESR`) are fully supported and break combinational cycles, matching physical synchronous design rules.

---

## 3. Verilog Generation & Synthesis Scope

### A. Synthesizable Subset Focus
* The generated HDL intentionally targets **strictly synthesizable IEEE 1364-2001 Verilog**.
* Non-synthesizable constructs (e.g. `#delay` inside module logic, `initial` blocks for hardware state, fork/join, real numbers) are excluded from generated RTL and reserved for self-checking testbenches.

### B. Generic Gate Elaboration vs Technology Mapping
* Synthesis verification in the CI pipeline runs via **YoWASP Yosys (WebAssembly)**, performing:
  * AST generation
  * Hierarchy validation
  * Procedural elimination (`proc`)
  * Constant folding and dead-code elimination (`opt`)
  * Generic cell elaboration (`$dff`, `$mux`, `$eq`, `$logic_not`, `$sdff`)
  * Formal assertion check (`check -assert`)
* Direct standard-cell technology mapping (e.g., target Liberty files for SkyWater SKY130 or TSMC 28nm) is decoupled from the educational editor and handled via the Phase 7 RTL-to-STA bridge interface.

---

## 4. Visual Canvas Scaling Limits

* **Recommended Canvas Size**: $\le 150$ components on the drag-and-drop schematic canvas.
* **Large Datapaths**: Multi-bit adders, ALUs, counters, and FSMs are simulated via the **Advanced RTL Lab** (`/advanced-lab/`), which renders interactive high-level diagrams (SVG carry chains, bit-strips, and state transition graphs) rather than cluttering the screen with hundreds of individual 1-bit logic gate symbols.

---

## 5. Security & Browser Runtime Sandbox

* **Zero Dynamic Code Execution**: Condition parsing in FSM Studio and simulation engines uses a deterministic, recursive-descent parser with zero `eval()` and zero `new Function()`.
* **Zero Backend Dependency**: The web application executes 100% client-side in the browser, requiring no Node.js backend or database server for end-user interaction. It is fully compatible with static hosting (GitHub Pages).
