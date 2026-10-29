/**
 * test_fsm.js — Unit Tests, Verification, and Yosys Synthesis for Phase D (Finite State Machines)
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

import { FSMModel, FSMPresets, FSMValidationError } from '../../advanced-lab/engine/fsm_engine.js';
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

console.log("=== Testing Finite State Machine Validation (Phase D) ===");

// 1. Validation Tests
{
    // Valid FSM
    const valid = FSMPresets.twoStateToggle();
    const valRes = valid.validate();
    assert(valRes.isValid && !valRes.hasUnreachable, "Toggle FSM passes validation with 0 unreachable states");

    // Duplicate state rejection
    assertThrows(() => {
        const dup = new FSMModel({
            states: ['S0', 'S1', 'S0'],
            resetState: 'S0'
        });
        dup.validate();
    }, FSMValidationError, "Duplicate state name throws FSMValidationError");

    // Invalid reset state
    assertThrows(() => {
        const invReset = new FSMModel({
            states: ['S0', 'S1'],
            resetState: 'S_NONEXISTENT'
        });
        invReset.validate();
    }, FSMValidationError, "Nonexistent reset state throws FSMValidationError");

    // Invalid transition destination
    assertThrows(() => {
        const invTrans = new FSMModel({
            states: ['S0', 'S1'],
            resetState: 'S0',
            transitions: [{ from: 'S0', to: 'S_BAD', condition: '1' }]
        });
        invTrans.validate();
    }, FSMValidationError, "Invalid transition target throws FSMValidationError");

    // Overlapping non-deterministic transitions
    assertThrows(() => {
        const nonDet = new FSMModel({
            states: ['S0', 'S1', 'S2'],
            resetState: 'S0',
            transitions: [
                { from: 'S0', to: 'S1', condition: 'x == 1' },
                { from: 'S0', to: 'S2', condition: 'x == 1' }
            ]
        });
        nonDet.validate();
    }, FSMValidationError, "Overlapping identical condition without priority throws FSMValidationError");

    // Reachability warning
    const unreachFsm = new FSMModel({
        states: ['S0', 'S1', 'ISLAND'],
        resetState: 'S0',
        transitions: [
            { from: 'S0', to: 'S1', condition: '1' },
            { from: 'S1', to: 'S0', condition: '1' }
        ]
    });
    const unreachRes = unreachFsm.validate();
    assert(unreachRes.hasUnreachable && unreachRes.unreachableStates.includes('ISLAND'), "Unreachable state 'ISLAND' detected");
}

console.log("\n=== Testing FSM Simulation & Presets ===");

// 2. 2-State Toggle FSM
{
    const toggle = FSMPresets.twoStateToggle();
    assert(toggle.currentState === 'OFF', "Toggle initial state is OFF");
    assert(toggle.evaluateOutputs().activeOutputs.led === 0, "LED is 0 in OFF state");

    // btn=0: holds OFF
    toggle.clockStep({ btn: 0 });
    assert(toggle.currentState === 'OFF', "Holds OFF when btn=0");

    // btn=1: transitions to ON
    toggle.clockStep({ btn: 1 });
    assert(toggle.currentState === 'ON', "Transitions to ON when btn=1");
    assert(toggle.evaluateOutputs().activeOutputs.led === 1, "LED is 1 in ON state");

    // btn=0: holds ON
    toggle.clockStep({ btn: 0 });
    assert(toggle.currentState === 'ON', "Holds ON when btn=0");

    // btn=1: transitions back to OFF
    toggle.clockStep({ btn: 1 });
    assert(toggle.currentState === 'OFF', "Transitions back to OFF when btn=1");
}

// 3. Traffic Light Controller
{
    const tl = FSMPresets.trafficLight();
    assert(tl.currentState === 'RED', "Traffic light starts at RED");
    assert(tl.evaluateOutputs().activeOutputs.light_r === 1, "Red light lit");

    // timer=1: RED -> GREEN
    tl.clockStep({ timer: 1 });
    assert(tl.currentState === 'GREEN', "RED -> GREEN on timer=1");
    assert(tl.evaluateOutputs().activeOutputs.light_g === 1, "Green light lit");

    // timer=1: GREEN -> YELLOW
    tl.clockStep({ timer: 1 });
    assert(tl.currentState === 'YELLOW', "GREEN -> YELLOW on timer=1");

    // timer=1: YELLOW -> RED
    tl.clockStep({ timer: 1 });
    assert(tl.currentState === 'RED', "YELLOW -> RED on timer=1");
}

// 4. Sequence Detector (1011)
{
    const seq = FSMPresets.sequenceDetector1011();
    assert(seq.currentState === 'S_RESET', "Detector starts in S_RESET");

    // Input sequence: 1 -> 0 -> 1 -> 1
    seq.clockStep({ bit_in: 1 });
    assert(seq.currentState === 'S_1', "After '1': state is S_1");

    seq.clockStep({ bit_in: 0 });
    assert(seq.currentState === 'S_10', "After '10': state is S_10");

    seq.clockStep({ bit_in: 1 });
    assert(seq.currentState === 'S_101', "After '101': state is S_101");

    seq.clockStep({ bit_in: 1 });
    assert(seq.currentState === 'S_1011', "After '1011': state is S_1011");
    assert(seq.evaluateOutputs().activeOutputs.detected === 1, "Detected flag asserted on pattern 1011");

    // Next bit: 0 -> Overlapping pattern "1011" followed by "0" has suffix "10" -> goes to S_10
    seq.clockStep({ bit_in: 0 });
    assert(seq.currentState === 'S_10', "Overlapping sequence transition: 10110 -> S_10");
    assert(seq.evaluateOutputs().activeOutputs.detected === 0, "Detected flag deasserted");
}

// 5. Vending Machine (20 cents target)
{
    const vend = FSMPresets.vendingMachine();
    assert(vend.currentState === 'C_0', "Vending machine starts at 0 cents");

    // Insert 10 cents
    vend.clockStep({ coin_5: 0, coin_10: 1 });
    assert(vend.currentState === 'C_10', "After 10c: state is C_10");

    // Insert another 10 cents -> total 20 cents
    vend.clockStep({ coin_5: 0, coin_10: 1 });
    assert(vend.currentState === 'VEND', "Reaches VEND state at 20 cents");
    assert(vend.evaluateOutputs().activeOutputs.dispense === 1, "Dispense output asserted");

    // Next clock: automatic reset back to C_0
    vend.clockStep();
    assert(vend.currentState === 'C_0', "Vending machine returns to C_0 after vend");
}

// 6. Moore vs Mealy Output Timing Demonstration
{
    const mealyFsm = new FSMModel({
        name: 'mealy_edge_detector',
        states: ['ZERO', 'ONE'],
        resetState: 'ZERO',
        inputs: [{ name: 'in_sig', width: 1 }],
        outputs: [{ name: 'rising_edge', width: 1 }],
        transitions: [
            // When in ZERO and in_sig becomes 1, Mealy output asserts IMMEDIATELY before clock edge!
            { id: 't0_1', from: 'ZERO', to: 'ONE',  condition: 'in_sig == 1', mealyOutputs: { rising_edge: 1 } },
            { id: 't0_0', from: 'ZERO', to: 'ZERO', condition: 'in_sig == 0', mealyOutputs: { rising_edge: 0 } },
            { id: 't1_1', from: 'ONE',  to: 'ONE',  condition: 'in_sig == 1', mealyOutputs: { rising_edge: 0 } },
            { id: 't1_0', from: 'ONE',  to: 'ZERO', condition: 'in_sig == 0', mealyOutputs: { rising_edge: 0 } }
        ],
        mooreOutputs: {
            ZERO: { rising_edge: 0 },
            ONE:  { rising_edge: 0 }
        },
        fsmType: 'MEALY'
    });

    // In state ZERO with in_sig=0
    assert(mealyFsm.evaluateOutputs({ in_sig: 0 }).activeOutputs.rising_edge === 0, "Initial output is 0");

    // Change input combinational level to 1 BEFORE clock edge
    const combOut = mealyFsm.evaluateOutputs({ in_sig: 1 });
    assert(combOut.activeOutputs.rising_edge === 1, "Mealy output asserts COMBINATIONALLY prior to clock edge!");
    assert(mealyFsm.currentState === 'ZERO', "Current state has NOT changed yet (still in ZERO)");

    // Clock edge arrives
    mealyFsm.clockStep({ in_sig: 1 });
    assert(mealyFsm.currentState === 'ONE', "State transitioned to ONE at clock edge");
    assert(mealyFsm.evaluateOutputs({ in_sig: 1 }).activeOutputs.rising_edge === 0, "Rising edge pulse ended");
}

// 7. Synthesizable Verilog & Yosys Synthesis Verification for FSMs
console.log("\n=== Verifying FSM Synthesizable Verilog with Yosys ===");

async function verifyYosysFSM(name, fsmObj, topName) {
    const verilogCode = AdvancedVerilogGenerator.generateFSM(fsmObj, topName);
    const fileName = `${name}.v`;
    const script = `
        read_verilog ${fileName};
        hierarchy -check -top ${topName};
        proc;
        opt;
        check -assert;
        stat;
    `;
    try {
        await runYosys(['-p', script], { [fileName]: verilogCode });
        console.log(`  ✅ Yosys synthesized FSM: ${name} (${topName})`);
        passed++;
    } catch (err) {
        console.error(`  ❌ Yosys FSM failure on ${name}:`, err);
        failed++;
    }
}

await verifyYosysFSM('toggle_fsm', FSMPresets.twoStateToggle(), 'toggle_fsm');
await verifyYosysFSM('traffic_light_fsm', FSMPresets.trafficLight(), 'traffic_light_fsm');
await verifyYosysFSM('seq_detector_1011', FSMPresets.sequenceDetector1011(), 'seq_detector_1011');
await verifyYosysFSM('vending_fsm', FSMPresets.vendingMachine(), 'vending_fsm');

console.log(`\n========================================`);
console.log(`  Phase D Test Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
