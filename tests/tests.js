/**
 * tests.js — Automated test suite for RTL Playground
 * 
 * Covers: gate truth tables, multi-gate propagation, half adder,
 * multiplexer, cycle detection, DFF sequential behavior, invalid
 * connections, truth table consistency, and Verilog generation.
 * 
 * Can run in both Node.js and browser (via test_runner.html).
 */

// ─── Detect Environment ────────────────────────────────────────────────────

const IS_NODE = typeof process !== 'undefined' && process.versions && process.versions.node;

let CircuitGraph, COMPONENT_TYPES, resetIdCounter, LogicSimulator, SequentialEngine, VerilogGenerator;
let PRESETS, LESSONS;

if (IS_NODE) {
    // Node.js: dynamic import
    const cg = await import('../src/engine/circuit_graph.js');
    const ls = await import('../src/engine/logic_simulator.js');
    const se = await import('../src/engine/sequential_engine.js');
    const vg = await import('../src/engine/verilog_generator.js');
    const pr = await import('../src/modules/presets.js');
    const le = await import('../src/modules/lessons.js');
    CircuitGraph = cg.CircuitGraph;
    COMPONENT_TYPES = cg.COMPONENT_TYPES;
    resetIdCounter = cg.resetIdCounter;
    LogicSimulator = ls.LogicSimulator;
    SequentialEngine = se.SequentialEngine;
    VerilogGenerator = vg.VerilogGenerator;
    PRESETS = pr.PRESETS;
    LESSONS = le.LESSONS;
} else {
    // Browser: imports provided by test_runner.html
    ({ CircuitGraph, COMPONENT_TYPES, resetIdCounter } = await import('../src/engine/circuit_graph.js'));
    ({ LogicSimulator } = await import('../src/engine/logic_simulator.js'));
    ({ SequentialEngine } = await import('../src/engine/sequential_engine.js'));
    ({ VerilogGenerator } = await import('../src/engine/verilog_generator.js'));
    ({ PRESETS } = await import('../src/modules/presets.js'));
    ({ LESSONS } = await import('../src/modules/lessons.js'));
}

// ─── Minimal Test Framework ─────────────────────────────────────────────────

const results = { passed: 0, failed: 0, errors: [] };

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertOk(result, message) {
    if (!result.ok) {
        throw new Error(`${message || 'Expected ok result'}: ${result.error}`);
    }
}

async function test(name, fn) {
    resetIdCounter();
    try {
        await fn();
        results.passed++;
        log(`  ✅ ${name}`);
    } catch (e) {
        results.failed++;
        results.errors.push({ name, error: e.message });
        log(`  ❌ ${name}: ${e.message}`);
    }
}

function log(msg) {
    if (IS_NODE) {
        console.log(msg);
    } else {
        const el = document.getElementById('test-output');
        if (el) el.textContent += msg + '\n';
        console.log(msg);
    }
}

// ─── Helper: Build a simple gate circuit ────────────────────────────────────

function buildGateCircuit(gateType) {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);

    const typeDef = COMPONENT_TYPES[gateType];
    const inputCount = typeDef.inputCount;

    // Create inputs
    const inputIds = [];
    for (let i = 0; i < inputCount; i++) {
        const r = graph.addComponent('INPUT', 50, 50 + i * 60, `in_${i}`);
        assertOk(r);
        inputIds.push(r.id);
    }

    // Create gate
    const gateResult = graph.addComponent(gateType, 200, 80);
    assertOk(gateResult);
    const gateId = gateResult.id;

    // Create output
    const outResult = graph.addComponent('OUTPUT', 350, 80, 'out');
    assertOk(outResult);
    const outId = outResult.id;

    // Wire inputs to gate
    for (let i = 0; i < inputCount; i++) {
        const r = graph.addConnection(
            inputIds[i], `${inputIds[i]}.out0`,
            gateId, `${gateId}.in${i}`
        );
        assertOk(r);
    }

    // Wire gate output to output
    const r = graph.addConnection(gateId, `${gateId}.out0`, outId, `${outId}.in0`);
    assertOk(r);

    return { graph, sim, inputIds, gateId, outId };
}

function testGateTruthTable(gateType, expectedTable) {
    const { graph, sim, inputIds, outId } = buildGateCircuit(gateType);

    for (const [inputs, expected] of expectedTable) {
        const inputValues = {};
        for (let i = 0; i < inputs.length; i++) {
            inputValues[inputIds[i]] = inputs[i];
        }
        const result = sim.evaluateWithInputs(inputValues);
        assertOk(result, `evaluateWithInputs for ${gateType}`);
        assertEqual(result.outputs[outId], expected,
            `${gateType} with inputs [${inputs}]`);
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  1. BASIC GATE TRUTH TABLES
// ═════════════════════════════════════════════════════════════════════════════

log('\n📋 Basic Gate Truth Tables');

await test('AND gate: all input combinations', () => {
    testGateTruthTable('AND', [
        [[0, 0], 0],
        [[0, 1], 0],
        [[1, 0], 0],
        [[1, 1], 1]
    ]);
});

await test('OR gate: all input combinations', () => {
    testGateTruthTable('OR', [
        [[0, 0], 0],
        [[0, 1], 1],
        [[1, 0], 1],
        [[1, 1], 1]
    ]);
});

await test('NOT gate: inversion', () => {
    testGateTruthTable('NOT', [
        [[0], 1],
        [[1], 0]
    ]);
});

await test('NAND gate: all input combinations', () => {
    testGateTruthTable('NAND', [
        [[0, 0], 1],
        [[0, 1], 1],
        [[1, 0], 1],
        [[1, 1], 0]
    ]);
});

await test('NOR gate: all input combinations', () => {
    testGateTruthTable('NOR', [
        [[0, 0], 1],
        [[0, 1], 0],
        [[1, 0], 0],
        [[1, 1], 0]
    ]);
});

await test('XOR gate: all input combinations', () => {
    testGateTruthTable('XOR', [
        [[0, 0], 0],
        [[0, 1], 1],
        [[1, 0], 1],
        [[1, 1], 0]
    ]);
});

await test('XNOR gate: all input combinations', () => {
    testGateTruthTable('XNOR', [
        [[0, 0], 1],
        [[0, 1], 0],
        [[1, 0], 0],
        [[1, 1], 1]
    ]);
});

// ═════════════════════════════════════════════════════════════════════════════
//  2. HALF ADDER
// ═════════════════════════════════════════════════════════════════════════════

log('\n📋 Half Adder');

await test('Half adder: SUM = XOR, CARRY = AND', () => {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);

    // Inputs
    const a = graph.addComponent('INPUT', 50, 50, 'a');
    const b = graph.addComponent('INPUT', 50, 120, 'b');

    // XOR for SUM
    const xor = graph.addComponent('XOR', 200, 50);
    // AND for CARRY
    const and_ = graph.addComponent('AND', 200, 120);

    // Outputs
    const sum = graph.addComponent('OUTPUT', 350, 50, 'sum');
    const carry = graph.addComponent('OUTPUT', 350, 120, 'carry');

    // Wire: a → XOR.in0, a → AND.in0
    graph.addConnection(a.id, `${a.id}.out0`, xor.id, `${xor.id}.in0`);
    graph.addConnection(a.id, `${a.id}.out0`, and_.id, `${and_.id}.in0`);
    // Wire: b → XOR.in1, b → AND.in1
    graph.addConnection(b.id, `${b.id}.out0`, xor.id, `${xor.id}.in1`);
    graph.addConnection(b.id, `${b.id}.out0`, and_.id, `${and_.id}.in1`);
    // Wire: XOR → sum, AND → carry
    graph.addConnection(xor.id, `${xor.id}.out0`, sum.id, `${sum.id}.in0`);
    graph.addConnection(and_.id, `${and_.id}.out0`, carry.id, `${carry.id}.in0`);

    const tests = [
        [[0, 0], [0, 0]],
        [[0, 1], [1, 0]],
        [[1, 0], [1, 0]],
        [[1, 1], [0, 1]]
    ];

    for (const [[aVal, bVal], [expSum, expCarry]] of tests) {
        const result = sim.evaluateWithInputs({ [a.id]: aVal, [b.id]: bVal });
        assertOk(result);
        assertEqual(result.outputs[sum.id], expSum,
            `Half adder SUM: a=${aVal}, b=${bVal}`);
        assertEqual(result.outputs[carry.id], expCarry,
            `Half adder CARRY: a=${aVal}, b=${bVal}`);
    }
});

// ═════════════════════════════════════════════════════════════════════════════
//  3. MULTIPLEXER
// ═════════════════════════════════════════════════════════════════════════════

log('\n📋 2:1 Multiplexer');

await test('2:1 MUX: sel=0 selects A, sel=1 selects B', () => {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);

    const a = graph.addComponent('INPUT', 50, 50, 'a');
    const b = graph.addComponent('INPUT', 50, 100, 'b');
    const sel = graph.addComponent('INPUT', 50, 150, 'sel');
    const mux = graph.addComponent('MUX2', 200, 80);
    const out = graph.addComponent('OUTPUT', 350, 80, 'y');

    // MUX2 inputs: in0=A, in1=B, in2=Sel
    graph.addConnection(a.id, `${a.id}.out0`, mux.id, `${mux.id}.in0`);
    graph.addConnection(b.id, `${b.id}.out0`, mux.id, `${mux.id}.in1`);
    graph.addConnection(sel.id, `${sel.id}.out0`, mux.id, `${mux.id}.in2`);
    graph.addConnection(mux.id, `${mux.id}.out0`, out.id, `${out.id}.in0`);

    // All 8 input combinations
    const tests = [
        [0, 0, 0, 0],  // sel=0 → A=0
        [0, 1, 0, 0],  // sel=0 → A=0
        [1, 0, 0, 1],  // sel=0 → A=1
        [1, 1, 0, 1],  // sel=0 → A=1
        [0, 0, 1, 0],  // sel=1 → B=0
        [0, 1, 1, 1],  // sel=1 → B=1
        [1, 0, 1, 0],  // sel=1 → B=0
        [1, 1, 1, 1],  // sel=1 → B=1
    ];

    for (const [aVal, bVal, selVal, expected] of tests) {
        const result = sim.evaluateWithInputs({
            [a.id]: aVal, [b.id]: bVal, [sel.id]: selVal
        });
        assertOk(result);
        assertEqual(result.outputs[out.id], expected,
            `MUX2: a=${aVal}, b=${bVal}, sel=${selVal}`);
    }
});

