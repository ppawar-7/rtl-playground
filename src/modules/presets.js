/**
 * presets.js — Predefined Educational Circuit Presets
 * 
 * Provides serialized circuit definitions that demonstrate fundamental
 * combinational logic, arithmetic building blocks, selection logic,
 * and sequential register storage.
 * 
 * Note: Combinational latches (e.g., cross-coupled NOR SR latch) are excluded
 * per architectural Decision 007.
 * 
 * @module Presets
 */

export const PRESETS = {
    'and-gate': {
        name: '2-Input AND Gate',
        description: 'Basic 2-input AND gate producing HIGH only when both inputs are 1.',
        circuit: {
            components: [
                { id: 'input_1', type: 'INPUT', label: 'A', x: 80, y: 80, value: 1 },
                { id: 'input_2', type: 'INPUT', label: 'B', x: 80, y: 160, value: 0 },
                { id: 'and_1', type: 'AND', label: 'AND', x: 260, y: 120 },
                { id: 'output_1', type: 'OUTPUT', label: 'Y', x: 440, y: 120 }
            ],
            connections: [
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'and_1', toPin: 'and_1.in0' },
                { fromComponent: 'input_2', fromPin: 'input_2.out0', toComponent: 'and_1', toPin: 'and_1.in1' },
                { fromComponent: 'and_1', fromPin: 'and_1.out0', toComponent: 'output_1', toPin: 'output_1.in0' }
            ]
        }
    },

    'or-gate': {
        name: '2-Input OR Gate',
        description: 'Basic 2-input OR gate producing HIGH when at least one input is 1.',
        circuit: {
            components: [
                { id: 'input_1', type: 'INPUT', label: 'A', x: 80, y: 80, value: 0 },
                { id: 'input_2', type: 'INPUT', label: 'B', x: 80, y: 160, value: 1 },
                { id: 'or_1', type: 'OR', label: 'OR', x: 260, y: 120 },
                { id: 'output_1', type: 'OUTPUT', label: 'Y', x: 440, y: 120 }
            ],
            connections: [
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'or_1', toPin: 'or_1.in0' },
                { fromComponent: 'input_2', fromPin: 'input_2.out0', toComponent: 'or_1', toPin: 'or_1.in1' },
                { fromComponent: 'or_1', fromPin: 'or_1.out0', toComponent: 'output_1', toPin: 'output_1.in0' }
            ]
        }
    },

    'not-gate': {
        name: '1-Bit Inverter (NOT)',
        description: 'Single-input logic inverter producing inverted complement output.',
        circuit: {
            components: [
                { id: 'input_1', type: 'INPUT', label: 'A', x: 100, y: 120, value: 0 },
                { id: 'not_1', type: 'NOT', label: 'NOT', x: 260, y: 120 },
                { id: 'output_1', type: 'OUTPUT', label: 'Y', x: 420, y: 120 }
            ],
            connections: [
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'not_1', toPin: 'not_1.in0' },
                { fromComponent: 'not_1', fromPin: 'not_1.out0', toComponent: 'output_1', toPin: 'output_1.in0' }
            ]
        }
    },

    'half-adder': {
        name: '1-Bit Half Adder',
        description: 'Computes binary SUM (A ⊕ B) and CARRY (A · B) of two 1-bit inputs.',
        circuit: {
            components: [
                { id: 'input_1', type: 'INPUT', label: 'A', x: 80, y: 80, value: 1 },
                { id: 'input_2', type: 'INPUT', label: 'B', x: 80, y: 180, value: 1 },
                { id: 'xor_1', type: 'XOR', label: 'XOR', x: 260, y: 70 },
                { id: 'and_1', type: 'AND', label: 'AND', x: 260, y: 190 },
                { id: 'output_1', type: 'OUTPUT', label: 'SUM', x: 440, y: 70 },
                { id: 'output_2', type: 'OUTPUT', label: 'CARRY', x: 440, y: 190 }
            ],
            connections: [
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'xor_1', toPin: 'xor_1.in0' },
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'and_1', toPin: 'and_1.in0' },
                { fromComponent: 'input_2', fromPin: 'input_2.out0', toComponent: 'xor_1', toPin: 'xor_1.in1' },
                { fromComponent: 'input_2', fromPin: 'input_2.out0', toComponent: 'and_1', toPin: 'and_1.in1' },
                { fromComponent: 'xor_1', fromPin: 'xor_1.out0', toComponent: 'output_1', toPin: 'output_1.in0' },
                { fromComponent: 'and_1', fromPin: 'and_1.out0', toComponent: 'output_2', toPin: 'output_2.in0' }
            ]
        }
    },

    'mux-2to1': {
        name: '2:1 Multiplexer',
        description: 'Selects between two inputs A (when Sel=0) and B (when Sel=1).',
        circuit: {
            components: [
                { id: 'input_1', type: 'INPUT', label: 'A', x: 80, y: 70, value: 0 },
                { id: 'input_2', type: 'INPUT', label: 'B', x: 80, y: 150, value: 1 },
                { id: 'input_sel', type: 'INPUT', label: 'Sel', x: 180, y: 240, value: 1 },
                { id: 'mux_1', type: 'MUX2', label: 'MUX 2:1', x: 280, y: 110 },
                { id: 'output_1', type: 'OUTPUT', label: 'Y', x: 460, y: 110 }
            ],
            connections: [
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'mux_1', toPin: 'mux_1.in0' },
                { fromComponent: 'input_2', fromPin: 'input_2.out0', toComponent: 'mux_1', toPin: 'mux_1.in1' },
                { fromComponent: 'input_sel', fromPin: 'input_sel.out0', toComponent: 'mux_1', toPin: 'mux_1.in2' },
                { fromComponent: 'mux_1', fromPin: 'mux_1.out0', toComponent: 'output_1', toPin: 'output_1.in0' }
            ]
        }
    },

    'dff-demo': {
        name: 'D Flip-Flop Register Demo',
        description: 'Positive-edge-triggered D flip-flop sampling D input on 0→1 clock transitions.',
        circuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 80, y: 90, value: 1 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 80, y: 180, value: 0 },
                { id: 'dff_1', type: 'DFF', label: 'DFF', x: 260, y: 100 },
                { id: 'output_q', type: 'OUTPUT', label: 'Q', x: 440, y: 115 }
            ],
            connections: [
                { fromComponent: 'input_d', fromPin: 'input_d.out0', toComponent: 'dff_1', toPin: 'dff_1.in0' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in1' },
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'output_q', toPin: 'output_q.in0' }
            ]
        }
    }
};
