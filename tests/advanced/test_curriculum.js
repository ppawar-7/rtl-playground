/**
 * test_curriculum.js — Unit Tests for Phase E Educational Curriculum & Lessons
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

import { ADVANCED_LESSONS, LessonProgressManager } from '../../advanced-lab/lessons/advanced_lessons.js';

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

console.log("=== Testing Advanced RTL Educational Curriculum (Phase E) ===");

// 1. Structure Audit: 10 Lessons
assert(ADVANCED_LESSONS.length === 10, "Curriculum contains exactly 10 high-quality advanced lessons");

const expectedFields = ['id', 'title', 'difficulty', 'category', 'objective', 'explanation', 'challenge', 'hints', 'physicalDesignNote', 'validate'];

for (const lesson of ADVANCED_LESSONS) {
    for (const field of expectedFields) {
        assert(lesson[field] !== undefined && lesson[field] !== null, `Lesson '${lesson.id}' defines field '${field}'`);
    }
    assert(Array.isArray(lesson.hints) && lesson.hints.length >= 2, `Lesson '${lesson.id}' has multiple progressive hints`);
    assert(typeof lesson.validate === 'function', `Lesson '${lesson.id}' provides behavioral validator`);
}

// 2. Behavioral Validation Testing for Each Lesson

// Lesson 1: Vectors & Slicing
{
    const l1 = ADVANCED_LESSONS[0];
    const fail = l1.validate({ upperMsb: 8, upperLsb: 4, lowerMsb: 3, lowerLsb: 0 });
    assert(fail.success === false, "L1 rejects invalid upper slice bounds [8:4]");

    const pass = l1.validate({ upperMsb: 7, upperLsb: 4, lowerMsb: 3, lowerLsb: 0 });
    assert(pass.success === true, "L1 accepts valid nibble slicing [7:4] and [3:0]");
}

// Lesson 2: Concatenation
{
    const l2 = ADVANCED_LESSONS[1];
    const fail = l2.validate({ pageBits: 4, offsetBits: 4, totalBits: 8 });
    assert(fail.success === false, "L2 rejects mismatched concatenation width");

    const pass = l2.validate({ pageBits: 4, offsetBits: 8, totalBits: 12 });
    assert(pass.success === true, "L2 accepts 12-bit address {page[3:0], offset[7:0]}");
}

// Lesson 3: Ripple Carry Chain
{
    const l3 = ADVANCED_LESSONS[2];
    const fail = l3.validate({ genStage0: false, propStage1: false });
    assert(fail.success === false, "L3 rejects incorrect carry chain breakdown");

    const pass = l3.validate({ genStage0: true, propStage1: true });
    assert(pass.success === true, "L3 accepts Stage 0 generate and Stage 1 propagate");
}

// Lesson 4: ALU Flags
{
    const l4 = ADVANCED_LESSONS[3];
    const fail = l4.validate({ C: 1, V: 0 });
    assert(fail.success === false, "L4 rejects conflating Carry and Overflow");

    const pass = l4.validate({ C: 0, V: 1 });
    assert(pass.success === true, "L4 accepts C=0, V=1 for 5+4 in 4-bit signed");
}

// Lesson 5: Clock Enable
{
    const l5 = ADVANCED_LESSONS[4];
    const pass = l5.validate({ heldCorrectly: true, qFinal: 0x9 });
    assert(pass.success === true, "L5 accepts clock enable state retention");
}

// Lesson 6: Sync Reset Priority
{
    const l6 = ADVANCED_LESSONS[5];
    const pass = l6.validate({ resetPriority: true });
    assert(pass.success === true, "L6 validates reset priority over clock enable");
}

// Lesson 7: Modulo Counter
{
    const l7 = ADVANCED_LESSONS[6];
    const pass = l7.validate({ tcAtCount: 5, modulo: 6 });
    assert(pass.success === true, "L7 validates modulo-6 terminal count at 5");
}

// Lesson 8: Universal Shift Register (SIPO)
{
    const l8 = ADVANCED_LESSONS[7];
    const pass = l8.validate({ finalParallel: 0b1011 });
    assert(pass.success === true, "L8 validates SIPO bitstream deserialization to 0b1011");
}

// Lesson 9: Moore Sequence Detector
{
    const l9 = ADVANCED_LESSONS[8];
    const pass = l9.validate({ nextState: 'S_101', detected: true });
    assert(pass.success === true, "L9 validates sequence detector transition to S_101");
}

// Lesson 10: Moore vs Mealy Latency
{
    const l10 = ADVANCED_LESSONS[9];
    const pass = l10.validate({ immediateType: 'MEALY' });
    assert(pass.success === true, "L10 validates Mealy 0-cycle combinational response");
}

console.log(`\n========================================`);
console.log(`  Phase E Test Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
