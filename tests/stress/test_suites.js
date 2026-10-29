/**
 * test_suites.js — Modular Stress Test Implementations
 * 
 * Implements the 12 requirement areas for RTL Playground:
 * 1. Randomized combinational circuit generation & simulation
 * 2. Independent truth table verification (AND, OR, NOT, XOR, NAND, NOR, XNOR, MUX2)
 * 3. Multi-level circuits, fan-out, and invalid topologies (cycles, multi-driver)
 * 4. Randomized DFFs, clock edge sequences, sequential feedback, nonblocking simultaneous update
 * 5. Serialization round-trip & simulation consistency
 * 6. Synthesizable Verilog & Yosys verification
 * 7. Complexity scaling & memory profiling
 * 8. Browser UI smoke & interaction validation
 */

import { CircuitGraph, COMPONENT_TYPES, resetIdCounter } from '../../src/engine/circuit_graph.js';
import { LogicSimulator } from '../../src/engine/logic_simulator.js';
import { SequentialEngine } from '../../src/engine/sequential_engine.js';
import { VerilogChecker } from './verilog_checker.js';
import { runBrowserSmokeCheck } from './browser_ui_worker.js';

/**
 * 1. Combinational Logic & Truth Table Verification against Independent Reference
 */
export async function testCombinationalVerification(prng, generator, tracker) {
    const numInputs = prng.nextInt(2, 4);
    const numOutputs = prng.nextInt(1, 2);
    const numGates = prng.nextInt(4, 12);

    const { graph, inputIds, outputIds, referenceOutputs } = generator.generateCombinational({
        numInputs,
        numOutputs,
        numGates,
        allowFanout: true
    });
    tracker.increment('circuitsGenerated');

    const sim = new LogicSimulator(graph);

    // Test all 2^N binary input combinations (truth table)
    const combinations = 1 << numInputs;
    for (let c = 0; c < combinations; c++) {
        const inputEnv = {};
        for (let i = 0; i < numInputs; i++) {
            inputEnv[inputIds[i]] = (c >> i) & 1;
        }

        const simResult = sim.evaluateWithInputs(inputEnv);
        if (!simResult.ok) {
            throw new Error(`Simulation failed on input vector ${JSON.stringify(inputEnv)}: ${simResult.error}`);
        }
        tracker.increment('simulationsRun');

        // Verify every output against the independent Boolean reference evaluator
        for (const outId of outputIds) {
            const actualVal = simResult.outputs[outId];
            const refNode = referenceOutputs[outId];
            const expectedVal = refNode.evaluate(inputEnv);

            if (actualVal !== expectedVal) {
                throw new Error(
                    `Mismatch on output ${outId}: expected ${expectedVal}, got ${actualVal} for input vector ${JSON.stringify(inputEnv)}`
                );
            }
        }
    }
    tracker.increment('truthTableChecks');

    // Also test null/unconnected input propagation: if an input is null, downstream outputs are null
    const nullEnv = {};
    for (const inId of inputIds) {
        nullEnv[inId] = null;
    }
    const nullResult = sim.evaluateWithInputs(nullEnv);
    if (!nullResult.ok) {
        throw new Error(`Null evaluation failed: ${nullResult.error}`);
    }
    for (const outId of outputIds) {
        if (nullResult.outputs[outId] !== null) {
            throw new Error(`Expected null output when inputs are null, got: ${nullResult.outputs[outId]}`);
        }
    }
    tracker.increment('simulationsRun');

    return { ok: true, gates: numGates, inputs: numInputs, combinationsChecked: combinations };
}

/**
 * 2. Invalid Circuit Rejection & Safety Checks
 */
