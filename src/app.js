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
        this.tour = new QuickTourController();

        // Check if user is visiting for the first time
        try {
            if (!localStorage.getItem('rtl_tour_seen')) {
                setTimeout(() => {
                    this.tour.open();
                }, 500);
            }
        } catch {}
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
        const urlParams = new URLSearchParams(window.location.search);
        const urlPreset = urlParams.get('preset');
        if (urlPreset && PRESETS[urlPreset]) {
            this.loadPreset(urlPreset);
            const select = document.getElementById('preset-select');
            if (select) select.value = urlPreset;
        } else {
            // Load Half Adder preset by default for immediate exploration
            this.loadPreset('half-adder');
            const select = document.getElementById('preset-select');
            if (select) select.value = 'half-adder';
        }

        const urlLesson = urlParams.get('lesson');
        if (urlLesson && this.lessons) {
            // Switch to lessons tab
            const lessonTabBtn = document.querySelector('.sidebar-tab-btn[data-tab="lessons"]');
            if (lessonTabBtn) lessonTabBtn.click();
            const targetLesson = this.lessons.getLessonById ? this.lessons.getLessonById(urlLesson) : null;
            if (targetLesson) this.lessons.openLesson(targetLesson);
        }
    }
}

export class QuickTourController {
    constructor() {
        this.modal = document.getElementById('tour-modal');
        this.titleEl = document.getElementById('tour-step-title');
        this.contentEl = document.getElementById('tour-step-content');
        this.dotsEl = document.getElementById('tour-dots');
        this.prevBtn = document.getElementById('btn-tour-prev');
        this.nextBtn = document.getElementById('btn-tour-next');
        this.closeBtn = document.getElementById('btn-tour-close');

        this.currentStep = 0;
        this.steps = [
            {
                title: 'Welcome to RTL Playground! 👋',
                icon: '🚀',
                html: `
                    <p style="margin-bottom:10px;">RTL (Register-Transfer Level) is how digital chips and microprocessors are designed across the world!</p>
                    <p style="margin-bottom:10px;">In this playground, you can build electronic circuits using logic gates (AND, OR, NOT, XOR) and flip-flops, simulate signals live, and see real synthesizable Verilog code generated instantly.</p>
                    <div style="padding:8px 12px; background:rgba(56,189,248,0.1); border-left:3px solid var(--accent-primary); border-radius:4px; font-size:12px;">
                        💡 <strong>Zero experience needed!</strong> Follow the guided lessons to learn step by step.
                    </div>
                `
            },
            {
                title: 'Interacting with the Canvas 🖱️',
                icon: '🛠️',
                html: `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div><strong>1. Left Palette:</strong> Click & drag any logic gate, switch, or clock from the Palette onto the canvas.</div>
                        <div><strong>2. Toggle Inputs:</strong> Click input switches (A, B) directly on the canvas to flip between <strong>0 (LOW)</strong> and <strong>1 (HIGH)</strong>.</div>
                        <div><strong>3. Wiring:</strong> Click and drag from any output circle pin to an input circle pin to connect wires!</div>
                        <div><strong>4. Delete:</strong> Click any component or wire and press Delete or the trash button in the Inspector.</div>
                    </div>
                `
            },
            {
                title: 'Understanding Signals & Clocks ⚡',
                icon: '💡',
                html: `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div><strong style="color:#4ade80;">● Glowing Green Wires:</strong> Logic 1 (HIGH / 3.3V power). Electricity is active!</div>
                        <div><strong style="color:#94a3b8;">● Slate Gray Wires:</strong> Logic 0 (LOW / 0V Ground). No active voltage.</div>
                        <div><strong style="color:#38bdf8;">● Clock Pulse:</strong> Flip-flops update only on the rising clock edge. Step the clock in the <strong>Waveform Viewer</strong> tab below to watch data flow!</div>
                    </div>
                `
            },
            {
                title: 'Guided Lessons & Verilog Code 🎓',
                icon: '📚',
                html: `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div><strong>Lessons Tab:</strong> Click the <strong>Lessons</strong> tab in the left panel to access 12 guided challenges with live micro-step checklists and hints.</div>
                        <div><strong>Generated Verilog Tab:</strong> View industry-standard hardware description code generated live for your circuit!</div>
                        <div><strong>Ready to build?</strong> Let's start with Lesson 1: Understanding Logic Gates!</div>
                    </div>
                `
            }
        ];

        this.init();
    }

    init() {
        if (!this.modal) return;

        this.closeBtn?.addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        this.prevBtn?.addEventListener('click', () => {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.render();
            }
        });

        this.nextBtn?.addEventListener('click', () => {
            if (this.currentStep < this.steps.length - 1) {
                this.currentStep++;
                this.render();
            } else {
                this.close();
                const lessonTabBtn = document.querySelector('.sidebar-tab-btn[data-tab="lessons"]');
                if (lessonTabBtn) lessonTabBtn.click();
                if (window.app?.lessons) {
                    const l1 = window.app.lessons.getLessonById('lesson-1-gates');
                    if (l1) window.app.lessons.openLesson(l1);
                }
            }
        });

        const tourBtn = document.getElementById('btn-quick-tour');
        if (tourBtn) {
            tourBtn.addEventListener('click', () => this.open());
        }
        window.openQuickTour = () => this.open();
    }

    open() {
        this.currentStep = 0;
        this.render();
        if (this.modal) this.modal.style.display = 'flex';
        try { localStorage.setItem('rtl_tour_seen', 'true'); } catch {}
    }

    close() {
        if (this.modal) this.modal.style.display = 'none';
    }

    render() {
        const step = this.steps[this.currentStep];
        if (!step) return;

        if (this.titleEl) this.titleEl.textContent = step.title;
        if (this.contentEl) this.contentEl.innerHTML = step.html;

        if (this.prevBtn) {
            this.prevBtn.style.display = this.currentStep === 0 ? 'none' : 'inline-block';
        }

        if (this.nextBtn) {
            this.nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Start Lesson 1 🚀' : 'Next →';
        }

        if (this.dotsEl) {
            this.dotsEl.innerHTML = this.steps.map((_, idx) => `
                <div class="tour-dot ${idx === this.currentStep ? 'active' : ''}"></div>
            `).join('');
        }
    }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RTLPlaygroundApp();
});
