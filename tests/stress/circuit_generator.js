/**
 * circuit_generator.js — Deterministic Digital Circuit Generator
 * 
 * Synthesizes valid and invalid digital circuits for stress testing:
 * - Combinational DAGs with various gate types and fan-outs
 * - Sequential circuits (DFF pipelines, LFSRs, feedback loops, enable/reset)
 * - Topology violation test cases (combinational cycles, multi-drivers)
 * - Scalable complex circuits for memory & throughput profiling
 */

import { CircuitGraph, COMPONENT_TYPES, resetIdCounter } from '../../src/engine/circuit_graph.js';
import { BooleanExprNode, SequentialReferenceModel, REFERENCE_GATE_OPS } from './reference_evaluator.js';

export const GATE_TYPES = ['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR', 'XNOR', 'MUX2'];

export class CircuitGenerator {
    /**
     * @param {import('./prng.js').PRNG} prng
     */
    constructor(prng) {
        this.prng = prng;
    }

    /**
     * Generate a valid random combinational circuit with exact Boolean ground truth.
     * 
     * @param {object} [options]
     * @param {number} [options.numInputs=3]
     * @param {number} [options.numOutputs=2]
     * @param {number} [options.numGates=8]
     * @param {string[]} [options.gateTypes=GATE_TYPES]
     * @param {boolean} [options.allowFanout=true]
     * @returns {{
     *   graph: CircuitGraph,
     *   inputIds: string[],
     *   outputIds: string[],
     *   gateIds: string[],
     *   referenceOutputs: Record<string, BooleanExprNode>
     * }}
     */
    generateCombinational(options = {}) {
        resetIdCounter();
        const numInputs = options.numInputs ?? this.prng.nextInt(2, 5);
        const numOutputs = options.numOutputs ?? this.prng.nextInt(1, 3);
        const numGates = options.numGates ?? this.prng.nextInt(4, 16);
        const gateTypes = options.gateTypes ?? GATE_TYPES;
        const allowFanout = options.allowFanout ?? true;

        const graph = new CircuitGraph();
        const inputIds = [];
        const outputIds = [];
        const gateIds = [];

        // Pool of available driving sources: { componentId, pinId, exprNode }
        const availableDrivers = [];

        // 1. Create Input Components
        for (let i = 0; i < numInputs; i++) {
            const label = `in_${String.fromCharCode(97 + i)}`;
            const res = graph.addComponent('INPUT', 40, 40 + i * 80, label);
            if (!res.ok) throw new Error(`Failed to add input: ${res.error}`);
            inputIds.push(res.id);
            const exprNode = new BooleanExprNode('INPUT', res.id);
            availableDrivers.push({ componentId: res.id, pinId: `${res.id}.out0`, exprNode });
        }

        // 2. Create Combinational Gates in topological order
        for (let g = 0; g < numGates; g++) {
            const gateType = this.prng.choice(gateTypes);
            const label = `${gateType.toLowerCase()}_${g}`;
            const col = Math.floor(g / 3) + 1;
            const row = g % 3;
            const res = graph.addComponent(gateType, 160 + col * 120, 50 + row * 90, label);
            if (!res.ok) throw new Error(`Failed to add gate: ${res.error}`);
            const gateId = res.id;
            gateIds.push(gateId);

            const compDef = COMPONENT_TYPES[gateType];
            const childExprNodes = [];

            // Wire each input pin of the gate to an existing driver
            for (let pinIdx = 0; pinIdx < compDef.inputCount; pinIdx++) {
                let driver;
                if (allowFanout) {
                    driver = this.prng.choice(availableDrivers);
                } else {
                    driver = availableDrivers.shift() || this.prng.choice(availableDrivers);
                }
                const toPin = `${gateId}.in${pinIdx}`;
                const connRes = graph.addConnection(driver.componentId, driver.pinId, gateId, toPin);
                if (!connRes.ok) throw new Error(`Failed to connect gate input: ${connRes.error}`);
                childExprNodes.push(driver.exprNode);
            }

            // Output of this gate becomes a new driver
            const gateExprNode = new BooleanExprNode(gateType, gateId, childExprNodes);
            availableDrivers.push({
                componentId: gateId,
                pinId: `${gateId}.out0`,
                exprNode: gateExprNode
            });
        }

        // 3. Create Output Components
        const referenceOutputs = {};
        for (let o = 0; o < numOutputs; o++) {
            const label = `out_${o}`;
            const res = graph.addComponent('OUTPUT', 600, 60 + o * 100, label);
            if (!res.ok) throw new Error(`Failed to add output: ${res.error}`);
            outputIds.push(res.id);

            // Connect output to one of the latest available drivers
            const driver = this.prng.choice(availableDrivers);
            const connRes = graph.addConnection(driver.componentId, driver.pinId, res.id, `${res.id}.in0`);
            if (!connRes.ok) throw new Error(`Failed to connect output: ${connRes.error}`);

            referenceOutputs[res.id] = driver.exprNode;
        }

        return {
            graph,
            inputIds,
            outputIds,
            gateIds,
            referenceOutputs
        };
    }