export async function testInvalidRejection(prng, generator, tracker) {
    const invalidType = prng.choice([
        'combinational_cycle',
        'multi_node_cycle',
        'multi_driver',
        'self_connection',
        'unclocked_dff'
    ]);

    const invalid = generator.generateInvalidCircuit(invalidType);

    if (invalidType === 'multi_driver') {
        if (invalid.secondRes.ok) {
            throw new Error('Expected multi-driver connection to be rejected, but it succeeded');
        }
        if (!invalid.secondRes.error?.includes(invalid.expectedError)) {
            throw new Error(`Expected multi-driver error containing "${invalid.expectedError}", got "${invalid.secondRes.error}"`);
        }
    } else if (invalidType === 'self_connection') {
        if (invalid.attemptResult.ok) {
            throw new Error('Expected self-connection to be rejected, but it succeeded');
        }
        if (!invalid.attemptResult.error?.includes(invalid.expectedError)) {
            throw new Error(`Expected error containing "${invalid.expectedError}", got "${invalid.attemptResult.error}"`);
        }
    } else {
        const val = invalid.graph.validateCircuit();
        const hasExpectedError = val.errors.some(e => e.includes(invalid.expectedError));
        if (!hasExpectedError) {
            throw new Error(`Expected validation error "${invalid.expectedError}", got errors: [${val.errors.join('; ')}]`);
        }
    }

    tracker.increment('invalidRejections');
    return { ok: true, rejectedType: invalidType };
}

/**
 * 3. Sequential Logic, DFF Clock Edge Sequences & Simultaneous Nonblocking Sampling
 */
export async function testSequentialVerification(prng, generator, tracker) {
    const topology = prng.choice(['shift_register', 'toggle_divider', 'lfsr', 'clock_enable', 'sync_reset']);
    const seq = generator.generateSequential(topology);
    tracker.increment('circuitsGenerated');

    const sim = new LogicSimulator(seq.graph);
    const seqEngine = new SequentialEngine(seq.graph, sim);
    seqEngine.initializeDFFs();
    // Evaluate initial combinational state
    sim.evaluate();

    // Run 10 clock steps with randomized input vectors
    const numCycles = 10;
    let prevClk = 0;

    for (let step = 0; step < numCycles * 2; step++) {
        // Randomize inputs before clock toggles
        const inputEnv = {};
        for (const inId of seq.inputIds) {
            const v = prng.nextInt(0, 1);
            inputEnv[inId] = v;
            seq.graph.setInputValue(inId, v);
        }
        // Propagate input values through combinational logic before clock edge
        sim.evaluate();

        const stepResult = seqEngine.clockStep();
        if (!stepResult.ok) {
            throw new Error(`Sequential clockStep failed at step ${step}: ${stepResult.error}`);
        }
        tracker.increment('sequentialSteps');

        const nextClk = seqEngine.clockState;

        // Advance reference model
        const expectedQ = seq.refModel.step(prevClk, nextClk, inputEnv);

        // Verify all DFF Q values match reference model
        for (const dffId of seq.dffIds) {
            const actualState = seqEngine.dffStates.get(dffId);
            const expQ = expectedQ[dffId];
            if (actualState && actualState.Q !== expQ) {
                throw new Error(
                    `Sequential mismatch in ${topology} on ${dffId} at step ${step} (prevClk=${prevClk}->clk=${nextClk}): expected Q=${expQ}, got Q=${actualState.Q}`
                );
            }
        }

        prevClk = nextClk;
    }

    return { ok: true, topology, stepsVerified: numCycles * 2 };
}

/**
 * 4. Circuit Serialization/Deserialization Round-Trip & Simulation Invariance
 */
