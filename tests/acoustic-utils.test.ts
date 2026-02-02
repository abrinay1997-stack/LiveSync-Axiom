import { describe, it, expect } from 'vitest';
import { AcousticUtils } from '../services/AcousticUtils';
import { AudioEngine } from '../services/AudioEngine';

describe('AcousticUtils', () => {
  describe('samplesToMs', () => {
    it('converts 480 samples at 48kHz to 10ms', () => {
      expect(AcousticUtils.samplesToMs(480, 48000)).toBe(10);
    });

    it('converts 0 samples to 0ms', () => {
      expect(AcousticUtils.samplesToMs(0, 48000)).toBe(0);
    });

    it('converts 48000 samples to 1000ms', () => {
      expect(AcousticUtils.samplesToMs(48000, 48000)).toBe(1000);
    });

    it('handles 44100 sample rate', () => {
      expect(AcousticUtils.samplesToMs(441, 44100)).toBeCloseTo(10, 1);
    });
  });

  describe('samplesToMeters', () => {
    it('converts 480 samples at 48kHz to ~3.43 meters', () => {
      expect(AcousticUtils.samplesToMeters(480, 48000)).toBeCloseTo(3.43, 1);
    });

    it('converts 0 samples to 0 meters', () => {
      expect(AcousticUtils.samplesToMeters(0, 48000)).toBe(0);
    });

    it('1 second of samples = 343 meters (speed of sound)', () => {
      expect(AcousticUtils.samplesToMeters(48000, 48000)).toBeCloseTo(343, 0);
    });
  });

  describe('analyzeTrace', () => {
    it('finds peak frequency in a simple spectrum', () => {
      const N = 2049; // typical N/2+1 bins for 4096 FFT
      const data = new Float32Array(N).fill(-60);
      // Place a peak at bin 100
      data[100] = -10;

      const result = AcousticUtils.analyzeTrace(data, 48000);
      const expectedFreq = (100 * 48000) / (N * 2);
      expect(result.peakFreq).toBeCloseTo(expectedFreq, 0);
    });

    it('computes average level', () => {
      const N = 100;
      const data = new Float32Array(N).fill(-20);
      const result = AcousticUtils.analyzeTrace(data, 48000);
      expect(result.avgLevel).toBeCloseTo(-20, 1);
    });

    it('handles all-zero data', () => {
      const data = new Float32Array(1024).fill(0);
      const result = AcousticUtils.analyzeTrace(data, 48000);
      expect(result.peakFreq).toBe(0);
      expect(result.avgLevel).toBe(0);
    });
  });

  describe('computeInverseEQ', () => {
    it('returns inverted difference between meas and ref', () => {
      const N = 2049;
      const meas = new Float32Array(N).fill(-20);
      const ref = new Float32Array(N).fill(-25);

      const eq = AcousticUtils.computeInverseEQ(meas, ref);
      expect(eq.length).toBe(N);

      // Meas is 5 dB above ref, so EQ should be approximately -5 dB
      // (after smoothing, the exact values may differ slightly)
      let sum = 0;
      let count = 0;
      for (let i = 100; i < 1000; i++) {
        sum += eq[i];
        count++;
      }
      const avg = sum / count;
      expect(avg).toBeCloseTo(-5, 0);
    });

    it('clamps correction to [-12, +9] range', () => {
      const N = 2049;
      const meas = new Float32Array(N).fill(0);
      const ref = new Float32Array(N).fill(-30); // 30 dB difference

      const eq = AcousticUtils.computeInverseEQ(meas, ref);
      for (let i = 0; i < N; i++) {
        expect(eq[i]).toBeGreaterThanOrEqual(-9);
        expect(eq[i]).toBeLessThanOrEqual(12);
      }
    });
  });
});

describe('AudioEngine static methods', () => {
  describe('applySmoothing', () => {
    it('preserves array length', () => {
      const input = new Float32Array(2049).fill(-20);
      const output = AudioEngine.applySmoothing(input, '1/3');
      expect(output.length).toBe(input.length);
    });

    it('returns input for "none" type', () => {
      const input = new Float32Array(100).fill(-15);
      const output = AudioEngine.applySmoothing(input, 'none');
      expect(output).toBe(input);
    });

    it('does not produce NaN values', () => {
      const input = new Float32Array(2049);
      for (let i = 0; i < 2049; i++) input[i] = -20 + Math.sin(i * 0.01) * 10;
      const output = AudioEngine.applySmoothing(input, '1/6');
      for (let i = 0; i < output.length; i++) {
        expect(isNaN(output[i])).toBe(false);
      }
    });

    it('reduces a sharp peak', () => {
      const input = new Float32Array(2049).fill(-30);
      input[500] = 0; // sharp peak
      const output = AudioEngine.applySmoothing(input, '1/3');
      // The peak should be reduced by smoothing
      expect(output[500]).toBeLessThan(0);
    });

    it('handles empty array', () => {
      const input = new Float32Array(0);
      const output = AudioEngine.applySmoothing(input, '1/3');
      expect(output.length).toBe(0);
    });
  });
});