    /**
     * Generate sequential circuit with DFFs, clock, and independent reference model.
     * 
     * Supported topologies:
     * - 'shift_register': N flip-flops in series
     * - 'toggle_divider': DFF with Q inverted feeding back to D
     * - 'lfsr': Linear Feedback Shift Register with XOR feedback
     * - 'clock_enable': DFF with 2:1 MUX recirculation
     * - 'sync_reset': DFF with AND/NOT synchronous clear
     * 
     * @param {string} [topology]
     * @param {object} [options]
     */
    generateSequential(topology, options = {}) {
        resetIdCounter();
        const graph = new CircuitGraph();

        if (!topology) {
            topology = this.prng.choice(['shift_register', 'toggle_divider', 'lfsr', 'clock_enable', 'sync_reset']);
        }

        // Add single Clock
        const clkRes = graph.addComponent('CLOCK', 50, 40, 'clk');
        if (!clkRes.ok) throw new Error(clkRes.error);
        const clkId = clkRes.id;
        const clkPin = `${clkId}.out0`;

        if (topology === 'shift_register') {
            const stages = options.stages ?? this.prng.nextInt(2, 5);
            // Input data
            const inRes = graph.addComponent('INPUT', 50, 120, 'din');
            graph.setInputValue(inRes.id, 1);
            const dffIds = [];
            let prevOutPin = `${inRes.id}.out0`;
            let prevCompId = inRes.id;

            for (let i = 0; i < stages; i++) {
                const dff = graph.addComponent('DFF', 180 + i * 130, 100, `dff_${i}`);
                dffIds.push(dff.id);
                // Connect clock
                graph.addConnection(clkId, clkPin, dff.id, `${dff.id}.in1`);
                // Connect D
                graph.addConnection(prevCompId, prevOutPin, dff.id, `${dff.id}.in0`);
                prevCompId = dff.id;
                prevOutPin = `${dff.id}.out0`;
            }

            // Output from final stage
            const outRes = graph.addComponent('OUTPUT', 180 + stages * 130, 100, 'q_out');
            graph.addConnection(prevCompId, prevOutPin, outRes.id, `${outRes.id}.in0`);

            // Reference model
            const nextDLogic = {};
            nextDLogic[dffIds[0]] = (q, inp) => inp[inRes.id];
            for (let i = 1; i < stages; i++) {
                const curId = dffIds[i];
                const prevId = dffIds[i - 1];
                nextDLogic[curId] = (q) => q[prevId];
            }
            const refModel = new SequentialReferenceModel(dffIds, nextDLogic);

            return {
                topology,
                graph,
                clkId,
                inputIds: [inRes.id],
                outputIds: [outRes.id],
                dffIds,
                refModel
            };
        }

        if (topology === 'toggle_divider') {
            // T-FlipFlop / Clock divider: D = ~Q
            const dff = graph.addComponent('DFF', 180, 100, 'dff_div');
            const notGate = graph.addComponent('NOT', 320, 150, 'inv');
            const outRes = graph.addComponent('OUTPUT', 450, 100, 'q_div');

            // Wire clock
            graph.addConnection(clkId, clkPin, dff.id, `${dff.id}.in1`);
            // Wire DFF Q to NOT and OUTPUT
            graph.addConnection(dff.id, `${dff.id}.out0`, notGate.id, `${notGate.id}.in0`);
            graph.addConnection(dff.id, `${dff.id}.out0`, outRes.id, `${outRes.id}.in0`);
            // Wire NOT output back to DFF D input (sequential feedback loop)
            graph.addConnection(notGate.id, `${notGate.id}.out0`, dff.id, `${dff.id}.in0`);

            const refModel = new SequentialReferenceModel([dff.id], {
                [dff.id]: (q) => (q[dff.id] === 0 ? 1 : (q[dff.id] === 1 ? 0 : null))
            });

            return {
                topology,
                graph,
                clkId,
                inputIds: [],
                outputIds: [outRes.id],
                dffIds: [dff.id],
                refModel
            };
        }

        if (topology === 'clock_enable') {
            // MUX2 with DFF: D = en ? din : Q
            const din = graph.addComponent('INPUT', 50, 100, 'din');
            const en = graph.addComponent('INPUT', 50, 180, 'en');
            const mux = graph.addComponent('MUX2', 200, 120, 'mux_en');
            const dff = graph.addComponent('DFF', 360, 120, 'dff_en');
            const outRes = graph.addComponent('OUTPUT', 500, 120, 'q_out');

            graph.setInputValue(din.id, 1);
            graph.setInputValue(en.id, 0);

            // Connect clock
            graph.addConnection(clkId, clkPin, dff.id, `${dff.id}.in1`);
            // Connect MUX: in0 = Q (hold), in1 = din (load), sel = en
            graph.addConnection(dff.id, `${dff.id}.out0`, mux.id, `${mux.id}.in0`);
            graph.addConnection(din.id, `${din.id}.out0`, mux.id, `${mux.id}.in1`);
            graph.addConnection(en.id, `${en.id}.out0`, mux.id, `${mux.id}.in2`);
            // Connect MUX output to DFF D
            graph.addConnection(mux.id, `${mux.id}.out0`, dff.id, `${dff.id}.in0`);
            // Connect DFF Q to OUTPUT
            graph.addConnection(dff.id, `${dff.id}.out0`, outRes.id, `${outRes.id}.in0`);

            const refModel = new SequentialReferenceModel([dff.id], {
                [dff.id]: (q, inp) => {
                    const enVal = inp[en.id];
                    const dinVal = inp[din.id];
                    if (enVal === 1) return dinVal;
                    if (enVal === 0) return q[dff.id];
                    return null;
                }
            });

            return {
                topology,
                graph,
                clkId,
                inputIds: [din.id, en.id],
                outputIds: [outRes.id],
                dffIds: [dff.id],
                refModel
            };
        }

        if (topology === 'sync_reset') {
            // Synchronous Reset: D = din & ~rst
            const din = graph.addComponent('INPUT', 50, 100, 'din');
            const rst = graph.addComponent('INPUT', 50, 180, 'rst');
            const notRst = graph.addComponent('NOT', 180, 180, 'not_rst');
            const andGate = graph.addComponent('AND', 300, 120, 'and_gate');
            const dff = graph.addComponent('DFF', 440, 120, 'dff_sr');
            const outRes = graph.addComponent('OUTPUT', 570, 120, 'q_out');

            graph.setInputValue(din.id, 1);
            graph.setInputValue(rst.id, 0);

            // Wire clock
            graph.addConnection(clkId, clkPin, dff.id, `${dff.id}.in1`);
            // rst -> NOT
            graph.addConnection(rst.id, `${rst.id}.out0`, notRst.id, `${notRst.id}.in0`);
            // din, notRst -> AND
            graph.addConnection(din.id, `${din.id}.out0`, andGate.id, `${andGate.id}.in0`);
            graph.addConnection(notRst.id, `${notRst.id}.out0`, andGate.id, `${andGate.id}.in1`);
            // AND -> DFF D
            graph.addConnection(andGate.id, `${andGate.id}.out0`, dff.id, `${dff.id}.in0`);
            // DFF Q -> OUTPUT
            graph.addConnection(dff.id, `${dff.id}.out0`, outRes.id, `${outRes.id}.in0`);

            const refModel = new SequentialReferenceModel([dff.id], {
                [dff.id]: (q, inp) => {
                    const rstVal = inp[rst.id];
                    const dinVal = inp[din.id];
                    if (rstVal === 1) return 0;
                    if (rstVal === 0) return dinVal;
                    return null;
                }
            });

            return {
                topology,
                graph,
                clkId,
                inputIds: [din.id, rst.id],
                outputIds: [outRes.id],
                dffIds: [dff.id],
                refModel
            };
        }

        // Default / LFSR (3-bit with XOR feedback)
        const dff0 = graph.addComponent('DFF', 160, 100, 'reg0');
        const dff1 = graph.addComponent('DFF', 280, 100, 'reg1');
        const dff2 = graph.addComponent('DFF', 400, 100, 'reg2');
        const xorGate = graph.addComponent('XOR', 280, 220, 'feedback_xor');
        const outRes = graph.addComponent('OUTPUT', 520, 100, 'q_out');

        // Clock connections
        graph.addConnection(clkId, clkPin, dff0.id, `${dff0.id}.in1`);
        graph.addConnection(clkId, clkPin, dff1.id, `${dff1.id}.in1`);
        graph.addConnection(clkId, clkPin, dff2.id, `${dff2.id}.in1`);

        // Series: DFF0 -> DFF1 -> DFF2
        graph.addConnection(dff0.id, `${dff0.id}.out0`, dff1.id, `${dff1.id}.in0`);
        graph.addConnection(dff1.id, `${dff1.id}.out0`, dff2.id, `${dff2.id}.in0`);
        graph.addConnection(dff2.id, `${dff2.id}.out0`, outRes.id, `${outRes.id}.in0`);

        // Feedback XOR taps: reg1 ^ reg2 -> reg0 D
        graph.addConnection(dff1.id, `${dff1.id}.out0`, xorGate.id, `${xorGate.id}.in0`);
        graph.addConnection(dff2.id, `${dff2.id}.out0`, xorGate.id, `${xorGate.id}.in1`);
        graph.addConnection(xorGate.id, `${xorGate.id}.out0`, dff0.id, `${dff0.id}.in0`);

        const dffIds = [dff0.id, dff1.id, dff2.id];
        const refModel = new SequentialReferenceModel(dffIds, {
            [dff0.id]: (q) => (q[dff1.id] !== null && q[dff2.id] !== null) ? (q[dff1.id] ^ q[dff2.id]) : null,
            [dff1.id]: (q) => q[dff0.id],
            [dff2.id]: (q) => q[dff1.id]
        });

        return {
            topology: 'lfsr',
            graph,
            clkId,
            inputIds: [],
            outputIds: [outRes.id],
            dffIds,
            refModel
        };
    }

