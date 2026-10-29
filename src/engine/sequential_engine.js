/**
 * sequential_engine.js — Clock and flip-flop state machine
 * 
 * Manages clock toggling and positive-edge-triggered D flip-flop behavior.
 * On a rising edge, ALL DFFs sample their D inputs simultaneously (using
 * pre-edge values), then ALL Q outputs update. Combinational logic is
 * re-evaluated after Q updates.
 * 
 * ZERO DOM dependencies. Testable in Node.js.
 * 
 * @module SequentialEngine
 */

import { COMPONENT_TYPES } from './circuit_graph.js';

export class SequentialEngine {
    /**
     * @param {import('./circuit_graph.js').CircuitGraph} graph
     * @param {import('./logic_simulator.js').LogicSimulator} simulator
     */
    constructor(graph, simulator) {
        this.graph = graph;
        this.simulator = simulator;
        this.clockState = 0;
        this.stepCount = 0;
        /** @type {Map<string, { Q: number|null }>} componentId → state */
        this.dffStates = new Map();
        /** @type {Array<object>} Waveform history snapshots */
        this.waveformHistory = [];
        /** @type {number} Max waveform steps to keep */
        this.maxHistoryLength = 64;
    }

    /**
     * Initialize or re-initialize all DFF states.
     * Called when the circuit changes (components added/removed).
     */
    initializeDFFs() {
        const dffs = this.graph.getDFFComponents();
        // Remove stale entries
        for (const id of this.dffStates.keys()) {
            if (!this.graph.getComponent(id)) {
                this.dffStates.delete(id);
            }
        }
        // Add new entries (preserve existing state)
        for (const dff of dffs) {
            if (!this.dffStates.has(dff.id)) {
                this.dffStates.set(dff.id, { Q: 0 });
                // Set initial Q output
                dff.outputs[0].value = 0;
            }
        }
    }

    /**
     * Toggle the clock one step (one half-cycle).
     * On rising edge (0→1): sample all D inputs, then update all Q outputs.
     * On falling edge (1→0): no DFF state change.
     * After each toggle: re-evaluate combinational logic.
     * 
     * @returns {{ ok: boolean, risingEdge: boolean, error?: string }}
     */
    clockStep() {
        this.initializeDFFs();

        const prevClock = this.clockState;
        this.clockState = this.clockState ^ 1;

        // Update all CLOCK component outputs
        for (const clk of this.graph.getClockComponents()) {
            clk.outputs[0].value = this.clockState;
        }

        let risingEdge = false;

        // Rising edge: 0 → 1
        if (prevClock === 0 && this.clockState === 1) {
            risingEdge = true;
            this._processRisingEdge();
        }

        // Re-evaluate combinational logic with new Q values and clock state
        this.simulator.evaluate();

        // Record waveform snapshot
        this._recordSnapshot();
        this.stepCount++;

        return { ok: true, risingEdge };
    }

    /**
     * Process a rising clock edge.
     * CRITICAL: All DFFs sample D simultaneously BEFORE any Q updates.
     * @private
     */
    _processRisingEdge() {
        const dffs = this.graph.getDFFComponents();

        // Phase 1: Sample all D inputs (using current/pre-edge values)
        const sampledD = new Map();
        for (const dff of dffs) {
            const dPin = dff.inputs[0]; // D input
            let dValue;
            if (dPin.connectedTo) {
                dValue = this.graph.getPinValue(dPin.connectedTo);
            } else {
                dValue = null; // Unconnected D → null (not silently retaining old Q)
            }
            sampledD.set(dff.id, dValue);
        }

        // Phase 2: Update all Q outputs simultaneously
        for (const dff of dffs) {
            const dValue = sampledD.get(dff.id);
            const state = this.dffStates.get(dff.id);
            if (state) {
                // If D is null (unconnected), Q becomes null — visible undefined state
                state.Q = dValue;
                dff.outputs[0].value = dValue;
            }
        }
    }

    /**
     * Record a waveform snapshot of the current state.
     * @private
     */
    _recordSnapshot() {
        const snapshot = {
            step: this.stepCount,
            clock: this.clockState,
            signals: {}
        };

        // Record DFF signals
        for (const dff of this.graph.getDFFComponents()) {
            const dPin = dff.inputs[0];
            const dValue = dPin.connectedTo
                ? this.graph.getPinValue(dPin.connectedTo)
                : null;

            snapshot.signals[dff.id] = {
                label: dff.label,
                type: 'DFF',
                D: dValue,
                Q: this.dffStates.get(dff.id)?.Q ?? null
            };
        }

        // Record INPUT values
        for (const inp of this.graph.getInputComponents()) {
            snapshot.signals[inp.id] = {
                label: inp.label,
                type: 'INPUT',
                value: inp.outputs[0].value
            };
        }

        // Record OUTPUT values
        for (const out of this.graph.getOutputComponents()) {
            snapshot.signals[out.id] = {
                label: out.label,
                type: 'OUTPUT',
                value: out.inputs[0].value
            };
        }

        this.waveformHistory.push(snapshot);

        // Trim history if too long
        if (this.waveformHistory.length > this.maxHistoryLength) {
            this.waveformHistory.shift();
        }
    }

    /**
     * Reset all sequential state.
     */
    reset() {
        this.clockState = 0;
        this.stepCount = 0;
        this.waveformHistory = [];

        // Reset all CLOCK outputs
        for (const clk of this.graph.getClockComponents()) {
            clk.outputs[0].value = 0;
        }

        // Reset all DFF states to 0
        for (const [id, state] of this.dffStates) {
            state.Q = 0;
            const dff = this.graph.getComponent(id);
            if (dff) {
                dff.outputs[0].value = 0;
            }
        }

        this.dffStates.clear();

        // Re-evaluate combinational logic
        this.simulator.evaluate();
    }

    /**
     * Get current DFF state.
     * @param {string} dffId
     * @returns {{ Q: number|null }|null}
     */
    getDFFState(dffId) {
        return this.dffStates.get(dffId) || null;
    }

    /**
     * Get the waveform history.
     * @returns {Array<object>}
     */
    getWaveformHistory() {
        return this.waveformHistory;
    }
}
