# PD Playground — Complete In-Repository AI-to-AI Handoff & Transfer Guide

> **Target Audience**: Incoming AI Coding Agents, Human Collaborators, and Evaluators.  
> **Release Baseline**: `v0.2.0-rc1` (Branch: `integrate/full-rtl-playground`)  
> **Verification Status**: 100% Passing (Consolidated Master Suite + 2-Hour Stress Harness Passed)  
> **Date**: October 29, 2026

---

## 1. Quick Copy-Paste Prompt for Incoming AI

When opening a new session or handing this repository off to another AI assistant (Claude, GPT-4, Antigravity, Cursor, etc.), copy and paste the prompt block below directly into the prompt box:

```markdown
You are taking over as the Lead Hardware / Software Integration Engineer for "PD Playground" (RTL Playground).

### Project Context
PD Playground is an educational RTL and digital logic platform providing interactive circuit simulation, multi-bit vector datapaths, ALUs, sequential registers, FSM design, dual-perspective Verilog generation, and browser-based verification.

### Your Active Baseline
- Dedicated Worktree: C:\Users\pranil\Documents\PD-Playground\rtl-playground-full
- Active Git Branch: integrate/full-rtl-playground
- Active Local Web Server: Running on http://localhost:8085/ (served via `node server.js`)
- Primary Documentation to read first:
  1. AGENTS.md
  2. docs/SYSTEM_ARCHITECTURE_DEEP_DIVE.md
  3. docs/TEST_COVERAGE_TRACEABILITY.md
  4. docs/HANDOFF.md
  5. docs/PROGRESS.md
  6. docs/RTL_LEARNING_COVERAGE_MATRIX.md
  7. docs/KNOWN_LIMITATIONS.md
  8. docs/FULL_RTL_INTEGRATION_REPORT.md
  9. docs/FULL_RTL_VERIFICATION_REPORT.md
  10. docs/RTL_TO_STA_BRIDGE_DESIGN.md

### Critical Constraints
1. NEVER push anything to remote GitHub repositories.
2. NEVER merge directly into the `master` branch.
3. NEVER modify the sibling project `STA Playground` (C:\Users\pranil\Documents\PD-Playground\ppawar-7-sta-playground). Keep all edits inside `rtl-playground-full`.
4. Windows PowerShell note: Direct `npm` calls can be blocked by PowerShell execution policy; always execute via `cmd /c npm <script>` or directly via `node <script_path>`.

### Verification Commands
- Consolidated Master Suite: `node tests/run_all_integrated_tests.js`
- Fundamentals Tests: `cmd /c npm test` (49 tests)
- Advanced Lab Tests: `cmd /c npm run test:advanced` (8 suites, 5,470+ assertions)
- Yosys Synthesis: `cmd /c npm run test:yosys` (17 modules)
- Icarus Verilog Simulation: `cmd /c npm run test:iverilog` (17 testbenches)
- Differential Parity: `cmd /c npm run test:differential` (106 vector checks)

Please inspect the current branch, review docs/HANDOFF.md and docs/PROGRESS.md, and confirm you understand the baseline before performing any new tasks.
```

---

## 2. Where Everything is Saved on Disk

### A. Repository Worktrees (`C:\Users\pranil\Documents\PD-Playground\`)

| Worktree Path | Branch | Description |
|:---|:---|:---|
| `C:\Users\pranil\Documents\PD-Playground\rtl-playground-full` | `integrate/full-rtl-playground` | **Primary Release Baseline Worktree**. Contains both RTL Fundamentals + Advanced RTL Lab, 24 lessons, unified navigation, server, and full test suites. |
| `C:\Users\pranil\Documents\PD-Playground\rtl-playground` | `master` | Original Phase 5 baseline repository. |
| `C:\Users\pranil\Documents\PD-Playground\rtl-playground-integration` | `integrate/phase6-stress` | Intermediate integration branch of Phase 6 and stress harness. |
| `C:\Users\pranil\Documents\PD-Playground\rtl-playground-advanced` | `feat/advanced-rtl-lab` | Original Advanced RTL Lab development branch. |
| `C:\Users\pranil\Documents\PD-Playground\ppawar-7-sta-playground` | `main` | Sibling STA Playground repository (**Read-only / Untouched**). |

### B. Core Application Source Structure (`rtl-playground-full\`)

