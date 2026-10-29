/**
 * reproduce.js — Deterministic Failure Reproducer
 * 
 * Re-runs a specific failed stress test case using its recorded random seed.
 * Usage:
 *   node tests/stress/reproduce.js --seed=12345 --category=combinational
 *   node tests/stress/reproduce.js --seed=12345 --category=sequential
 *   node tests/stress/reproduce.js --seed=12345 --category=verilog
 *   node tests/stress/reproduce.js --seed=12345 --category=invalid
 *   node tests/stress/reproduce.js --seed=12345 --category=serialization
 */

import { PRNG } from './prng.js';
import { CircuitGenerator } from './circuit_generator.js';
import { PerfTracker } from './perf_tracker.js';
import {
    testCombinationalVerification,
    testInvalidRejection,
    testSequentialVerification,
    testSerializationRoundTrip,
    testVerilogYosysCompilation,
    testComplexityScaling
} from './test_suites.js';

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {
        seed: 42,
        category: 'combinational'
    };
    for (const arg of args) {
        if (arg.startsWith('--seed=')) parsed.seed = parseInt(arg.split('=')[1], 10);
        else if (arg.startsWith('--category=')) parsed.category = arg.split('=')[1];
    }
    return parsed;
}

async function main() {
    const { seed, category } = parseArgs();
    console.log(`\n======================================================`);
    console.log(`  RTL Playground Failure Reproducer`);
    console.log(`  Target Seed:     ${seed}`);
    console.log(`  Target Category: ${category}`);
    console.log(`======================================================\n`);

    const prng = new PRNG(seed);
    const generator = new CircuitGenerator(prng);
    const tracker = new PerfTracker();

    try {
        let result;
        if (category === 'combinational') {
            result = await testCombinationalVerification(prng, generator, tracker);
        } else if (category === 'invalid') {
            result = await testInvalidRejection(prng, generator, tracker);
        } else if (category === 'sequential') {
            result = await testSequentialVerification(prng, generator, tracker);
        } else if (category === 'serialization') {
            result = await testSerializationRoundTrip(prng, generator, tracker);
        } else if (category === 'verilog') {
            result = await testVerilogYosysCompilation(prng, generator, tracker);
        } else if (category === 'scale') {
            result = await testComplexityScaling(generator, tracker);
        } else {
            throw new Error(`Unknown test category: ${category}`);
        }

        console.log(`[REPRODUCE RESULT] ✅ Test passed! Result:`, result);
    } catch (err) {
        console.error(`[REPRODUCE RESULT] ❌ Test reproduced failure!`);
        console.error(`Error message: ${err.message}`);
        if (err.stack) console.error(`Stack trace:\n${err.stack}`);
        process.exit(1);
    }
}

main();
