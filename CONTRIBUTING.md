# Contributing to PD Playground (RTL Playground)

Thank you for your interest in contributing to **PD Playground**! This project is an open-source educational platform engineered to teach students and VLSI beginners digital logic design and Register-Transfer Level (RTL) modeling in Verilog.

---

## 1. Code of Conduct

Please help maintain a welcoming, respectful, and constructive environment for all learners, educators, and contributors.

---

## 2. Core Architectural Principles

When contributing code, please keep these non-negotiable principles in mind:

1. **Zero Runtime Frameworks / Pure Vanilla Web Standards**:
   - The user-facing application (`index.html` and `advanced-lab/index.html`) requires **zero build tools** and **zero Node.js dependencies** to run.
   - All code is written in standard ES modules (`import`/`export`), modern CSS, and SVG/Canvas APIs.
2. **Zero DOM Dependencies in Simulation Engines**:
   - Every file in `src/engine/` and `advanced-lab/engine/` must be pure JavaScript without references to `document`, `window`, or browser globals.
   - Engines must remain 100% testable in headless Node.js.
3. **Rigorous Hardware Correctness**:
   - Generated Verilog must be standards-compliant (IEEE 1364-2001) and synthesizable without unintended latches.
   - Behavior must match standard digital ASIC conventions (e.g., synchronous reset strictly overrides clock enable).
4. **Zero-Eval Security**:
   - Never use `eval()`, `new Function()`, or unsanitized `innerHTML`. Condition parsing must use safe AST tokenizers.

---

## 3. Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher.
- A modern web browser (Edge, Chrome, Firefox, or Safari).

### Local Installation
```bash
# Clone repository
git clone https://github.com/ppawar-7/rtl-playground.git
cd rtl-playground

# Install verification developer dependencies (YoWASP Yosys and Icarus Verilog WASM)
npm install
```

### Running Locally
Because modern browsers restrict ES module loading from `file://` URLs, serve via any static HTTP server:
```bash
# Using Node static server:
node server.js
# Then open http://localhost:8085

# Or using Python:
python -m http.server 8085
```

---

## 4. Running Verification & Tests

Always run the full regression test suite before submitting a pull request:

```bash
# 1. Single-Bit RTL Fundamentals Unit Tests
npm test

# 2. Multi-Bit Advanced RTL Lab Unit & Property Tests
npm run test:advanced

# 3. YoWASP Yosys Synthesis AST & Elaboration Checks
npm run test:yosys

# 4. Icarus Verilog Functional Simulations
npm run test:iverilog

# 5. Differential Equivalence Checks (JS Engine vs Compiled Verilog)
npm run test:differential

# 6. Master Consolidated Test Runner
npm run test:all

# 7. GitHub Pages Subpath Deployment Audit
npm run test:subpath

# 8. Cross-Platform Navigation & Deep Links
npm run test:e2e
```

---

## 5. Submitting Changes

1. Fork the repository and create a feature branch (`git checkout -b feat/your-feature`).
2. Implement your changes following existing code style.
3. Add corresponding unit or regression tests.
4. Verify all tests pass cleanly (`npm run test:all`).
5. Commit with a clear, descriptive message (`git commit -m "feat(alu): add support for barrel shifter"`).
6. Open a Pull Request against `main`.