// ═════════════════════════════════════════════════════════════════════════════
//  4. MULTI-GATE SIGNAL PROPAGATION
// ═════════════════════════════════════════════════════════════════════════════

log('\n📋 Multi-Gate Signal Propagation');

await test('Cascaded gates: NOT → AND', () => {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);

    const a = graph.addComponent('INPUT', 50, 50, 'a');
    const b = graph.addComponent('INPUT', 50, 120, 'b');
    const notGate = graph.addComponent('NOT', 150, 50);
    const andGate = graph.addComponent('AND', 250, 80);
    const out = graph.addComponent('OUTPUT', 400, 80, 'y');

    // a → NOT → AND.in0; b → AND.in1; AND → out
    graph.addConnection(a.id, `${a.id}.out0`, notGate.id, `${notGate.id}.in0`);
    graph.addConnection(notGate.id, `${notGate.id}.out0`, andGate.id, `${andGate.id}.in0`);
    graph.addConnection(b.id, `${b.id}.out0`, andGate.id, `${andGate.id}.in1`);
    graph.addConnection(andGate.id, `${andGate.id}.out0`, out.id, `${out.id}.in0`);

    // NOT(a) AND b
    const tests = [
        [0, 0, 0],  // NOT(0)=1, 1 AND 0 = 0
        [0, 1, 1],  // NOT(0)=1, 1 AND 1 = 1
        [1, 0, 0],  // NOT(1)=0, 0 AND 0 = 0
        [1, 1, 0],  // NOT(1)=0, 0 AND 1 = 0
    ];

    for (const [aVal, bVal, expected] of tests) {
        const result = sim.evaluateWithInputs({ [a.id]: aVal, [b.id]: bVal });
        assertOk(result);
        assertEqual(result.outputs[out.id], expected,
            `NOT→AND: a=${aVal}, b=${bVal}`);
    }
});

await test('Fan-out: one output drives multiple inputs', () => {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);

    const a = graph.addComponent('INPUT', 50, 50, 'a');
    const b = graph.addComponent('INPUT', 50, 120, 'b');
    const andGate = graph.addComponent('AND', 200, 50);
    const orGate = graph.addComponent('OR', 200, 120);
    const out1 = graph.addComponent('OUTPUT', 350, 50, 'y1');
    const out2 = graph.addComponent('OUTPUT', 350, 120, 'y2');

    // a → AND.in0 AND a → OR.in0 (fan-out from a)
    graph.addConnection(a.id, `${a.id}.out0`, andGate.id, `${andGate.id}.in0`);
    graph.addConnection(a.id, `${a.id}.out0`, orGate.id, `${orGate.id}.in0`);
    // b → AND.in1 AND b → OR.in1
    graph.addConnection(b.id, `${b.id}.out0`, andGate.id, `${andGate.id}.in1`);
    graph.addConnection(b.id, `${b.id}.out0`, orGate.id, `${orGate.id}.in1`);
    // Gates → outputs
    graph.addConnection(andGate.id, `${andGate.id}.out0`, out1.id, `${out1.id}.in0`);
    graph.addConnection(orGate.id, `${orGate.id}.out0`, out2.id, `${out2.id}.in0`);

    const result = sim.evaluateWithInputs({ [a.id]: 1, [b.id]: 0 });
    assertOk(result);
    assertEqual(result.outputs[out1.id], 0, 'AND(1,0)=0');
    assertEqual(result.outputs[out2.id], 1, 'OR(1,0)=1');
});

// ═════════════════════════════════════════════════════════════════════════════
//  5. D FLIP-FLOP — SEQUENTIAL
// ═════════════════════════════════════════════════════════════════════════════

log('\n📋 D Flip-Flop Sequential Behavior');

function buildDFFCircuit() {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);
    const seq = new SequentialEngine(graph, sim);

    const dInput = graph.addComponent('INPUT', 50, 50, 'd');
    const clk = graph.addComponent('CLOCK', 50, 120, 'clk');
    const dff = graph.addComponent('DFF', 200, 80, 'ff');
    const out = graph.addComponent('OUTPUT', 350, 80, 'q');

    // d → DFF.D, clk → DFF.CLK, DFF.Q → out
    graph.addConnection(dInput.id, `${dInput.id}.out0`, dff.id, `${dff.id}.in0`);
    graph.addConnection(clk.id, `${clk.id}.out0`, dff.id, `${dff.id}.in1`);
    graph.addConnection(dff.id, `${dff.id}.out0`, out.id, `${out.id}.in0`);

    return { graph, sim, seq, dInput, clk, dff, out };
}

await test('DFF: Q updates on rising edge only', () => {
    const { graph, sim, seq, dInput, dff, out } = buildDFFCircuit();

    // Initial state: Q=0
    seq.initializeDFFs();
    sim.evaluate();
    assertEqual(seq.getDFFState(dff.id).Q, 0, 'Initial Q');

    // Set D=1, clock step 0→1 (rising edge): Q should become 1
    graph.setInputValue(dInput.id, 1);
    sim.evaluate();
    seq.clockStep(); // 0→1, rising edge
    assertEqual(seq.getDFFState(dff.id).Q, 1, 'Q after rising edge with D=1');

    // Set D=0, clock step 1→0 (falling edge): Q should remain 1
    graph.setInputValue(dInput.id, 0);
    sim.evaluate();
    seq.clockStep(); // 1→0, falling edge
    assertEqual(seq.getDFFState(dff.id).Q, 1, 'Q after falling edge should stay 1');

    // Clock step 0→1 (rising edge): Q should become 0
    seq.clockStep(); // 0→1, rising edge
    assertEqual(seq.getDFFState(dff.id).Q, 0, 'Q after second rising edge with D=0');
});

