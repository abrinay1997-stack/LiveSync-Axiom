
/**
 * FFT.ts — Radix-2 Cooley-Tukey FFT implementation for LiveSync Axiom.
 * Pure TypeScript, zero dependencies.
 *
 * Complex data layout: Float64Array of length 2*N
 *   [re0, im0, re1, im1, re2, im2, ...]
 *
 * Using Float64 for precision in cross-spectrum accumulation.
 */

// ─── Window Functions ──────────────────────────────────────────────────────────

export type WindowType = 'hann' | 'hamming' | 'blackman-harris' | 'flattop' | 'rectangular';

/** Pre-compute a window of given size and type. */
export function createWindow(size: number, type: WindowType): Float64Array {
  const w = new Float64Array(size);
  const N = size - 1;

  switch (type) {
    case 'rectangular':
      w.fill(1);
      break;

    case 'hann':
      for (let i = 0; i < size; i++)
        w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / N));
      break;

    case 'hamming':
      for (let i = 0; i < size; i++)
        w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / N);
      break;

    case 'blackman-harris': {
      const a0 = 0.35875, a1 = 0.48829, a2 = 0.14128, a3 = 0.01168;
      for (let i = 0; i < size; i++) {
        const x = (2 * Math.PI * i) / N;
        w[i] = a0 - a1 * Math.cos(x) + a2 * Math.cos(2 * x) - a3 * Math.cos(3 * x);
      }
      break;
    }

    case 'flattop': {
      const a0 = 0.21557895, a1 = 0.41663158, a2 = 0.277263158;
      const a3 = 0.083578947, a4 = 0.006947368;
      for (let i = 0; i < size; i++) {
        const x = (2 * Math.PI * i) / N;
        w[i] = a0 - a1 * Math.cos(x) + a2 * Math.cos(2 * x) - a3 * Math.cos(3 * x) + a4 * Math.cos(4 * x);
      }
      break;
    }
  }
  return w;
}

// ─── Bit-Reversal Permutation Table ────────────────────────────────────────────

function makeBitReversalTable(n: number): Uint32Array {
  const bits = Math.log2(n) | 0;
  const table = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let rev = 0;
    let val = i;
    for (let b = 0; b < bits; b++) {
      rev = (rev << 1) | (val & 1);
      val >>= 1;
    }
    table[i] = rev;
  }
  return table;
}

// Cache for bit-reversal tables (keyed by FFT size)
const bitRevCache = new Map<number, Uint32Array>();
// Cache for twiddle factors
const twiddleCache = new Map<number, Float64Array>();

function getBitReversal(n: number): Uint32Array {
  let table = bitRevCache.get(n);
  if (!table) {
    table = makeBitReversalTable(n);
    bitRevCache.set(n, table);
  }
  return table;
}

function getTwiddles(n: number): Float64Array {
  let tw = twiddleCache.get(n);
  if (!tw) {
    tw = new Float64Array(n); // stores cos/sin for half-size
    for (let i = 0; i < n / 2; i++) {
      const angle = (-2 * Math.PI * i) / n;
      tw[2 * i] = Math.cos(angle);
      tw[2 * i + 1] = Math.sin(angle);
    }
    twiddleCache.set(n, tw);
  }
  return tw;
}

// ─── Forward FFT (in-place, Cooley-Tukey radix-2 DIT) ─────────────────────────

/**
 * Compute forward FFT in-place.
 * @param data Interleaved complex array [re, im, re, im, ...] of length 2*N.
 *   N must be a power of 2.
 */
export function fftForward(data: Float64Array): void {
  const n = data.length >> 1;
  const table = getBitReversal(n);
  const twiddles = getTwiddles(n);

  // Bit-reversal permutation
  for (let i = 0; i < n; i++) {
    const j = table[i];
    if (j > i) {
      // Swap complex elements i and j
      let t = data[2 * i]; data[2 * i] = data[2 * j]; data[2 * j] = t;
      t = data[2 * i + 1]; data[2 * i + 1] = data[2 * j + 1]; data[2 * j + 1] = t;
    }
  }

  // Butterfly stages
  for (let size = 2; size <= n; size <<= 1) {
    const halfSize = size >> 1;
    const step = n / size;

    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const twIdx = j * step;
        const wr = twiddles[2 * twIdx];
        const wi = twiddles[2 * twIdx + 1];

        const evenIdx = 2 * (i + j);
        const oddIdx = 2 * (i + j + halfSize);

        const or = data[oddIdx];
        const oi = data[oddIdx + 1];

        const tr = wr * or - wi * oi;
        const ti = wr * oi + wi * or;

        data[oddIdx] = data[evenIdx] - tr;
        data[oddIdx + 1] = data[evenIdx + 1] - ti;
        data[evenIdx] += tr;
        data[evenIdx + 1] += ti;
      }
    }
  }
}

/**
 * Compute inverse FFT in-place. Result is scaled by 1/N.
 */
export function fftInverse(data: Float64Array): void {
  const n = data.length >> 1;

  // Conjugate
  for (let i = 0; i < n; i++) data[2 * i + 1] = -data[2 * i + 1];

  fftForward(data);

  // Conjugate and scale
  const invN = 1 / n;
  for (let i = 0; i < n; i++) {
    data[2 * i] *= invN;
    data[2 * i + 1] = -data[2 * i + 1] * invN;
  }
}

// ─── Utility: real signal → complex buffer ─────────────────────────────────────

/** Pack a real signal into an interleaved complex buffer (imaginary = 0). */
export function realToComplex(real: Float32Array, out: Float64Array, window?: Float64Array): void {
  const n = real.length;
  if (window) {
    for (let i = 0; i < n; i++) {
      out[2 * i] = real[i] * window[i];
      out[2 * i + 1] = 0;
    }
  } else {
    for (let i = 0; i < n; i++) {
      out[2 * i] = real[i];
      out[2 * i + 1] = 0;
    }
  }
}

/** Compute magnitude spectrum in dB from complex FFT output. Returns N/2+1 bins. */
export function complexToMagnitudeDb(data: Float64Array, out: Float32Array): void {
  const n = data.length >> 1;
  const bins = n >> 1; // N/2
  for (let i = 0; i <= bins; i++) {
    const re = data[2 * i];
    const im = data[2 * i + 1];
    const mag = re * re + im * im;
    // 10*log10(mag) = 20*log10(sqrt(mag))
    out[i] = mag > 1e-30 ? 10 * Math.log10(mag) : -300;
  }
}
