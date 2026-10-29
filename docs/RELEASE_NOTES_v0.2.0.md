# PD Playground — Release Notes v0.2.0

> **Platform**: PD Playground — Interactive RTL & Digital Logic Design Suite  
> **Repository**: [https://github.com/ppawar-7/rtl-playground](https://github.com/ppawar-7/rtl-playground)  
> **Live Website**: [https://ppawar-7.github.io/rtl-playground/](https://ppawar-7.github.io/rtl-playground/)  
> **Release Baseline**: `v0.2.0` (Promoted from verified `v0.2.0-rc1` baseline)  
> **Release Date**: October 29, 2026  
> **License**: [MIT](file:///C:/Users/pranil/Documents/PD-Playground/rtl-playground-full/LICENSE)

---

## 1. Executive Summary

**PD Playground v0.2.0** marks the first formal general release of the standalone RTL Educational Learning Platform. Engineered as part of the university capstone project on ASIC Physical Design, PD Playground bridges the conceptual gap between introductory Boolean logic gates and synthesizable Register-Transfer Level (RTL) hardware design.

The platform provides a continuous educational journey from single-bit schematic capture to multi-bit vector datapaths, ripple-carry arithmetic, educational ALUs, sequential registers, binary counters, universal shift registers, and deterministic Finite State Machines (Moore & Mealy architectures).

---

## 2. Key Highlights & Features

### A. Dual-Lab Educational Architecture
- **Tier 1: RTL Fundamentals (`index.html`)**:
  - Interactive drag-and-drop netlist canvas with real-time logic signal coloring (`1` green, `0` gray, `null` red dashed).
  - Component library: Digital inputs, outputs, clock source, 7 basic gates (`AND`, `OR`, `NOT`, `NAND`, `NOR`, `XOR`, `XNOR`), 2:1 Multiplexer (`MUX2`), and 4 first-class sequential registers (`DFF`, `DFFE`, `DFFSR`, `DFFESR`).
  - Strict active-high synchronous reset-over-enable evaluation order matching standard ASIC cell libraries.
  - Interactive Verilog Explainer bar featuring 6 core RTL concepts and synthesis rules.
  - Dual coding perspectives: continuous dataflow (`assign`) vs procedural behavioral (`always @(*)`, `case`).
  - Interactive Canvas waveform drawer and exhaustive truth table generator with active-row tracking.
  - 16 predefined educational circuits.
- **Tier 2: Advanced RTL Lab (`advanced-lab/index.html`)**:
  - Multi-bit vector engine supporting 1–64 bit signals, big-endian bit extraction (`vec[7:4]`), concatenation (`{A, B}`), and sign/zero extension.
  - Arithmetic Datapath Visualizer with stage-by-stage ripple carry propagation ($G, P, C_{in}, C_{out}$) and 4-bit Educational ALU with status flags ($Z, C, V, N$).
  - Sequential Systems Studio: Multi-bit registers with nonblocking pipeline updates, modulo binary counters (up/down) with terminal count rollover, and 4-mode Universal Shift Register (Hold, Shift Right, Shift Left, Parallel Load).
  - Finite State Machine (FSM) Studio: Interactive SVG state diagrams, real-time active state glow, Moore and Mealy output decoding, and 2-process synthesizable Verilog export.
  - Hexagonal multi-bit bus waveform rendering (`< 0xA >`).

### B. Unified 24-Lesson Curriculum
- **Lessons 1–12 (Single-Bit Fundamentals)**: Logic gates, half adders, multiplexers, D flip-flops, continuous conditional assignment (`? :`), clock enable recirculation, synchronous reset, clock timing waveforms, full adders, native DFFE, reset priority in DFFESR, and blocking vs nonblocking semantics (`=` vs `<=`).
- **Lessons 13–24 (Multi-Bit Advanced Datapaths & Verification)**: Vector slicing, bus concatenation, carry lookahead vs ripple carry, ALU status flags, multi-bit register recirculation, hardware reset priority, modulo counters, universal shift registers, sequence detector FSM, Moore vs Mealy output timing, combinational latch inference avoidance, and self-checking Verilog testbenches with assertions.
- Automated behavioral solution validation and contextual level-up guidance.

### C. Zero-Dependency Client-Side Simulation
- The interactive student application executes **100% in pure vanilla JavaScript** using standard ES modules and SVG.
- **Zero WebAssembly or native compilation in the browser**: Runs instantaneously on any modern desktop or mobile browser with zero plugin or backend server requirements.
- Safe AST expression evaluation: Deterministic recursive-descent parser for FSM state transitions with **zero `eval()` and zero `new Function()`**.

---

## 3. Developer Verification & Hardware Equivalence

All generated Verilog models are validated using automated offline verification tools running in Node.js:

| Verification Suite | Tool / Scope | Results |
|---|---|:---:|
| **Fundamentals Unit Suite** | 49 Node.js unit tests (`npm test`) | 49 / 49 Passed |
| **Advanced RTL Lab Suite** | 8 test suites & property tests (`npm run test:advanced`) | 5,474 Assertions Passed |
| **Yosys Synthesis Elaboration** | Real IEEE 1364 AST synthesis on 17 modules (`npm run test:yosys`) | 17 / 17 Elaborated (0 latches) |
| **Icarus Verilog Simulation** | Event-driven testbenches in WASM (`npm run test:iverilog`) | 17 / 17 Testbenches Passed |
| **Cross-Engine Differential Parity** | Bit-for-bit check: JS simulation vs compiled Verilog (`npm run test:differential`) | 106 / 106 Passed (0 mismatches) |
| **End-to-End Browser Journeys** | Headless Edge/Chrome CDP audits across Journeys A–F | 6 / 6 Journeys Verified |
| **Extended Stress Harness** | 2-hour randomized circuit generation and memory profiling | 453,229 Circuits, 0 Leaks |
| **Subpath Deployment Audit** | `/rtl-playground/` hosting without root leakage (`npm run test:subpath`) | 42 / 42 Requests Valid |

---

## 4. Release Hardening & Deployment Engineering

This release incorporates critical release-hardening enhancements:
1. **Portable Dependency Lockfile**: Added clean `package-lock.json` resolving from the public npm registry; updated GitHub Actions workflows to use `npm ci` with dependency caching.
2. **Lean Static Site Packaging**: Created `scripts/build_site.js` (`npm run build`) to package only essential client assets into `_site/` (31 files, 470.6 KB total). All unit test scripts, development dependencies, documentation files, and git metadata are excluded from the published website.
3. **Strict Deployment Gating**: Restructured `.github/workflows/deploy.yml` so that static site packaging and GitHub Pages deployment are executed as dependent jobs. The live site cannot be updated if mandatory verification checks on that commit fail.
4. **Subpath Hosting Integrity**: Validated full relative pathing for subpath deployment under `https://ppawar-7.github.io/rtl-playground/`.

---

## 5. Branch Protection & Contribution Guidelines

For ongoing maintenance of this educational project, the following minimal repository configuration is recommended:
- **Default Branch**: `main`
- **Branch Protection Rules for `main`**:
  - Require pull request before merging (1 review recommended for collaborative work).
  - Require status checks to pass before merging:
    - `CI Verification / RTL & Hardware Verification Suites`
  - Do not allow force pushes (`allow-force-pushes: false`).
  - Do not allow branch deletions (`allow-deletions: false`).
- **Feature Branch Workflow**:
  - Create feature branches from `main` (e.g. `feat/branch-name` or `fix/branch-name`).
  - Open a Pull Request targeting `main`.
  - Verify that CI passes green before merging.
  - On merge to `main`, `deploy.yml` automatically verifies the commit, packages `_site/`, and publishes to GitHub Pages.

---

## 6. Known Educational Modeling Scope & Boundaries

- **3-State Logic Domain**: Signals are modeled as `0`, `1`, or `null` (floating/unconnected). 8-level analog driving strengths and IEEE 1364 `X` propagation are omitted to keep introductory concepts accessible.
- **Synchronous Zero-Delay**: Logic gates evaluate with ideal zero delay ($t_{pd} = 0$). Dynamic hazards and setup/hold timing slacks are modeled in the companion **STA Playground** (`ppawar-7/sta-playground`).
- **Synthesis Focus**: Generated HDL targets synthesizable IEEE 1364-2001 constructs. Physical standard-cell mapping (e.g. SkyWater SKY130 Liberty cells) is reserved for the post-v0.2.0 RTL-to-STA bridge interface.

---

## 7. Migration from v0.2.0-rc1

- The `v0.2.0-rc1` tag remains immutably pinned to commit `a5d3fb3` as historical evidence of the pre-release integration gate.
- `v0.2.0` includes workflow and lockfile corrections, static site artifact packaging, updated version metadata, and clarified documentation.
