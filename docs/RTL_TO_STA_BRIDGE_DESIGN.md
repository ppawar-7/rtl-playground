# RTL-to-STA Architectural Bridge Design Specification

**Document Version:** 1.0.0  
**Status:** Approved Architectural Proposal  
**Context:** *PD Playground: An Interactive Learning Tool for ASIC Physical Design*  
**Related Repositories:**  
- RTL Playground (`rtl-playground`)
- STA Playground (`https://github.com/ppawar-7/sta-playground`)

---

## 1. Executive Summary & Purpose

The **PD Playground** suite aims to provide an end-to-end educational journey through digital ASIC implementation. Students begin at front-end logic entry (RTL and schematic construction), proceed through static timing analysis (STA), and eventually progress to floorplanning, placement, and routing.

Currently, **RTL Playground** and **STA Playground** exist as independent, self-contained educational applications.
- **RTL Playground** focuses on Boolean behavior, gate topology, state retention, clock edge stepping, and synthesizable Verilog HDL generation.
- **STA Playground** focuses on static timing analysis, arrival/required times, slack calculation ($Slack = RAT - AT$), setup/hold constraints, and critical path identification.

This document specifies the concrete architectural bridge that connects the two platforms. The bridge translates an RTL Playground schematic netlist into an annotated timing graph consumable by STA Playground, allowing students to observe how functional circuits translate into real-world physical timing constraints.

```
┌────────────────────────┐         Bridge Export          ┌────────────────────────┐
│     RTL Playground     │  ────────────────────────────► │     STA Playground     │
│                        │     Structured JSON Schema     │                        │
│ • Gate-level Schematic │                                │ • Static Timing Graph  │
│ • Synthesizable HDL    │                                │ • Cell Delay Models    │
│ • Boolean Truth Tables │                                │ • Setup/Hold Slacks    │
│ • Ideal Step Waveforms │                                │ • Critical Path Report │
└────────────────────────┘                                └────────────────────────┘
```

---

## 2. Graph Model Mapping

RTL Playground and STA Playground operate on graph data structures optimized for different engineering objectives.

| Aspect | RTL Playground Graph | STA Playground Timing Graph |
| :--- | :--- | :--- |
| **Primary Unit** | Components (`INPUT`, `GATE`, `DFF`, `OUTPUT`) | Timing Cells (`INVX1`, `AND2X1`, `DFFX1`) and Timing Pins |
| **Edges** | Directed functional wires | Directed timing arcs (gate delay arcs and interconnect net arcs) |
| **Signal Domain** | Discrete Boolean logic $\{0, 1, \text{null}\}$ | Continuous time (picoseconds $\text{ps}$ or nanoseconds $\text{ns}$) |
| **Clock Representation** | Input component generating toggling $0 \leftrightarrow 1$ | Clock object defining period $T_{\text{clk}}$, uncertainty, and rise/fall edges |
| **Sequential Break** | DFF outputs decouple combinational loops | DFF pins split paths into Launch ($CLK \to Q$) and Capture ($D \to CLK$) |

### 2.1 Component-to-Cell Translation

RTL Playground's idealized components are mapped to physical standard cell library equivalents:

```
RTL Component (Graph Node)
 ├── id: "and_1", type: "AND", label: "AND"
 ├── inputs: [in0, in1]
 └── outputs: [out0]
        │
        ▼ Technology Mapping (Liberty Cell Binding)
STA Instance (Timing Cell)
 ├── instance_name: "U_and_1"
 ├── cell_type: "AND2X1"
 ├── pins: [A, B, Y]
 └── timing_arcs:
      ├── A -> Y (propagation delay t_pd)
      └── B -> Y (propagation delay t_pd)
```

---

## 3. Technology Library & Delay Modeling

Because RTL Playground simulates idealized digital logic without propagation delay, the bridge must annotate the netlist with realistic physical timing parameters before delivering it to STA Playground.

### 3.1 Standard Cell Model (Nominal 65nm / 45nm Educational Library)

