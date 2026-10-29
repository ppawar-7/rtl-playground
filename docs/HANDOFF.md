# RTL Playground — Developer Handoff Document

## 1. Current State
- The entire application has undergone an exhaustive engineering audit, browser testing in Microsoft Edge, and defect remediation.
- **Engine Layer**: 100% test-covered and physically accurate:
  - Combinational evaluation with topological sort (`logic_simulator.js`).
  - Graph model with cycle detection and pin constraint checks (`circuit_graph.js`).
  - Sequential engine enforcing nonblocking simultaneous D sampling on rising edges and clock-connected filtering (`sequential_engine.js`).
  - Synthesizable Verilog HDL generator with valid port net types, clock grouping, and identifier disambiguation (`verilog_generator.js`).
- **UI Layer**: Fully functional in real browsers with zero runtime exceptions:
  - SVG digital workspace with drag-and-drop, wiring (click-click and drag-release modes), input value toggles, component deletion, and signal color visualization (`circuit_editor.js`).
  - Component library palette (`component_library.js`).
  - Layout management and circuit health inspector (`panels.js`).
  - Combinational truth table generator with active state highlighting (`truth_table.js`).
  - Canvas waveform timing diagram visualizer (`waveform_viewer.js`).
  - Guided lessons with behavioral and structural challenge validators (`lessons.js`).
- **Tests & Automation**:
  - `node tests/tests.js`: **32/32 tests passing**.
  - `node tests/browser_smoke_test.js`: automated CDP test suite running in headless Edge.
  - In-browser visual test runner: `tests/test_runner.html`.

## 2. Defects Found & Fixed During Audit
1. **SVG className TypeError**: Fixed `TypeError: Cannot set property className of #<SVGElement> which has only a getter` in `circuit_editor.js` by using `.setAttribute('class', ...)`.
2. **Illegal Verilog Reg Continuous Assignment**: Fixed `output reg` driven by continuous `assign` in `verilog_generator.js` by making all outputs driven by continuous assigns `output wire`.
3. **Duplicate Verilog Port Names**: Added unique identifier registry in `verilog_generator.js` to disambiguate components with identical labels.
4. **Missing Clock Handling**: Enhanced `circuit_graph.js` to reject sequential circuits lacking clocks, preventing emission of undeclared clock signals.
5. **DFF Clock Sensitivity**: Fixed `sequential_engine.js` so only DFFs connected to an active rising clock sample $D$ and update $Q$.
6. **Wire Drag vs Click**: Enhanced `circuit_editor.js` to support both "click-pin-then-click-pin" and "drag-pin-to-pin" wiring.
7. **Waveform Canvas Dimensions**: Added safe geometry fallbacks in `waveform_viewer.js` when the waveform tab is initially hidden.
8. **Lesson 4 Structural Validation**: Added DFF $Q \to \text{Output}$ connectivity requirement to prevent premature pass.

## 3. Test Pass/Fail Status
- Automated Tests (`node tests/tests.js`): **32 Passed, 0 Failed**.
- Browser Tests (`node tests/browser_smoke_test.js`): **All Passed, 0 Page Exceptions**.
- In-Browser Runner (`tests/test_runner.html`): **32 Passed, 0 Failed**.
- External Verilog Compiler: **UNVERIFIED VIA COMPILER** (`iverilog` not present on host machine).

## 4. Exact Commands to Run
```bash
# Navigate to project:
cd C:\Users\pranil\Documents\PD-Playground\rtl-playground

# Run automated tests in Node:
node tests/tests.js

# Run automated browser test in Microsoft Edge (requires local server on 8080):
node tests/browser_smoke_test.js

# Launch local HTTP server to run the web application:
python -m http.server 8080
# Or using Node:
npx serve .

# Then open in any browser:
# Main Application: http://localhost:8080
# In-Browser Test Runner: http://localhost:8080/tests/test_runner.html
```

## 5. Next Recommended Milestone
- Begin design of the export interface to bridge RTL Playground circuits into **STA Playground** (cell mapping and timing path extraction).
- Add support for multi-bit buses/vectors (e.g. 4-bit adders/registers).