```
rtl-playground-full/
├── index.html                     # RTL Fundamentals entry point (Canvas, gates, 16 presets)
├── server.js                      # Zero-dependency local static server (Port 8085)
├── package.json                   # Consolidated npm scripts and dependencies
├── AGENTS.md                      # Agent rules and engineering guidelines
├── advanced-lab/                  # Advanced RTL Lab sub-application
│   ├── index.html                 # Advanced Lab entry point (Datapath, Sequential, FSM, Lessons)
│   ├── app.js                     # Advanced Lab UI controller and deep-link routing
│   └── styles/advanced.css        # Advanced Lab theme and layout
├── js/                            # RTL Fundamentals JavaScript engine
│   ├── app.js                     # Fundamentals UI controller & preset loader
│   ├── circuit.js                 # Drag-and-drop circuit canvas & component renderers
│   ├── simulation.js              # Topological netlist evaluator & cycle detection
│   ├── verilog-generator.js       # Continuous (assign) & Procedural (always@) generator
│   ├── verilog-explainer.js       # Interactive 6-card RTL concept explainer
│   ├── truth-table.js             # Live truth table generation
│   ├── waveform.js                # Digital waveform trace visualizer
│   └── lessons.js                 # 12 fundamental guided lessons & validators
├── src/                           # RTL Fundamentals ES modules
│   ├── engine/                    # CircuitGraph, LogicSimulator, SequentialEngine, VerilogGenerator
│   ├── modules/                   # 16 Presets and 12 Fundamental Lessons
│   ├── ui/                        # Canvas, CircuitEditor, ComponentLibrary, Panels, TruthTable, Waveforms
│   └── styles/main.css            # Dark mode styles
├── tests/                         # All Verification Suites
│   ├── run_all_integrated_tests.js# Consolidated master test runner
│   ├── tests.js                   # Fundamentals unit tests (49 passing)
│   ├── advanced/                  # Advanced Lab test suites (8 suites, 5,470+ assertions)
│   ├── verilog_verification/      # Yosys, Icarus Verilog, and Differential test suites
│   └── stress/                    # Long-duration stress testing infrastructure
│       └── reports/run_20261029_003549/ # Complete 2-hour stress test final results
└── docs/                          # Comprehensive Engineering Reports
    ├── HANDOFF.md                 # Developer handoff notes
    ├── PROGRESS.md                # Milestone progress log
    ├── RTL_LEARNING_COVERAGE_MATRIX.md # 38-topic curriculum audit matrix
    ├── KNOWN_LIMITATIONS.md       # Modeling approximations and architectural boundaries
    ├── FULL_RTL_INTEGRATION_REPORT.md # Technical integration architecture
    ├── FULL_RTL_VERIFICATION_REPORT.md# Detailed verification logs
    ├── FULL_RTL_RELEASE_CHECKLIST.md  # 24-point signoff matrix
    ├── RTL_TO_STA_BRIDGE_DESIGN.md    # Phase 7 bridge architecture specification
    └── screenshots/               # High-resolution screenshots of Journeys A–F
```

---

## 3. How to Run the Application & Tests

### Launching the Web Server
From `C:\Users\pranil\Documents\PD-Playground\rtl-playground-full`:
```powershell
node server.js
```
The server binds to port **8085**:
- Full Hub: [http://localhost:8085/](http://localhost:8085/)
- RTL Fundamentals: [http://localhost:8085/index.html](http://localhost:8085/index.html)
- Advanced RTL Lab: [http://localhost:8085/advanced-lab/index.html](http://localhost:8085/advanced-lab/index.html)
- Datapath Tab: [http://localhost:8085/advanced-lab/index.html?tab=datapath](http://localhost:8085/advanced-lab/index.html?tab=datapath)
- Sequential Tab: [http://localhost:8085/advanced-lab/index.html?tab=sequential](http://localhost:8085/advanced-lab/index.html?tab=sequential)
- FSM Tab: [http://localhost:8085/advanced-lab/index.html?tab=fsm](http://localhost:8085/advanced-lab/index.html?tab=fsm)
- Curriculum Tab: [http://localhost:8085/advanced-lab/index.html?tab=lessons](http://localhost:8085/advanced-lab/index.html?tab=lessons)

### Running Verification Tests

```powershell
# 1. Consolidated Master Test Suite (Runs all core suites sequentially)
node tests/run_all_integrated_tests.js

# 2. RTL Fundamentals Unit Tests (49 tests)
cmd /c npm test

# 3. Advanced RTL Lab Unit Suites (8 suites, 5,470+ assertions)
cmd /c npm run test:advanced

# 4. YoWASP Yosys Hardware Synthesis Checks (17 modules)
cmd /c npm run test:yosys

# 5. Icarus Verilog WASM Event Simulation Testbenches (17 testbenches)
cmd /c npm run test:iverilog

# 6. Cross-Engine Differential Parity (106 checks)
cmd /c npm run test:differential

# 7. Cross-Navigation Smoke Test
node tests/cross_navigation_smoke_test.js
```

---

## 4. Verification Closure Scorecard

| Test Suite | Implementation | Assertions / Modules | Result | Status |
|:---|:---|:---|:---|:---|
| **Consolidated Master** | Sequential orchestrator | 5 suites | 5 / 5 passed | 🟢 100% |
| **Fundamentals Unit** | Node `node:test` | 49 tests | 49 / 49 passed | 🟢 100% |
| **Advanced Lab Suites** | Vector, Datapath, Sequential, FSM, Security | 8 suites (5,470+ assertions) | 8 / 8 passed | 🟢 100% |
| **Yosys Synthesis** | YoWASP Yosys (WASM) | 17 modules | 17 / 17 passed | 🟢 100% |
| **Icarus Verilog Sim** | `@veriflow/iverilog-wasm` | 17 self-checking TBs | 17 / 17 passed | 🟢 100% |
| **Differential Parity** | JS Sim vs Verilog vectors | 106 vector checks | 106 / 106 passed | 🟢 100% |
| **Cross-Portal Navigation** | URL deep-links | 6 transitions | 6 / 6 passed | 🟢 100% |
| **Headless Browser CDP** | Microsoft Edge DevTools | 56 automated checks | 56 / 56 passed | 🟢 100% |
| **2-Hour Autonomous Stress** | Automated Random Harness | 129,494 batches / 453k circuits | 0 errors / 0 leaks | 🟢 100% |

---

## 5. Potential Future Work (Phase 7 & Beyond)

1. **Phase 7: RTL-to-STA Playground Bridge**:
   - The full design specification is complete at `docs/RTL_TO_STA_BRIDGE_DESIGN.md`.
   - Planned capabilities: Export synthesizable gate-level Verilog and Liberty timing constraints directly into the sibling `ppawar-7-sta-playground` for static timing analysis and setup/hold Slack calculation.
2. **Phase 8: Multi-Bit Bus Schematic Rendering**:
   - Extend the visual schematic canvas from 1-bit logic gates to render multi-bit vector bus wires (slanted hash marks with bit widths like `[7:0]`).
3. **Phase 9: VCD Waveform Export**:
   - Provide standard `.vcd` file downloads from the waveform viewer for inspection in GTKWave or external EDA viewers.
