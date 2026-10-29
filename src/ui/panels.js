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
            if (selection && selection.type === 'component' && selection.component) {
                this.updateVerilog(selection.component.id);
            } else {
                this.updateVerilog(null);
            }
        };
    }

    onTabSwitched(tabName) {
        if (tabName === 'verilog') {
            const selectedComp = this.editor.selectedComponentId;
            this.updateVerilog(selectedComp);
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

    _escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    updateVerilog(selectedComponentId = null) {
        const codeDisplay = document.getElementById('verilog-code-display');
        const syncIndicator = document.getElementById('verilog-sync-indicator');
        if (!codeDisplay) return;

        const res = this.verilogGen.generate('digital_circuit');
        if (!res.ok || !res.code) {
            codeDisplay.textContent = res.code || '// No code generated';
            if (syncIndicator) syncIndicator.style.display = 'none';
            return;
        }

        const lines = res.code.split('\n');
        const selectedComp = selectedComponentId ? this.graph.getComponent(selectedComponentId) : null;
        let matchedCount = 0;

        // Build line-by-line HTML with syntax & selection highlighting
        const html = lines.map((line, idx) => {
            let isHighlighted = false;
            if (selectedComp) {
                const sName = (this.verilogGen.signalNames && this.verilogGen.signalNames.get(selectedComp.id)) 
                    || selectedComp.label 
                    || selectedComp.id;
                
                // Regex word boundary matching for signal identifier
                const idPattern = new RegExp(`\\b${sName}\\b`);
                if (idPattern.test(line)) {
                    isHighlighted = true;
                } else if (selectedComp.type === 'DFF' && (line.includes(`${sName}_q`) || (line.includes('always @(posedge') && line.includes(sName)))) {
                    isHighlighted = true;
                }
            }

            if (isHighlighted) matchedCount++;
            const hlClass = isHighlighted ? 'highlighted-verilog-line' : '';
            return `<div class="verilog-line ${hlClass}" data-line="${idx + 1}"><span class="line-num">${idx + 1}</span><span class="line-text">${this._escapeHtml(line)}</span></div>`;
        }).join('');

        codeDisplay.innerHTML = html;
        if (syncIndicator) {
            syncIndicator.style.display = (selectedComp && matchedCount > 0) ? 'inline-block' : 'none';
        }
    }

    _getRtlMappingInfo(comp) {
        switch (comp.type) {
            case 'AND':
                return {
                    construct: 'Continuous Bitwise AND (&)',
                    example: `assign y = (in0 & in1);`,
                    cell: 'AND2X1 Combinational Cell',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'OR':
                return {
                    construct: 'Continuous Bitwise OR (|)',
                    example: `assign y = (in0 | in1);`,
                    cell: 'OR2X1 Combinational Cell',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'NOT':
                return {
                    construct: 'Continuous Inversion (~)',
                    example: `assign y = (~in0);`,
                    cell: 'INVX1 Inverter Cell',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'NAND':
                return {
                    construct: 'Continuous Bitwise NAND (~(&))',
                    example: `assign y = ~(in0 & in1);`,
                    cell: 'NAND2X1 Inverted Gate',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'NOR':
                return {
                    construct: 'Continuous Bitwise NOR (~(|))',
                    example: `assign y = ~(in0 | in1);`,
                    cell: 'NOR2X1 Inverted Gate',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'XOR':
                return {
                    construct: 'Continuous Bitwise XOR (^)',
                    example: `assign sum = (a ^ b);`,
                    cell: 'XOR2X1 Parity/Adder Cell',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'XNOR':
                return {
                    construct: 'Continuous Equivalence (~(^))',
                    example: `assign eq = ~(a ^ b);`,
                    cell: 'XNOR2X1 Equality Cell',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'MUX2':
                return {
                    construct: 'Ternary Conditional (sel ? in1 : in0)',
                    example: `assign y = sel ? b : a;`,
                    cell: 'MUX2X1 Data Selector',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'DFF':
                return {
                    construct: 'Clocked always @(posedge clk)',
                    example: `always @(posedge clk) q <= d;`,
                    cell: 'DFFX1 Rising-Edge Register',
                    timing: 'Sequential 1-cycle latency (samples D on clock edge)'
                };
            case 'INPUT':
                return {
                    construct: 'Module Input Port (input wire)',
                    example: `input wire ${comp.label};`,
                    cell: 'Primary Input Pad / Net',
                    timing: 'Driven externally'
                };
            case 'OUTPUT':
                return {
                    construct: 'Module Output Port (output wire)',
                    example: `output wire ${comp.label};`,
                    cell: 'Primary Output Pad / Net',
                    timing: 'Driven continuously via assign'
                };
            case 'CLOCK':
                return {
                    construct: 'Clock Net (posedge clk sensitivity)',
                    example: `input wire ${comp.label};`,
                    cell: 'Clock Distribution Network / Tree',
                    timing: 'Periodic clock edge generator'
                };
            default:
                return null;
        }
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

            const rtlInfo = this._getRtlMappingInfo(comp);
            let rtlCardHtml = '';
            if (rtlInfo) {
                rtlCardHtml = `
                    <div class="inspector-card" style="border-left: 3px solid var(--accent-primary);">
                        <div class="inspector-card-title" style="color:var(--accent-primary);">RTL Hardware Mapping</div>
                        <div style="display:flex; flex-direction:column; gap:6px; font-size:12px;">
                            <div><strong>Construct:</strong> <code style="font-size:11px; color:#38bdf8;">${this._escapeHtml(rtlInfo.construct)}</code></div>
                            <div><strong>Verilog Pattern:</strong></div>
                            <pre class="rtl-example-code" style="padding:4px 6px; font-size:11px;"><code>${this._escapeHtml(rtlInfo.example)}</code></pre>
                            <div><strong>Synthesis Cell:</strong> <span>${rtlInfo.cell}</span></div>
                            <div style="font-size:11px; color:var(--text-muted);"><strong>Timing:</strong> ${rtlInfo.timing}</div>
                        </div>
                    </div>
                `;
            }

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
                ${rtlCardHtml}
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
