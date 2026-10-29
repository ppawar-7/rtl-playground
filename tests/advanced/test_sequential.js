/**
 * test_sequential.js — Unit Tests and Verification for Phase C (Registers, Counters, Shift Registers)
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

import { MultiBitRegister, SequentialSimulationEngine } from '../../advanced-lab/engine/register_engine.js';
import { BinaryCounter, UniversalShiftRegister } from '../../advanced-lab/engine/counter_engine.js';
import { VectorSignal } from '../../advanced-lab/engine/vector_model.js';
import { AdvancedVerilogGenerator } from '../../advanced-lab/engine/advanced_verilog.js';
import { runYosys } from '@yowasp/yosys';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  ✅ ${testName}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${testName}`);
        failed++;
    }
}

console.log("=== Testing Multi-Bit Registers & Nonblocking Semantics (Phase C) ===");

// 1. MultiBitRegister Basic Operation
{
    const reg = new MultiBitRegister({ name: 'r0', width: 4, resetValue: 0xA });
    assert(reg.q.value === 0xA, "Register initialized to resetValue (0xA)");

    // Clock step with enable = 1
    const d5 = new VectorSignal({ width: 4, value: 5 });
    reg.step({ d: d5, en: 1, clkEdge: true });
    assert(reg.q.value === 5, "Register updated to 5 on posedge clock with en=1");

    // Clock step with enable = 0 (hold)
    const d9 = new VectorSignal({ width: 4, value: 9 });
    reg.step({ d: d9, en: 0, clkEdge: true });
    assert(reg.q.value === 5, "Register retains 5 when en=0");

    // Synchronous reset
    reg.step({ d: d9, rst: 1, en: 1, clkEdge: true });
    assert(reg.q.value === 0xA, "Register resets to resetValue (0xA) on rst=1");
}

// 2. Simultaneous Nonblocking Updates Across Pipeline Stages
{
    const sim = new SequentialSimulationEngine();
    const r1 = sim.addRegister(new MultiBitRegister({ name: 'r1', width: 4, resetValue: 0 }));
    const r2 = sim.addRegister(new MultiBitRegister({ name: 'r2', width: 4, resetValue: 0 }));
    const r3 = sim.addRegister(new MultiBitRegister({ name: 'r3', width: 4, resetValue: 0 }));

    // Inject value 7 into r1 on Cycle 0
    sim.clockCycle({
        r1: { d: new VectorSignal({ width: 4, value: 7 }) },
        r2: { d: r1.q },
        r3: { d: r2.q }
    });
    assert(r1.q.value === 7, "Cycle 0: r1 loaded with 7");
    assert(r2.q.value === 0, "Cycle 0: r2 sampled OLD r1 (0) before update — NO RACE CONDITION");
    assert(r3.q.value === 0, "Cycle 0: r3 sampled OLD r2 (0)");

    // Cycle 1: 7 propagates from r1 to r2, while 0x3 is injected into r1
    sim.clockCycle({
        r1: { d: new VectorSignal({ width: 4, value: 3 }) },
        r2: { d: r1.q },
        r3: { d: r2.q }
    });
    assert(r1.q.value === 3, "Cycle 1: r1 loaded with 3");
    assert(r2.q.value === 7, "Cycle 1: r2 loaded with 7 (pipelined from r1)");
    assert(r3.q.value === 0, "Cycle 1: r3 sampled r2's previous value (0)");

    // Cycle 2: 7 reaches r3
    sim.clockCycle({
        r1: { d: new VectorSignal({ width: 4, value: 0 }) },
        r2: { d: r1.q },
        r3: { d: r2.q }
    });
    assert(r3.q.value === 7, "Cycle 2: 7 successfully arrived at r3 after 2 pipeline stages");
}

console.log("\n=== Testing Binary Counters ===");

// 3. 4-bit Up Counter with Rollover
{
    const upCnt = new BinaryCounter({ width: 4 });
    assert(upCnt.count.value === 0, "Counter starts at 0");

    for (let i = 1; i <= 15; i++) {
        const out = upCnt.step({ en: 1, up: 1 });
        assert(out.count.value === i, `Counter count step ${i}`);
        if (i === 15) {
            assert(out.terminalCount === 1, "Terminal count asserted at count=15");
        } else {
            assert(out.terminalCount === 0, `Terminal count 0 at count=${i}`);
        }
    }

    // Rollover at 15 -> 0
    const roll = upCnt.step({ en: 1, up: 1 });
    assert(roll.count.value === 0, "4-bit counter rolled over from 15 to 0");
    assert(roll.rollover === true, "Rollover flag asserted");
}

// 4. Down Counter with Underflow
{
    const downCnt = new BinaryCounter({ width: 4, initialValue: 0 });
    const under = downCnt.step({ en: 1, up: 0 });
    assert(under.count.value === 15, "Down counter underflowed from 0 to 15");
    assert(under.rollover === true, "Underflow rollover flag asserted");

    downCnt.step({ en: 1, up: 0 });
    assert(downCnt.count.value === 14, "Down counter decremented to 14");
}

// 5. Modulo-10 Decade Counter
{
    const mod10 = new BinaryCounter({ width: 4, modulo: 10 });
    for (let i = 1; i <= 9; i++) {
        const res = mod10.step({ en: 1, up: 1 });
        assert(res.count.value === i, `Decade counter step ${i}`);
    }
    assert(mod10.terminalCount === 1, "Decade counter terminal count asserted at 9");

    const roll10 = mod10.step({ en: 1, up: 1 });
    assert(roll10.count.value === 0, "Decade counter rolled over from 9 to 0");
}

console.log("\n=== Testing Universal Shift Register ===");

// 6. Shift Register Operations (Parallel Load, Shift Right, Shift Left, Hold)
{
    const sreg = new UniversalShiftRegister({ width: 4 });

    // Parallel load 0b1011 (11)
    sreg.step({
        mode: UniversalShiftRegister.MODE_LOAD,
        parallel_d: new VectorSignal({ width: 4, value: 0b1011 })
    });
    assert(sreg.q.value === 0b1011, "PISO: Parallel loaded 0b1011");
    assert(sreg.q.toBinaryString() === "1011", "Shift register binary: 1011");

    // Hold state
    sreg.step({ mode: UniversalShiftRegister.MODE_HOLD });
    assert(sreg.q.value === 0b1011, "Shift register holds state");

    // Shift Right: sin_msb = 0
    // 1011 -> 0101 (5), sout_lsb was 1
    const shr1 = sreg.step({ mode: UniversalShiftRegister.MODE_SHR, sin_msb: 0 });
    assert(shr1.q.value === 0b0101, "Shift right step 1: 1011 -> 0101");
    assert(shr1.sout_lsb === 1, "Serial out bit 0 is 1");

    // Shift Right: sin_msb = 1
    // 0101 -> 1010 (10)
    const shr2 = sreg.step({ mode: UniversalShiftRegister.MODE_SHR, sin_msb: 1 });
    assert(shr2.q.value === 0b1010, "Shift right step 2 (with sin_msb=1): 0101 -> 1010");

    // Shift Left: sin_lsb = 1
    // 1010 -> 0101 (5)
    const shl1 = sreg.step({ mode: UniversalShiftRegister.MODE_SHL, sin_lsb: 1 });
    assert(shl1.q.value === 0b0101, "Shift left step 1: 1010 -> 0101");
    assert(shl1.sout_msb === 0, "Serial out MSB is 0");
}

console.log(`\n========================================`);
console.log(`  Phase C Test Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