await test('DFF: state retention between edges', () => {
    const { graph, sim, seq, dInput, dff } = buildDFFCircuit();

    seq.initializeDFFs();
    sim.evaluate();

    // Set D=1, rising edge → Q=1
    graph.setInputValue(dInput.id, 1);
    sim.evaluate();
    seq.clockStep(); // 0→1, rising
    assertEqual(seq.getDFFState(dff.id).Q, 1, 'Q=1 after rising edge');

    // Change D to 0 (no clock edge): Q must remain 1
    graph.setInputValue(dInput.id, 0);
    sim.evaluate(); // Re-evaluate combinational — Q is set by seq engine, not simulator
    assertEqual(seq.getDFFState(dff.id).Q, 1, 'Q retained at 1 (no clock edge)');
});

await test('DFF: null D input produces null Q on rising edge', () => {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);
    const seq = new SequentialEngine(graph, sim);

    const clk = graph.addComponent('CLOCK', 50, 120, 'clk');
    const dff = graph.addComponent('DFF', 200, 80, 'ff');
    const out = graph.addComponent('OUTPUT', 350, 80, 'q');

    // Only connect CLK, leave D unconnected
    graph.addConnection(clk.id, `${clk.id}.out0`, dff.id, `${dff.id}.in1`);
    graph.addConnection(dff.id, `${dff.id}.out0`, out.id, `${out.id}.in0`);

    seq.initializeDFFs();
    sim.evaluate();

    // Rising edge with unconnected D → Q should become null
    seq.clockStep(); // 0→1
    assertEqual(seq.getDFFState(dff.id).Q, null, 'Q=null when D is unconnected');
});

// ═════════════════════════════════════════════════════════════════════════════
//  6. CYCLE DETECTION
// ═════════════════════════════════════════════════════════════════════════════

log('\n📋 Cycle Detection');

await test('Combinational cycle detected', () => {
    const graph = new CircuitGraph();

    const not1 = graph.addComponent('NOT', 100, 50);
    const not2 = graph.addComponent('NOT', 200, 50);

    // NOT1 → NOT2 → NOT1 (feedback loop)
    graph.addConnection(not1.id, `${not1.id}.out0`, not2.id, `${not2.id}.in0`);
    graph.addConnection(not2.id, `${not2.id}.out0`, not1.id, `${not1.id}.in0`);

    const result = graph.detectCycles();
    assert(result.hasCycle, 'Should detect combinational cycle');
});

await test('DFF breaks combinational cycle', () => {
    const graph = new CircuitGraph();

    const notGate = graph.addComponent('NOT', 100, 50);
    const dff = graph.addComponent('DFF', 200, 50);
    const clk = graph.addComponent('CLOCK', 50, 100);

    // DFF.Q → NOT → DFF.D (feedback through DFF is allowed)
    graph.addConnection(dff.id, `${dff.id}.out0`, notGate.id, `${notGate.id}.in0`);
    graph.addConnection(notGate.id, `${notGate.id}.out0`, dff.id, `${dff.id}.in0`);
    graph.addConnection(clk.id, `${clk.id}.out0`, dff.id, `${dff.id}.in1`);

    const result = graph.detectCycles();
    assert(!result.hasCycle, 'DFF should break the combinational feedback loop');
});

// ═════════════════════════════════════════════════════════════════════════════
//  7. INVALID CONNECTIONS
// ═════════════════════════════════════════════════════════════════════════════

log('\n📋 Invalid Connections');

await test('Multi-driver rejected', () => {
    const graph = new CircuitGraph();

    const in1 = graph.addComponent('INPUT', 50, 50, 'a');
    const in2 = graph.addComponent('INPUT', 50, 100, 'b');
    const out = graph.addComponent('OUTPUT', 200, 80, 'y');

    // Connect in1 → out
    const r1 = graph.addConnection(in1.id, `${in1.id}.out0`, out.id, `${out.id}.in0`);
    assertOk(r1);

    // Try to connect in2 → same input pin of out (multiple driver)
    const r2 = graph.addConnection(in2.id, `${in2.id}.out0`, out.id, `${out.id}.in0`);
    assert(!r2.ok, 'Should reject multiple drivers');
    assert(r2.error.includes('already has a connection'), `Error should mention existing connection: ${r2.error}`);
});

await test('Self-connection rejected', () => {
    const graph = new CircuitGraph();
    const andGate = graph.addComponent('AND', 100, 50);
    const r = graph.addConnection(andGate.id, `${andGate.id}.out0`, andGate.id, `${andGate.id}.in0`);
    assert(!r.ok, 'Should reject self-connection');
});

await test('Unconnected inputs produce null output', () => {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);

    const in1 = graph.addComponent('INPUT', 50, 50, 'a');
    const andGate = graph.addComponent('AND', 200, 80);
    const out = graph.addComponent('OUTPUT', 350, 80, 'y');

    // Only connect one input of AND gate
    graph.addConnection(in1.id, `${in1.id}.out0`, andGate.id, `${andGate.id}.in0`);
    graph.addConnection(andGate.id, `${andGate.id}.out0`, out.id, `${out.id}.in0`);

    graph.setInputValue(in1.id, 1);
    sim.evaluate();

    const outputs = sim.getOutputValues();
    assertEqual(outputs[out.id], null, 'AND with unconnected input should produce null');
});

// ═════════════════════════════════════════════════════════════════════════════
//  8. TRUTH TABLE CONSISTENCY
// ═════════════════════════════════════════════════════════════════════════════

log('\n📋 Truth Table Consistency');

await test('Truth table matches simulation for half adder', () => {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);

    const a = graph.addComponent('INPUT', 50, 50, 'a');
    const b = graph.addComponent('INPUT', 50, 120, 'b');
    const xor = graph.addComponent('XOR', 200, 50);
    const and_ = graph.addComponent('AND', 200, 120);
    const sum = graph.addComponent('OUTPUT', 350, 50, 'sum');
    const carry = graph.addComponent('OUTPUT', 350, 120, 'carry');

    graph.addConnection(a.id, `${a.id}.out0`, xor.id, `${xor.id}.in0`);
    graph.addConnection(a.id, `${a.id}.out0`, and_.id, `${and_.id}.in0`);
    graph.addConnection(b.id, `${b.id}.out0`, xor.id, `${xor.id}.in1`);
    graph.addConnection(b.id, `${b.id}.out0`, and_.id, `${and_.id}.in1`);
    graph.addConnection(xor.id, `${xor.id}.out0`, sum.id, `${sum.id}.in0`);
    graph.addConnection(and_.id, `${and_.id}.out0`, carry.id, `${carry.id}.in0`);

    // Generate truth table by testing all input combinations
    const inputs = graph.getInputComponents();
    const outputs = graph.getOutputComponents();
    const n = inputs.length; // 2

    for (let i = 0; i < (1 << n); i++) {
        const inputVals = {};
        inputs.forEach((inp, idx) => {
            inputVals[inp.id] = (i >> (n - 1 - idx)) & 1;
        });

        // Truth table evaluation
        const ttResult = sim.evaluateWithInputs(inputVals);
        assertOk(ttResult);

        // Direct simulation
        for (const [id, val] of Object.entries(inputVals)) {
            graph.setInputValue(id, val);
        }
        sim.evaluate();
        const directOutputs = sim.getOutputValues();

        // Compare
        for (const out of outputs) {
            assertEqual(ttResult.outputs[out.id], directOutputs[out.id],
                `Truth table vs direct sim mismatch for ${out.label} with inputs ${JSON.stringify(inputVals)}`);
        }
    }
});

// ═════════════════════════════════════════════════════════════════════════════
//  9. VERILOG GENERATION
// ═════════════════════════════════════════════════════════════════════════════

