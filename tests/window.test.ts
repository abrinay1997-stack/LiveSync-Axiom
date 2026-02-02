import { describe, it, expect } from 'vitest';
import { createWindow, type WindowType } from '../services/FFT';

describe('Window Functions', () => {
  const N = 1024;

  describe('rectangular', () => {
    it('is all ones', () => {
      const w = createWindow(N, 'rectangular');
      for (let i = 0; i < N; i++) {
        expect(w[i]).toBe(1);
      }
    });

    it('has correct length', () => {
      expect(createWindow(N, 'rectangular').length).toBe(N);
    });
  });

  describe('hann', () => {
    const w = createWindow(N, 'hann');

    it('is zero at endpoints', () => {
      expect(Math.abs(w[0])).toBeLessThan(1e-10);
    });

    it('is near unity at center', () => {
      // Hann uses N-1 in denominator, so w[N/2] is close to 1 but not exact for even N
      expect(Math.abs(w[N / 2] - 1)).toBeLessThan(1e-4);
    });

    it('is symmetric', () => {
      for (let i = 0; i < N / 2; i++) {
        expect(w[i]).toBeCloseTo(w[N - 1 - i], 10);
      }
    });

    it('is non-negative', () => {
      for (let i = 0; i < N; i++) {
        expect(w[i]).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('hamming', () => {
    const w = createWindow(N, 'hamming');

    it('has non-zero endpoints (Hamming property)', () => {
      // Hamming: a0 = 0.54, endpoint = 0.54 - 0.46 = 0.08
      expect(w[0]).toBeCloseTo(0.08, 2);
    });

    it('peaks at center', () => {
      const center = w[N / 2];
      for (let i = 0; i < N; i++) {
        expect(w[i]).toBeLessThanOrEqual(center + 1e-10);
      }
    });

    it('is symmetric', () => {
      for (let i = 0; i < N / 2; i++) {
        expect(w[i]).toBeCloseTo(w[N - 1 - i], 10);
      }
    });

    it('is non-negative', () => {
      for (let i = 0; i < N; i++) {
        expect(w[i]).toBeGreaterThanOrEqual(-1e-10);
      }
    });
  });

  describe('blackman-harris', () => {
    const w = createWindow(N, 'blackman-harris');

    it('has near-zero endpoints', () => {
      expect(Math.abs(w[0])).toBeLessThan(0.001);
    });

    it('peak is at or near center', () => {
      let maxVal = -1;
      let maxIdx = 0;
      for (let i = 0; i < N; i++) {
        if (w[i] > maxVal) { maxVal = w[i]; maxIdx = i; }
      }
      expect(Math.abs(maxIdx - N / 2)).toBeLessThan(2);
    });

    it('is symmetric', () => {
      for (let i = 0; i < N / 2; i++) {
        expect(w[i]).toBeCloseTo(w[N - 1 - i], 8);
      }
    });

    it('is non-negative', () => {
      for (let i = 0; i < N; i++) {
        expect(w[i]).toBeGreaterThanOrEqual(-1e-10);
      }
    });

    it('has better sidelobe suppression than Hann', () => {
      // BH4 should have smaller value near endpoints than Hann
      const hann = createWindow(N, 'hann');
      const quarterIdx = Math.round(N * 0.05);
      expect(w[quarterIdx]).toBeLessThan(hann[quarterIdx]);
    });
  });

  describe('flattop', () => {
    const w = createWindow(N, 'flattop');

    it('has correct length', () => {
      expect(w.length).toBe(N);
    });

    it('is symmetric', () => {
      for (let i = 0; i < N / 2; i++) {
        expect(w[i]).toBeCloseTo(w[N - 1 - i], 8);
      }
    });

    it('has flat passband characteristic', () => {
      // Flat-top: the max should be approximately 1.0 at center
      const center = w[N / 2];
      expect(center).toBeGreaterThan(0.9);
      expect(center).toBeLessThan(1.1);
    });
  });

  describe('all windows have correct length', () => {
    const types: WindowType[] = ['hann', 'hamming', 'blackman-harris', 'flattop', 'rectangular'];
    const sizes = [64, 256, 1024, 4096, 16384];

    types.forEach(type => {
      sizes.forEach(size => {
        it(`${type} N=${size} has length ${size}`, () => {
          expect(createWindow(size, type).length).toBe(size);
        });
      });
    });
  });

  describe('window energy', () => {
    it('rectangular has highest energy', () => {
      const types: WindowType[] = ['hann', 'hamming', 'blackman-harris', 'flattop'];
      const rectEnergy = createWindow(N, 'rectangular').reduce((s, v) => s + v * v, 0);

      for (const type of types) {
        const w = createWindow(N, type);
        const energy = w.reduce((s, v) => s + v * v, 0);
        expect(energy).toBeLessThanOrEqual(rectEnergy);
      }
    });
  });
});
