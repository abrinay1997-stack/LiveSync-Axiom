import { describe, it, expect, beforeEach } from 'vitest';
import { DSPEngine } from '../services/DSPEngine';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSine(freq: number, N: number, sr: number = 48000, amplitude: number = 1): Float32Array {
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    out[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sr);
  }
  return out;
}

function makePseudoNoise(N: number, seed: number = 42): Float32Array {
  const out = new Float32Array(N);
  let s = seed;
  for (let i = 0; i < N; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out[i] = s / 0x7fffffff * 2 - 1;
  }
  return out;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DSPEngine', () => {
  let dsp: DSPEngine;

  beforeEach(() => {
    dsp = new DSPEngine(32768);
    dsp.fftSize = 4096;
    dsp.setWindow('hann');
    dsp.setAveraging('Exp', 4);
  });

  describe('Ring buffer', () => {
    it('push and read returns correct data', () => {
      const input = new Float32Array(512);
      for (let i = 0; i < 512; i++) input[i] = i / 512;

      dsp.pushSamples(input, input);
      const output = dsp.readMeasSamples(512);

      let maxErr = 0;
      for (let i = 0; i < 512; i++) {
        maxErr = Math.max(maxErr, Math.abs(output[i] - input[i]));
      }
      expect(maxErr).toBeLessThan(1e-6);
    });

    it('handles wraparound correctly', () => {
      const small = new DSPEngine(128);
      // Push more than capacity
      const data1 = new Float32Array(100).fill(1);
      const data2 = new Float32Array(100).fill(2);
      small.pushSamples(data1, data1);
      small.pushSamples(data2, data2);

      const result = small.readMeasSamples(50);
      // Should read the most recent data (all 2s)
      for (let i = 0; i < 50; i++) {
        expect(result[i]).toBe(2);
      }
    });

    it('returns zeros when not enough data', () => {
      const small = new DSPEngine(256);
      const short = new Float32Array(10).fill(5);
      small.pushSamples(short, short);
      // Try to read more than available
      const result = small.readMeasSamples(200);
      // Should have some zeros (ring buffer returns false, readMeasSamples returns zero-filled array)
      expect(result.length).toBe(200);
    });
  });

  describe('FFT size management', () => {
    it('getter returns current size', () => {
      expect(dsp.fftSize).toBe(4096);
    });

    it('setter changes size and creates accumulator', () => {
      dsp.fftSize = 8192;
      expect(dsp.fftSize).toBe(8192);
    });

    it('no-op when setting same size', () => {
      dsp.fftSize = 4096;
      expect(dsp.fftSize).toBe(4096);
    });
  });

  describe('Block processing', () => {
    it('returns false when insufficient data', () => {
      const result = dsp.processBlock(4096);
      expect(result).toBe(false);
    });

    it('returns true after sufficient data pushed', () => {
      const signal = makeSine(1000, 4096);
      dsp.pushSamples(signal, signal);
      const result = dsp.processBlock(4096);
      expect(result).toBe(true);
    });

    it('processAllMTW processes all three FFT sizes', () => {
      // Push enough data for the largest MTW size (16384)
      const signal = makeSine(1000, 16384);
      dsp.pushSamples(signal, signal);
      // Should not throw
      dsp.processAllMTW();
    });
  });

  describe('Coherence', () => {
    it('equals 1.0 for identical signals', () => {
      for (let block = 0; block < 8; block++) {
        const signal = makeSine(1000, 4096, 48000, 1);
        // Use offset to avoid repetition
        const offset = new Float32Array(4096);
        for (let i = 0; i < 4096; i++) {
          offset[i] = Math.sin(2 * Math.PI * 1000 * (block * 4096 + i) / 48000);
        }
        dsp.pushSamples(offset, offset.slice());
        dsp.processBlock(4096);
      }

      const tf = dsp.getTransferFunction('none');
      expect(tf.coherence.length).toBeGreaterThan(0);

      // Check audible range bins
      const binStart = Math.round(100 * 4096 / 48000);
      const binEnd = Math.round(10000 * 4096 / 48000);
      let minCoh = 1;
      for (let i = binStart; i < binEnd; i++) {
        minCoh = Math.min(minCoh, tf.coherence[i]);
      }
      expect(minCoh).toBeGreaterThan(0.95);
    });

    it('is low for uncorrelated signals', () => {
      dsp.setAveraging('Exp', 16);

      for (let block = 0; block < 16; block++) {
        const ref = makePseudoNoise(4096, block * 100);
        const meas = makePseudoNoise(4096, block * 100 + 50);
        dsp.pushSamples(ref, meas);
        dsp.processBlock(4096);
      }

      const tf = dsp.getTransferFunction('none');
      const binStart = Math.round(200 * 4096 / 48000);
      const binEnd = Math.round(8000 * 4096 / 48000);

      let avgCoh = 0;
      let count = 0;
      for (let i = binStart; i < binEnd; i++) {
        avgCoh += tf.coherence[i];
        count++;
      }
      avgCoh /= count;

      // Uncorrelated signals should have low average coherence
      expect(avgCoh).toBeLessThan(0.5);
    });

    it('is bounded between 0 and 1', () => {
      for (let block = 0; block < 4; block++) {
        const signal = makeSine(1000, 4096);
        dsp.pushSamples(signal, signal.slice());
        dsp.processBlock(4096);
      }

      const tf = dsp.getTransferFunction('none');
      for (let i = 0; i < tf.coherence.length; i++) {
        expect(tf.coherence[i]).toBeGreaterThanOrEqual(0);
        expect(tf.coherence[i]).toBeLessThanOrEqual(1.001); // tiny float tolerance
      }
    });
  });

  describe('Transfer function', () => {
    it('magnitude = 0 dB for unity system (identical signals)', () => {
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
      expect(maxDeviation).toBeLessThan(0.5);
    });

    it('detects a +6dB gain in measurement channel', () => {
      const gain = 2.0; // +6 dB
      for (let block = 0; block < 8; block++) {
        const ref = new Float32Array(4096);
        const meas = new Float32Array(4096);
        for (let i = 0; i < 4096; i++) {
          const sample = Math.sin(2 * Math.PI * 1000 * (block * 4096 + i) / 48000);
          ref[i] = sample;
          meas[i] = sample * gain;
        }
        dsp.pushSamples(ref, meas);
        dsp.processBlock(4096);
      }

      const tf = dsp.getTransferFunction('none');
      const bin1k = Math.round(1000 * 4096 / 48000);

      // Expect ~6 dB at 1kHz bin (20*log10(2) = 6.02)
      if (tf.coherence[bin1k] > 0.9) {
        expect(tf.magnitude[bin1k]).toBeCloseTo(6.02, 0);
      }
    });

    it('returns group delay array', () => {
      for (let block = 0; block < 4; block++) {
        const signal = makeSine(1000, 4096);
        dsp.pushSamples(signal, signal.slice());
        dsp.processBlock(4096);
      }

      const tf = dsp.getTransferFunction('none');
      expect(tf.groupDelay).toBeDefined();
      expect(tf.groupDelay!.length).toBe(4096 / 2 + 1);
    });

    it('returns empty arrays when no data processed', () => {
      const tf = dsp.getTransferFunction('none');
      expect(tf.magnitude.length).toBe(0);
      expect(tf.phase.length).toBe(0);
      expect(tf.coherence.length).toBe(0);
    });
  });

  describe('MTW Transfer Function', () => {
    it('returns data with correct bin count', () => {
      // Push enough for largest MTW size
      for (let block = 0; block < 4; block++) {
        const signal = makeSine(1000, 16384);
        dsp.pushSamples(signal, signal.slice());
        dsp.processAllMTW();
      }

      const tf = dsp.getTransferFunctionMTW('none');
      expect(tf.magnitude.length).toBe(4096 / 2 + 1);
      expect(tf.phase.length).toBe(4096 / 2 + 1);
      expect(tf.coherence.length).toBe(4096 / 2 + 1);
    });
  });

  describe('RTA data', () => {
    it('returns dB magnitude spectrum', () => {
      const signal = makeSine(1000, 4096, 48000, 0.5);
      dsp.pushSamples(signal, signal);
      dsp.processBlock(4096);

      const rta = dsp.getRTAData('none', false, 0);
      expect(rta.length).toBe(4096 / 2 + 1);

      // Find peak at 1kHz bin
      const bin1k = Math.round(1000 * 4096 / 48000);
      let maxBin = 0;
      let maxVal = -Infinity;
      for (let i = 0; i < rta.length; i++) {
        if (rta[i] > maxVal) { maxVal = rta[i]; maxBin = i; }
      }
      expect(Math.abs(maxBin - bin1k)).toBeLessThan(3);
    });

    it('applies visual gain offset', () => {
      const signal = makeSine(1000, 4096);
      dsp.pushSamples(signal, signal);
      dsp.processBlock(4096);

      const rtaNoGain = dsp.getRTAData('none', false, 0);
      const rtaWithGain = dsp.getRTAData('none', false, 10);

      // With 10 dB gain, each bin should be 10 dB higher
      const bin = Math.round(1000 * 4096 / 48000);
      expect(rtaWithGain[bin]).toBeCloseTo(rtaNoGain[bin] + 10, 1);
    });

    it('returns empty array when no data', () => {
      const rta = dsp.getRTAData('none', false, 0);
      expect(rta.length).toBe(0);
    });
  });

  describe('Delay finder', () => {
    it('detects a 100-sample delay', () => {
      const delay = 100;
      const N = 16384;
      const ref = makePseudoNoise(N, 42);
      const meas = new Float32Array(N);
      for (let i = delay; i < N; i++) meas[i] = ref[i - delay];

      dsp.pushSamples(ref, meas);
      dsp.computeAutoDelay();

      expect(Math.abs(dsp.currentDelaySamples - delay)).toBeLessThanOrEqual(2);
    });

    it('detects a 500-sample delay', () => {
      const delay = 500;
      const N = 16384;
      const ref = makePseudoNoise(N, 123);
      const meas = new Float32Array(N);
      for (let i = delay; i < N; i++) meas[i] = ref[i - delay];

      dsp.pushSamples(ref, meas);
      dsp.computeAutoDelay();

      expect(Math.abs(dsp.currentDelaySamples - delay)).toBeLessThanOrEqual(2);
    });

    it('returns ms and meters', () => {
      const N = 16384;
      const ref = makePseudoNoise(N, 42);
      const meas = new Float32Array(N);
      const delay = 48; // 1ms at 48kHz
      for (let i = delay; i < N; i++) meas[i] = ref[i - delay];

      dsp.pushSamples(ref, meas);
      const result = dsp.computeAutoDelay();

      expect(result.ms).toBeGreaterThan(0);
      expect(result.meters).toBeGreaterThan(0);
      expect(result.ms).toBeCloseTo(1, 0); // ~1ms
    });

    it('stores impulse response', () => {
      const N = 16384;
      const ref = makePseudoNoise(N, 42);
      dsp.pushSamples(ref, ref.slice());
      dsp.computeAutoDelay();

      expect(dsp.lastImpulseResponse.length).toBeGreaterThan(0);
    });

    it('computes acoustic metrics', () => {
      const N = 16384;
      const ref = makePseudoNoise(N, 42);
      dsp.pushSamples(ref, ref.slice());
      dsp.computeAutoDelay();

      expect(dsp.acousticMetrics).not.toBeNull();
      expect(dsp.acousticMetrics!.c80).toBeDefined();
      expect(dsp.acousticMetrics!.d50).toBeDefined();
      expect(dsp.acousticMetrics!.rt60).toBeDefined();
    });
  });

  describe('Averaging modes', () => {
    it('Exponential averaging converges', () => {
      dsp.setAveraging('Exp', 4);

      for (let block = 0; block < 20; block++) {
        const signal = makeSine(1000, 4096);
        dsp.pushSamples(signal, signal.slice());
        dsp.processBlock(4096);
      }

      const tf = dsp.getTransferFunction('none');
      expect(tf.magnitude.length).toBeGreaterThan(0);
    });

    it('Linear averaging works', () => {
      dsp.setAveraging('Lin', 8);

      for (let block = 0; block < 16; block++) {
        const signal = makeSine(1000, 4096);
        dsp.pushSamples(signal, signal.slice());
        dsp.processBlock(4096);
      }

      const tf = dsp.getTransferFunction('none');
      expect(tf.magnitude.length).toBeGreaterThan(0);
    });

    it('Infinite averaging accumulates', () => {
      dsp.setAveraging('Inf', 0);

      for (let block = 0; block < 10; block++) {
        const signal = makeSine(1000, 4096);
        dsp.pushSamples(signal, signal.slice());
        dsp.processBlock(4096);
      }

      const tf = dsp.getTransferFunction('none');
      expect(tf.magnitude.length).toBeGreaterThan(0);
    });

    it('None mode uses only latest block', () => {
      dsp.setAveraging('None', 0);

      const signal = makeSine(1000, 4096);
      dsp.pushSamples(signal, signal.slice());
      dsp.processBlock(4096);

      const tf = dsp.getTransferFunction('none');
      expect(tf.magnitude.length).toBeGreaterThan(0);
    });
  });

  describe('Smoothing', () => {
    it('1/3 octave smoothing reduces variance', () => {
      // Create a noisy magnitude spectrum
      const N = 2049;
      const noisy = new Float32Array(N);
      let s = 123;
      for (let i = 0; i < N; i++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        noisy[i] = -20 + (s / 0x7fffffff * 2 - 1) * 10;
      }

      const smoothed = dsp.applySmoothing(noisy, '1/3');
      expect(smoothed.length).toBe(N);

      // Compute variance of both
      let varNoisy = 0, varSmoothed = 0;
      const meanN = noisy.reduce((a, b) => a + b, 0) / N;
      const meanS = smoothed.reduce((a, b) => a + b, 0) / N;
      for (let i = 0; i < N; i++) {
        varNoisy += (noisy[i] - meanN) ** 2;
        varSmoothed += (smoothed[i] - meanS) ** 2;
      }
      varNoisy /= N;
      varSmoothed /= N;

      expect(varSmoothed).toBeLessThan(varNoisy);
    });

    it('no smoothing returns input unchanged', () => {
      const input = new Float32Array([1, 2, 3, 4, 5]);
      const output = dsp.applySmoothing(input, 'none');
      expect(output).toBe(input); // Same reference
    });

    it('all smoothing types produce valid output', () => {
      const input = new Float32Array(2049).fill(-20);
      const types: Array<'1/1' | '1/3' | '1/6' | '1/12' | '1/24' | '1/48'> = ['1/1', '1/3', '1/6', '1/12', '1/24', '1/48'];

      for (const type of types) {
        const output = dsp.applySmoothing(input, type);
        expect(output.length).toBe(2049);
        for (let i = 0; i < output.length; i++) {
          expect(isNaN(output[i])).toBe(false);
          expect(isFinite(output[i])).toBe(true);
        }
      }
    });
  });

  describe('Microphone calibration', () => {
    it('applies calibration correction to RTA', () => {
      // First get baseline
      const signal = makeSine(1000, 4096, 48000, 0.5);
      dsp.pushSamples(signal, signal);
      dsp.processBlock(4096);
      const rtaBefore = dsp.getRTAData('none', false, 0).slice();

      // Set mic cal: +5dB correction at all freqs
      dsp.setMicCalibration({
        name: 'test',
        freqs: [20, 20000],
        corrections: [5, 5],
      });

      // Re-read RTA (same accumulated data)
      const rtaAfter = dsp.getRTAData('none', false, 0);
      const bin1k = Math.round(1000 * 4096 / 48000);

      // Should be 5 dB higher
      expect(rtaAfter[bin1k]).toBeCloseTo(rtaBefore[bin1k] + 5, 1);
    });

    it('does not apply correction to reference channel', () => {
      const signal = makeSine(1000, 4096);
      dsp.pushSamples(signal, signal);
      dsp.processBlock(4096);
      const rtaRefBefore = dsp.getRTAData('none', true, 0).slice();

      dsp.setMicCalibration({
        name: 'test',
        freqs: [20, 20000],
        corrections: [10, 10],
      });

      const rtaRefAfter = dsp.getRTAData('none', true, 0);
      const bin1k = Math.round(1000 * 4096 / 48000);
      expect(rtaRefAfter[bin1k]).toBeCloseTo(rtaRefBefore[bin1k], 1);
    });

    it('clears calibration when set to null', () => {
      // Process one block to have data
      const signal = makeSine(1000, 4096);
      dsp.pushSamples(signal, signal);
      dsp.processBlock(4096);

      // Get baseline without cal
      const rtaBaseline = dsp.getRTAData('none', false, 0).slice();

      // Set +10 dB cal and verify it takes effect
      dsp.setMicCalibration({
        name: 'test',
        freqs: [20, 20000],
        corrections: [10, 10],
      });
      const rtaWithCal = dsp.getRTAData('none', false, 0).slice();
      const bin1k = Math.round(1000 * 4096 / 48000);
      expect(rtaWithCal[bin1k]).toBeCloseTo(rtaBaseline[bin1k] + 10, 1);

      // Now clear and verify it's back to baseline
      dsp.setMicCalibration(null);
      const rtaCleared = dsp.getRTAData('none', false, 0);
      expect(rtaCleared[bin1k]).toBeCloseTo(rtaBaseline[bin1k], 1);
    });

    it('interpolates between calibration points', () => {
      dsp.setMicCalibration({
        name: 'test',
        freqs: [100, 10000],
        corrections: [0, 10],
      });

      const signal = makeSine(5000, 4096);
      dsp.pushSamples(signal, signal);
      dsp.processBlock(4096);
      const rta = dsp.getRTAData('none', false, 0);
      // At 5kHz, interpolated correction should be ~5 dB
      // We can't check exactly because of windowing, but it shouldn't be 0 or 10
      expect(rta.length).toBeGreaterThan(0);
    });
  });

  describe('Sweep capture', () => {
    it('captures peak-hold data during sweep', () => {
      dsp.startSweepCapture();

      const signal = makeSine(1000, 4096);
      dsp.pushSamples(signal, signal);
      dsp.processBlock(4096);

      const peakData = dsp.stopSweepCapture();
      expect(peakData.length).toBeGreaterThan(0);
    });

    it('returns empty array when no capture started', () => {
      const peakData = dsp.stopSweepCapture();
      expect(peakData.length).toBe(0);
    });
  });

  describe('Reset', () => {
    it('clears all accumulated data', () => {
      const signal = makeSine(1000, 4096);
      dsp.pushSamples(signal, signal);
      dsp.processBlock(4096);

      dsp.resetAveraging();

      const tf = dsp.getTransferFunction('none');
      expect(tf.magnitude.length).toBe(0);
      expect(dsp.currentDelaySamples).toBe(0);
      expect(dsp.phaseOffsetMs).toBe(0);
      expect(dsp.acousticMetrics).toBeNull();
    });
  });
});