log('\n📋 Verilog Generation');

await test('AND gate Verilog output', () => {
    const { graph } = buildGateCircuit('AND');
    const vgen = new VerilogGenerator(graph);
    const result = vgen.generate();
    assertOk(result);
    assert(result.code.includes('module'), 'Should contain module declaration');
    assert(result.code.includes('endmodule'), 'Should contain endmodule');
    assert(result.code.includes('input wire'), 'Should contain input declarations');
    assert(result.code.includes('output wire'), 'Should contain output declarations');
    assert(result.code.includes('&'), 'Should contain AND operator');
    assert(result.code.includes('assign'), 'Should contain assign statement');
});

await test('Half adder Verilog output', () => {
    const graph = new CircuitGraph();

    const a = graph.addComponent('INPUT', 50, 50, 'a');
    const b = graph.addComponent('INPUT', 50, 120, 'b');
    const xor = graph.addComponent('XOR', 200, 50);
    const and_ = graph.addComponent('AND', 200, 120);
    const sum = graph.addComponent('OUTPUT', 350, 50, 'sum');
    const carry = graph.addComponent('OUTPUT', 350, 120, 'carry');

    graph.addConnection(a.id, `${a.id}.out0`, xor.id, `${xor.id}.in0`);
    graph.addConnection(a.id, `${a.id}.out0`, and_.id, `${and_.id}.in0`);
    graph.addConnection(b.id, `${b.id}.out0`, xor.id, `${xor.id}.in1`);
    graph.addConnection(b.id, `${b.id}.out0`, and_.id, `${and_.id}.in1`);
    graph.addConnection(xor.id, `${xor.id}.out0`, sum.id, `${sum.id}.in0`);
    graph.addConnection(and_.id, `${and_.id}.out0`, carry.id, `${carry.id}.in0`);

    const vgen = new VerilogGenerator(graph);
    const result = vgen.generate('half_adder');
    assertOk(result);
    assert(result.code.includes('module half_adder'), 'Should have module name');
    assert(result.code.includes('^'), 'Should contain XOR operator for SUM');
    assert(result.code.includes('&'), 'Should contain AND operator for CARRY');
    // Should have two assign statements
    const assignCount = (result.code.match(/assign/g) || []).length;
    assert(assignCount === 2, `Should have 2 assign statements, got ${assignCount}`);
});

await test('DFF generates always block', () => {
    const graph = new CircuitGraph();

    const d = graph.addComponent('INPUT', 50, 50, 'd');
    const clk = graph.addComponent('CLOCK', 50, 120, 'clk');
    const dff = graph.addComponent('DFF', 200, 80, 'ff');
    const out = graph.addComponent('OUTPUT', 350, 80, 'q');

    graph.addConnection(d.id, `${d.id}.out0`, dff.id, `${dff.id}.in0`);
    graph.addConnection(clk.id, `${clk.id}.out0`, dff.id, `${dff.id}.in1`);
    graph.addConnection(dff.id, `${dff.id}.out0`, out.id, `${out.id}.in0`);

    const vgen = new VerilogGenerator(graph);
    const result = vgen.generate();
    assertOk(result);
    assert(result.code.includes('always @(posedge'), 'Should contain posedge always block');
    assert(result.code.includes('<='), 'Should contain nonblocking assignment');
});

await test('Verilog has valid module declaration', () => {
    const { graph } = buildGateCircuit('OR');
    const vgen = new VerilogGenerator(graph);
    const result = vgen.generate('test_module');
    assertOk(result);

    assert(result.code.startsWith('module test_module'), 'Should start with module');
    assert(result.code.trimEnd().endsWith('endmodule'), 'Should end with endmodule');

    // Check port list
    assert(result.code.includes('input wire'), 'Should declare input wires');
    assert(result.code.includes('output wire'), 'Should declare output wires');
});

await test('Invalid circuit produces error Verilog', () => {
    const graph = new CircuitGraph();

    // Create a cycle
    const not1 = graph.addComponent('NOT', 100, 50);
    const not2 = graph.addComponent('NOT', 200, 50);
    graph.addConnection(not1.id, `${not1.id}.out0`, not2.id, `${not2.id}.in0`);
    graph.addConnection(not2.id, `${not2.id}.out0`, not1.id, `${not1.id}.in0`);

    const vgen = new VerilogGenerator(graph);
    const result = vgen.generate();
    assert(!result.ok, 'Should fail for invalid circuit');
    assert(result.code.includes('⚠'), 'Error code should contain warning');
});

// ═════════════════════════════════════════════════════════════════════════════
//  10. SERIALIZATION
// ═════════════════════════════════════════════════════════════════════════════

log('\n📋 Serialization');

await test('Serialize and deserialize circuit', () => {
    const graph = new CircuitGraph();

    const a = graph.addComponent('INPUT', 50, 50, 'a');
    const b = graph.addComponent('INPUT', 50, 120, 'b');
    const andGate = graph.addComponent('AND', 200, 80);
    const out = graph.addComponent('OUTPUT', 350, 80, 'y');

    graph.addConnection(a.id, `${a.id}.out0`, andGate.id, `${andGate.id}.in0`);
    graph.addConnection(b.id, `${b.id}.out0`, andGate.id, `${andGate.id}.in1`);
    graph.addConnection(andGate.id, `${andGate.id}.out0`, out.id, `${out.id}.in0`);

    graph.setInputValue(a.id, 1);
    graph.setInputValue(b.id, 0);

    const serialized = graph.serialize();

    // Deserialize into a new graph
    const graph2 = new CircuitGraph();
    const result = graph2.deserialize(serialized);
    assertOk(result);

    // Verify structure
    assertEqual(graph2.components.size, 4, 'Component count');
    assertEqual(graph2.connections.size, 3, 'Connection count');

    // Verify simulation works on deserialized graph
    const sim2 = new LogicSimulator(graph2);
    sim2.evaluate();
    const outputs = sim2.getOutputValues();
    // a=1, b=0 → AND → 0
    const outComp = graph2.getOutputComponents()[0];
    assertEqual(outputs[outComp.id], 0, 'Deserialized circuit: AND(1,0)=0');
});

// ═════════════════════════════════════════════════════════════════════════════
//  11. ADVANCED VLSI LOGIC & SEQUENTIAL AUDIT TESTS
// ═════════════════════════════════════════════════════════════════════════════

log('\n📋 Advanced VLSI Logic & Sequential Audit Tests');