    /**
     * Generate invalid circuit topologies to verify rejection and error reporting.
     * 
     * @param {'combinational_cycle'|'multi_node_cycle'|'multi_driver'|'self_connection'|'unclocked_dff'} type
     */
    generateInvalidCircuit(type) {
        resetIdCounter();
        const graph = new CircuitGraph();

        if (type === 'combinational_cycle') {
            // 2-gate direct cycle: NOT1 -> NOT2 -> NOT1
            const not1 = graph.addComponent('NOT', 100, 100, 'not1');
            const not2 = graph.addComponent('NOT', 250, 100, 'not2');
            graph.addConnection(not1.id, `${not1.id}.out0`, not2.id, `${not2.id}.in0`);
            graph.addConnection(not2.id, `${not2.id}.out0`, not1.id, `${not1.id}.in0`);
            return {
                type,
                graph,
                expectedError: 'Combinational feedback loop detected'
            };
        }

        if (type === 'multi_node_cycle') {
            // 4-gate ring: G0 -> G1 -> G2 -> G3 -> G0
            const gates = [];
            for (let i = 0; i < 4; i++) {
                const g = graph.addComponent('AND', 100 + i * 120, 100, `ring_${i}`);
                gates.push(g.id);
            }
            // Add inputs for the other AND pin
            for (let i = 0; i < 4; i++) {
                const inp = graph.addComponent('INPUT', 100 + i * 120, 40, `in_${i}`);
                graph.addConnection(inp.id, `${inp.id}.out0`, gates[i], `${gates[i]}.in1`);
            }
            // Connect ring
            for (let i = 0; i < 4; i++) {
                const next = (i + 1) % 4;
                graph.addConnection(gates[i], `${gates[i]}.out0`, gates[next], `${gates[next]}.in0`);
            }
            return {
                type,
                graph,
                expectedError: 'Combinational feedback loop detected'
            };
        }

        if (type === 'multi_driver') {
            // Two drivers to same input pin
            const in1 = graph.addComponent('INPUT', 50, 50, 'in1');
            const in2 = graph.addComponent('INPUT', 50, 150, 'in2');
            const andGate = graph.addComponent('AND', 200, 100, 'and');
            const firstRes = graph.addConnection(in1.id, `${in1.id}.out0`, andGate.id, `${andGate.id}.in0`);
            // Attempt second connection to in0
            const secondRes = graph.addConnection(in2.id, `${in2.id}.out0`, andGate.id, `${andGate.id}.in0`);
            return {
                type,
                graph,
                firstRes,
                secondRes,
                expectedError: 'multiple drivers not allowed'
            };
        }

        if (type === 'self_connection') {
            // Attempt to connect component output to its own input
            const notGate = graph.addComponent('NOT', 100, 100, 'not_self');
            const res = graph.addConnection(notGate.id, `${notGate.id}.out0`, notGate.id, `${notGate.id}.in0`);
            return {
                type,
                graph,
                attemptResult: res,
                expectedError: 'Cannot connect a component to itself'
            };
        }

        if (type === 'unclocked_dff') {
            // DFF without clock connection
            const inp = graph.addComponent('INPUT', 50, 100, 'din');
            const dff = graph.addComponent('DFF', 200, 100, 'dff');
            const outRes = graph.addComponent('OUTPUT', 350, 100, 'q');
            graph.addConnection(inp.id, `${inp.id}.out0`, dff.id, `${dff.id}.in0`);
            graph.addConnection(dff.id, `${dff.id}.out0`, outRes.id, `${outRes.id}.in0`);
            return {
                type,
                graph,
                expectedError: 'CLK input must be connected to a Clock'
            };
        }

        throw new Error(`Unknown invalid circuit type: ${type}`);
    }

    /**
     * Generate a large circuit of variable size for memory and performance stress testing.
     * 
     * @param {number} gateCount - Total number of gates
     * @param {number} [inputsCount=8]
     * @param {number} [outputsCount=4]
     */
    generateStressSized(gateCount, inputsCount = 8, outputsCount = 4) {
        return this.generateCombinational({
            numInputs: inputsCount,
            numOutputs: outputsCount,
            numGates: gateCount,
            allowFanout: true
        });
    }
}