> [!IMPORTANT]
> **Pedagogical Disclaimer — Illustrative Delay Approximations:**
> The delay metrics ($t_{\text{pd}}$, $t_{\text{cq}}$, $t_{\text{setup}}$, $t_{\text{hold}}$) and input capacitances ($C_{\text{in}}$) tabulated below are **simplified educational approximations** modeled after generic nominal 65nm/45nm planar CMOS standard cell characteristics. They are intended strictly for teaching arrival time, required time, and slack concepts.
> 
> They are **NOT** foundry-characterized, silicon-calibrated sign-off library data (such as TSMC, Intel, or GlobalFoundries NLDM/CCS Liberty files). Real nanometer standard cell delays are highly nonlinear functions of input transition time (slew), capacitive load, power supply voltage droop, operating temperature, and process corner variations ($PVT$).

The bridge provides a standard cell library descriptor defining nominal delays ($t_{\text{nom}}$), input capacitance ($C_{\text{in}}$), output drive resistance ($R_{\text{drive}}$), and flip-flop setup/hold margins:

| Generic Component | Standard Cell Name | Delay Metric | Nominal Value | Input Cap ($C_{\text{in}}$) |
| :--- | :--- | :--- | :--- | :--- |
| **NOT** | `INVX1` | $t_{\text{pd}}$ | $25\text{ ps}$ | $0.9\text{ fF}$ |
| **NAND** | `NAND2X1` | $t_{\text{pd}}$ | $35\text{ ps}$ | $1.0\text{ fF}$ |
| **NOR** | `NOR2X1` | $t_{\text{pd}}$ | $40\text{ ps}$ | $1.1\text{ fF}$ |
| **AND** | `AND2X1` | $t_{\text{pd}}$ | $45\text{ ps}$ | $1.2\text{ fF}$ |
| **OR** | `OR2X1` | $t_{\text{pd}}$ | $50\text{ ps}$ | $1.1\text{ fF}$ |
| **XOR** | `XOR2X1` | $t_{\text{pd}}$ | $65\text{ ps}$ | $1.8\text{ fF}$ |
| **XNOR** | `XNOR2X1` | $t_{\text{pd}}$ | $60\text{ ps}$ | $1.7\text{ fF}$ |
| **MUX2** | `MUX2X1` | $t_{\text{pd, data}}$<br>$t_{\text{pd, sel}}$ | $55\text{ ps}$<br>$70\text{ ps}$ | $1.4\text{ fF}$<br>$1.8\text{ fF}$ |
| **DFF** | `DFFX1` | $t_{\text{cq}}$<br>$t_{\text{setup}}$<br>$t_{\text{hold}}$ | $60\text{ ps}$<br>$35\text{ ps}$<br>$15\text{ ps}$ | $C_{\text{clk}} = 2.0\text{ fF}$<br>$C_D = 1.2\text{ fF}$ |

### 3.2 Interconnect & Load Capacitance Approximation

In pre-layout design (before physical placement and routing), wire delays are estimated using a lump-sum wire load model (WLM) based on pin fanout:

$$C_{\text{load}} = C_{\text{wire}}(N_{\text{fanout}}) + \sum_{k=1}^{N_{\text{fanout}}} C_{\text{in}, k}$$

$$t_{\text{stage}} = t_{\text{intrinsic}} + R_{\text{drive}} \times C_{\text{load}}$$

For educational simplicity in v1, STA Playground supports a toggle between:
1. **Nominal Delay Mode**: Delays are fixed to the cell's nominal intrinsic delay.
2. **Load-Dependent Mode**: Propagation delay increases proportionally with output fanout.

---

## 4. Timing Path Classification

The bridge automatically traverses the RTL Playground graph and partitions it into the **four canonical digital timing path groups**:

```
           ┌──────────────────────┐
           │     Register DFF1    │ (Launch Flip-Flop)
           │      CLK ──► Q       │
           └──────────┬───────────┘
                      │
                      ▼ Path 1: Reg-to-Reg
            [ Combinational Cloud ]
                      │
                      ▼
           ┌──────────────────────┐
           │     Register DFF2    │ (Capture Flip-Flop)
           │      D ──► CLK       │
           └──────────────────────┘

  Path 2: In-to-Reg   ──► Primary Input ──► [Logic] ──► DFF Capture (D)
  Path 3: Reg-to-Out  ──► DFF Launch (Q) ──► [Logic] ──► Primary Output
  Path 4: In-to-Out   ──► Primary Input ──► [Logic] ──► Primary Output
```