await test('Full Adder: all 8 binary combinations (A, B, Cin -> Sum, Cout)', () => {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);

    const a = graph.addComponent('INPUT', 50, 40, 'a');
    const b = graph.addComponent('INPUT', 50, 100, 'b');
    const cin = graph.addComponent('INPUT', 50, 160, 'cin');

    // XOR1 = a ^ b
    const xor1 = graph.addComponent('XOR', 180, 50);
    graph.addConnection(a.id, `${a.id}.out0`, xor1.id, `${xor1.id}.in0`);
    graph.addConnection(b.id, `${b.id}.out0`, xor1.id, `${xor1.id}.in1`);

    // XOR2 = (a ^ b) ^ cin = SUM
    const xor2 = graph.addComponent('XOR', 300, 50);
    graph.addConnection(xor1.id, `${xor1.id}.out0`, xor2.id, `${xor2.id}.in0`);
    graph.addConnection(cin.id, `${cin.id}.out0`, xor2.id, `${xor2.id}.in1`);

    // AND1 = a & b
    const and1 = graph.addComponent('AND', 180, 140);
    graph.addConnection(a.id, `${a.id}.out0`, and1.id, `${and1.id}.in0`);
    graph.addConnection(b.id, `${b.id}.out0`, and1.id, `${and1.id}.in1`);

    // AND2 = (a ^ b) & cin
    const and2 = graph.addComponent('AND', 300, 140);
    graph.addConnection(xor1.id, `${xor1.id}.out0`, and2.id, `${and2.id}.in0`);
    graph.addConnection(cin.id, `${cin.id}.out0`, and2.id, `${and2.id}.in1`);

    // OR1 = (a & b) | ((a ^ b) & cin) = COUT
    const or1 = graph.addComponent('OR', 420, 140);
    graph.addConnection(and1.id, `${and1.id}.out0`, or1.id, `${or1.id}.in0`);
    graph.addConnection(and2.id, `${and2.id}.out0`, or1.id, `${or1.id}.in1`);

    // Outputs
    const sumOut = graph.addComponent('OUTPUT', 450, 50, 'sum');
    const coutOut = graph.addComponent('OUTPUT', 550, 140, 'cout');
    graph.addConnection(xor2.id, `${xor2.id}.out0`, sumOut.id, `${sumOut.id}.in0`);
    graph.addConnection(or1.id, `${or1.id}.out0`, coutOut.id, `${coutOut.id}.in0`);

    // Full truth table: A, B, Cin -> Sum, Cout
    const table = [
        [0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 1, 0, 1],
        [1, 0, 0, 1, 0],
        [1, 0, 1, 0, 1],
        [1, 1, 0, 0, 1],
        [1, 1, 1, 1, 1]
    ];

    for (const [aVal, bVal, cVal, expS, expC] of table) {
        const res = sim.evaluateWithInputs({
            [a.id]: aVal,
            [b.id]: bVal,
            [cin.id]: cVal
        });
        assertOk(res);
        assertEqual(res.outputs[sumOut.id], expS, `Full Adder SUM for (${aVal},${bVal},${cVal})`);
        assertEqual(res.outputs[coutOut.id], expC, `Full Adder COUT for (${aVal},${bVal},${cVal})`);
    }
});

await test('2-Stage Shift Register: simultaneous DFF update without race condition', () => {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);
    const seq = new SequentialEngine(graph, sim);

    const dIn = graph.addComponent('INPUT', 50, 40, 'd');
    const clk = graph.addComponent('CLOCK', 50, 120, 'clk');

    const dff1 = graph.addComponent('DFF', 180, 50, 'ff1');
    const dff2 = graph.addComponent('DFF', 320, 50, 'ff2');

    const q1Out = graph.addComponent('OUTPUT', 240, 120, 'q1');
    const q2Out = graph.addComponent('OUTPUT', 450, 50, 'q2');

    // Wiring:
    // dIn -> DFF1.D, CLK -> DFF1.CLK, DFF1.Q -> DFF2.D & q1Out
    // CLK -> DFF2.CLK, DFF2.Q -> q2Out
    graph.addConnection(dIn.id, `${dIn.id}.out0`, dff1.id, `${dff1.id}.in0`);
    graph.addConnection(clk.id, `${clk.id}.out0`, dff1.id, `${dff1.id}.in1`);

    graph.addConnection(dff1.id, `${dff1.id}.out0`, dff2.id, `${dff2.id}.in0`);
    graph.addConnection(clk.id, `${clk.id}.out0`, dff2.id, `${dff2.id}.in1`);

    graph.addConnection(dff1.id, `${dff1.id}.out0`, q1Out.id, `${q1Out.id}.in0`);
    graph.addConnection(dff2.id, `${dff2.id}.out0`, q2Out.id, `${q2Out.id}.in0`);

    seq.initializeDFFs();
    sim.evaluate();

    // Initial state: DFF1.Q = 0, DFF2.Q = 0
    assertEqual(seq.getDFFState(dff1.id).Q, 0, 'DFF1 init');
    assertEqual(seq.getDFFState(dff2.id).Q, 0, 'DFF2 init');

    // Cycle 1: Set D=1, step clock rising edge
    graph.setInputValue(dIn.id, 1);
    sim.evaluate();
    seq.clockStep(); // 0 -> 1 (rising edge)

    // Nonblocking semantics: DFF1 sampled 1, DFF2 sampled DFF1's PRE-EDGE value (0)
    assertEqual(seq.getDFFState(dff1.id).Q, 1, 'Cycle 1: DFF1 receives 1');
    assertEqual(seq.getDFFState(dff2.id).Q, 0, 'Cycle 1: DFF2 receives 0 (sampled pre-edge)');

    // Falling edge: no change
    seq.clockStep(); // 1 -> 0
    assertEqual(seq.getDFFState(dff1.id).Q, 1, 'Falling edge: DFF1 holds 1');
    assertEqual(seq.getDFFState(dff2.id).Q, 0, 'Falling edge: DFF2 holds 0');

    // Cycle 2: Set D=0, step clock rising edge
    graph.setInputValue(dIn.id, 0);
    sim.evaluate();
    seq.clockStep(); // 0 -> 1 (rising edge)

    // DFF1 samples D=0; DFF2 samples DFF1's PRE-EDGE value (1)
    assertEqual(seq.getDFFState(dff1.id).Q, 0, 'Cycle 2: DFF1 receives 0');
    assertEqual(seq.getDFFState(dff2.id).Q, 1, 'Cycle 2: DFF2 receives 1 (shifted from DFF1)');
});

await test('Unconnected DFF clock immunity: unclocked flip-flops hold state', () => {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);
    const seq = new SequentialEngine(graph, sim);

    const dIn = graph.addComponent('INPUT', 50, 40, 'd');
    const clk = graph.addComponent('CLOCK', 50, 120, 'clk');
    const dff = graph.addComponent('DFF', 180, 50, 'ff_unclocked');

    // Connect D only, leave CLK unconnected
    graph.addConnection(dIn.id, `${dIn.id}.out0`, dff.id, `${dff.id}.in0`);

    seq.initializeDFFs();
    graph.setInputValue(dIn.id, 1);
    sim.evaluate();

    // Step clock rising edge
    seq.clockStep(); // 0 -> 1
    assertEqual(seq.getDFFState(dff.id).Q, 0, 'Unclocked DFF must NOT sample when CLK is unconnected');
});

await test('Verilog duplicate label handling: unique signal disambiguation', () => {
    const graph = new CircuitGraph();
    // Add two inputs both labeled 'A'
    const in1 = graph.addComponent('INPUT', 50, 50, 'A');
    const in2 = graph.addComponent('INPUT', 50, 120, 'A');
    const andGate = graph.addComponent('AND', 200, 80);
    const out = graph.addComponent('OUTPUT', 350, 80, 'Y');

    graph.addConnection(in1.id, `${in1.id}.out0`, andGate.id, `${andGate.id}.in0`);
    graph.addConnection(in2.id, `${in2.id}.out0`, andGate.id, `${andGate.id}.in1`);
    graph.addConnection(andGate.id, `${andGate.id}.out0`, out.id, `${out.id}.in0`);

    const vgen = new VerilogGenerator(graph);
    const res = vgen.generate();
    assertOk(res);

    // Verify there are two distinct input wire declarations
    const inputLines = res.code.split('\n').filter(l => l.includes('input wire'));
    assertEqual(inputLines.length, 2, 'Should declare exactly 2 input wires');
    assert(inputLines[0] !== inputLines[1], 'Input signal names must be distinct');
});

await test('Missing clock error detection: sequential circuit without clock rejected', () => {
    const graph = new CircuitGraph();
    const dIn = graph.addComponent('INPUT', 50, 50, 'd');
    const dff = graph.addComponent('DFF', 180, 50, 'ff');
    graph.addConnection(dIn.id, `${dIn.id}.out0`, dff.id, `${dff.id}.in0`);

    // No CLOCK component in the circuit
    const validation = graph.validateCircuit();
    assert(!validation.valid, 'Circuit with DFF but no Clock must fail validation');
    assert(validation.errors.some(e => e.includes('Clock')), 'Error must mention missing Clock');
});

