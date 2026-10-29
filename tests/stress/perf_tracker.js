/**
 * perf_tracker.js — Performance, Memory, and Throughput Monitor
 * 
 * Tracks heap allocation, peak memory, simulation throughput, and detects
 * abnormal memory growth patterns during long-running stress execution.
 */

export class PerfTracker {
    constructor() {
        this.startTime = Date.now();
        this.baselineMemory = process.memoryUsage();
        this.peakHeapUsed = this.baselineMemory.heapUsed;
        this.peakRss = this.baselineMemory.rss;
        this.samples = [];

        this.counters = {
            circuitsGenerated: 0,
            simulationsRun: 0,
            truthTableChecks: 0,
            sequentialSteps: 0,
            serializationChecks: 0,
            verilogCompilations: 0,
            invalidRejections: 0,
            browserSmokePasses: 0,
            scaleBenchmarksRun: 0
        };

        this.benchmarkResults = [];
    }

    /**
     * Increment an activity counter.
     * @param {keyof this.counters} key
     * @param {number} [amount=1]
     */
    increment(key, amount = 1) {
        if (this.counters[key] !== undefined) {
            this.counters[key] += amount;
        }
    }

    /**
     * Sample current memory usage.
     */
    sampleMemory() {
        const mem = process.memoryUsage();
        if (mem.heapUsed > this.peakHeapUsed) this.peakHeapUsed = mem.heapUsed;
        if (mem.rss > this.peakRss) this.peakRss = mem.rss;

        const sample = {
            timestamp: Date.now(),
            elapsedSec: Math.floor((Date.now() - this.startTime) / 1000),
            heapUsedMB: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
            heapTotalMB: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
            rssMB: Number((mem.rss / 1024 / 1024).toFixed(2)),
            externalMB: Number((mem.external / 1024 / 1024).toFixed(2))
        };

        this.samples.push(sample);
        // Keep samples bounded to avoid memory consumption in tracker itself
        if (this.samples.length > 500) {
            this.samples.splice(0, 100);
        }

        return sample;
    }

    /**
     * Record a scaling benchmark point.
     * @param {number} gateCount
     * @param {number} buildTimeMs
     * @param {number} topoTimeMs
     * @param {number} simTimeMs
     * @param {number} heapUsedMB
     */
    recordBenchmark(gateCount, buildTimeMs, topoTimeMs, simTimeMs, heapUsedMB) {
        this.benchmarkResults.push({
            gateCount,
            buildTimeMs: Number(buildTimeMs.toFixed(3)),
            topoTimeMs: Number(topoTimeMs.toFixed(3)),
            simTimeMs: Number(simTimeMs.toFixed(3)),
            heapUsedMB
        });
    }

    /**
     * Generate summary report of performance and memory.
     */
    getSummary() {
        const elapsedSec = Math.max(1, Math.floor((Date.now() - this.startTime) / 1000));
        const currentMem = process.memoryUsage();

        return {
            elapsedSec,
            elapsedFormatted: `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`,
            baselineHeapMB: Number((this.baselineMemory.heapUsed / 1024 / 1024).toFixed(2)),
            currentHeapMB: Number((currentMem.heapUsed / 1024 / 1024).toFixed(2)),
            peakHeapMB: Number((this.peakHeapUsed / 1024 / 1024).toFixed(2)),
            peakRssMB: Number((this.peakRss / 1024 / 1024).toFixed(2)),
            counters: { ...this.counters },
            throughput: {
                circuitsPerSec: Number((this.counters.circuitsGenerated / elapsedSec).toFixed(1)),
                simulationsPerSec: Number((this.counters.simulationsRun / elapsedSec).toFixed(1)),
                sequentialStepsPerSec: Number((this.counters.sequentialSteps / elapsedSec).toFixed(1))
            },
            complexityScaling: this.benchmarkResults.slice(-5)
        };
    }
}