export async function testSerializationRoundTrip(prng, generator, tracker) {
    const isSequential = prng.nextBoolean(0.4);
    let originalGraph, inputIds, outputIds;

    if (isSequential) {
        const seq = generator.generateSequential('shift_register', { stages: 3 });
        originalGraph = seq.graph;
        inputIds = seq.inputIds;
        outputIds = seq.outputIds;
    } else {
        const comb = generator.generateCombinational({ numInputs: 3, numOutputs: 2, numGates: 6 });
        originalGraph = comb.graph;
        inputIds = comb.inputIds;
        outputIds = comb.outputIds;
    }
    tracker.increment('circuitsGenerated');

    // 1. Evaluate original circuit
    const origSim = new LogicSimulator(originalGraph);
    const testInputEnv = {};
    for (const inId of inputIds) {
        testInputEnv[inId] = prng.nextInt(0, 1);
    }
    const origEval = origSim.evaluateWithInputs(testInputEnv);
    if (!origEval.ok) throw new Error(`Original evaluation failed: ${origEval.error}`);

    // 2. Serialize
    const serialized = originalGraph.serialize();
    const jsonString = JSON.stringify(serialized);
    const parsedData = JSON.parse(jsonString);

    // 3. Deserialize into fresh CircuitGraph
    const newGraph = new CircuitGraph();
    const desResult = newGraph.deserialize(parsedData);
    if (!desResult.ok) {
        throw new Error(`Deserialization failed: ${desResult.error}`);
    }

    // 4. Assert graph equivalence
    if (newGraph.components.size !== originalGraph.components.size) {
        throw new Error(`Component count mismatch: orig=${originalGraph.components.size}, new=${newGraph.components.size}`);
    }
    if (newGraph.connections.size !== originalGraph.connections.size) {
        throw new Error(`Connection count mismatch: orig=${originalGraph.connections.size}, new=${newGraph.connections.size}`);
    }

    // 5. Evaluate deserialized circuit with identical input vector
    const newSim = new LogicSimulator(newGraph);
    const newEval = newSim.evaluateWithInputs(testInputEnv);
    if (!newEval.ok) throw new Error(`Deserialized evaluation failed: ${newEval.error}`);

    // 6. Assert simulation consistency
    for (const outId of outputIds) {
        if (origEval.outputs[outId] !== newEval.outputs[outId]) {
            throw new Error(`Simulation inconsistency after serialization for ${outId}: orig=${origEval.outputs[outId]}, new=${newEval.outputs[outId]}`);
        }
    }

    tracker.increment('serializationChecks');
    return { ok: true, componentCount: newGraph.components.size, isSequential };
}

/**
 * 5. Synthesizable Verilog Generation & Yosys HDL Verification
 */
export async function testVerilogYosysCompilation(prng, generator, tracker) {
    const isSequential = prng.nextBoolean(0.35);
    let graph;

    if (isSequential) {
        const seq = generator.generateSequential(prng.choice(['shift_register', 'clock_enable', 'sync_reset']));
        graph = seq.graph;
    } else {
        const comb = generator.generateCombinational({ numInputs: 3, numOutputs: 1, numGates: 5 });
        graph = comb.graph;
    }
    tracker.increment('circuitsGenerated');

    const modName = `synth_test_${prng.nextInt(1000, 9999)}`;
    const result = await VerilogChecker.verifyCircuitVerilog(graph, modName);

    if (!result.ok) {
        throw new Error(`Verilog/Yosys verification failure: ${result.error}`);
    }

    tracker.increment('verilogCompilations');
    return { ok: true, moduleName: modName, isSequential };
}

/**
 * 6. Complexity Scaling Benchmark & Memory Observations
 */
export async function testComplexityScaling(generator, tracker) {
    const sizes = [15, 35, 70, 120];

    for (const size of sizes) {
        const t0 = performance.now();
        const { graph } = generator.generateStressSized(size, 4, 2);
        const tBuild = performance.now() - t0;

        const t1 = performance.now();
        const topo = graph.getTopologicalOrder();
        if (!topo.ok) throw new Error(`Topological sort failed for size ${size}: ${topo.error}`);
        const tTopo = performance.now() - t1;

        const sim = new LogicSimulator(graph);
        const t2 = performance.now();
        const simRes = sim.evaluate();
        if (!simRes.ok) throw new Error(`Simulation failed for size ${size}: ${simRes.error}`);
        const tSim = performance.now() - t2;

        const mem = tracker.sampleMemory();
        tracker.recordBenchmark(size, tBuild, tTopo, tSim, mem.heapUsedMB);
        tracker.increment('scaleBenchmarksRun');
    }

    return { ok: true, benchmarkPoints: sizes.length };
}

/**
 * 7. Browser Smoke & UI Interaction Validation
 */
export async function testBrowserUI(rootDir, tracker) {
    const res = await runBrowserSmokeCheck(rootDir);
    if (!res.ok) {
        throw new Error(`Browser UI smoke test failed: ${res.error}`);
    }
    tracker.increment('browserSmokePasses');
    return { ok: true, stepsPassed: res.stepsPassed };
}
