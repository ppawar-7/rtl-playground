/**
 * panels.js — Workspace Layout, Panel Tabs, and Inspector Manager
 * 
 * Manages tab switching in left sidebar and bottom drawer,
 * component inspector display, circuit health checks, and Verilog display.
 * 
 * @module PanelManager
 */

export class PanelManager {
    /**
     * @param {import('../engine/circuit_graph.js').CircuitGraph} graph
     * @param {import('../engine/verilog_generator.js').VerilogGenerator} verilogGen
     * @param {import('../ui/circuit_editor.js').CircuitEditor} editor
     */
    constructor(graph, verilogGen, editor) {
        this.graph = graph;
        this.verilogGen = verilogGen;
        this.editor = editor;

        this.currentDrawerTab = 'verilog';
        this.currentSidebarTab = 'palette';

        this._bindDrawerTabs();
        this._bindSidebarTabs();
        this._bindInspector();
    }

    _bindSidebarTabs() {
        const tabs = document.querySelectorAll('.sidebar-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const paletteView = document.getElementById('palette-container');
                const lessonsView = document.getElementById('lessons-container');

                if (target === 'palette') {
                    if (paletteView) paletteView.style.display = 'flex';
                    if (lessonsView) lessonsView.style.display = 'none';
                } else {
                    if (paletteView) paletteView.style.display = 'none';
                    if (lessonsView) lessonsView.style.display = 'flex';
                }
                this.currentSidebarTab = target;
            });
        });
    }

    _bindDrawerTabs() {
        const tabs = document.querySelectorAll('.drawer-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const panes = document.querySelectorAll('.tab-pane');
                panes.forEach(p => p.classList.remove('active'));

                const activePane = document.getElementById(`tab-${target}`);
                if (activePane) activePane.classList.add('active');

                this.currentDrawerTab = target;
                this.onTabSwitched(target);
            });
        });

        // Copy Verilog button
        const copyBtn = document.getElementById('copy-verilog-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const codeEl = document.getElementById('verilog-code-display');
                if (codeEl) {
                    navigator.clipboard.writeText(codeEl.textContent).then(() => {
                        const originalText = copyBtn.textContent;
                        copyBtn.textContent = '✓ Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                        }, 1800);
                    });
                }
            });
        }
    }

    _bindInspector() {
        this.editor.onSelectionChanged = (selection) => {
            this.updateInspector(selection);
        };
    }

    onTabSwitched(tabName) {
        if (tabName === 'verilog') {
            this.updateVerilog();
        } else if (tabName === 'truth-table') {
            if (window.app && window.app.truthTable) {
                window.app.truthTable.render();
            }
        } else if (tabName === 'waveform') {
            if (window.app && window.app.waveform) {
                window.app.waveform.redraw();
            }
        }
    }

    updateVerilog() {
        const codeDisplay = document.getElementById('verilog-code-display');
        if (!codeDisplay) return;

        const res = this.verilogGen.generate('digital_circuit');
        codeDisplay.textContent = res.code || '// No code generated';
    }

    updateInspector(selection) {
        const inspectorContainer = document.getElementById('inspector-content');
        if (!inspectorContainer) return;

        if (!selection || !selection.type) {
            // General circuit stats
            const summary = this.graph.getSummary();
            const validation = this.graph.validateCircuit();

            let healthHtml = '';
            if (!validation.valid) {
                healthHtml = `
                    <div class="circuit-alert alert-error">
                        <div>
                            <strong>Error:</strong> ${validation.errors.join('<br>')}
                        </div>
                    </div>
                `;
            } else if (validation.warnings.length > 0) {
                healthHtml = `
                    <div class="circuit-alert alert-warn">
                        <div>
                            <strong>Warning:</strong> ${validation.warnings.join('<br>')}
                        </div>
                    </div>
                `;
            } else {
                healthHtml = `
                    <div class="circuit-alert alert-ok">
                        <div>✓ Circuit topology clean & valid</div>
                    </div>
                `;
            }

            inspectorContainer.innerHTML = `
                <div class="inspector-card">
                    <div class="inspector-card-title">Circuit Statistics</div>
                    <div class="stat-grid">
                        <div class="stat-item">
                            <span class="stat-label">Components</span>
                            <span class="stat-val">${summary.componentCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Connections</span>
                            <span class="stat-val">${summary.connectionCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Inputs / Clocks</span>
                            <span class="stat-val">${summary.inputCount + summary.clockCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Outputs</span>
                            <span class="stat-val">${summary.outputCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Flip-Flops</span>
                            <span class="stat-val">${summary.dffCount}</span>
                        </div>
                    </div>
                </div>

                <div class="inspector-card">
                    <div class="inspector-card-title">Circuit Health</div>
                    ${healthHtml}
                </div>
            `;
            return;
        }

        if (selection.type === 'component') {
            const comp = selection.component;
            if (!comp) return;

            inspectorContainer.innerHTML = `
                <div class="inspector-card">
                    <div class="inspector-card-title">
                        <span>Selected Component</span>
                        <button id="btn-delete-selected" class="btn btn-sm btn-danger">Delete</button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <div><strong>Type:</strong> ${comp.type}</div>
                        <div><strong>Label:</strong> ${comp.label}</div>
                        <div><strong>ID:</strong> <code style="font-size:10px;">${comp.id}</code></div>
                        <div><strong>Inputs:</strong> ${comp.inputs.length}</div>
                        <div><strong>Outputs:</strong> ${comp.outputs.length}</div>
                    </div>
                </div>
            `;

            const delBtn = document.getElementById('btn-delete-selected');
            if (delBtn) {
                delBtn.addEventListener('click', () => {
                    this.graph.removeComponent(comp.id);
                    this.editor.render();
                    this.updateInspector(null);
                });
            }
        } else if (selection.type === 'wire') {
            const conn = selection.connection;
            if (!conn) return;

            inspectorContainer.innerHTML = `
                <div class="inspector-card">
                    <div class="inspector-card-title">
                        <span>Selected Connection</span>
                        <button id="btn-delete-selected" class="btn btn-sm btn-danger">Delete</button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; font-size:11px;">
                        <div><strong>From:</strong> <code>${conn.fromComponent}.${conn.fromPin}</code></div>
                        <div><strong>To:</strong> <code>${conn.toComponent}.${conn.toPin}</code></div>
                    </div>
                </div>
            `;

            const delBtn = document.getElementById('btn-delete-selected');
            if (delBtn) {
                delBtn.addEventListener('click', () => {
                    this.graph.removeConnection(conn.id);
                    this.editor.render();
                    this.updateInspector(null);
                });
            }
        }
    }
}
