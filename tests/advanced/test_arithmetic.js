/**
 * test_arithmetic.js — Unit Tests and Yosys Synthesis Checks for Phase B
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

import { HalfAdder, FullAdder, RippleCarryAdder, EducationalALU } from '../../advanced-lab/engine/arithmetic_engine.js';
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

console.log("=== Testing Arithmetic Engine & ALU (Phase B) ===");

// 1. Half Adder Truth Table
{
    const ha00 = HalfAdder.compute(0, 0);
    assert(ha00.sum === 0 && ha00.carry === 0, "HalfAdder 0+0 => sum=0, carry=0");

    const ha01 = HalfAdder.compute(0, 1);
    assert(ha01.sum === 1 && ha01.carry === 0, "HalfAdder 0+1 => sum=1, carry=0");

    const ha10 = HalfAdder.compute(1, 0);
    assert(ha10.sum === 1 && ha10.carry === 0, "HalfAdder 1+0 => sum=1, carry=0");

    const ha11 = HalfAdder.compute(1, 1);
    assert(ha11.sum === 0 && ha11.carry === 1, "HalfAdder 1+1 => sum=0, carry=1");
    assert(ha11.explanation.includes('CARRY is 1'), "HalfAdder provides carry generation explanation");
}

// 2. Full Adder (8 Combinations & P/G Generation)
{
    for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
            for (let cin = 0; cin <= 1; cin++) {
                const fa = FullAdder.compute(a, b, cin);
                const expectedSum = (a + b + cin) % 2;
                const expectedCout = (a + b + cin) >= 2 ? 1 : 0;
                assert(
                    fa.sum === expectedSum && fa.cout === expectedCout,
                    `FullAdder (${a}+${b}+${cin}) => sum=${expectedSum}, cout=${expectedCout}`
                );
            }
        }
    }

    // Check Propagate and Generate distinction
    const faGen = FullAdder.compute(1, 1, 0);
    assert(faGen.g === 1 && faGen.p === 0, "FullAdder: 1,1 produces Generate (G=1, P=0)");
    assert(faGen.carryReason.includes('Generated locally'), "Reason explains carry generation");

    const faProp = FullAdder.compute(1, 0, 1);
    assert(faProp.g === 0 && faProp.p === 1 && faProp.cout === 1, "FullAdder: 1,0 with Cin=1 produces Propagate (G=0, P=1, Cout=1)");
    assert(faProp.carryReason.includes('Propagated from stage below'), "Reason explains carry propagation");
}

// 3. Ripple-Carry Adder (4-bit & 8-bit Stage Traces)
{
    const rca4 = new RippleCarryAdder(4);

    // Test 1: Simple addition 5 + 3 = 8
    const a5 = new VectorSignal({ width: 4, value: 5 });
    const b3 = new VectorSignal({ width: 4, value: 3 });
    const res1 = rca4.compute(a5, b3, 0);
    assert(res1.sum.value === 8, "RCA4: 5 + 3 = 8");
    assert(res1.carryOut === 0, "RCA4: 5 + 3 carryOut = 0");
    assert(res1.stages.length === 4, "RCA4 has 4 stages");

    // Test 2: Full ripple propagation across all 4 stages: 0b1111 (15) + 0b0001 (1)
    // Stage 0 generates carry; stages 1, 2, 3 all propagate it
    const a15 = new VectorSignal({ width: 4, value: 15 });
    const b1 = new VectorSignal({ width: 4, value: 1 });
    const resProp = rca4.compute(a15, b1, 0);
    assert(resProp.sum.value === 0, "RCA4: 15 + 1 modulo-16 sum is 0");
    assert(resProp.carryOut === 1, "RCA4: 15 + 1 carryOut is 1");
    assert(resProp.extendedSum.value === 16, "RCA4: extended 5-bit sum is 16");
    assert(resProp.stages[0].g === 1, "Stage 0 generated carry");
    assert(resProp.stages[1].p === 1 && resProp.stages[1].cin === 1, "Stage 1 propagated carry");
    assert(resProp.stages[2].p === 1 && resProp.stages[2].cin === 1, "Stage 2 propagated carry");
    assert(resProp.stages[3].p === 1 && resProp.stages[3].cin === 1, "Stage 3 propagated carry");

    // Test 3: 8-bit RCA
    const rca8 = new RippleCarryAdder(8);
    const a8 = new VectorSignal({ width: 8, value: 200 });
    const b8 = new VectorSignal({ width: 8, value: 100 });
    const res8 = rca8.compute(a8, b8, 0);
    assert(res8.sum.value === 44, "RCA8: 200 + 100 = 300 % 256 = 44");
    assert(res8.carryOut === 1, "RCA8: carryOut = 1");
    assert(res8.extendedSum.value === 300, "RCA8: extendedSum = 300");
}

// 4. Educational ALU
{
    const alu = new EducationalALU(4);
    const a = new VectorSignal({ width: 4, value: 6 });
    const b = new VectorSignal({ width: 4, value: 2 });

    // ADD
    const addOut = alu.execute(EducationalALU.OP_ADD, a, b);
    assert(addOut.result.value === 8, "ALU ADD 6 + 2 = 8");
    assert(addOut.flags.Z === 0, "Z flag is 0");
    assert(addOut.flags.C === 0, "C flag is 0");
    assert(addOut.flags.V === 1, "V flag is 1 (+6 + +2 = -8 in 4-bit signed)");
    assert(addOut.flags.N === 1, "N flag is 1 (MSB of 8 is 1)");

    // SUB: 6 - 2 = 4
    const subOut = alu.execute(EducationalALU.OP_SUB, a, b);
    assert(subOut.result.value === 4, "ALU SUB 6 - 2 = 4");
    assert(subOut.flags.Z === 0 && subOut.flags.C === 0 && subOut.flags.V === 0 && subOut.flags.N === 0, "Flags all 0 for 6 - 2");

    // SUB: 2 - 6 = -4 (12 in 4-bit unsigned, borrow = 1)
    const subBorrow = alu.execute(EducationalALU.OP_SUB, b, a);
    assert(subBorrow.result.value === 12, "ALU SUB 2 - 6 = 12 (2's complement -4)");
    assert(subBorrow.flags.C === 1, "C flag = 1 (borrow asserted)");
    assert(subBorrow.flags.N === 1, "N flag = 1 (MSB set)");

    // SUB: 6 - 6 = 0 (Zero flag)
    const subZero = alu.execute(EducationalALU.OP_SUB, a, a);
    assert(subZero.result.value === 0, "ALU SUB 6 - 6 = 0");
    assert(subZero.flags.Z === 1, "Z flag = 1 for zero result");

    // Bitwise AND, OR, XOR, NOT
    const andOut = alu.execute(EducationalALU.OP_AND, a, b);
    assert(andOut.result.value === (6 & 2), "ALU AND 6 & 2 = 2");

    const orOut = alu.execute(EducationalALU.OP_OR, a, b);
    assert(orOut.result.value === (6 | 2), "ALU OR 6 | 2 = 6");

    const xorOut = alu.execute(EducationalALU.OP_XOR, a, b);
    assert(xorOut.result.value === (6 ^ 2), "ALU XOR 6 ^ 2 = 4");

    const notOut = alu.execute(EducationalALU.OP_NOT, a, b);
    assert(notOut.result.value === (~6 & 0xF), "ALU NOT ~6 & 0xF = 9");

    // Shift Left: 6 (0110) << 1 = 12 (1100), MSB was 0
    const shlOut = alu.execute(EducationalALU.OP_SHL, a, b);
    assert(shlOut.result.value === 12, "ALU SHL 6 << 1 = 12");
    assert(shlOut.flags.C === 0, "C flag is 0 (MSB of 6 is 0)");

    // Shift Left with MSB=1: 9 (1001) << 1 = 2 (0010), shifted out MSB=1
    const a9 = new VectorSignal({ width: 4, value: 9 });
    const shlCarry = alu.execute(EducationalALU.OP_SHL, a9, b);
    assert(shlCarry.result.value === 2, "ALU SHL 9 << 1 = 2");
    assert(shlCarry.flags.C === 1, "C flag is 1 (shifted out MSB=1)");

    // Shift Right: 6 (0110) >> 1 = 3 (0011), LSB was 0
    const shrOut = alu.execute(EducationalALU.OP_SHR, a, b);
    assert(shrOut.result.value === 3, "ALU SHR 6 >> 1 = 3");
    assert(shrOut.flags.C === 0, "C flag is 0 (LSB of 6 is 0)");
}

// 5. Verilog Generation & Yosys Elaboration / Synthesis Check
console.log("\n=== Verifying Generated Verilog HDL with Yosys ===");

async function verifyWithYosys(name, code, top) {
    const fileName = `${name}.v`;
    const script = `
        read_verilog ${fileName};
        hierarchy -check -top ${top};
        proc;
        opt;
        check -assert;
        stat;
    `;
    try {
        await runYosys(['-p', script], { [fileName]: code });
        console.log(`  ✅ Yosys synthesized: ${name} (${top})`);
        passed++;
    } catch (err) {
        console.error(`  ❌ Yosys failed on ${name}:`, err);
        failed++;
    }
}

// Generate Verilog modules
const vHalfAdder = AdvancedVerilogGenerator.generateHalfAdder();
const vFullAdder = AdvancedVerilogGenerator.generateFullAdder();
const vRCA = AdvancedVerilogGenerator.generateRippleCarryAdder({ width: 4 });
const vALU = AdvancedVerilogGenerator.generateALU({ width: 4 });
const vReg = AdvancedVerilogGenerator.generateRegister({ width: 4 });
const vCounter = AdvancedVerilogGenerator.generateCounter({ width: 4 });
const vShift = AdvancedVerilogGenerator.generateShiftRegister({ width: 4 });

await verifyWithYosys('half_adder', vHalfAdder, 'half_adder');
await verifyWithYosys('full_adder', vFullAdder, 'full_adder');
await verifyWithYosys('ripple_carry_adder', vRCA, 'ripple_carry_adder');
await verifyWithYosys('educational_alu', vALU, 'educational_alu');
await verifyWithYosys('multi_bit_register', vReg, 'multi_bit_register');
await verifyWithYosys('modulo_counter', vCounter, 'modulo_counter');
await verifyWithYosys('shift_register', vShift, 'shift_register');

console.log(`\n========================================`);
console.log(`  Phase B Test Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