### 4.1 Path Formulation & Equations

1. **Register-to-Register (Reg-to-Reg)**:
   - Data Arrival Time: $AT = T_{\text{launch\_clk}} + t_{\text{cq}} + t_{\text{combo}}$
   - Required Arrival Time: $RAT = T_{\text{capture\_clk}} + T_{\text{period}} - t_{\text{setup}} - t_{\text{uncertainty}}$
   - Setup Slack: $Slack_{\text{setup}} = RAT - AT$
   - Hold Slack: $Slack_{\text{hold}} = (T_{\text{launch\_clk}} + t_{\text{cq}} + t_{\text{combo\_min}}) - (T_{\text{capture\_clk}} + t_{\text{hold}})$

2. **Input-to-Register (In-to-Reg)**:
   - Constrained by primary input arrival time (`set_input_delay`).
   - Models external upstream chip/package transmission delays.

3. **Register-to-Output (Reg-to-Out)**:
   - Constrained by downstream setup requirement (`set_output_delay`).

4. **Input-to-Output (In-to-Out)**:
   - Pure combinational path across the entire module.

---

## 5. Synopsys Design Constraints (SDC) Mapping

The bridge synthesizes an SDC timing constraint header based on the clock components present in RTL Playground:

```tcl
# Automatically Generated SDC Constraints from RTL Playground
current_design digital_circuit

# Primary Clock Definitions
create_clock -name clk -period 1.000 -waveform {0.000 0.500} [get_ports clk]
set_clock_uncertainty 0.050 [get_clocks clk]
set_clock_transition 0.020 [get_clocks clk]

# Primary I/O Constraints (Default 20% of cycle for external budget)
set_input_delay -clock clk -max 0.200 [get_ports {a b sel}]
set_input_delay -clock clk -min 0.050 [get_ports {a b sel}]

set_output_delay -clock clk -max 0.150 [get_ports {y sum carry q}]
set_output_delay -clock clk -min 0.020 [get_ports {y sum carry q}]

# Output Capacitive Loads (10 fF standard pad load)
set_load 0.010 [all_outputs]
```

---

## 6. Bridge Exchange JSON Specification (`rtl_to_sta.v1.json`)

The bridge data format is defined below as a strict JSON schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PDPlayground_RTL_to_STA_Transfer",
  "type": "object",
  "required": ["version", "metadata", "clocks", "cells", "nets", "constraints"],
  "properties": {
    "version": {
      "type": "string",
      "enum": ["1.0.0"]
    },
    "metadata": {
      "type": "object",
      "properties": {
        "designName": { "type": "string" },
        "generatedAt": { "type": "string" },
        "sourceTool": { "type": "string", "enum": ["RTL Playground"] },
        "technologyNode": { "type": "string", "default": "educational_65nm" }
      }
    },
    "clocks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "portId": { "type": "string" },
          "period_ns": { "type": "number" },
          "uncertainty_ns": { "type": "number" }
        }
      }
    },
    "cells": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "cellType": { "type": "string" },
          "isSequential": { "type": "boolean" },
          "timingParameters": {
            "type": "object",
            "properties": {
              "t_pd_ps": { "type": "number" },
              "t_cq_ps": { "type": "number" },
              "t_setup_ps": { "type": "number" },
              "t_hold_ps": { "type": "number" }
            }
          }
        }
      }
    },
    "nets": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "driver": { "type": "string" },
          "loads": { "type": "array", "items": { "type": "string" } },
          "fanout": { "type": "integer" },
          "estimatedCap_fF": { "type": "number" }
        }
      }
    },
    "constraints": {
      "type": "object",
      "properties": {
        "clockPeriod_ns": { "type": "number" },
        "inputDelay_ns": { "type": "number" },
        "outputDelay_ns": { "type": "number" }
      }
    }
  }
}
```

### 6.1 Concrete Example: 1-Bit Half Adder Translation

```json
{
  "version": "1.0.0",
  "metadata": {
    "designName": "half_adder",
    "generatedAt": "2026-10-29T00:00:00Z",
    "sourceTool": "RTL Playground",
    "technologyNode": "educational_65nm"
  },
  "clocks": [],
  "cells": [
    {
      "id": "xor_1",
      "label": "XOR",
      "cellType": "XOR2X1",
      "isSequential": false,
      "timingParameters": { "t_pd_ps": 65.0 }
    },
    {
      "id": "and_1",
      "label": "AND",
      "cellType": "AND2X1",
      "isSequential": false,
      "timingParameters": { "t_pd_ps": 45.0 }
    }
  ],
  "nets": [
    {
      "id": "net_a",
      "driver": "inp_a.out0",
      "loads": ["xor_1.in0", "and_1.in0"],
      "fanout": 2,
      "estimatedCap_fF": 3.0
    },
    {
      "id": "net_b",
      "driver": "inp_b.out0",
      "loads": ["xor_1.in1", "and_1.in1"],
      "fanout": 2,
      "estimatedCap_fF": 3.0
    },
    {
      "id": "net_sum",
      "driver": "xor_1.out0",
      "loads": ["out_sum.in0"],
      "fanout": 1,
      "estimatedCap_fF": 10.0
    },
    {
      "id": "net_carry",
      "driver": "and_1.out0",
      "loads": ["out_carry.in0"],
      "fanout": 1,
      "estimatedCap_fF": 10.0
    }
  ],
  "constraints": {
    "clockPeriod_ns": 1.0,
    "inputDelay_ns": 0.1,
    "outputDelay_ns": 0.1
  }
}
```

---

## 7. Educational User Experience (Student Journey)

The student experience transitioning between RTL Playground and STA Playground is designed to demystify how digital logic synthesis bridges into physical timing closure:

```
[ Step 1: RTL Playground ]
Student designs circuit (e.g., 2:1 MUX or Pipelined Shift Register)
Verifies functional truth table and clock-edge waveform transitions.
       │
       ▼ Click "Analyze in STA Playground"
