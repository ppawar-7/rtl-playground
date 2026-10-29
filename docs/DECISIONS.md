# RTL Playground — Technical Decisions Log

## Decision 001: Vanilla JS with ES Modules (No Framework)

**Date**: 2026-10-28  
**Decision**: Use plain HTML/CSS/JavaScript with ES modules, no frameworks.  
**Rationale**: Matches existing STA Playground approach; enables GitHub Pages deployment without build tools; keeps the project accessible to university contributors; minimizes dependency risk.  
**Trade-off**: More boilerplate for UI components, but engine/UI separation is cleaner without framework coupling.

## Decision 002: CircuitGraph as Single Source of Truth

**Date**: 2026-10-28  
**Decision**: All simulation, visualization, Verilog generation, and truth tables read from one `CircuitGraph` instance.  
**Rationale**: Prevents state desynchronization between views. Any change to the circuit updates all dependent outputs through event-driven propagation.

## Decision 003: SVG for Circuit Visualization

**Date**: 2026-10-28  
**Decision**: Use SVG (not Canvas) for the interactive circuit editor.  
**Rationale**: SVG elements are DOM nodes — they support native click/drag events, CSS styling, and accessibility. Individual gates and wires can be selected, styled, and manipulated without hit-testing math. Canvas would require manual redraw and hit detection.  
**Trade-off**: SVG may be slower for very large circuits, but educational circuits are small (≤20 components).

## Decision 004: Three-Value Signal Model (0, 1, null)

**Date**: 2026-10-28  
**Decision**: Signal values are `0` (low), `1` (high), or `null` (unresolved/unconnected). A gate with any `null` input produces `null` output.  
**Rationale**: Provides clear visual feedback for unconnected pins. Prevents silent incorrect results. Does NOT silently retain old flip-flop Q values when D is null — the Q becomes null on the next rising edge if D is null, making the undefined state visible.  
**Alternative considered**: Verilog 4-value (0/1/x/z). Rejected for v1 as overly complex for beginners; can be added later.

## Decision 005: Simultaneous DFF Sampling on Rising Edge

**Date**: 2026-10-28  
**Decision**: On a rising clock edge, ALL flip-flops sample their D inputs first (using pre-edge values), then ALL Q outputs update simultaneously. Combinational logic is re-evaluated after Q updates.  
**Rationale**: Matches real hardware behavior and Verilog nonblocking assignment semantics (`<=`). Prevents order-dependent bugs where one DFF's new Q feeds another DFF's D within the same edge.

## Decision 006: Behavioral Lesson Validation (Not Structural)

**Date**: 2026-10-28  
**Decision**: Lesson "Check Solution" validates the circuit's truth table / I/O behavior, not its internal structure.  
**Rationale**: Students may build valid circuits in unexpected ways (e.g., AND using NAND+NOT). Behavioral validation rewards correct understanding rather than rote reproduction.

## Decision 007: No SR Latch Preset in v1

**Date**: 2026-10-28  
**Decision**: Remove the SR latch (NOR cross-coupled) preset because the simulator rejects combinational feedback loops.  
**Rationale**: The SR latch has a combinational feedback path. The cycle detection correctly flags this. Adding asynchronous latch support would require level-sensitive simulation, which is out of scope for v1.  
**Future**: Can be added when the simulator supports level-triggered elements.

## Decision 008: Truth Table Limited to ≤4 Inputs

**Date**: 2026-10-28  
**Decision**: Truth table generation is limited to circuits with ≤4 independent Boolean inputs (16 rows max).  
**Rationale**: Larger truth tables are unwieldy in the UI and slow to compute for educational purposes. The UI shows a clear message for circuits exceeding this limit.

## Decision 009: Local HTTP Server Required

**Date**: 2026-10-28  
**Decision**: The application requires a local HTTP server (e.g., `python -m http.server`) to run, because ES modules require same-origin policy.  
**Rationale**: Opening `index.html` via `file://` protocol blocks ES module imports in most browsers. A simple HTTP server is the standard solution.

## Decision 010: Wire Routing — Bézier Curves

**Date**: 2026-10-28  
**Decision**: Wires use SVG quadratic Bézier paths with horizontal-first routing, not straight lines or Manhattan routing.  
**Rationale**: Curved wires look cleaner than straight lines when pins aren't aligned, and are simpler to implement than full Manhattan routing with congestion avoidance. Good enough for educational circuits.

## Decision 011: WebAssembly Yosys Verification (@yowasp/yosys) for Local HDL Synthesis Testing

**Date**: 2026-10-29  
**Decision**: Use `@yowasp/yosys` inside Node.js for automated HDL verification without requiring root or system-wide C++ toolchain installations.  
**Rationale**: Icarus Verilog and Verilator were not installed on the system PATH. YoWASP Yosys provides a WebAssembly port that compiles generated Verilog into IEEE 1364 AST, elaborates design hierarchy, performs process optimizations, and runs `check -assert`. This delivers true compiler validation completely locally with zero system modifications.

## Decision 012: Synchronized Component-to-RTL Highlighting & Physical Cell Mapping

**Date**: 2026-10-29  
**Decision**: Canvas component selection dynamically highlights the corresponding continuous assignment (`assign`), port definition, or procedural register (`always @(posedge clk)`) in the Verilog code pane, and renders an "RTL Hardware Mapping" inspector card with target standard cell details.  
**Rationale**: Connects visual schematic representation directly to HDL text and ASIC physical synthesis concepts for students.

## Decision 013: First-Class Registers with Enable (DFFE), Synchronous Reset (DFFSR), and Documented Priority (DFFESR)

**Date**: 2026-10-29  
**Decision**: Expanded the sequential model and component library to include first-class register blocks (`DFFE`, `DFFSR`, `DFFESR`) in addition to discrete gate/MUX subcircuits. Explicitly documented and implemented reset priority: when both synchronous reset and clock enable are active on the rising clock edge, reset dominates (`if (rst) q <= 1'b0; else if (en) q <= d;`).  
**Rationale**: Students need to observe real ASIC register behaviors both at the structural discrete gate level (recirculating MUX / reset gating) and at the monolithic behavioral RTL cell level. Reset priority ensures critical safety resets are never blocked by an inactive enable line.

## Decision 014: Interactive Verilog Construct Explainer & Dual RTL Coding Perspectives

**Date**: 2026-10-29  
**Decision**: Added an interactive RTL Construct Explainer bar directly inside the Generated Verilog drawer with 6 interactive construct chips (`assign`, `always @(*)`, `if/else`, `case`, `always @(posedge clk)`, and Blocking vs Nonblocking `= vs <=`). Added a style switcher enabling students to view synthesizable circuits in either Continuous Dataflow style (`assign`) or Procedural Behavioral style (`always @(*)`, `case`).  
**Rationale**: Beginners frequently struggle with the duality between dataflow (`assign`) and procedural (`always`) Verilog. Grounding explanations in validated educational examples and standard cell mappings bridges visual schematic intuition to professional RTL design.
