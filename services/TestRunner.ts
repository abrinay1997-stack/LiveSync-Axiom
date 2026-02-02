
import { AudioEngine } from './AudioEngine';
import { AcousticUtils } from './AcousticUtils';
import { DSPEngine } from './DSPEngine';
import { fftForward, fftInverse, realToComplex, createWindow } from './FFT';

export interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  message: string;
  duration: number;
}

/**
 * TestRunner: DSP integrity test suite for LiveSync Axiom.
 * Validates mathematical correctness of FFT, cross-spectrum,
 * coherence, delay finder, smoothing, and acoustic metrics.
 */
export class TestRunner {
  public static async runAll(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    const runTest = async (name: string, fn: () => void | Promise<void>) => {
      const start = performance.now();
      try {
        await fn();
        results.push({ name, status: 'passed', message: 'OK', duration: performance.now() - start });
      } catch (e: any) {
        results.push({ name, status: 'failed', message: e.message || 'Unknown error', duration: performance.now() - start });
      }
    };

    // 1. FFT Roundtrip: forward then inverse should recover original signal
    await runTest('FFT Roundtrip (forward + inverse)', () => {
      const N = 1024;
      const original = new Float64Array(N);
      // Generate a known signal: sum of two sinusoids
      for (let i = 0; i < N; i++) {
        original[i] = Math.sin(2 * Math.PI * 100 * i / 48000) + 0.5 * Math.cos(2 * Math.PI * 1000 * i / 48000);
      }

      const complex = new Float64Array(N * 2);
      for (let i = 0; i < N; i++) {
        complex[2 * i] = original[i];
        complex[2 * i + 1] = 0;
      }

      fftForward(complex);
      fftInverse(complex);

      // Check reconstruction error
      let maxErr = 0;
      for (let i = 0; i < N; i++) {
        maxErr = Math.max(maxErr, Math.abs(complex[2 * i] - original[i]));
      }

      if (maxErr > 1e-10) {
        throw new Error(`Roundtrip error: ${maxErr.toExponential(3)} (expected < 1e-10)`);
      }
    });

    // 2. Parseval's theorem: energy in time domain = energy in freq domain
    await runTest('FFT Parseval Energy Conservation', () => {
      const N = 2048;
      const signal = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        signal[i] = Math.sin(2 * Math.PI * 440 * i / 48000);
      }

      let timeEnergy = 0;
      for (let i = 0; i < N; i++) timeEnergy += signal[i] * signal[i];

      const complex = new Float64Array(N * 2);
      const win = createWindow(N, 'rectangular');
      realToComplex(signal, complex, win);
      fftForward(complex);

      let freqEnergy = 0;
      for (let i = 0; i < N; i++) {
        freqEnergy += complex[2 * i] * complex[2 * i] + complex[2 * i + 1] * complex[2 * i + 1];
      }
      freqEnergy /= N; // Parseval normalization

      const ratio = freqEnergy / timeEnergy;
      if (Math.abs(ratio - 1) > 0.01) {
        throw new Error(`Energy ratio: ${ratio.toFixed(4)} (expected ~1.0)`);
      }
    });

    // 3. Coherence = 1 for identical signals
    await runTest('Coherence = 1.0 for identical signals', () => {
      const dsp = new DSPEngine(16384);
      dsp.fftSize = 4096;
      dsp.setWindow('hann');
      dsp.setAveraging('Exp', 4);

      // Feed identical signals into both channels
      for (let block = 0; block < 8; block++) {
        const signal = new Float32Array(4096);
        for (let i = 0; i < 4096; i++) {
          signal[i] = Math.sin(2 * Math.PI * 1000 * (block * 4096 + i) / 48000);
        }
        dsp.pushSamples(signal, signal.slice()); // identical
        dsp.processBlock(4096);
      }

      const tf = dsp.getTransferFunction('none');
      if (tf.coherence.length === 0) throw new Error('No coherence data produced');

      // Check bins in the audible range
      let minCoh = 1;
      const binStart = Math.round(100 * 4096 / 48000);
      const binEnd = Math.round(10000 * 4096 / 48000);
      for (let i = binStart; i < binEnd; i++) {
        if (tf.coherence[i] < minCoh) minCoh = tf.coherence[i];
      }

      if (minCoh < 0.95) {
        throw new Error(`Min coherence in 100-10kHz: ${minCoh.toFixed(3)} (expected > 0.95)`);
      }
    });

