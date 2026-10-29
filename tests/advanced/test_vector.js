/**
 * test_vector.js — Unit Tests for VectorSignal and VectorOps
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

import { VectorSignal, VectorOps, WidthMismatchError } from '../../advanced-lab/engine/vector_model.js';

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

function assertThrows(fn, expectedErrorType, testName) {
    try {
        fn();
        console.error(`  ❌ FAIL (did not throw): ${testName}`);
        failed++;
    } catch (err) {
        if (!expectedErrorType || err instanceof expectedErrorType) {
            console.log(`  ✅ ${testName} (threw ${err.name})`);
            passed++;
        } else {
            console.error(`  ❌ FAIL (wrong error type ${err.name}): ${testName}`);
            failed++;
        }
    }
}

console.log("=== Testing VectorSignal & VectorOps (Phase A) ===");

// 1. VectorSignal Creation and Widths
{
    const v4 = new VectorSignal({ name: 'data', width: 4, value: 5 });
    assert(v4.width === 4 && v4.value === 5, "4-bit vector initialized to 5");
    assert(v4.toBinaryString() === "0101", "toBinaryString padded to 4 bits: '0101'");
    assert(v4.toHexString() === "0x5", "toHexString: '0x5'");
    assert(v4.toVerilogString() === "4'b0101", "toVerilogString binary format: 4'b0101");
    assert(v4.toVerilogString('hex') === "4'h5", "toVerilogString hex format: 4'h5");
    assert(v4.toUnsignedDecimal() === 5, "Unsigned decimal is 5");
    assert(v4.toSignedDecimal() === 5, "Signed decimal is 5 (MSB=0)");

    // Masking test: 0b11111 (31) into 4-bit must become 0b1111 (15)
    const vMask = new VectorSignal({ width: 4, value: 31 });
    assert(vMask.value === 15, "Width-aware clamping: 31 clamped to 15 in 4-bit");
    assert(vMask.toBinaryString() === "1111", "Clamped binary is '1111'");
    assert(vMask.toSignedDecimal() === -1, "4-bit 0b1111 is -1 in 2's complement");

    // Negative input normalized to 2's complement
    const vNeg = new VectorSignal({ width: 4, value: -3 });
    assert(vNeg.value === 13, "-3 in 4-bit 2's complement is 13 (0b1101)");
    assert(vNeg.toSignedDecimal() === -3, "Round-trips back to -3 via toSignedDecimal");

    // Negative -8 (minimum 4-bit signed number)
    const vMin = new VectorSignal({ width: 4, value: 8 });
    assert(vMin.toSignedDecimal() === -8, "0b1000 in 4-bit is -8");

    // 16-bit boundary
    const v16 = new VectorSignal({ width: 16, value: 0xFFFF });
    assert(v16.value === 65535, "16-bit 0xFFFF is 65535");
    assert(v16.toHexString() === "0xFFFF", "16-bit toHexString formatted correctly");
}

// 2. Unresolved ('X') Signal Handling
{
    const vX = new VectorSignal({ width: 4, isValid: false });
    assert(!vX.isValid, "Unresolved signal has isValid=false");
    assert(vX.value === null, "Unresolved value is null");
    assert(vX.toBinaryString() === "XXXX", "Unresolved binary string is 'XXXX'");
    assert(vX.toVerilogString() === "4'bxxxx", "Unresolved Verilog literal is 4'bxxxx");
}

// 3. Bit Access & Modification
{
    const v = new VectorSignal({ width: 4, value: 0b1010 });
    assert(v.getBit(0) === 0, "LSB is 0");
    assert(v.getBit(1) === 1, "Bit 1 is 1");
    assert(v.getBit(2) === 0, "Bit 2 is 0");
    assert(v.getBit(3) === 1, "MSB (Bit 3) is 1");
    assertThrows(() => v.getBit(4), RangeError, "Out of range bit access throws RangeError");

    const vMod = v.withBit(0, 1);
    assert(vMod.value === 0b1011, "withBit(0, 1) returns new vector with value 0b1011");
    assert(v.value === 0b1010, "Original vector remains immutable");
}

// 4. Bitwise Operations
{
    const a = new VectorSignal({ width: 4, value: 0b1100 });
    const b = new VectorSignal({ width: 4, value: 0b1010 });

    const andRes = VectorOps.bitwiseAnd(a, b);
    assert(andRes.value === 0b1000, "1100 & 1010 = 1000");

    const orRes = VectorOps.bitwiseOr(a, b);
    assert(orRes.value === 0b1110, "1100 | 1010 = 1110");

    const xorRes = VectorOps.bitwiseXor(a, b);
    assert(xorRes.value === 0b0110, "1100 ^ 1010 = 0110");

    const notRes = VectorOps.bitwiseNot(a);
    assert(notRes.value === 0b0011, "~1100 in 4-bit = 0011");

    const nandRes = VectorOps.bitwiseNand(a, b);
    assert(nandRes.value === 0b0111, "~(1100 & 1010) = 0111");

    const norRes = VectorOps.bitwiseNor(a, b);
    assert(norRes.value === 0b0001, "~(1100 | 1010) = 0001");

    const xnorRes = VectorOps.bitwiseXnor(a, b);
    assert(xnorRes.value === 0b1001, "~(1100 ^ 1010) = 1001");
}

// 5. Width Mismatch Error Detection
{
    const a4 = new VectorSignal({ width: 4, value: 3 });
    const b8 = new VectorSignal({ width: 8, value: 3 });

    assertThrows(() => VectorOps.bitwiseAnd(a4, b8), WidthMismatchError, "Bitwise AND with unequal widths throws WidthMismatchError");
    assertThrows(() => VectorOps.add(a4, b8), WidthMismatchError, "Addition with unequal widths throws WidthMismatchError");
    assertThrows(() => VectorOps.mux(new VectorSignal({ width: 1, value: 1 }), a4, b8), WidthMismatchError, "Mux with unequal input widths throws WidthMismatchError");
}

// 6. Addition & Subtraction (Carry, Truncation, Signed Overflow)
{
    // Normal 4-bit addition: 5 + 2 = 7 (within 4-bit signed range [-8..+7])
    const a = new VectorSignal({ width: 4, value: 5 });
    const b = new VectorSignal({ width: 4, value: 2 });
    const add1 = VectorOps.add(a, b);
    assert(add1.result.value === 7, "5 + 2 = 7");
    assert(add1.carryOut === 0, "No unsigned carry out");
    assert(add1.overflowSigned === false, "No signed overflow for 5 + 2 = 7");

    // Signed overflow: 5 + 3 = 8 (0b1000 = -8 in 4-bit signed, exceeds +7)
    const b3 = new VectorSignal({ width: 4, value: 3 });
    const addOverflow = VectorOps.add(a, b3);
    assert(addOverflow.result.value === 8, "5 + 3 = 8 (0b1000)");
    assert(addOverflow.overflowSigned === true, "Signed overflow detected for 5 + 3 = 8 in 4-bit signed");

    // Overflow & Truncation: 12 + 6 = 18 = 0b10010 -> 4-bit result is 2 (0b0010), Carry = 1
    const a12 = new VectorSignal({ width: 4, value: 12 });
    const b6 = new VectorSignal({ width: 4, value: 6 });
    const add2 = VectorOps.add(a12, b6);
    assert(add2.result.value === 2, "12 + 6 in 4-bit modulo truncates to 2");
    assert(add2.carryOut === 1, "Carry out is 1");

    // Extended width addition: 12 + 6 with extendWidth=true produces 5-bit vector with value 18
    const addExt = VectorOps.add(a12, b6, 0, true);
    assert(addExt.result.width === 5, "Extended addition has width 5");
    assert(addExt.result.value === 18, "Extended result is 18");

    // Signed overflow: 7 (0b0111) + 2 (0b0010) = 9 (0b1001 = -7 in signed)
    const a7 = new VectorSignal({ width: 4, value: 7 });
    const b2 = new VectorSignal({ width: 4, value: 2 });
    const addSigned = VectorOps.add(a7, b2);
    assert(addSigned.overflowSigned === true, "Signed overflow detected: +7 + +2 wrapped to -7");

    // Subtraction: 10 - 4 = 6
    const a10 = new VectorSignal({ width: 4, value: 10 });
    const b4 = new VectorSignal({ width: 4, value: 4 });
    const sub1 = VectorOps.sub(a10, b4);
    assert(sub1.result.value === 6, "10 - 4 = 6");
    assert(sub1.borrowOut === 0, "No borrow out");

    // Subtraction underflow: 4 - 10 = -6 = 10 in 4-bit unsigned, borrow = 1
    const sub2 = VectorOps.sub(b4, a10);
    assert(sub2.result.value === 10, "4 - 10 in 4-bit = 10 (2's complement -6)");
    assert(sub2.borrowOut === 1, "Borrow out is 1");
}

// 7. Relational Comparisons
{
    const a = new VectorSignal({ width: 4, value: 9 });
    const b = new VectorSignal({ width: 4, value: 5 });

    assert(VectorOps.eq(a, b).value === 0, "9 == 5 is 0");
    assert(VectorOps.neq(a, b).value === 1, "9 != 5 is 1");
    assert(VectorOps.lt(a, b).value === 0, "9 < 5 is 0");
    assert(VectorOps.gt(a, b).value === 1, "9 > 5 is 1");
    assert(VectorOps.gte(a, a).value === 1, "9 >= 9 is 1");
    assert(VectorOps.lte(b, a).value === 1, "5 <= 9 is 1");
}

// 8. Shifts (Logical & Arithmetic)
{
    const v = new VectorSignal({ width: 4, value: 0b1011 }); // -5 or 11

    // SHL
    assert(VectorOps.shl(v, 1).value === 0b0110, "SHL 1011 by 1 is 0110");
    assert(VectorOps.shl(v, 4).value === 0, "SHL by width or greater gives 0");

    // SHR (logical)
    assert(VectorOps.shr(v, 1).value === 0b0101, "SHR 1011 by 1 is 0101");
    assert(VectorOps.shr(v, 4).value === 0, "SHR by width or greater gives 0");

    // SAR (arithmetic: replicates MSB = 1)
    const sar1 = VectorOps.sar(v, 1);
    assert(sar1.value === 0b1101, "SAR 1011 by 1 is 1101 (sign replicated)");
    const sarFull = VectorOps.sar(v, 4);
    assert(sarFull.value === 0b1111, "SAR by >= width fills with sign bit (0b1111)");

    // SAR with MSB = 0
    const vPos = new VectorSignal({ width: 4, value: 0b0110 });
    assert(VectorOps.sar(vPos, 1).value === 0b0011, "SAR 0110 by 1 is 0011");
}

// 9. Concatenation and Slicing
{
    const a4 = new VectorSignal({ width: 4, value: 0b1010 });
    const b4 = new VectorSignal({ width: 4, value: 0b0101 });
    const cat = VectorOps.concat(a4, b4);
    assert(cat.width === 8, "Concat width is 4 + 4 = 8");
    assert(cat.value === 0b10100101, "Concat value is 0b10100101 (0xA5)");

    // Slicing
    const slc = VectorOps.slice(cat, 5, 2); // bits 5, 4, 3, 2
    assert(slc.width === 4, "Slice [5:2] has width 4");
    // cat = 1010 0101 -> bits: 7=1, 6=0, 5=1, 4=0, 3=0, 2=1, 1=0, 0=1 -> [5:2] is 1001 (9)
    assert(slc.value === 0b1001, "Slice [5:2] value is 0b1001 (9)");

    // Invalid slice bounds
    assertThrows(() => VectorOps.slice(cat, 8, 0), RangeError, "Slice MSB out of bounds throws RangeError");
    assertThrows(() => VectorOps.slice(cat, 2, 5), RangeError, "Slice with msb < lsb throws RangeError");
}

// 10. Multiplexing
{
    const a = new VectorSignal({ width: 4, value: 0xA });
    const b = new VectorSignal({ width: 4, value: 0xB });
    const sel0 = new VectorSignal({ width: 1, value: 0 });
    const sel1 = new VectorSignal({ width: 1, value: 1 });

    assert(VectorOps.mux(sel0, a, b).value === 0xA, "Mux sel=0 selects input A (0xA)");
    assert(VectorOps.mux(sel1, a, b).value === 0xB, "Mux sel=1 selects input B (0xB)");
}

console.log(`\n========================================`);
console.log(`  Phase A Test Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