[ Step 2: Educational Bridge Modal ]
Modal explains the physical translation:
"Translating 6 schematic gates into standard cell instances (AND2X1, DFFX1)..."
"Annotating intrinsic cell propagation delays and pin capacitances..."
"Extracting 4 timing paths: 2 Reg-to-Reg, 2 In-to-Reg..."
       │
       ▼ Click "Open in STA Playground"
[ Step 3: STA Playground ]
Loads identical circuit topology.
Displays timing arcs, arrival times, required times, and slack badges.
Students can now adjust the clock frequency (e.g. from 1.0 GHz to 2.5 GHz)
and watch setup slack go negative (timing violation)!
```

---

## 8. Implementation Strategy (Future Milestones)

> [!WARNING]
> **Strict Repository Isolation & Two-Sided Engineering Requirement:**
> The existing STA Playground repository (`ppawar-7/sta-playground`) is currently **protected and strictly read-only** ("Do not modify, refactor, or break my existing STA project").
> 
> STA Playground currently has its own internal graph model and circuit presets. It **does not yet possess** an ingestion endpoint or importer for external JSON schemas. Therefore, the bridge **cannot** operate out-of-the-box with "zero changes" in STA Playground. End-to-end operation requires two coordinated engineering deliverables:
> 1. An **Exporter** in RTL Playground (`src/bridge/sta_exporter.js`) to generate the valid exchange schema.
> 2. An **Importer Adapter** in STA Playground to parse the schema and map it into STA's internal timing data structures.
> 
> Development of the bridge should only proceed when authorized to implement the importer inside STA Playground.

When ready to implement this bridge, the recommended engineering steps are:
1. **Module `src/bridge/sta_exporter.js` in RTL Playground**:
   - Implements graph traversal, technology cell binding, and strict JSON validation.
2. **"Analyze in STA Playground" UI Trigger in Top Header**:
   - Adds export button and educational explanation modal in `index.html`.
3. **Cross-Origin / LocalStorage Bridge Protocol**:
   - Stores schema payload in `localStorage.setItem('pd_bridge_circuit', json)` and launches STA Playground with URL param `?source=rtl_playground`.
4. **Ingestion Adapter in STA Playground (Separate Dedicated Effort)**:
   - Develops an ingestion adapter inside `sta-playground` to deserialize `pd_bridge_circuit` and build the native timing graph.

---

*This specification completes Step 6 of Phase 5.*
