/**
 * reference_evaluator.js — Independent Boolean and Sequential Reference Model
 * 
 * An independent, mathematically formal implementation of digital logic
 * used to cross-verify CircuitGraph, LogicSimulator, and SequentialEngine.
 * 
 * Rules:
 * - Follows 3-valued logic (0, 1, null/undefined).
 * - Implements zero-delay combinational propagation.
 * - Nonblocking simultaneous sampling for sequential registers.
 */

export const REFERENCE_GATE_OPS = {
    AND: ([a, b]) => (a !== null && a !== undefined && b !== null && b !== undefined) ? (a & b) : null,
    OR: ([a, b]) => (a !== null && a !== undefined && b !== null && b !== undefined) ? (a | b) : null,
    NOT: ([a]) => (a !== null && a !== undefined) ? (a ^ 1) : null,
    NAND: ([a, b]) => (a !== null && a !== undefined && b !== null && b !== undefined) ? ((a & b) ^ 1) : null,
    NOR: ([a, b]) => (a !== null && a !== undefined && b !== null && b !== undefined) ? ((a | b) ^ 1) : null,
    XOR: ([a, b]) => (a !== null && a !== undefined && b !== null && b !== undefined) ? (a ^ b) : null,
    XNOR: ([a, b]) => (a !== null && a !== undefined && b !== null && b !== undefined) ? ((a ^ b) ^ 1) : null,
    MUX2: ([a, b, sel]) => {
        if (sel === null || sel === undefined) return null;
        return sel === 0 ? (a ?? null) : (b ?? null);
    }
};

/**
 * An independent Boolean expression node for combinational DAGs.
 */
export class BooleanExprNode {
    /**
     * @param {string} type - 'INPUT', 'CONST', or gate type (AND, OR, NOT, etc.)
     * @param {string} id - Unique node identifier
     * @param {BooleanExprNode[]} [inputs=[]] - Upstream child nodes
     * @param {number|null} [value=null] - Static value if CONST
     */
    constructor(type, id, inputs = [], value = null) {
        this.type = type;
        this.id = id;
        this.inputs = inputs;
        this.value = value;
    }

    /**
     * Recursively evaluate node value given a dictionary of input values.
     * @param {Record<string, number|null>} inputEnv - inputId -> 0 | 1 | null
     * @param {Map<string, number|null>} [memo=new Map()]
     * @returns {number|null}
     */
    evaluate(inputEnv, memo = new Map()) {
        if (memo.has(this.id)) {
            return memo.get(this.id);
        }

        let res = null;
        if (this.type === 'INPUT') {
            res = (this.id in inputEnv) ? inputEnv[this.id] : null;
        } else if (this.type === 'CONST') {
            res = this.value;
        } else {
            const op = REFERENCE_GATE_OPS[this.type];
            if (!op) {
                throw new Error(`Unsupported reference gate type: ${this.type}`);
            }
            const inValues = this.inputs.map(child => child.evaluate(inputEnv, memo));
            res = op(inValues);
        }

        memo.set(this.id, res);
        return res;
    }
}

/**
 * Independent sequential state machine reference.
 */
export class SequentialReferenceModel {
    /**
     * @param {string[]} dffIds - IDs of DFFs
     * @param {Record<string, (prevQ: Record<string, number|null>, inputs: Record<string, number|null>) => number|null>} nextDLogic
     */
    constructor(dffIds, nextDLogic = {}) {
        this.dffIds = dffIds;
        this.nextDLogic = nextDLogic;
        /** @type {Record<string, number|null>} */
        this.qStates = {};
        for (const id of dffIds) {
            this.qStates[id] = 0;
        }
    }

    /**
     * Perform clock step.
     * @param {number} prevClk
     * @param {number} nextClk
     * @param {Record<string, number|null>} inputs
     * @returns {Record<string, number|null>} Snapshot of Q states after step
     */
    step(prevClk, nextClk, inputs) {
        if (prevClk === 0 && nextClk === 1) {
            // Rising edge: sample ALL D simultaneously using pre-edge Q states
            const sampledD = {};
            for (const id of this.dffIds) {
                const nextFn = this.nextDLogic[id];
                sampledD[id] = nextFn ? nextFn(this.qStates, inputs) : null;
            }
            // Update all Q simultaneously
            for (const id of this.dffIds) {
                this.qStates[id] = sampledD[id];
            }
        }
        return { ...this.qStates };
    }
}
