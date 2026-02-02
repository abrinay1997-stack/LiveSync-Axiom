import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../constants';
import type { MeasurementConfig, WindowType, SmoothingType, AveragingType } from '../types';

describe('Configuration', () => {
  describe('DEFAULT_CONFIG', () => {
    it('has all required fields', () => {
      const required: (keyof MeasurementConfig)[] = [
        'fftSize', 'smoothing', 'averaging', 'averagingCount',
        'windowType', 'useMTW', 'minFreq', 'maxFreq',
        'minDb', 'maxDb', 'visualGain', 'tld',
        'showPhase', 'showCoherence', 'showGroupDelay',
        'splCalOffset', 'micCalibration',
      ];

      for (const key of required) {
        expect(DEFAULT_CONFIG).toHaveProperty(key);
      }
    });

    it('has valid FFT size (power of 2)', () => {
      expect(DEFAULT_CONFIG.fftSize).toBeGreaterThan(0);
      expect(Math.log2(DEFAULT_CONFIG.fftSize) % 1).toBe(0);
    });

    it('has valid frequency range', () => {
      expect(DEFAULT_CONFIG.minFreq).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.maxFreq).toBeGreaterThan(DEFAULT_CONFIG.minFreq);
      expect(DEFAULT_CONFIG.maxFreq).toBeLessThanOrEqual(24000);
    });

    it('has valid dB range', () => {
      expect(DEFAULT_CONFIG.minDb).toBeLessThan(DEFAULT_CONFIG.maxDb);
    });

    it('has valid smoothing type', () => {
      const validTypes: SmoothingType[] = ['none', '1/1', '1/3', '1/6', '1/12', '1/24', '1/48'];
      expect(validTypes).toContain(DEFAULT_CONFIG.smoothing);
    });

    it('has valid averaging type', () => {
      const validTypes: AveragingType[] = ['None', 'Exp', 'Lin', 'Inf'];
      expect(validTypes).toContain(DEFAULT_CONFIG.averaging);
    });

    it('has valid window type', () => {
      const validTypes: WindowType[] = ['hann', 'hamming', 'blackman-harris', 'flattop', 'rectangular'];
      expect(validTypes).toContain(DEFAULT_CONFIG.windowType);
    });

    it('averagingCount is positive', () => {
      expect(DEFAULT_CONFIG.averagingCount).toBeGreaterThan(0);
    });

    it('splCalOffset defaults to 0', () => {
      expect(DEFAULT_CONFIG.splCalOffset).toBe(0);
    });

    it('micCalibration defaults to null', () => {
      expect(DEFAULT_CONFIG.micCalibration).toBeNull();
    });

    it('MTW defaults to off', () => {
      expect(DEFAULT_CONFIG.useMTW).toBe(false);
    });

    it('group delay defaults to off', () => {
      expect(DEFAULT_CONFIG.showGroupDelay).toBe(false);
    });
  });

  describe('Type constraints', () => {
    it('FFT sizes are valid powers of 2', () => {
      const validSizes = [256, 512, 1024, 2048, 4096, 8192, 16384];
      for (const size of validSizes) {
        expect(Math.log2(size) % 1).toBe(0);
      }
    });

    it('MicCalibration type structure', () => {
      const cal = {
        name: 'test-mic.cal',
        freqs: [20, 100, 1000, 10000, 20000],
        corrections: [-2, -1, 0, 1.5, 3],
      };

      expect(cal.freqs.length).toBe(cal.corrections.length);
      expect(cal.name).toBeTruthy();
      // Frequencies should be monotonically increasing
      for (let i = 1; i < cal.freqs.length; i++) {
        expect(cal.freqs[i]).toBeGreaterThan(cal.freqs[i - 1]);
      }
    });
  });
});