    // 4. Transfer function magnitude = 0 dB for identical signals
    await runTest('TF Magnitude = 0 dB for unity system', () => {
      const dsp = new DSPEngine(16384);
      dsp.fftSize = 4096;
      dsp.setWindow('hann');
      dsp.setAveraging('Exp', 4);

      for (let block = 0; block < 8; block++) {
        const signal = new Float32Array(4096);
        for (let i = 0; i < 4096; i++) {
          signal[i] = Math.sin(2 * Math.PI * 1000 * (block * 4096 + i) / 48000)
            + 0.5 * Math.sin(2 * Math.PI * 5000 * (block * 4096 + i) / 48000);
        }
        dsp.pushSamples(signal, signal.slice());
        dsp.processBlock(4096);
      }

      const tf = dsp.getTransferFunction('none');
      const binStart = Math.round(100 * 4096 / 48000);
      const binEnd = Math.round(10000 * 4096 / 48000);
      let maxDeviation = 0;
      for (let i = binStart; i < binEnd; i++) {
        if (tf.coherence[i] > 0.9) {
          maxDeviation = Math.max(maxDeviation, Math.abs(tf.magnitude[i]));
        }
      }

      if (maxDeviation > 0.5) {
        throw new Error(`Max magnitude deviation: ${maxDeviation.toFixed(2)} dB (expected < 0.5)`);
      }
    });

    // 5. Delay finder accuracy with synthetic delayed signal
    await runTest('Delay Finder: 100-sample offset detection', () => {
      const dsp = new DSPEngine(32768);
      dsp.fftSize = 4096;
      dsp.setWindow('hann');

      const delayInSamples = 100;
      const N = 16384;
      const ref = new Float32Array(N);
      const meas = new Float32Array(N);

      // White noise-like signal
      let seed = 42;
      const pseudoRandom = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };

      for (let i = 0; i < N; i++) ref[i] = pseudoRandom();
      for (let i = delayInSamples; i < N; i++) meas[i] = ref[i - delayInSamples];

      dsp.pushSamples(ref, meas);
      const result = dsp.computeAutoDelay();
      const detectedSamples = dsp.currentDelaySamples;

      if (Math.abs(detectedSamples - delayInSamples) > 2) {
        throw new Error(`Detected ${detectedSamples} samples (expected ${delayInSamples}, tolerance ±2)`);
      }
    });

    // 6. Window functions: verify known properties
    await runTest('Window Functions: Sum and Shape Validation', () => {
      const N = 1024;

      // Rectangular should be all 1s
      const rect = createWindow(N, 'rectangular');
      for (let i = 0; i < N; i++) {
        if (Math.abs(rect[i] - 1) > 1e-15) throw new Error('Rectangular window is not flat');
      }

      // Hann should be 0 at endpoints and 1 at center
      const hann = createWindow(N, 'hann');
      if (Math.abs(hann[0]) > 1e-10) throw new Error('Hann window not zero at start');
      if (Math.abs(hann[N / 2] - 1) > 1e-10) throw new Error('Hann window not unity at center');

      // All windows should be non-negative
      const windows: Array<[string, Float64Array]> = [
        ['hann', hann],
        ['hamming', createWindow(N, 'hamming')],
        ['blackman-harris', createWindow(N, 'blackman-harris')],
        ['flattop', createWindow(N, 'flattop')],
      ];

      for (const [name, win] of windows) {
        // Flat-top can go slightly negative, skip min check for it
        if (name === 'flattop') continue;
        for (let i = 0; i < N; i++) {
          if (win[i] < -1e-10) throw new Error(`${name} window has negative value: ${win[i]}`);
        }
      }
    });

    // 7. Octave Smoothing: output size matches input, no NaN
    await runTest('Octave Smoothing Integrity', () => {
      const input = new Float32Array(2049).fill(-20);
      // Add a peak
      input[100] = 0;
      const output = AudioEngine.applySmoothing(input, '1/3');
      if (output.length !== input.length) throw new Error('Buffer size changed after smoothing');
      for (let i = 0; i < output.length; i++) {
        if (isNaN(output[i])) throw new Error(`NaN at bin ${i}`);
      }
      // The peak should be smoothed down
      if (output[100] >= 0) throw new Error('Smoothing did not reduce the peak');
    });

    // 8. Acoustic Utilities: conversion math
    await runTest('Acoustic Utilities: Conversion Math', () => {
      const samples = 480; // 10ms at 48kHz
      const ms = AcousticUtils.samplesToMs(samples, 48000);
      const meters = AcousticUtils.samplesToMeters(samples, 48000);

      if (ms !== 10) throw new Error(`MS conversion: ${ms} (expected 10)`);
      if (Math.abs(meters - 3.43) > 0.01) throw new Error(`Meters conversion: ${meters} (expected ~3.43)`);
    });

    // 9. Ring buffer integrity (via DSPEngine push/read cycle)
    await runTest('Ring Buffer: Push/Read Consistency', () => {
      const dsp = new DSPEngine(1024);
      const input = new Float32Array(512);
      for (let i = 0; i < 512; i++) input[i] = i / 512;

      dsp.pushSamples(input, input);
      const output = dsp.readMeasSamples(512);

      let maxErr = 0;
      for (let i = 0; i < 512; i++) {
        maxErr = Math.max(maxErr, Math.abs(output[i] - input[i]));
      }
      if (maxErr > 1e-6) throw new Error(`Ring buffer mismatch: max error ${maxErr}`);
    });

    return results;
  }
}