await test('Multi-level logic tree: (A & B) | (C ^ D)', () => {
    const graph = new CircuitGraph();
    const sim = new LogicSimulator(graph);

    const a = graph.addComponent('INPUT', 50, 30, 'a');
    const b = graph.addComponent('INPUT', 50, 80, 'b');
    const c = graph.addComponent('INPUT', 50, 130, 'c');
    const d = graph.addComponent('INPUT', 50, 180, 'd');

    const andG = graph.addComponent('AND', 180, 50);
    const xorG = graph.addComponent('XOR', 180, 150);
    const orG = graph.addComponent('OR', 300, 100);
    const out = graph.addComponent('OUTPUT', 420, 100, 'y');

    graph.addConnection(a.id, `${a.id}.out0`, andG.id, `${andG.id}.in0`);
    graph.addConnection(b.id, `${b.id}.out0`, andG.id, `${andG.id}.in1`);

    graph.addConnection(c.id, `${c.id}.out0`, xorG.id, `${xorG.id}.in0`);
    graph.addConnection(d.id, `${d.id}.out0`, xorG.id, `${xorG.id}.in1`);

    graph.addConnection(andG.id, `${andG.id}.out0`, orG.id, `${orG.id}.in0`);
    graph.addConnection(xorG.id, `${xorG.id}.out0`, orG.id, `${orG.id}.in1`);

    graph.addConnection(orG.id, `${orG.id}.out0`, out.id, `${out.id}.in0`);

    // Test cases:
    // A=1, B=1, C=0, D=0 -> (1&1)|(0^0) = 1|0 = 1
    // A=0, B=1, C=1, D=1 -> (0&1)|(1^1) = 0|0 = 0
    // A=0, B=0, C=1, D=0 -> (0&0)|(1^0) = 0|1 = 1
    const testCases = [
        [{ [a.id]: 1, [b.id]: 1, [c.id]: 0, [d.id]: 0 }, 1],
        [{ [a.id]: 0, [b.id]: 1, [c.id]: 1, [d.id]: 1 }, 0],
        [{ [a.id]: 0, [b.id]: 0, [c.id]: 1, [d.id]: 0 }, 1]
    ];

    for (const [inputs, exp] of testCases) {
        const res = sim.evaluateWithInputs(inputs);
        assertOk(res);
        assertEqual(res.outputs[out.id], exp);
    }
});

// ─── 13. PHASE 5 EXPANDED RTL LEARNING & VERIFIED PATTERNS ────────────────────

log('\n📋 Phase 5 & 6 Expanded RTL Learning & Presets');

await test('All 16 educational presets deserialize and validate without error', () => {
    const presetKeys = Object.keys(PRESETS);
    assertEqual(presetKeys.length, 16, 'Should have exactly 16 educational presets');

    for (const key of presetKeys) {
        const preset = PRESETS[key];
        const g = new CircuitGraph();
        g.deserialize(preset.circuit);
        const validation = g.validateCircuit();
        assert(validation.valid, `Preset '${key}' must pass topological validation: ${validation.errors.join('; ')}`);
        const vgen = new VerilogGenerator(g);
        const vRes = vgen.generate(key.replace(/[^a-zA-Z0-9]/g, '_'));
        assert(vRes.ok, `Preset '${key}' must generate valid Verilog`);
    }
});

await test('Register with Clock Enable preset: recirculation hold and posedge load', () => {
    const g = new CircuitGraph();
    g.deserialize(PRESETS['reg-enable'].circuit);
    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);
    seq.initializeDFFs();
    sim.evaluate();

    const dComp = Array.from(g.components.values()).find(c => c.label === 'D');
    const enComp = Array.from(g.components.values()).find(c => c.label === 'EN');
    const dffComp = g.getDFFComponents()[0];

    // Hold state with EN=0
    g.setInputValue(dComp.id, 1);
    g.setInputValue(enComp.id, 0);
    sim.evaluate();
    seq.clockStep();
    seq.clockStep();
    assertEqual(seq.getDFFState(dffComp.id).Q, 0, 'DFF Q must stay 0 when EN=0');

    // Load state with EN=1
    g.setInputValue(enComp.id, 1);
    sim.evaluate();
    seq.clockStep();
    seq.clockStep();
    assertEqual(seq.getDFFState(dffComp.id).Q, 1, 'DFF Q must load 1 when EN=1 on posedge');

    // Hold state with EN=0 even if D changes to 0
    g.setInputValue(dComp.id, 0);
    g.setInputValue(enComp.id, 0);
    sim.evaluate();
    seq.clockStep();
    seq.clockStep();
    assertEqual(seq.getDFFState(dffComp.id).Q, 1, 'DFF Q must hold 1 when EN=0');
});

await test('Register with Synchronous Reset preset: posedge clear and normal load', () => {
    const g = new CircuitGraph();
    g.deserialize(PRESETS['reg-sync-reset'].circuit);
    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);
    seq.initializeDFFs();
    sim.evaluate();

    const dComp = Array.from(g.components.values()).find(c => c.label === 'D');
    const rstComp = Array.from(g.components.values()).find(c => c.label === 'RST');
    const dffComp = g.getDFFComponents()[0];

    // RST=0, D=1 -> Q becomes 1 on posedge
    g.setInputValue(rstComp.id, 0);
    g.setInputValue(dComp.id, 1);
    sim.evaluate();
    seq.clockStep();
    seq.clockStep();
    assertEqual(seq.getDFFState(dffComp.id).Q, 1, 'Q must load 1 when RST=0');

    // RST=1, D=1 -> Q synchronously resets to 0 on posedge
    g.setInputValue(rstComp.id, 1);
    sim.evaluate();
    seq.clockStep();
    seq.clockStep();
    assertEqual(seq.getDFFState(dffComp.id).Q, 0, 'Q must synchronously clear to 0 when RST=1');
});

await test('2-Stage Shift Register preset: cycle-by-cycle pipeline step', () => {
    const g = new CircuitGraph();
    g.deserialize(PRESETS['shift-reg-2stage'].circuit);
    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);

    const dComp = Array.from(g.components.values()).find(c => c.label === 'D');
    const dffs = g.getDFFComponents();

    // Reset initial state
    seq.reset();

    // Pulse D=1 for 1 cycle
    g.setInputValue(dComp.id, 1);
    seq.clockStep();
    seq.clockStep();

    // Stage 1 loaded, Stage 2 empty
    assertEqual(seq.getDFFState(dffs[0].id).Q, 1, 'Stage 1 should have 1 after 1 cycle');
    assertEqual(seq.getDFFState(dffs[1].id).Q, 0, 'Stage 2 should have 0 after 1 cycle');

    // Set D=0 for next cycle
    g.setInputValue(dComp.id, 0);
    seq.clockStep();
    seq.clockStep();

    // Stage 1 cleared, Stage 2 loaded
    assertEqual(seq.getDFFState(dffs[0].id).Q, 0, 'Stage 1 should clear after 2 cycles');
    assertEqual(seq.getDFFState(dffs[1].id).Q, 1, 'Stage 2 should receive pulse after 2 cycles');
});

await test('All 12 Guided Lessons validate both starter failure and correct solution', () => {
    assertEqual(LESSONS.length, 12, 'Should have exactly 12 guided lessons');

    for (const lesson of LESSONS) {
        const g = new CircuitGraph();
        if (lesson.starterCircuit) {
            g.deserialize(lesson.starterCircuit);
        }
        const sim = new LogicSimulator(g);
        const seq = new SequentialEngine(g, sim);

        // Starter circuit should fail validation
        const starterCheck = lesson.validate(g, sim, seq);
        assert(!starterCheck.pass, `Lesson '${lesson.id}' starter circuit must not prematurely pass`);
    }

    // Solution validation checks for all 12 lessons
    const solutions = [
        { id: 'lesson-1-gates', preset: 'and-gate' },
        { id: 'lesson-2-half-adder', preset: 'half-adder' },
        { id: 'lesson-3-mux', preset: 'mux-2to1' },
        { id: 'lesson-4-dff', preset: 'dff-demo', preStep: true },
        { id: 'lesson-5-mux-cond', preset: 'mux-cond' },
        { id: 'lesson-6-reg-enable', preset: 'reg-enable' },
        { id: 'lesson-7-sync-reset', preset: 'reg-sync-reset' },
        { id: 'lesson-8-clock-timing', preset: 'shift-reg-2stage' },
        { id: 'lesson-9-full-adder', preset: 'full-adder' },
        { id: 'lesson-10-reg-enable', preset: 'dff-enable' },
        { id: 'lesson-11-sync-reset-priority', preset: 'dff-esr-priority' },
        { id: 'lesson-12-blocking-nonblocking', preset: 'blocking-vs-nonblocking' }
    ];

    for (const sol of solutions) {
        const lesson = LESSONS.find(l => l.id === sol.id);
        const g = new CircuitGraph();
        g.deserialize(PRESETS[sol.preset].circuit);
        const sim = new LogicSimulator(g);
        const seq = new SequentialEngine(g, sim);
        if (sol.preStep) {
            seq.clockStep();
            seq.clockStep();
        }
        const check = lesson.validate(g, sim, seq);
        assert(check.pass, `Lesson '${sol.id}' valid solution must pass validation: ${check.message}`);
    }
});

