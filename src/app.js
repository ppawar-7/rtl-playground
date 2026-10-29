/**
 * app.js — Main Application Controller
 * 
 * Coordinates engine layers (CircuitGraph, LogicSimulator, SequentialEngine, VerilogGenerator)
 * with UI controllers (CircuitEditor, ComponentLibrary, PanelManager, TruthTable, WaveformViewer, LessonManager).
 * 
 * @module App
 */

import { CircuitGraph } from './engine/circuit_graph.js';
import { LogicSimulator } from './engine/logic_simulator.js';
import { SequentialEngine } from './engine/sequential_engine.js';
import { VerilogGenerator } from './engine/verilog_generator.js';

import { CircuitEditor } from './ui/circuit_editor.js';
import { ComponentLibrary } from './ui/component_library.js';
import { PanelManager } from './ui/panels.js';
import { TruthTable } from './ui/truth_table.js';
import { WaveformViewer } from './ui/waveform_viewer.js';

import { PRESETS } from './modules/presets.js';
import { LessonManager } from './modules/lessons.js';

export class RTLPlaygroundApp {
    constructor() {
        // 1. Initialize Engines
        this.graph = new CircuitGraph();
        this.simulator = new LogicSimulator(this.graph);
        this.sequentialEngine = new SequentialEngine(this.graph, this.simulator);
        this.verilogGenerator = new VerilogGenerator(this.graph);

        // 2. Initialize UI Controllers
        this.editor = new CircuitEditor('circuit-svg', this.graph, this.simulator);
        this.componentLibrary = new ComponentLibrary('palette-container', this.editor);
        this.panels = new PanelManager(this.graph, this.verilogGenerator, this.editor);
        this.truthTable = new TruthTable('truth-table-view', this.graph, this.simulator);
        this.waveform = new WaveformViewer('waveform-view', this.sequentialEngine, this.editor);
        this.lessons = new LessonManager('lessons-container', this.graph, this.simulator, this.editor, this.sequentialEngine);

        this._setupEvents();
        this._loadDefaultCircuit();
    }

    _setupEvents() {
        // Circuit graph change pipeline
        this.graph.on('change', () => {
            // 1. Evaluate combinational logic
            this.simulator.evaluate();

            // 2. Update visual signals
            this.editor.updateSignals();

            // 3. Update Verilog code
            this.panels.updateVerilog();

            // 4. Update Inspector & health stats
            this.panels.updateInspector(null);

            // 5. Update Truth Table if visible
            if (this.panels.currentDrawerTab === 'truth-table') {
                this.truthTable.render();
            }

            // 6. Update Waveform if visible
            if (this.panels.currentDrawerTab === 'waveform') {
                this.waveform.redraw();
            }
        });

        // Preset selector
        const presetSelect = document.getElementById('preset-select');
        if (presetSelect) {
            presetSelect.addEventListener('change', (e) => {
                const key = e.target.value;
                this.loadPreset(key);
            });
        }

        // Reset canvas buttons
        const resetBtn = document.getElementById('btn-reset-circuit');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetCircuit();
            });
        }

        const clearCanvasBtn = document.getElementById('btn-canvas-clear');
        if (clearCanvasBtn) {
            clearCanvasBtn.addEventListener('click', () => {
                this.resetCircuit();
            });
        }
    }

    loadPreset(presetKey) {
        const preset = PRESETS[presetKey];
        if (!preset) return;

        this.graph.deserialize(preset.circuit);
        this.sequentialEngine.reset();
        this.sequentialEngine.initializeDFFs();
        this.simulator.evaluate();
        this.editor.render();
        this.panels.updateVerilog();
        this.panels.updateInspector(null);

        const statusBar = document.getElementById('canvas-status-text');
        if (statusBar) {
            statusBar.textContent = `Loaded Preset: ${preset.name}`;
            statusBar.style.color = 'var(--accent-primary)';
            setTimeout(() => {
                statusBar.textContent = 'Ready';
                statusBar.style.color = 'var(--text-muted)';
            }, 3000);
        }
    }

    resetCircuit() {
        this.graph.clear();
        this.sequentialEngine.reset();
        this.simulator.evaluate();
        this.editor.render();
        this.panels.updateVerilog();
        this.panels.updateInspector(null);

        const select = document.getElementById('preset-select');
        if (select) select.value = '';

        const statusBar = document.getElementById('canvas-status-text');
        if (statusBar) {
            statusBar.textContent = 'Circuit Cleared';
            setTimeout(() => {
                statusBar.textContent = 'Ready';
            }, 2000);
        }
    }

    _loadDefaultCircuit() {
        // Load Half Adder preset by default for immediate exploration
        this.loadPreset('half-adder');
        const select = document.getElementById('preset-select');
        if (select) select.value = 'half-adder';
    }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RTLPlaygroundApp();
});
