# PD Playground — Unified Post-v0.2.0 Engineering Roadmap

> **Platform**: PD Playground (RTL Playground & STA Playground Integration)  
> **Authoritative Roadmap Version**: 1.0.0  
> **Date**: October 29, 2026  
> **Status**: Approved Architectural Master Roadmap

---

## 1. Roadmap Reconciliation & Dependency Architecture

In early planning documents, the connection to Static Timing Analysis was referenced as "Phase 7". As the platform evolved into a comprehensive dual-lab architecture (`v0.2.0`), a critical engineering dependency became apparent:

> [!NOTE]
> **Dependency Rationale**:
> In physical ASIC design, timing analysis is performed on real gate-level netlists with multi-bit data buses (e.g., 32-bit registers, 64-bit ALUs). If RTL Playground only supports single-bit drag-and-drop schematics on its visual canvas, the exported STA timing graphs would be restricted to trivial 1-bit toy circuits.
> 
> Therefore, **visual multi-bit schematic bus routing (Phase 7)** and **unified multi-bit waveform visualization (Phase 8)** must be established before the **live RTL-to-STA timing bridge (Phase 9)** can provide meaningful physical design education.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Current Stable Release Baseline: v0.2.0-rc1                            │
│ • Tier 1: Single-Bit Fundamentals (Logic Gates, DFFESR, 12 Lessons)    │
│ • Tier 2: Multi-Bit Advanced Lab (ALU Flags, FSM, 12 Lessons)          │
│ • Dual Verification: YoWASP Yosys + Icarus Verilog WASM (100% Passing) │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 7: Multi-Bit Schematic Bus Routing & Component Vectorization     │
│ • Visual canvas thick wires (wire [N-1:0])                             │
│ • Bus tap / bit-splitter palette components                            │
│ • Seamless visual datapath capture on main schematic editor            │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 8: Universal Multi-Channel & Hexadecimal Bus Waveform Viewer     │
│ • Unified bottom drawer graphing single-bit control & multi-bit data   │
│ • Synchronous time cursor & cycle-accurate measurement markers         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 9: Live Front-End to Static Timing Analysis (RTL-to-STA) Bridge  │
│ • Implements approved spec in docs/RTL_TO_STA_BRIDGE_DESIGN.md         │
│ • Technology mapping to Liberty standard cells (AND2X1, DFFX1)         │
│ • One-click live handoff to STA Playground (sta-playground)            │
│ • Critical path and setup/hold timing slack evaluation ($RAT - AT$)    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 10: Complete ASIC Physical Design Flow (Future Capstone Horizon) │
│ • Floorplanning, Placement, Clock Tree Synthesis, and Routing          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase-by-Phase Technical Specifications

### Phase 7: Multi-Bit Schematic Bus Routing & Component Vectorization
- **Objective**: Extend the primary visual canvas (`src/ui/circuit_editor.js`) to support multi-bit vector nets alongside single-bit wires.
- **Architectural Scope**:
  - Introduce thick visual bus wires (`stroke-width: 4` with slash and width annotation `/[N]`).
  - Add `BUS_TAP` and `BUS_CONCAT` palette components allowing students to visually extract slices (e.g., `vec[7:4]`) and bundle single wires into buses.
  - Vectorize gate primitives (e.g., $N$-bit bitwise AND, $N$-bit 2:1 MUX).
- **Underlying Model**: Directly reuses the verified `VectorModel` and `VectorOps` classes from `advanced-lab/engine/vector_model.js`.
- **Educational Impact**: Bridges the visual gap between single-bit schematic wiring and high-level datapath architecture.

### Phase 8: Universal Multi-Channel & Vector Waveform Viewer
- **Objective**: Consolidate single-bit digital waveforms (`src/ui/waveform_viewer.js`) and multi-bit hexagonal bus envelopes (`advanced-lab/ui/advanced_waveforms.js`) into a unified, resizable bottom drawer.
- **Architectural Scope**:
  - Dynamic channel list with user-selectable signals.
  - Interactive vertical timeline cursor displaying instantaneous hexadecimal, binary, and signed decimal values.
  - VCD (Value Change Dump) export for external waveform viewer compatibility (GTKWave, Surfer).
- **Educational Impact**: Enables students to visually debug pipelined datapaths where control lines (`clk`, `en`, `rst`) interact with vector data words.

### Phase 9: Live RTL-to-STA Architectural Bridge
- **Objective**: Connect RTL Playground to the companion **STA Playground** (`https://ppawar-7.github.io/sta-playground/`).
- **Architectural Scope**:
  - Implements the complete approved specification in `docs/RTL_TO_STA_BRIDGE_DESIGN.md`.
  - Translates the unified circuit graph into a standard Liberty cell timing graph (`AND2X1`, `DFFX1`, `INVX1`).
  - Exports a structured JSON payload defining gate instances, interconnect net delays, and clock period constraints.
  - Provides a one-click button: *"Analyze Timing in STA Playground"*, passing data via URL query parameter or browser `localStorage`.
- **Educational Impact**: Completes the front-end to back-end VLSI learning continuum: students see why functional correctness in Verilog is insufficient if propagation delay exceeds the clock period ($t_{cq} + t_{comb} + t_{setup} > T_{clk}$).

### Phase 10: Physical ASIC Design Flow Integration
- **Objective**: Expand beyond static timing analysis into floorplanning, macro placement, standard-cell placement, and routing.

---

## 3. Strict Development Rules

1. **Isolation**: Development of Phase 7, 8, or 9 must NOT begin until the current `v0.2.0` baseline is formally published and verified.
2. **STA Playground Protection**: The sibling repository `ppawar-7-sta-playground` remains strictly independent and must never be altered during RTL development.
3. **Additive Architecture**: Future phases must extend the existing verified ES module architecture without introducing bulky external web frameworks.