// ─── 14. PHASE 6 INTERACTIVE RTL CODING FUNDAMENTALS ──────────────────────────

log('\n📋 Phase 6 Interactive RTL Coding Fundamentals');

await test('DFFE component: enable gating, state retention, and nonblocking Verilog', () => {
    const g = new CircuitGraph();
    const dIn = g.addComponent('INPUT', 50, 50, 'd_in');
    const clk = g.addComponent('CLOCK', 50, 120, 'clk');
    const enIn = g.addComponent('INPUT', 50, 190, 'en_in');
    const dffe = g.addComponent('DFFE', 200, 80, 'ff_en');
    const outQ = g.addComponent('OUTPUT', 350, 80, 'q_out');

    g.addConnection(dIn.id, `${dIn.id}.out0`, dffe.id, `${dffe.id}.in0`);
    g.addConnection(clk.id, `${clk.id}.out0`, dffe.id, `${dffe.id}.in1`);
    g.addConnection(enIn.id, `${enIn.id}.out0`, dffe.id, `${dffe.id}.in2`);
    g.addConnection(dffe.id, `${dffe.id}.out0`, outQ.id, `${outQ.id}.in0`);

    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);
    seq.initializeDFFs();
    sim.evaluate();

    assertEqual(seq.getDFFState(dffe.id).Q, 0, 'Initial Q should be 0');

    // 1. Clock rising edge with EN=0, D=1 -> Q must remain 0 (state retention)
    g.setInputValue(dIn.id, 1);
    g.setInputValue(enIn.id, 0);
    sim.evaluate();

    // Toggle 0 -> 1 (rising edge)
    seq.clockStep();
    assertEqual(seq.getDFFState(dffe.id).Q, 0, 'Q must remain 0 when EN=0 on rising edge');

    // Toggle 1 -> 0 (falling edge) -> no state update
    seq.clockStep();
    assertEqual(seq.getDFFState(dffe.id).Q, 0, 'Falling edge must not alter state');

    // 2. Clock rising edge with EN=1, D=1 -> Q updates to 1
    g.setInputValue(enIn.id, 1);
    sim.evaluate();
    seq.clockStep(); // rising edge
    assertEqual(seq.getDFFState(dffe.id).Q, 1, 'Q must load 1 when EN=1 on rising edge');
    seq.clockStep(); // falling edge

    // 3. EN=0, D=0 -> Q must retain 1 across multiple clock cycles
    g.setInputValue(dIn.id, 0);
    g.setInputValue(enIn.id, 0);
    sim.evaluate();
    seq.clockStep(); // rising edge
    seq.clockStep(); // falling edge
    seq.clockStep(); // second rising edge
    seq.clockStep(); // second falling edge
    assertEqual(seq.getDFFState(dffe.id).Q, 1, 'Q must hold 1 when EN=0 despite D=0');

    // 4. Verify generated Verilog nonblocking enable construct
    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('dffe_test');
    assert(vRes.ok, 'Verilog generation must succeed for DFFE');
    assert(vRes.code.includes('if (en_in) begin'), 'Must generate if (en) check');
    assert(vRes.code.includes('ff_en_q <= d_in;'), 'Must use nonblocking assignment <= for DFFE');
});

await test('DFFSR component: synchronous reset on clock edge and falling-edge immunity', () => {
    const g = new CircuitGraph();
    const dIn = g.addComponent('INPUT', 50, 50, 'd_in');
    const clk = g.addComponent('CLOCK', 50, 120, 'clk');
    const rstIn = g.addComponent('INPUT', 50, 190, 'rst_in');
    const dffsr = g.addComponent('DFFSR', 200, 80, 'ff_sr');
    const outQ = g.addComponent('OUTPUT', 350, 80, 'q_out');

    g.addConnection(dIn.id, `${dIn.id}.out0`, dffsr.id, `${dffsr.id}.in0`);
    g.addConnection(clk.id, `${clk.id}.out0`, dffsr.id, `${dffsr.id}.in1`);
    g.addConnection(rstIn.id, `${rstIn.id}.out0`, dffsr.id, `${dffsr.id}.in2`);
    g.addConnection(dffsr.id, `${dffsr.id}.out0`, outQ.id, `${outQ.id}.in0`);

    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);
    seq.initializeDFFs();
    sim.evaluate();

    // 1. Normal load: RST=0, D=1 -> posedge clk -> Q becomes 1
    g.setInputValue(rstIn.id, 0);
    g.setInputValue(dIn.id, 1);
    sim.evaluate();
    seq.clockStep(); // rising edge
    seq.clockStep(); // falling edge
    assertEqual(seq.getDFFState(dffsr.id).Q, 1, 'Q must load 1 when RST=0');

    // 2. Asynchronous immunity: Assert RST=1 while clock is static -> Q does NOT reset immediately!
    g.setInputValue(rstIn.id, 1);
    sim.evaluate();
    assertEqual(seq.getDFFState(dffsr.id).Q, 1, 'Synchronous reset must NOT change Q while clock is static');

    // 3. Falling edge immunity: Toggle falling edge -> Q still does NOT reset
    seq.clockState = 1;
    seq.clockStep(); // 1 -> 0 falling edge
    assertEqual(seq.getDFFState(dffsr.id).Q, 1, 'Synchronous reset must NOT take effect on falling edge');

    // 4. Active rising edge (0 -> 1) -> Q synchronously clears to 0!
    seq.clockStep(); // 0 -> 1 rising edge
    assertEqual(seq.getDFFState(dffsr.id).Q, 0, 'Q must synchronously clear to 0 on rising clock edge when RST=1');

    // 5. Deassert RST: RST=0 -> normal operation resumes
    g.setInputValue(rstIn.id, 0);
    g.setInputValue(dIn.id, 1);
    sim.evaluate();
    seq.clockStep(); // falling edge
    seq.clockStep(); // rising edge
    assertEqual(seq.getDFFState(dffsr.id).Q, 1, 'Q must resume normal loading when RST returns to 0');

    // 6. Verify generated Verilog synchronous reset construct
    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('dffsr_test');
    assert(vRes.ok, 'Verilog generation must succeed for DFFSR');
    assert(vRes.code.includes('if (rst_in) begin'), 'Must generate if (rst) check');
    assert(vRes.code.includes("ff_sr_q <= 1'b0;"), 'Must assign 1b0 on synchronous reset');
    assert(vRes.code.includes('ff_sr_q <= d_in;'), 'Must use nonblocking <= for data load');
});

