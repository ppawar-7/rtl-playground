# PD Playground — Advanced RTL Lab: Implementation Plan

## Overview
The Advanced RTL Lab is an interactive educational module of the PD Playground capstone project. While the base RTL Playground focuses on single-bit gate-level Boolean logic and basic D flip-flops, the Advanced RTL Lab extends the scope into multi-bit datapaths, arithmetic units (Ripple-Carry Adder, Educational ALU), sequential registers (multi-bit registers with clock enable and synchronous reset), counters (up/down/modulo), shift registers (SISO, SIPO, PISO), deterministic Finite State Machines (Moore and Mealy), synthesizable Verilog HDL generation, and guided interactive lessons.

## Architectural Boundaries
- **Worktree**: `C:\Users\pranil\Documents\PD-Playground\rtl-playground-advanced`
- **Branch**: `feat/advanced-rtl-lab` derived from Phase 5 baseline `f9c6d7b83a42ff62438e4013417cd18a38f59761`
- **Module Directory**: `advanced-lab/`
- **Engine Layer**: `advanced-lab/engine/` (Zero DOM dependencies, fully testable in Node.js)
- **UI Layer**: `advanced-lab/ui/` (DOM, SVG, Canvas)
- **Curriculum Layer**: `advanced-lab/lessons/`
- **Test Suite**: `tests/advanced/`
- **Documentation**: `docs/advanced/`

## Phase Roadmap
1. **Phase A**: Multi-Bit Signals and Vector Engine (`vector_model.js`, bitwise, slicing, concatenation, width checks)
2. **Phase B**: Arithmetic & Datapath Playground (Half/Full adders, Ripple-Carry Adder, Educational ALU, flags, Verilog)
3. **Phase C**: Registers, Counters, and Sequential Datapaths (Multi-bit registers, Up/Down/Modulo counters, Shift registers, bus waveforms)
4. **Phase D**: Finite State Machine Playground (Deterministic FSM model, Moore/Mealy outputs, state editor, synthesizable FSM Verilog)
5. **Phase E**: Advanced RTL Educational Curriculum (10 interactive lessons, behavioral validation, local storage progress)
6. **Phase F**: Verification & Hardening (Unit tests, property-based randomized tests, Yosys synthesis, headless Edge CDP browser test)
7. **Phase G**: Documentation & Integration Proposal (Progress, handoff, decisions, verification report, future integration blueprint)
