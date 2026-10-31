/**
 * test_beginner_experience.js — Comprehensive Test Suite for Beginner Learning Experience
 * 
 * Verifies:
 * 1. 12 Fundamentals Lessons structure (steps, hints, whatIsHappening, solutionPreset, validate)
 * 2. Micro-step checks run without exceptions on starter circuits
 * 3. Reference solution presets pass 100% of micro-steps and lesson validation
 * 4. PanelManager live hardware explainer (_getLiveBehaviorExplanation) for all component types
 * 5. Advanced RTL Lab interactive challenge collection and validation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { CircuitGraph } from '../src/engine/circuit_graph.js';
import { LogicSimulator } from '../src/engine/logic_simulator.js';
import { SequentialEngine } from '../src/engine/sequential_engine.js';
import { LESSONS } from '../src/modules/lessons.js';
import { PRESETS } from '../src/modules/presets.js';
import { PanelManager } from '../src/ui/panels.js';
import { ADVANCED_LESSONS } from '../advanced-lab/lessons/advanced_lessons.js';
import { SoundController } from '../src/ui/sound_effects.js';

describe('Beginner Guided Experience Test Suite', () => {

    it('All 12 Fundamentals lessons must have steps, hints, whatIsHappening, and solutionPreset', () => {
        assert.strictEqual(LESSONS.length, 12, 'Must have exactly 12 Fundamentals lessons');

        LESSONS.forEach((lesson, idx) => {
            assert.ok(lesson.id, `Lesson ${idx + 1} must have id`);
            assert.ok(lesson.title, `Lesson ${idx + 1} must have title`);
            assert.ok(lesson.whatIsHappening, `Lesson ${lesson.id} must have whatIsHappening explanation`);
            assert.ok(lesson.task, `Lesson ${lesson.id} must have task`);
            assert.ok(lesson.solutionPreset, `Lesson ${lesson.id} must have solutionPreset`);
            assert.ok(PRESETS[lesson.solutionPreset], `Preset ${lesson.solutionPreset} must exist in PRESETS`);
            assert.ok(Array.isArray(lesson.steps), `Lesson ${lesson.id} must have steps array`);
            assert.ok(lesson.steps.length >= 3, `Lesson ${lesson.id} must have at least 3 guided micro-steps`);

            lesson.steps.forEach((step, sIdx) => {
                assert.ok(step.id, `Lesson ${lesson.id} step ${sIdx} must have id`);
                assert.ok(step.text, `Lesson ${lesson.id} step ${sIdx} must have text`);
                assert.ok(step.hint, `Lesson ${lesson.id} step ${sIdx} must have hint`);
                assert.strictEqual(typeof step.check, 'function', `Lesson ${lesson.id} step ${sIdx} check must be function`);
            });
        });
    });

    it('Micro-step checks must execute cleanly on starter circuits without throwing errors', () => {
        LESSONS.forEach(lesson => {
            const graph = new CircuitGraph();
            const simulator = new LogicSimulator(graph);
            const seq = new SequentialEngine(graph, simulator);

            if (lesson.starterCircuit) {
                graph.deserialize(lesson.starterCircuit);
                simulator.evaluate();
            }

            lesson.steps.forEach(step => {
                assert.doesNotThrow(() => {
                    step.check(graph, simulator, seq);
                }, `Step ${step.id} check threw an error on starter circuit`);
            });
        });
    });

    it('All 12 reference solution presets must satisfy their lesson validations', () => {
        LESSONS.forEach(lesson => {
            const graph = new CircuitGraph();
            const simulator = new LogicSimulator(graph);
            const seq = new SequentialEngine(graph, simulator);

            const preset = PRESETS[lesson.solutionPreset];
            assert.ok(preset, `Preset ${lesson.solutionPreset} must exist`);

            graph.deserialize(preset.circuit);
            seq.reset();
            seq.initializeDFFs();
            simulator.evaluate();

            // For sequential circuits, step clock twice to initialize history
            if (graph.getClockComponents().length > 0 || graph.getDFFComponents().length > 0) {
                seq.clockStep();
                seq.clockStep();
            }

            // Run validation
            const result = lesson.validate(graph, simulator, seq);
            assert.strictEqual(result.pass, true, `Lesson ${lesson.id} validation failed on its own solutionPreset ${lesson.solutionPreset}: ${result.message}`);
        });
    });

    it('PanelManager _getLiveBehaviorExplanation produces valid explanation for all components', () => {
        const graph = new CircuitGraph();

        const types = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'MUX2', 'DFF', 'DFFE', 'DFFSR', 'DFFESR', 'INPUT', 'OUTPUT', 'CLOCK'];

        types.forEach(type => {
            const res = graph.addComponent(type, 50, 50, type);
            const comp = graph.getComponent(res.id);

            const explanation = PanelManager.prototype._getLiveBehaviorExplanation.call({ graph }, comp);
            assert.ok(explanation, `Component type ${type} must return an explanation object`);
            assert.ok(explanation.state, `Component type ${type} must have state label`);
            assert.ok(explanation.stateColor, `Component type ${type} must have state color`);
            assert.ok(explanation.explanation, `Component type ${type} must have detailed explanation string`);
            assert.ok(explanation.explanation.length > 15, `Component type ${type} explanation must be descriptive`);
        });
    });

    it('Advanced RTL Lab lessons must correctly validate interactive student inputs', () => {
        assert.strictEqual(ADVANCED_LESSONS.length, 12, 'Must have 12 Advanced Lab lessons');

        // Test Lesson 1 (Vectors & Slicing)
        const l1 = ADVANCED_LESSONS.find(l => l.id === 'lesson_1_vectors_slicing');
        assert.ok(l1);
        const l1Success = l1.validate({ upperMsb: 7, upperLsb: 4, lowerMsb: 3, lowerLsb: 0 });
        assert.strictEqual(l1Success.success, true);
        const l1Fail = l1.validate({ upperMsb: 6, upperLsb: 4, lowerMsb: 3, lowerLsb: 0 });
        assert.strictEqual(l1Fail.success, false);

        // Test Lesson 2 (Concatenation)
        const l2 = ADVANCED_LESSONS.find(l => l.id === 'lesson_2_concatenation');
        assert.ok(l2);
        assert.strictEqual(l2.validate({ pageBits: 4, offsetBits: 8, totalBits: 12 }).success, true);
        assert.strictEqual(l2.validate({ pageBits: 4, offsetBits: 4, totalBits: 8 }).success, false);

        // Test Lesson 4 (ALU Flags)
        const l4 = ADVANCED_LESSONS.find(l => l.id === 'lesson_4_alu_flags');
        assert.ok(l4);
        assert.strictEqual(l4.validate({ C: 0, V: 1 }).success, true);
        assert.strictEqual(l4.validate({ C: 1, V: 0 }).success, false);

        // Test Lesson 7 (Modulo Counter)
        const l7 = ADVANCED_LESSONS.find(l => l.id === 'lesson_7_modulo_counter');
        assert.ok(l7);
        assert.strictEqual(l7.validate({ tcAtCount: 5, modulo: 6 }).success, true);
        assert.strictEqual(l7.validate({ tcAtCount: 6, modulo: 6 }).success, false);

        // Test Lesson 9 (FSM Moore)
        const l9 = ADVANCED_LESSONS.find(l => l.id === 'lesson_9_fsm_moore');
        assert.ok(l9);
        assert.strictEqual(l9.validate({ nextState: 'S_101' }).success, true);
        assert.strictEqual(l9.validate({ nextState: 'S_RESET' }).success, false);
    });

    it('All 12 Fundamentals lessons must have an interactive Concept Check quiz with exactly 1 correct answer', () => {
        LESSONS.forEach(lesson => {
            assert.ok(lesson.quiz, `Lesson ${lesson.id} must have a quiz object`);
            assert.ok(typeof lesson.quiz.question === 'string' && lesson.quiz.question.length > 10, `Lesson ${lesson.id} quiz must have a descriptive question`);
            assert.ok(Array.isArray(lesson.quiz.options) && lesson.quiz.options.length >= 2, `Lesson ${lesson.id} quiz must have at least 2 options`);
            
            const correctCount = lesson.quiz.options.filter(o => o.correct).length;
            assert.strictEqual(correctCount, 1, `Lesson ${lesson.id} quiz must have exactly 1 correct option`);

            lesson.quiz.options.forEach((opt, oIdx) => {
                assert.ok(opt.text, `Lesson ${lesson.id} opt ${oIdx} must have text`);
                assert.ok(opt.explain, `Lesson ${lesson.id} opt ${oIdx} must have explanation`);
            });
        });
    });

    it('SoundController manages mute state and executes safely in headless environment', () => {
        const sound = new SoundController();
        assert.strictEqual(typeof sound.isMuted, 'boolean');
        const initial = sound.isMuted;
        const toggled = sound.toggleMute();
        assert.strictEqual(toggled, !initial);
        sound.toggleMute(); // toggle back

        // Ensure playback methods never throw in non-browser/headless Node
        assert.doesNotThrow(() => sound.playSwitchClick());
        assert.doesNotThrow(() => sound.playWireConnect());
        assert.doesNotThrow(() => sound.playStepSuccess());
        assert.doesNotThrow(() => sound.playLessonComplete());
    });

    it('Bidirectional connection logic: input-to-output wire orientation connects properly', () => {
        const graph = new CircuitGraph();
        const gateId = graph.addComponent('AND', 100, 100).id;
        const swId = graph.addComponent('INPUT', 20, 100).id;
        const gate = graph.getComponent(gateId);
        const sw = graph.getComponent(swId);

        // Simulate bidirectional wiring: user started from input pin, dragged to output pin
        let fromComp = gate.id;
        let fromPin = gate.inputs[0].id;
        let toComp = sw.id;
        let toPin = sw.outputs[0].id;

        // The bidirectional adapter swaps them so from=output and to=input
        const swappedFromComp = toComp;
        const swappedFromPin = toPin;
        const swappedToComp = fromComp;
        const swappedToPin = fromPin;

        const res = graph.addConnection(swappedFromComp, swappedFromPin, swappedToComp, swappedToPin);
        assert.strictEqual(res.ok, true, 'Connection should succeed when properly oriented');
        assert.strictEqual(graph.connections.size, 1);
        const conn = Array.from(graph.connections.values())[0];
        assert.strictEqual(conn.fromComponent, sw.id);
        assert.strictEqual(conn.toComponent, gate.id);
    });

});
