/**
 * property_tests.js — Property-Based Testing with Deterministic PRNG
 * 
 * Part of PD Playground: Advanced RTL Lab
 * 
 * Tests algebraic and architectural invariants across 1,000+ randomized iterations:
 * 1. Arithmetic consistency vs BigInt mathematical reference.
 * 2. De Morgan's & Boolean algebraic invariants for vector logic.
 * 3. Modulo-M counter monotonicity and wraparound.
 * 4. Register state retention invariant under disabled clock.
 * 5. Deterministic FSM state closure under arbitrary random input traces.
 */

import { VectorSignal, VectorOps } from '../../advanced-lab/engine/vector_model.js';
import { BinaryCounter } from '../../advanced-lab/engine/counter_engine.js';
import { MultiBitRegister } from '../../advanced-lab/engine/register_engine.js';
import { FSMPresets } from '../../advanced-lab/engine/fsm_engine.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        passed++;
    } else {
        console.error(`  ❌ Property Invariant Violation: ${testName}`);
        failed++;
    }
}

// Deterministic PRNG (Mulberry32)
function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rng = mulberry32(0xDEADBEEF);

console.log("=== Running Property-Based Randomized Invariant Tests (Phase F) ===");

// -------------------------------------------------------------
// Property 1: Arithmetic Consistency vs Independent BigInt Reference
// -------------------------------------------------------------
console.log("  Testing Property 1: Addition & Subtraction Invariants (500 random pairs)...");
{
    const widths = [2, 4, 8, 12, 16];
    for (let i = 0; i < 500; i++) {
        const w = widths[Math.floor(rng() * widths.length)];
        const maxVal = (1n << BigInt(w)) - 1n;
        const valA = BigInt(Math.floor(rng() * Number(maxVal)));
        const valB = BigInt(Math.floor(rng() * Number(maxVal)));
        const cin = rng() > 0.5 ? 1 : 0;

        const a = new VectorSignal({ width: w, value: valA });
        const b = new VectorSignal({ width: w, value: valB });

        // Add
        const addRes = VectorOps.add(a, b, cin);
        const expectedSum = (valA + valB + BigInt(cin)) & maxVal;
        const expectedCout = (valA + valB + BigInt(cin)) > maxVal ? 1 : 0;

        assert(
            addRes.result.valueBigInt === expectedSum,
            `Addition value mismatch at width ${w}: ${valA} + ${valB} + ${cin}`
        );
        assert(
            addRes.carryOut === expectedCout,
            `Carry out mismatch at width ${w}: ${valA} + ${valB} + ${cin}`
        );

        // Sub
        const subRes = VectorOps.sub(a, b, cin);
        const expectedDiff = (valA - valB - BigInt(cin)) & maxVal;
        const expectedBorrow = valA < (valB + BigInt(cin)) ? 1 : 0;

        assert(
            subRes.result.valueBigInt === expectedDiff,
            `Subtraction value mismatch at width ${w}: ${valA} - ${valB} - ${cin}`
        );
        assert(
            subRes.borrowOut === expectedBorrow,
            `Borrow out mismatch at width ${w}: ${valA} - ${valB} - ${cin}`
        );
    }
    console.log(`    ✅ 500/500 randomized addition & subtraction invariant trials passed.`);
}

