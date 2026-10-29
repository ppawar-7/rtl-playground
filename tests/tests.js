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

if (IS_NODE) {
    // Node.js: dynamic import
    const cg = await import('../src/engine/circuit_graph.js');
    const ls = await import('../src/engine/logic_simulator.js');
    const se = await import('../src/engine/sequential_engine.js');
    const vg = await import('../src/engine/verilog_generator.js');
    CircuitGraph = cg.CircuitGraph;
    COMPONENT_TYPES = cg.COMPONENT_TYPES;
    resetIdCounter = cg.resetIdCounter;
    LogicSimulator = ls.LogicSimulator;
    SequentialEngine = se.SequentialEngine;
    VerilogGenerator = vg.VerilogGenerator;
} else {
    // Browser: imports provided by test_runner.html
    ({ CircuitGraph, COMPONENT_TYPES, resetIdCounter } = await import('../src/engine/circuit_graph.js'));
    ({ LogicSimulator } = await import('../src/engine/logic_simulator.js'));
    ({ SequentialEngine } = await import('../src/engine/sequential_engine.js'));
    ({ VerilogGenerator } = await import('../src/engine/verilog_generator.js'));
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
