# RTL Playground — Automated Stress Testing Suite

Autonomous, deterministic, long-duration stress testing infrastructure for RTL Playground.

---

## 1. Overview & Verification Scope

The stress testing harness provides continuous, independent validation of digital logic simulation, sequential state transitions, synthesizable Verilog generation, and browser UI interaction:

1. **Randomized Digital Circuit Generation**: Synthesizes valid combinational DAGs with multi-level logic and wide fan-out.
2. **Thousands of Boolean Logic Simulations**: Tests random input vectors and full truth tables for up to $2^N$ combinations.
3. **Truth Table Verification against Independent Reference**: Independent bitwise reference evaluator verifying zero-delay Boolean logic and three-valued logic (`0`, `1`, `null`).
4. **All Core Logic Primitives**: Complete coverage of `AND`, `OR`, `NOT`, `XOR`, `NAND`, `NOR`, `XNOR`, and `MUX2` gates.
5. **Cycle Detection & Topology Violations**: Validates rejection of combinational feedback loops, multiple drivers on pins, self-connections, and unconnected clocks.
6. **Randomized DFF & Clock Edge Sequences**: Verifies positive-edge clock triggers and state retention on falling edges.
7. **Simultaneous Register Updates & Sequential Feedback**: Nonblocking DFF semantics (all D pins sampled before Q updates) across shift registers, toggle flip-flops, LFSRs, clock enables, and synchronous resets.
8. **Serialization Round-Trip Consistency**: JSON serialization and deserialization invariance.
9. **Simulation Consistency Pre/Post-Serialization**: Bit-for-bit behavioral equality before and after deserialization.
10. **Verilog HDL Synthesizability & Yosys Verification**: WebAssembly Yosys verification pipeline (`read_verilog`, `hierarchy -check`, `proc`, `opt`, `check -assert`, `stat`).
11. **Performance & Memory Scaling**: Memory leak detection and throughput benchmarking across circuits up to 500+ components.
12. **Repeated Browser CDP Smoke Testing**: Automated UI interaction in headless Microsoft Edge via Chrome DevTools Protocol (CDP).

---

## 2. Test Execution Commands

Run commands from the repository root:

### Quick Smoke Test (5 Minutes)
```bash
node tests/stress/stress_runner.js --mode=smoke
# or with explicit duration:
node tests/stress/stress_runner.js --duration=5m
```

### Intermediate Run (30 Minutes)
```bash
node tests/stress/stress_runner.js --duration=30m
```

### Full Long-Duration Run (2 Hours, Default)
```bash
node tests/stress/stress_runner.js --duration=2h
```

### Headless / CI Execution (No Browser UI passes)
```bash
node tests/stress/stress_runner.js --duration=30m --no-browser
```

### Configurable Parameters
- `--duration=<time>`: Duration string (e.g. `10m`, `30m`, `2h`, `7200s`). Default: `2h`.
- `--seed=<number>`: Base random seed for PRNG. Default: `424242`.
- `--yield-ms=<ms>`: Cooperative sleep between batches to throttle CPU usage (default: `30`ms).
- `--report-dir=<path>`: Custom output directory for reports and logs.
- `--no-browser`: Disables headless Edge CDP browser UI passes.

---

## 3. Failure Reproduction Instructions

Every failed test batch records its exact deterministic random seed in `stress_run.log`, `progress_snapshot.json`, and `final_report.json`.

To reproduce any failure in isolation with verbose diagnostic output:

```bash
# Combinational truth table mismatch:
node tests/stress/reproduce.js --seed=<seed> --category=combinational

# Sequential DFF timing or simultaneous sampling mismatch:
node tests/stress/reproduce.js --seed=<seed> --category=sequential

# Verilog generation or Yosys compilation failure:
node tests/stress/reproduce.js --seed=<seed> --category=verilog

# Topology rejection or cycle detection failure:
node tests/stress/reproduce.js --seed=<seed> --category=invalid

# Serialization / deserialization round-trip mismatch:
node tests/stress/reproduce.js --seed=<seed> --category=serialization

# Complexity scaling benchmark:
node tests/stress/reproduce.js --seed=<seed> --category=scale
```

---

## 4. Reports and Progress Snapshots

All runs write structured, machine-readable, and human-readable reports to a timestamped folder under `tests/stress/reports/run_<timestamp>/`:

- `stress_run.log`: Full timestamped execution stream.
- `progress_snapshot.json`: Written periodically (approximately every 10 minutes) with current throughput, heap memory, passed/failed counts, and remaining time.
- `PID.txt`: The operating system process ID of the running job.
- `final_report.json`: Machine-readable results containing batch counts, failure rates, gate coverage, throughput, memory curve, and failure seeds.
- `SUMMARY.md`: Formatted Markdown summary suitable for audit and project documentation.

All generated reports under `tests/stress/reports/` are excluded from version control.

---

## 5. Rerunning Tests Against Future Commits (Phase 6 & Beyond)

When new features are developed (such as Phase 6 multi-bit vector support or STA Playground bridge exporter), rerun the stress test suite against the new commit:

```bash
# 1. Ensure working tree is clean or checkout the target commit:
git checkout <target-commit-or-branch>

# 2. Run the 5-minute smoke test first:
node tests/stress/stress_runner.js --duration=5m

# 3. If smoke test passes, launch full stress run:
node tests/stress/stress_runner.js --duration=2h
```

---

## 6. Architecture & File Structure

```
tests/stress/
├── README.md               # This documentation
├── .gitignore              # Ignores reports/ directory
├── prng.js                 # Deterministic Mulberry32 PRNG
├── reference_evaluator.js  # Independent mathematical Boolean & sequential model
├── circuit_generator.js    # Circuit synthesizer (valid, invalid, sequential, scaled)
├── verilog_checker.js      # Verilog syntax & WebAssembly Yosys verification
├── browser_ui_worker.js    # Headless Edge CDP browser smoke tester
├── perf_tracker.js         # Memory, throughput, and complexity monitor
├── test_suites.js          # Modular test case implementations
├── reproduce.js            # Standalone single-failure reproducer CLI
└── stress_runner.js        # Main long-duration autonomous orchestrator
```

---

## 7. Non-Destructive Integration

This stress harness resides purely within `tests/stress/` and does not alter any production code in `src/` or `index.html`. It can be merged cleanly into `master` or any future development branch without causing merge conflicts.
