/**
 * prng.js — Deterministic Pseudo-Random Number Generator (Mulberry32)
 * 
 * Provides reproducible random number sequences across test runs.
 * Supports state capture and restoration for minimal failure reproduction.
 */

export class PRNG {
    /**
     * @param {number} seed - 32-bit integer seed
     */
    constructor(seed = 123456789) {
        this.initialSeed = seed >>> 0;
        this.state = this.initialSeed;
    }

    /**
     * Return next pseudo-random 32-bit unsigned integer.
     * @returns {number}
     */
    nextUint32() {
        let z = (this.state += 0x6D2B79F5);
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0);
    }

    /**
     * Return next float in [0, 1).
     * @returns {number}
     */
    next() {
        return this.nextUint32() / 4294967296;
    }

    /**
     * Return random integer in [min, max] inclusive.
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    nextInt(min, max) {
        if (min > max) [min, max] = [max, min];
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Return true with given probability (default 0.5).
     * @param {number} [prob=0.5]
     * @returns {boolean}
     */
    nextBoolean(prob = 0.5) {
        return this.next() < prob;
    }

    /**
     * Pick a random element from an array.
     * @template T
     * @param {T[]} array
     * @returns {T}
     */
    choice(array) {
        if (!array || array.length === 0) return undefined;
        return array[this.nextInt(0, array.length - 1)];
    }

    /**
     * Pick k distinct random elements from an array (without replacement).
     * @template T
     * @param {T[]} array
     * @param {number} k
     * @returns {T[]}
     */
    sample(array, k) {
        const copy = [...array];
        const result = [];
        k = Math.min(k, copy.length);
        for (let i = 0; i < k; i++) {
            const idx = this.nextInt(0, copy.length - 1);
            result.push(copy[idx]);
            copy.splice(idx, 1);
        }
        return result;
    }

    /**
     * Shuffle an array in-place using Fisher-Yates.
     * @template T
     * @param {T[]} array
     * @returns {T[]}
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Get current state snapshot.
     */
    getState() {
        return {
            initialSeed: this.initialSeed,
            state: this.state
        };
    }

    /**
     * Restore state snapshot.
     */
    setState(snapshot) {
        this.initialSeed = snapshot.initialSeed;
        this.state = snapshot.state;
    }
}
