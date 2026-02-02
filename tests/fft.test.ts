import { describe, it, expect } from 'vitest';
import {
  fftForward,
  fftInverse,
  realToComplex,
  complexToMagnitudeDb,
  createWindow,
} from '../services/FFT';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a pure sine signal */
function makeSine(freq: number, N: number, sr: number = 48000, amplitude: number = 1): Float32Array {
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    out[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sr);
  }
  return out;
}

/** Generate a multi-tone signal */
function makeMultiTone(freqs: number[], N: number, sr: number = 48000): Float32Array {
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    for (const f of freqs) {
      out[i] += Math.sin(2 * Math.PI * f * i / sr);
    }
  }
  return out;
}

/** Max absolute difference between two arrays */
function maxAbsDiff(a: Float64Array, b: Float64Array): number {
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    max = Math.max(max, Math.abs(a[i] - b[i]));
  }
  return max;
}

// ─── FFT Roundtrip Tests ─────────────────────────────────────────────────────

describe('FFT', () => {
  describe('Forward + Inverse roundtrip', () => {
    const sizes = [64, 256, 1024, 4096];

    sizes.forEach(N => {
      it(`recovers original signal for N=${N}`, () => {
        const original = new Float64Array(N);
        for (let i = 0; i < N; i++) {
          original[i] = Math.sin(2 * Math.PI * 100 * i / 48000)
            + 0.5 * Math.cos(2 * Math.PI * 1000 * i / 48000)
            + 0.3 * Math.sin(2 * Math.PI * 5000 * i / 48000);
        }

        const complex = new Float64Array(N * 2);
        for (let i = 0; i < N; i++) {
          complex[2 * i] = original[i];
          complex[2 * i + 1] = 0;
        }

        fftForward(complex);
        fftInverse(complex);

        const reconstructed = new Float64Array(N);
        for (let i = 0; i < N; i++) reconstructed[i] = complex[2 * i];

        expect(maxAbsDiff(original, reconstructed)).toBeLessThan(1e-10);
      });
    });

    it('recovers impulse signal', () => {
      const N = 1024;
      const complex = new Float64Array(N * 2);
      complex[0] = 1; // impulse at t=0

      const origRe = complex.slice();
      fftForward(complex);
      fftInverse(complex);

      // Should recover the impulse
      expect(Math.abs(complex[0] - 1)).toBeLessThan(1e-12);
      for (let i = 1; i < N; i++) {
        expect(Math.abs(complex[2 * i])).toBeLessThan(1e-12);
      }
    });

    it('recovers DC signal', () => {
      const N = 512;
      const complex = new Float64Array(N * 2);
      for (let i = 0; i < N; i++) complex[2 * i] = 1.0;

      fftForward(complex);

      // DC bin should have magnitude N, all others ~0
      expect(Math.abs(complex[0] - N)).toBeLessThan(1e-10);
      for (let i = 1; i < N; i++) {
        const mag = Math.sqrt(complex[2 * i] ** 2 + complex[2 * i + 1] ** 2);
        expect(mag).toBeLessThan(1e-10);
      }
    });
  });

  describe('Parseval energy conservation', () => {
    const sizes = [256, 1024, 4096];

    sizes.forEach(N => {
      it(`conserves energy for N=${N}`, () => {
        const signal = makeSine(440, N);
        let timeEnergy = 0;
        for (let i = 0; i < N; i++) timeEnergy += signal[i] * signal[i];

        const complex = new Float64Array(N * 2);
        const win = createWindow(N, 'rectangular');
        realToComplex(signal, complex, win);
        fftForward(complex);

        let freqEnergy = 0;
        for (let i = 0; i < N; i++) {
          freqEnergy += complex[2 * i] ** 2 + complex[2 * i + 1] ** 2;
        }
        freqEnergy /= N; // Parseval normalization

        const ratio = freqEnergy / timeEnergy;
        expect(ratio).toBeCloseTo(1, 2);
      });
    });
  });

  describe('Known spectral peaks', () => {
    it('single tone at 1kHz lands in correct bin', () => {
      const N = 4096;
      const sr = 48000;
      const freq = 1000;
      const signal = makeSine(freq, N, sr);

      const complex = new Float64Array(N * 2);
      const win = createWindow(N, 'rectangular');
      realToComplex(signal, complex, win);
      fftForward(complex);

      // Expected bin for 1kHz
      const expectedBin = Math.round(freq * N / sr);

      // Find actual peak bin
      let maxMag = 0;
      let peakBin = 0;
      for (let i = 0; i <= N / 2; i++) {
        const mag = complex[2 * i] ** 2 + complex[2 * i + 1] ** 2;
        if (mag > maxMag) {
          maxMag = mag;
          peakBin = i;
        }
      }

      expect(peakBin).toBe(expectedBin);
    });

    it('two tones resolve into two distinct peaks', () => {
      const N = 4096;
      const sr = 48000;
      const f1 = 1000, f2 = 5000;
      const signal = makeMultiTone([f1, f2], N, sr);

      const complex = new Float64Array(N * 2);
      const win = createWindow(N, 'rectangular');
      realToComplex(signal, complex, win);
      fftForward(complex);

      const bin1 = Math.round(f1 * N / sr);
      const bin2 = Math.round(f2 * N / sr);

      // Both bins should have significant energy
      const mag1 = complex[2 * bin1] ** 2 + complex[2 * bin1 + 1] ** 2;
      const mag2 = complex[2 * bin2] ** 2 + complex[2 * bin2 + 1] ** 2;

      // Background noise should be much lower
      const noiseBin = Math.round(3000 * N / sr);
      const noiseLevel = complex[2 * noiseBin] ** 2 + complex[2 * noiseBin + 1] ** 2;

      expect(mag1).toBeGreaterThan(noiseLevel * 1000);
      expect(mag2).toBeGreaterThan(noiseLevel * 1000);
    });
  });

  describe('Linearity', () => {
    it('FFT(a*x + b*y) = a*FFT(x) + b*FFT(y)', () => {
      const N = 1024;
      const a = 2.5, b = -1.3;
      const x = makeSine(200, N);
      const y = makeSine(800, N);

      // Compute FFT of combined signal
      const combined = new Float32Array(N);
      for (let i = 0; i < N; i++) combined[i] = a * x[i] + b * y[i];

      const cCombined = new Float64Array(N * 2);
      realToComplex(combined, cCombined);
      fftForward(cCombined);

      // Compute FFTs individually and combine
      const cX = new Float64Array(N * 2);
      const cY = new Float64Array(N * 2);
      realToComplex(x, cX);
      realToComplex(y, cY);
      fftForward(cX);
      fftForward(cY);

      const cLinear = new Float64Array(N * 2);
      for (let i = 0; i < N * 2; i++) {
        cLinear[i] = a * cX[i] + b * cY[i];
      }

      // Float32 input precision limits error to ~1e-5
      expect(maxAbsDiff(cCombined, cLinear)).toBeLessThan(1e-4);
    });
  });

  describe('realToComplex', () => {
    it('applies window correctly', () => {
      const N = 256;
      const signal = new Float32Array(N).fill(1.0);
      const win = createWindow(N, 'hann');
      const complex = new Float64Array(N * 2);

      realToComplex(signal, complex, win);

      for (let i = 0; i < N; i++) {
        expect(complex[2 * i]).toBeCloseTo(win[i], 10);
        expect(complex[2 * i + 1]).toBe(0); // imaginary = 0
      }
    });

    it('passes through without window', () => {
      const N = 128;
      const signal = new Float32Array(N);
      for (let i = 0; i < N; i++) signal[i] = i / N;
      const complex = new Float64Array(N * 2);

      realToComplex(signal, complex);

      for (let i = 0; i < N; i++) {
        expect(complex[2 * i]).toBeCloseTo(signal[i], 10);
        expect(complex[2 * i + 1]).toBe(0);
      }
    });
  });

  describe('complexToMagnitudeDb', () => {
    it('computes correct dB magnitudes', () => {
      const N = 8;
      const data = new Float64Array(N * 2);
      // Set bin 0 to magnitude 1 (0 dB power)
      data[0] = 1; data[1] = 0;
      // Set bin 1 to magnitude 10 (20 dB power = 10*log10(100))
      data[2] = 10; data[3] = 0;
      // Set bin 2 to zero
      data[4] = 0; data[5] = 0;

      const out = new Float32Array(N / 2 + 1);
      complexToMagnitudeDb(data, out);

      expect(out[0]).toBeCloseTo(0, 1);     // |1|^2 = 1 => 0 dB
      expect(out[1]).toBeCloseTo(20, 1);    // |10|^2 = 100 => 20 dB
      expect(out[2]).toBeLessThan(-200);     // zero => very negative dB
    });
  });
});