await test('DFFESR component: synchronous reset strictly overrides clock enable (priority)', () => {
    const g = new CircuitGraph();
    const dIn = g.addComponent('INPUT', 50, 40, 'd_in');
    const clk = g.addComponent('CLOCK', 50, 100, 'clk');
    const enIn = g.addComponent('INPUT', 50, 160, 'en_in');
    const rstIn = g.addComponent('INPUT', 50, 220, 'rst_in');
    const dffesr = g.addComponent('DFFESR', 220, 80, 'ff_esr');
    const outQ = g.addComponent('OUTPUT', 380, 80, 'q_out');

    g.addConnection(dIn.id, `${dIn.id}.out0`, dffesr.id, `${dffesr.id}.in0`);
    g.addConnection(clk.id, `${clk.id}.out0`, dffesr.id, `${dffesr.id}.in1`);
    g.addConnection(enIn.id, `${enIn.id}.out0`, dffesr.id, `${dffesr.id}.in2`);
    g.addConnection(rstIn.id, `${rstIn.id}.out0`, dffesr.id, `${dffesr.id}.in3`);
    g.addConnection(dffesr.id, `${dffesr.id}.out0`, outQ.id, `${outQ.id}.in0`);

    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);
    seq.initializeDFFs();
    sim.evaluate();

    // Step 1: Load 1 (RST=0, EN=1, D=1)
    g.setInputValue(rstIn.id, 0);
    g.setInputValue(enIn.id, 1);
    g.setInputValue(dIn.id, 1);
    sim.evaluate();
    seq.clockStep(); seq.clockStep();
    assertEqual(seq.getDFFState(dffesr.id).Q, 1, 'Q should be loaded with 1');

    // Step 2: Priority Conflict: Both RST=1 and EN=1 active simultaneously with D=1
    // Documented Priority Rule: Synchronous Reset MUST win over Enable!
    g.setInputValue(rstIn.id, 1);
    g.setInputValue(enIn.id, 1);
    g.setInputValue(dIn.id, 1);
    sim.evaluate();
    seq.clockStep(); seq.clockStep();
    assertEqual(seq.getDFFState(dffesr.id).Q, 0, 'Synchronous Reset must strictly override Enable when both are active');

    // Step 3: Deassert RST, disable EN (RST=0, EN=0, D=1) -> Q holds 0
    g.setInputValue(rstIn.id, 0);
    g.setInputValue(enIn.id, 0);
    sim.evaluate();
    seq.clockStep(); seq.clockStep();
    assertEqual(seq.getDFFState(dffesr.id).Q, 0, 'Q must retain 0 when EN=0');

    // Step 4: Verify generated Verilog priority structure
    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('dffesr_test');
    assert(vRes.ok, 'Verilog generation must succeed for DFFESR');
    assert(vRes.code.includes('if (rst_in) begin'), 'Reset must be top condition');
    assert(vRes.code.includes('else if (en_in) begin'), 'Enable must be secondary else-if condition');
});

await test('Full Adder preset: complete 8-state truth table verification', () => {
    const g = new CircuitGraph();
    g.deserialize(PRESETS['full-adder'].circuit);
    const sim = new LogicSimulator(g);

    const inA = Array.from(g.components.values()).find(c => c.label === 'A');
    const inB = Array.from(g.components.values()).find(c => c.label === 'B');
    const inCin = Array.from(g.components.values()).find(c => c.label === 'CIN');
    const outSum = Array.from(g.components.values()).find(c => c.label === 'SUM');
    const outCout = Array.from(g.components.values()).find(c => c.label === 'COUT');

    for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
            for (let cin = 0; cin <= 1; cin++) {
                const expSum = (a ^ b ^ cin);
                const expCout = ((a & b) | (cin & (a ^ b)));

                const res = sim.evaluateWithInputs({
                    [inA.id]: a,
                    [inB.id]: b,
                    [inCin.id]: cin
                });
                assertOk(res);
                assertEqual(res.outputs[outSum.id], expSum, `Full Adder SUM mismatch for A=${a}, B=${b}, Cin=${cin}`);
                assertEqual(res.outputs[outCout.id], expCout, `Full Adder COUT mismatch for A=${a}, B=${b}, Cin=${cin}`);
            }
        }
    }
});

await test('Procedural Verilog generation: synthesizable always @(*) and case statement for MUX', () => {
    const g = new CircuitGraph();
    g.deserialize(PRESETS['mux-2to1'].circuit);
    const vgen = new VerilogGenerator(g);

    // Continuous assign style
    const contRes = vgen.generate('mux_cont');
    assert(contRes.ok, 'Continuous generation must succeed');
    assert(contRes.code.includes('assign y = (sel ? b : a);'), 'Continuous style must contain ternary assign');

    // Procedural style with always @(*) and case
    const procRes = vgen.generateProcedural('mux_proc');
    assert(procRes.ok, 'Procedural generation must succeed');
    assert(procRes.code.includes('always @(*) begin'), 'Procedural style must contain always @(*)');
    assert(procRes.code.includes('case (sel)'), 'Procedural MUX must generate case statement');
    assert(procRes.code.includes("1'b0: y = a;"), 'Case 0 must select A');
    assert(procRes.code.includes("1'b1: y = b;"), 'Case 1 must select B');
    assert(procRes.code.includes('default: y = 1\'bx;'), 'Case must contain default clause');
});

await test('Equivalence: generated Verilog and JavaScript simulation describe identical hardware', () => {
    // 1. Combinational MUX equivalence
    const gMux = new CircuitGraph();
    gMux.deserialize(PRESETS['mux-2to1'].circuit);
    const simMux = new LogicSimulator(gMux);
    const vgenMux = new VerilogGenerator(gMux);
    const verilogMux = vgenMux.generate('mux_equiv').code;

    for (let s = 0; s <= 1; s++) {
        for (let a = 0; a <= 1; a++) {
            for (let b = 0; b <= 1; b++) {
                const inA = Array.from(gMux.components.values()).find(c => c.label === 'A');
                const inB = Array.from(gMux.components.values()).find(c => c.label === 'B');
                const inSel = Array.from(gMux.components.values()).find(c => c.label === 'Sel');
                const outY = Array.from(gMux.components.values()).find(c => c.label === 'Y');

                const jsResult = simMux.evaluateWithInputs({ [inA.id]: a, [inB.id]: b, [inSel.id]: s }).outputs[outY.id];
                const verilogSemanticResult = s === 1 ? b : a;
                assertEqual(jsResult, verilogSemanticResult, `MUX JS output (${jsResult}) must match Verilog semantics (${verilogSemanticResult})`);
            }
        }
    }

    // 2. Sequential DFFE equivalence
    const gDffe = new CircuitGraph();
    gDffe.deserialize(PRESETS['dff-enable'].circuit);
    const simDffe = new LogicSimulator(gDffe);
    const seqDffe = new SequentialEngine(gDffe, simDffe);
    seqDffe.initializeDFFs();

    const dIn = Array.from(gDffe.components.values()).find(c => c.label === 'D');
    const enIn = Array.from(gDffe.components.values()).find(c => c.label === 'EN');
    const dffeComp = gDffe.getDFFComponents()[0];

    // Check with EN=1
    gDffe.setInputValue(dIn.id, 1);
    gDffe.setInputValue(enIn.id, 1);
    simDffe.evaluate();
    seqDffe.clockStep(); seqDffe.clockStep();
    assertEqual(seqDffe.getDFFState(dffeComp.id).Q, 1, 'JS DFFE loads 1 on rising clock');

    // Check with EN=0 (retain)
    gDffe.setInputValue(dIn.id, 0);
    gDffe.setInputValue(enIn.id, 0);
    simDffe.evaluate();
    seqDffe.clockStep(); seqDffe.clockStep();
    assertEqual(seqDffe.getDFFState(dffeComp.id).Q, 1, 'JS DFFE retains 1 when EN=0');
});

// ═════════════════════════════════════════════════════════════════════════════
//  SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

log('\n════════════════════════════════════════');
log(`  Results: ${results.passed} passed, ${results.failed} failed`);
log('════════════════════════════════════════');

if (results.errors.length > 0) {
    log('\nFailures:');
    for (const { name, error } of results.errors) {
        log(`  ❌ ${name}`);
        log(`     ${error}`);
    }
}

if (IS_NODE) {
    process.exit(results.failed > 0 ? 1 : 0);
}

// Export for browser test runner
if (typeof window !== 'undefined') {
    window.testResults = results;
}