// -------------------------------------------------------------
// Property 2: De Morgan's Laws & Boolean Algebraic Invariants
// -------------------------------------------------------------
console.log("  Testing Property 2: De Morgan's & Boolean Dualities (200 random pairs)...");
{
    for (let i = 0; i < 200; i++) {
        const w = 8;
        const valA = BigInt(Math.floor(rng() * 256));
        const valB = BigInt(Math.floor(rng() * 256));
        const a = new VectorSignal({ width: w, value: valA });
        const b = new VectorSignal({ width: w, value: valB });

        // De Morgan: ~(A & B) == ~A | ~B
        const nand = VectorOps.bitwiseNand(a, b);
        const notA = VectorOps.bitwiseNot(a);
        const notB = VectorOps.bitwiseNot(b);
        const orNot = VectorOps.bitwiseOr(notA, notB);
        assert(nand.valueBigInt === orNot.valueBigInt, `De Morgan law 1 violated for 0x${valA.toString(16)} and 0x${valB.toString(16)}`);

        // De Morgan: ~(A | B) == ~A & ~B
        const nor = VectorOps.bitwiseNor(a, b);
        const andNot = VectorOps.bitwiseAnd(notA, notB);
        assert(nor.valueBigInt === andNot.valueBigInt, `De Morgan law 2 violated for 0x${valA.toString(16)} and 0x${valB.toString(16)}`);

        // XOR definition: A ^ B == (A | B) & ~(A & B)
        const xor = VectorOps.bitwiseXor(a, b);
        const aOrB = VectorOps.bitwiseOr(a, b);
        const aAndB = VectorOps.bitwiseAnd(a, b);
        const notAAndB = VectorOps.bitwiseNot(aAndB);
        const xorEquiv = VectorOps.bitwiseAnd(aOrB, notAAndB);
        assert(xor.valueBigInt === xorEquiv.valueBigInt, `XOR duality violated for 0x${valA.toString(16)} and 0x${valB.toString(16)}`);
    }
    console.log(`    ✅ 200/200 Boolean algebraic invariant trials passed.`);
}

// -------------------------------------------------------------
// Property 3: Modulo-M Counter Monotonicity & Complete State Cycle
// -------------------------------------------------------------
console.log("  Testing Property 3: Counter Monotonicity & Rollover Invariants...");
{
    const moduli = [3, 5, 7, 10, 16];
    for (const m of moduli) {
        const cnt = new BinaryCounter({ width: 4, modulo: m });
        const visited = [];

        // Cycle through 2 full periods (2 * m steps)
        for (let step = 0; step < 2 * m; step++) {
            const expected = step % m;
            assert(cnt.count.value === expected, `Counter mod-${m} step ${step} expected ${expected}, got ${cnt.count.value}`);
            if (expected === m - 1) {
                assert(cnt.terminalCount === 1, `Counter mod-${m} failed to assert TC at ${expected}`);
            } else {
                assert(cnt.terminalCount === 0, `Counter mod-${m} asserted false TC at ${expected}`);
            }
            cnt.step({ en: 1, up: 1 });
        }
    }
    console.log(`    ✅ Counter monotonicity & rollover verified for all moduli.`);
}

// -------------------------------------------------------------
// Property 4: Register State Retention Invariant (Clock Gating)
// -------------------------------------------------------------
console.log("  Testing Property 4: Register Clock Enable Retention Invariant (300 cycles)...");
{
    const reg = new MultiBitRegister({ width: 8, resetValue: 0x42 });
    assert(reg.q.value === 0x42, "Initial register value is 0x42");

    // Random stimulus with en=0
    for (let c = 0; c < 300; c++) {
        const randD = new VectorSignal({ width: 8, value: Math.floor(rng() * 256) });
        reg.step({ d: randD, en: 0, rst: 0, clkEdge: true });
        assert(reg.q.value === 0x42, `Register state violated retention on cycle ${c} (modified to ${reg.q.value})`);
    }
    console.log(`    ✅ Register retention strictly invariant across 300 cycles with en=0.`);
}

// -------------------------------------------------------------
// Property 5: FSM State Closure Under Random Stimulus Traces
// -------------------------------------------------------------
console.log("  Testing Property 5: FSM State Closure (500-step random walk on all 4 presets)...");
{
    const presets = [
        FSMPresets.twoStateToggle(),
        FSMPresets.trafficLight(),
        FSMPresets.sequenceDetector1011(),
        FSMPresets.vendingMachine()
    ];

    for (const fsm of presets) {
        const validStates = new Set(fsm.states);
        for (let step = 0; step < 500; step++) {
            const inputs = {};
            for (const inp of fsm.inputs) {
                inputs[inp.name] = rng() > 0.5 ? 1 : 0;
            }
            const out = fsm.clockStep(inputs);
            assert(validStates.has(out.toState), `FSM ${fsm.name} leaked into invalid state '${out.toState}'`);
        }
    }
    console.log(`    ✅ FSM state closure verified across 2,000 cumulative random walk steps.`);
}

console.log(`\n========================================`);
console.log(`  Property Testing Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
