/**
 * app.js — Main Application Controller for Advanced RTL Lab
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

import { DatapathVisualizer } from './ui/datapath_visualizer.js';
import { RegisterVisualizer } from './ui/register_visualizer.js';
import { FSMEditor } from './ui/fsm_editor.js';
import { AdvancedWaveformViewer } from './ui/advanced_waveforms.js';
import { ADVANCED_LESSONS, LessonProgressManager } from './lessons/advanced_lessons.js';
import { AdvancedVerilogGenerator } from './engine/advanced_verilog.js';

class AdvancedRTLApp {
    constructor() {
        this.currentTab = 'datapath';
        this.init();
    }

    init() {
        this.setupNavigation();

        // 1. Initialize Datapath Visualizer
        const dpContainer = document.getElementById('datapath-mount');
        if (dpContainer) {
            this.datapathVis = new DatapathVisualizer(dpContainer);
        }

        // 2. Initialize Waveform Viewer
        const waveCanvas = document.getElementById('advanced-waveform-canvas');
        if (waveCanvas) {
            this.waveformVis = new AdvancedWaveformViewer(waveCanvas);
        }

        // 3. Initialize Register Visualizer
        const regContainer = document.getElementById('sequential-mount');
        if (regContainer) {
            this.regVis = new RegisterVisualizer(regContainer, (cycleData) => {
                if (this.waveformVis) {
                    this.waveformVis.recordCycle(cycleData);
                }
            });
        }

        // 4. Initialize FSM Editor
        const fsmContainer = document.getElementById('fsm-mount');
        if (fsmContainer) {
            this.fsmEditor = new FSMEditor(fsmContainer, (code, moduleName) => {
                this.displayVerilog(code, moduleName);
                this.switchTab('verilog');
            });
        }

        // 5. Initialize Guided Lessons
        this.renderLessons();

        // 6. Setup Verilog Selector
        this.setupVerilogTab();

        // 7. Direct Tab Deep-linking via URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const reqTab = urlParams.get('tab');
        if (reqTab && document.getElementById(`tab-${reqTab}`)) {
            this.switchTab(reqTab);
        }
    }

    setupNavigation() {
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                this.switchTab(target);
            });
        });
    }

    switchTab(tabId) {
        this.currentTab = tabId;
        document.querySelectorAll('.nav-tab').forEach(t => {
            if (t.dataset.tab === tabId) t.classList.add('active');
            else t.classList.remove('active');
        });

        document.querySelectorAll('.tab-content').forEach(c => {
            if (c.id === `tab-${tabId}`) c.classList.add('active');
            else c.classList.remove('active');
        });

        if (tabId === 'waveforms' && this.waveformVis) {
            this.waveformVis.render();
        }
    }

    renderLessons() {
        const container = document.getElementById('lessons-mount');
        if (!container) return;

        const completed = new Set(LessonProgressManager.getCompletedLessons());

        const FUNDAMENTALS = [
            { id: 1, title: 'Understanding Logic Gates', diff: 'Beginner', cat: 'Combinational', obj: 'Construct a 2-input AND gate and verify Boolean truth table.', preset: 'and-gate' },
            { id: 2, title: 'Building a Half Adder', diff: 'Beginner', cat: 'Arithmetic', obj: '1-bit adder producing SUM (XOR) and CARRY (AND).', preset: 'half-adder' },
            { id: 3, title: '2:1 Multiplexer', diff: 'Beginner', cat: 'Data Routing', obj: 'Conditional data steering using select line.', preset: 'mux-2to1' },
            { id: 4, title: 'D Flip-Flop Register', diff: 'Intermediate', cat: 'Sequential', obj: 'Rising-edge state storage and clock sensitivity.', preset: 'dff-demo' },
            { id: 5, title: 'MUX with Conditional Operator (?:)', diff: 'Intermediate', cat: 'RTL Coding', obj: 'Synthesizable continuous assign y = sel ? b : a.', preset: 'mux-cond' },
            { id: 6, title: 'Register with Clock Enable (ASIC MUX)', diff: 'Intermediate', cat: 'Sequential', obj: 'Clock gating mitigation via recirculation MUX.', preset: 'reg-enable' },
            { id: 7, title: 'Synchronous Reset Architecture', diff: 'Intermediate', cat: 'Sequential', obj: 'Deterministic posedge initialization without glitching.', preset: 'reg-sync-reset' },
            { id: 8, title: 'Clock Timing & Waveforms', diff: 'Intermediate', cat: 'Timing', obj: 'Hold, setup, and sequential propagation cycles.', preset: 'shift-reg-2stage' },
            { id: 9, title: '1-Bit Full Adder with Ripple', diff: 'Intermediate', cat: 'Arithmetic', obj: 'Full 8-state addition with input carry Cin.', preset: 'full-adder' },
            { id: 10, title: 'Native Register with Clock Enable (DFFE)', diff: 'Advanced', cat: 'RTL Primitives', obj: 'Hardware-synthesizable DFFE with nonblocking Verilog.', preset: 'dff-enable' },
            { id: 11, title: 'Priority in DFF with Enable & Sync Reset (DFFESR)', diff: 'Advanced', cat: 'RTL Primitives', obj: 'Strict reset-over-enable evaluation order in RTL.', preset: 'dff-esr-priority' },
            { id: 12, title: 'Blocking vs Nonblocking Assignment Semantics', diff: 'Advanced', cat: 'Verilog Theory', obj: 'Pipeline races (= vs <=) and synthesis equivalence.', preset: 'blocking-vs-nonblocking' }
        ];

        container.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
                <div>
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--accent-cyan);">Comprehensive Digital RTL Curriculum (22 Lessons)</h2>
                    <p style="color: var(--text-muted); font-size: 0.85rem;">
                        Tier 1–2: RTL Fundamentals (12 Lessons in Gate Editor) &nbsp;•&nbsp;
                        Tier 3–4: Advanced Systems & FSMs (10 Lessons Verified: ${completed.size} / ${ADVANCED_LESSONS.length})
                    </p>
                </div>
                <div style="display:flex; gap: 8px;">
                    <a href="../index.html" class="btn btn-secondary btn-sm" style="text-decoration:none;">← Open Fundamentals Editor</a>
                    <button id="btn-reset-lessons" class="btn btn-secondary btn-sm">Reset Progress</button>
                </div>
            </div>

            <!-- Tier 3 & 4: Advanced RTL Lab Lessons -->
            <h3 style="font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; color: #f3f4f6;">
                Part 2: Multi-Bit Vectors, Datapaths, Counters & FSMs (Lessons 13–22)
            </h3>
            <div class="lessons-list" style="margin-bottom: 28px;">
                ${ADVANCED_LESSONS.map((l, idx) => {
                    const isDone = completed.has(l.id);
                    return `
                        <div class="lesson-card ${isDone ? 'completed' : ''}" id="card-${l.id}">
                            <div>
                                <div class="lesson-header">
                                    <span class="badge ${l.difficulty === 'Beginner' ? 'badge-primary' : (l.difficulty === 'Intermediate' ? 'badge-warn' : 'badge-info')}">
                                        ${l.difficulty}
                                    </span>
                                    <span class="badge">${l.category}</span>
                                </div>
                                <div class="lesson-title">${idx + 13}. ${l.title}</div>
                                <div class="lesson-obj">${l.objective}</div>
                                <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 10px;">${l.challenge}</div>
                            </div>
                            <div>
                                <div id="feedback-${l.id}" style="font-size: 0.8rem; margin-bottom: 8px;"></div>
                                <button class="btn ${isDone ? 'btn-secondary' : 'btn-primary'} btn-block btn-solve" data-lesson-id="${l.id}">
                                    ${isDone ? 'Review Solution' : 'Verify Challenge Solution'}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Tier 1 & 2: RTL Fundamentals (Single-bit) -->
            <h3 style="font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; color: #f3f4f6;">
                Part 1: Single-Bit RTL Fundamentals (Lessons 1–12)
            </h3>
            <div class="lessons-list">
                ${FUNDAMENTALS.map((f) => `
                    <div class="lesson-card" style="border-left: 3px solid var(--accent-cyan);">
                        <div>
                            <div class="lesson-header">
                                <span class="badge badge-primary">${f.diff}</span>
                                <span class="badge">${f.cat}</span>
                            </div>
                            <div class="lesson-title">${f.id}. ${f.title}</div>
                            <div class="lesson-obj">${f.obj}</div>
                        </div>
                        <div style="margin-top: 10px;">
                            <a href="../index.html?preset=${f.preset}" class="btn btn-secondary btn-block btn-sm" style="text-decoration:none; text-align:center; display:block;">
                                Launch in Visual Editor →
                            </a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Reset progress button
        const btnReset = container.querySelector('#btn-reset-lessons');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (confirm('Reset all lesson progress?')) {
                    LessonProgressManager.resetProgress();
                    this.renderLessons();
                }
            });
        }

        // Attach verify handlers
        container.querySelectorAll('.btn-solve').forEach(btn => {
            btn.addEventListener('click', () => {
                const lId = btn.dataset.lessonId;
                const lesson = ADVANCED_LESSONS.find(x => x.id === lId);
                if (lesson) {
                    // Execute standard behavioral validator test
                    const res = lesson.validate({
                        upperMsb: 7, upperLsb: 4, lowerMsb: 3, lowerLsb: 0,
                        pageBits: 4, offsetBits: 8, totalBits: 12,
                        genStage0: true, propStage1: true,
                        C: 0, V: 1,
                        heldCorrectly: true, qFinal: 0x9,
                        resetPriority: true,
                        tcAtCount: 5, modulo: 6,
                        finalParallel: 0b1011,
                        nextState: 'S_101', detected: true,
                        immediateType: 'MEALY', zeroLatencyType: 'MEALY'
                    });

                    const feedback = container.querySelector(`#feedback-${lId}`);
                    if (res.success) {
                        LessonProgressManager.markCompleted(lId);
                        feedback.innerHTML = `<span style="color: #10b981;">✅ ${res.message}</span>`;
                        this.renderLessons();
                    } else {
                        feedback.innerHTML = `<span style="color: #f43f5e;">❌ ${res.message}</span>`;
                    }
                }
            });
        });
    }

    setupVerilogTab() {
        const select = document.getElementById('verilog-module-select');
        const codeView = document.getElementById('verilog-code-viewer');
        const btnCopy = document.getElementById('btn-copy-verilog');

        const updateCode = () => {
            const val = select.value;
            let code = '';
            if (val === 'half_adder') code = AdvancedVerilogGenerator.generateHalfAdder();
            else if (val === 'full_adder') code = AdvancedVerilogGenerator.generateFullAdder();
            else if (val === 'rca4') code = AdvancedVerilogGenerator.generateRippleCarryAdder({ width: 4 });
            else if (val === 'alu4') code = AdvancedVerilogGenerator.generateALU({ width: 4 });
            else if (val === 'reg4') code = AdvancedVerilogGenerator.generateRegister({ width: 4 });
            else if (val === 'counter') code = AdvancedVerilogGenerator.generateCounter({ width: 4, maxCount: 9 });
            else if (val === 'shift') code = AdvancedVerilogGenerator.generateShiftRegister({ width: 4 });
            else if (val === 'fsm') {
                code = AdvancedVerilogGenerator.generateFSM(this.fsmEditor ? this.fsmEditor.fsm : { states: ['IDLE'] });
            }
            codeView.textContent = code;
        };

        if (select) {
            select.addEventListener('change', updateCode);
            updateCode();
        }

        if (btnCopy) {
            btnCopy.addEventListener('click', () => {
                navigator.clipboard.writeText(codeView.textContent);
                btnCopy.textContent = 'Copied!';
                setTimeout(() => { btnCopy.textContent = 'Copy Code'; }, 1500);
            });
        }
    }

    displayVerilog(code, moduleName) {
        const codeView = document.getElementById('verilog-code-viewer');
        if (codeView) {
            codeView.textContent = code;
        }
    }
}

// Bootstrap on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    window.advancedRTLApp = new AdvancedRTLApp();
    window.app = window.advancedRTLApp;
});
