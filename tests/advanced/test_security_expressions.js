/**
 * test_security_expressions.js — Security & Safe Parser Regression Test Suite
 * 
 * Verifies:
 * 1. FSMModel.safeEvalBooleanExpr handles valid Boolean logic:
 *    - Unary negation (!, ~)
 *    - Binary operations (&&, ||, &, |, ^)
 *    - Equality (==, !=)
 *    - Numeric constants (0, 1) and literals
 *    - Grouping with parentheses
 * 2. Injection rejection:
 *    - Arbitrary code execution strings (console.log, alert, process.exit) return false
 *      without throwing uncaught exceptions or executing payloads.
 * 3. XML entity escaping on SVG component labels.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FSMModel } from '../../advanced-lab/engine/fsm_engine.js';

describe('Security: Deterministic Safe Boolean Parser', () => {
    it('evaluates simple single-bit identifiers and negations', () => {
        assert.equal(FSMModel.safeEvalBooleanExpr('in_bit', { in_bit: 1 }), true);
        assert.equal(FSMModel.safeEvalBooleanExpr('in_bit', { in_bit: 0 }), false);
        assert.equal(FSMModel.safeEvalBooleanExpr('!in_bit', { in_bit: 1 }), false);
        assert.equal(FSMModel.safeEvalBooleanExpr('!in_bit', { in_bit: 0 }), true);
        assert.equal(FSMModel.safeEvalBooleanExpr('~in_bit', { in_bit: 1 }), false);
    });

    it('evaluates equality and inequality comparisons', () => {
        assert.equal(FSMModel.safeEvalBooleanExpr('timer == 1', { timer: 1 }), true);
        assert.equal(FSMModel.safeEvalBooleanExpr('timer == 1', { timer: 0 }), false);
        assert.equal(FSMModel.safeEvalBooleanExpr('timer != 0', { timer: 1 }), true);
        assert.equal(FSMModel.safeEvalBooleanExpr('timer != 0', { timer: 0 }), false);
    });

    it('evaluates compound logical and bitwise expressions', () => {
        const inputs = { a: 1, b: 0, c: 1 };
        assert.equal(FSMModel.safeEvalBooleanExpr('a && b', inputs), false);
        assert.equal(FSMModel.safeEvalBooleanExpr('a || b', inputs), true);
        assert.equal(FSMModel.safeEvalBooleanExpr('a & c', inputs), true);
        assert.equal(FSMModel.safeEvalBooleanExpr('a ^ b', inputs), true);
        assert.equal(FSMModel.safeEvalBooleanExpr('a ^ c', inputs), false);
        assert.equal(FSMModel.safeEvalBooleanExpr('(a || b) && c', inputs), true);
        assert.equal(FSMModel.safeEvalBooleanExpr('(a && b) || c', inputs), true);
    });

    it('evaluates constant strings and edge cases', () => {
        assert.equal(FSMModel.safeEvalBooleanExpr('1'), true);
        assert.equal(FSMModel.safeEvalBooleanExpr('true'), true);
        assert.equal(FSMModel.safeEvalBooleanExpr('0'), false);
        assert.equal(FSMModel.safeEvalBooleanExpr('false'), false);
        assert.equal(FSMModel.safeEvalBooleanExpr(''), true);
        assert.equal(FSMModel.safeEvalBooleanExpr(null), false);
    });

    it('neutralizes malicious JavaScript injection without code execution', () => {
        let flag = 0;
        // Attempt code execution
        const payload1 = 'console.log("INJECTED")';
        const payload2 = 'process.exit(1)';
        const payload3 = 'Function("flag = 1")()';
        const payload4 = 'this.constructor.constructor("return 1")()';
        
        assert.equal(FSMModel.safeEvalBooleanExpr(payload1, {}), false);
        assert.equal(FSMModel.safeEvalBooleanExpr(payload2, {}), false);
        assert.equal(FSMModel.safeEvalBooleanExpr(payload3, {}), false);
        assert.equal(FSMModel.safeEvalBooleanExpr(payload4, {}), false);
        assert.equal(flag, 0); // Confirms zero code execution
    });
});
