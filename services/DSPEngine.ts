
/**
 * DSPEngine.ts — Real dual-channel DSP pipeline for LiveSync Axiom.
 *
 * Implements:
 * - Block-based FFT processing with overlap
 * - Cross-spectrum Sxy = conj(X) * Y
 * - Auto-spectrums Sxx, Syy
 * - Transfer function H(f) = Sxy / Sxx
 * - Coherence gamma^2 = |Sxy|^2 / (Sxx * Syy)
 * - Phase extraction with continuous unwrapping
 * - Group delay = -d(phase)/d(omega)
 * - Cross-correlation delay finder via FFT with parabolic interpolation
 * - Multi-Time Windowing (MTW)
 * - Spectral averaging (exponential, linear FIFO, infinite) in linear power domain
 * - Octave-fraction smoothing in linear power domain
 */

import {
  fftForward, fftInverse, realToComplex, createWindow,
  type WindowType
} from './FFT';
import type { SmoothingType, AveragingType, TFData } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────────

const SAMPLE_RATE = 48000;
// MTW FFT sizes and their crossover frequencies
// Large FFT for LF (good freq resolution), small for HF (good time resolution)
interface MTWConfig { fftSize: number; freqLow: number; freqHigh: number; }
const MTW_CONFIGS: readonly MTWConfig[] = [
  { fftSize: 16384, freqLow: 20,   freqHigh: 200  },
  { fftSize: 4096,  freqLow: 200,  freqHigh: 2000 },
  { fftSize: 1024,  freqLow: 2000, freqHigh: 24000 },
];

// ─── Ring Buffer ────────────────────────────────────────────────────────────────

class RingBuffer {
  private buffer: Float32Array;
  private writePos: number = 0;
  private filled: number = 0;

  constructor(public readonly capacity: number) {
    this.buffer = new Float32Array(capacity);
  }

  push(data: Float32Array): void {
    const len = data.length;
    if (len >= this.capacity) {
      // Data larger than buffer: take last capacity samples
      this.buffer.set(data.subarray(len - this.capacity));
      this.writePos = 0;
      this.filled = this.capacity;
      return;
    }
    const spaceAtEnd = this.capacity - this.writePos;
    if (len <= spaceAtEnd) {
      this.buffer.set(data, this.writePos);
    } else {
      this.buffer.set(data.subarray(0, spaceAtEnd), this.writePos);
      this.buffer.set(data.subarray(spaceAtEnd), 0);
    }
    this.writePos = (this.writePos + len) % this.capacity;
    this.filled = Math.min(this.filled + len, this.capacity);
  }

  /** Extract the last `length` contiguous samples (linearized). */
  read(length: number, out: Float32Array): boolean {
    if (this.filled < length) return false;
    const start = (this.writePos - length + this.capacity) % this.capacity;
    if (start + length <= this.capacity) {
      out.set(this.buffer.subarray(start, start + length));
    } else {
      const firstChunk = this.capacity - start;
      out.set(this.buffer.subarray(start, this.capacity));
      out.set(this.buffer.subarray(0, length - firstChunk), firstChunk);
    }
    return true;
  }

  get isFull(): boolean { return this.filled >= this.capacity; }
  get available(): number { return this.filled; }
}

// ─── Spectral Accumulator (for averaging) ───────────────────────────────────────

interface SpectralAccumulator {
  /** Sxx: auto-spectrum of reference (real-valued, power) */
  sxx: Float64Array;
  /** Syy: auto-spectrum of measurement */
  syy: Float64Array;
  /** Sxy: cross-spectrum (complex interleaved) */
  sxyRe: Float64Array;
  sxyIm: Float64Array;
  /** Single-channel magnitude for RTA (linear power, meas channel) */
  rtaMeas: Float64Array;
  rtaRef: Float64Array;
  /** Number of accumulated blocks */
  count: number;
}

function createAccumulator(bins: number): SpectralAccumulator {
  return {
    sxx: new Float64Array(bins),
    syy: new Float64Array(bins),
    sxyRe: new Float64Array(bins),
    sxyIm: new Float64Array(bins),
    rtaMeas: new Float64Array(bins),
    rtaRef: new Float64Array(bins),
    count: 0,
  };
}

// ─── FIFO Buffer for Linear Averaging ───────────────────────────────────────────

interface FIFOEntry {
  sxx: Float64Array;
  syy: Float64Array;
  sxyRe: Float64Array;
  sxyIm: Float64Array;
  rtaMeas: Float64Array;
  rtaRef: Float64Array;
}

// ─── DSPEngine Class ────────────────────────────────────────────────────────────

export class DSPEngine {
  // Ring buffers for raw samples
  private refBuffer: RingBuffer;
  private measBuffer: RingBuffer;

  // FFT work buffers (allocated once, reused)
  private fftWorkRef: Float64Array;
  private fftWorkMeas: Float64Array;
  private readBufRef: Float32Array;
  private readBufMeas: Float32Array;
  private windowCache = new Map<string, Float64Array>();

  // Spectral accumulators per FFT size (for MTW)
  private accumulators = new Map<number, SpectralAccumulator>();
  // FIFO buffers for linear averaging
  private fifoBuffers = new Map<number, FIFOEntry[]>();

  // Current config
  private windowType: WindowType = 'hann';
  private averagingType: AveragingType = 'Exp';
  private averagingCount: number = 8;
  private expAlpha: number = 0.15;

  // State
  private blockCounter: number = 0;
  private _fftSize: number = 4096;

  // Delay finder results
  public currentDelaySamples: number = 0;
  public currentDelayFractional: number = 0; // sub-sample precision
  public phaseOffsetMs: number = 0;

  // Impulse response
  public lastImpulseResponse: Float32Array = new Float32Array(0);
  public acousticMetrics: AcousticMetricsData | null = null;

  // Sweep capture
  private isSweepCapturing = false;
  private sweepPeakBuffer: Float32Array | null = null;

  constructor(bufferCapacity: number = 32768) {
    this.refBuffer = new RingBuffer(bufferCapacity);
    this.measBuffer = new RingBuffer(bufferCapacity);

    // Allocate for largest FFT size
    const maxFFT = 16384;
    this.fftWorkRef = new Float64Array(maxFFT * 2);
    this.fftWorkMeas = new Float64Array(maxFFT * 2);
    this.readBufRef = new Float32Array(maxFFT);
    this.readBufMeas = new Float32Array(maxFFT);

    // Initialize accumulators for MTW sizes
    for (const cfg of MTW_CONFIGS) {
      const bins = cfg.fftSize / 2 + 1;
      this.accumulators.set(cfg.fftSize, createAccumulator(bins));
      this.fifoBuffers.set(cfg.fftSize, []);
    }
    // Also for user-selected single FFT size
    this._fftSize = 4096;
  }

  get fftSize(): number { return this._fftSize; }
  set fftSize(v: number) {
    if (v !== this._fftSize) {
      this._fftSize = v;
      const bins = v / 2 + 1;
      if (!this.accumulators.has(v)) {
        this.accumulators.set(v, createAccumulator(bins));
        this.fifoBuffers.set(v, []);
      }
    }
  }

  // ─── Configuration ──────────────────────────────────────────────────────────

  setAveraging(type: AveragingType, count: number = 8): void {
    this.averagingType = type;
    this.averagingCount = count;
    // Exponential alpha: approximate equivalent of `count` blocks
    this.expAlpha = count > 0 ? 2 / (count + 1) : 1;
  }

  setWindow(type: WindowType): void {
    this.windowType = type;
  }

  // ─── Sample Input (called from AudioEngine onmessage) ─────────────────────

  pushSamples(ref: Float32Array, meas: Float32Array): void {
    this.refBuffer.push(ref);
    this.measBuffer.push(meas);

    // Sweep peak-hold using frequency domain
    if (this.isSweepCapturing) {
      this.updateSweepCapture();
    }
  }

  // ─── Block Processing ─────────────────────────────────────────────────────

  /**
   * Process one FFT block of a given size.
   * Should be called at ~60fps from requestAnimationFrame.
   * Returns true if data was available.
   */
  processBlock(fftSize: number): boolean {
    if (!this.refBuffer.read(fftSize, this.readBufRef.subarray(0, fftSize))) return false;
    if (!this.measBuffer.read(fftSize, this.readBufMeas.subarray(0, fftSize))) return false;

    const bins = fftSize / 2 + 1;
    const win = this.getWindow(fftSize, this.windowType);

    // FFT of reference channel
    const workRef = this.fftWorkRef.subarray(0, fftSize * 2);
    realToComplex(this.readBufRef.subarray(0, fftSize), workRef, win);
    fftForward(workRef);

    // FFT of measurement channel
    const workMeas = this.fftWorkMeas.subarray(0, fftSize * 2);
    realToComplex(this.readBufMeas.subarray(0, fftSize), workMeas, win);
    fftForward(workMeas);

    // Compute instantaneous spectrums
    const instSxx = new Float64Array(bins);
    const instSyy = new Float64Array(bins);
    const instSxyRe = new Float64Array(bins);
    const instSxyIm = new Float64Array(bins);
    const instRtaMeas = new Float64Array(bins);
    const instRtaRef = new Float64Array(bins);

    for (let i = 0; i < bins; i++) {
      const xr = workRef[2 * i];
      const xi = workRef[2 * i + 1];
      const yr = workMeas[2 * i];
      const yi = workMeas[2 * i + 1];

      // Auto-spectrums (real-valued power)
      instSxx[i] = xr * xr + xi * xi;
      instSyy[i] = yr * yr + yi * yi;

      // Cross-spectrum: conj(X) * Y = (xr - j*xi)(yr + j*yi)
      instSxyRe[i] = xr * yr + xi * yi;
      instSxyIm[i] = xr * yi - xi * yr;

      // RTA magnitudes (linear power)
      instRtaMeas[i] = instSyy[i];
      instRtaRef[i] = instSxx[i];
    }

    // Apply averaging
    this.applyAveraging(fftSize, instSxx, instSyy, instSxyRe, instSxyIm, instRtaMeas, instRtaRef);

    this.blockCounter++;
    return true;
  }

  /**
   * Process all MTW FFT sizes. Call this from the render loop.
   */
  processAllMTW(): void {
    for (const cfg of MTW_CONFIGS) {
      this.processBlock(cfg.fftSize);
    }
  }

  // ─── Averaging ────────────────────────────────────────────────────────────

  private applyAveraging(
    fftSize: number,
    sxx: Float64Array, syy: Float64Array,
    sxyRe: Float64Array, sxyIm: Float64Array,
    rtaMeas: Float64Array, rtaRef: Float64Array
  ): void {
    const acc = this.accumulators.get(fftSize);
    if (!acc) return;
    const bins = sxx.length;

    switch (this.averagingType) {
      case 'Exp': {
        const a = acc.count === 0 ? 1 : this.expAlpha;
        const b = 1 - a;
        for (let i = 0; i < bins; i++) {
          acc.sxx[i] = a * sxx[i] + b * acc.sxx[i];
          acc.syy[i] = a * syy[i] + b * acc.syy[i];
          acc.sxyRe[i] = a * sxyRe[i] + b * acc.sxyRe[i];
          acc.sxyIm[i] = a * sxyIm[i] + b * acc.sxyIm[i];
          acc.rtaMeas[i] = a * rtaMeas[i] + b * acc.rtaMeas[i];
          acc.rtaRef[i] = a * rtaRef[i] + b * acc.rtaRef[i];
        }
        acc.count++;
        break;
      }

      case 'Lin': {
        const fifo = this.fifoBuffers.get(fftSize);
        if (!fifo) return;

        // Push new entry
        fifo.push({
          sxx: sxx.slice(),
          syy: syy.slice(),
          sxyRe: sxyRe.slice(),
          sxyIm: sxyIm.slice(),
          rtaMeas: rtaMeas.slice(),
          rtaRef: rtaRef.slice(),
        });

        // Trim to max count
        while (fifo.length > this.averagingCount) fifo.shift();

        // Recompute average
        const n = fifo.length;
        acc.sxx.fill(0); acc.syy.fill(0);
        acc.sxyRe.fill(0); acc.sxyIm.fill(0);
        acc.rtaMeas.fill(0); acc.rtaRef.fill(0);

        for (const entry of fifo) {
          for (let i = 0; i < bins; i++) {
            acc.sxx[i] += entry.sxx[i];
            acc.syy[i] += entry.syy[i];
            acc.sxyRe[i] += entry.sxyRe[i];
            acc.sxyIm[i] += entry.sxyIm[i];
            acc.rtaMeas[i] += entry.rtaMeas[i];
            acc.rtaRef[i] += entry.rtaRef[i];
          }
        }
        const invN = 1 / n;
        for (let i = 0; i < bins; i++) {
          acc.sxx[i] *= invN; acc.syy[i] *= invN;
          acc.sxyRe[i] *= invN; acc.sxyIm[i] *= invN;
          acc.rtaMeas[i] *= invN; acc.rtaRef[i] *= invN;
        }
        acc.count = n;
        break;
      }

      case 'Inf': {
        const n = acc.count;
        const invN1 = 1 / (n + 1);
        for (let i = 0; i < bins; i++) {
          acc.sxx[i] = (acc.sxx[i] * n + sxx[i]) * invN1;
          acc.syy[i] = (acc.syy[i] * n + syy[i]) * invN1;
          acc.sxyRe[i] = (acc.sxyRe[i] * n + sxyRe[i]) * invN1;
          acc.sxyIm[i] = (acc.sxyIm[i] * n + sxyIm[i]) * invN1;
          acc.rtaMeas[i] = (acc.rtaMeas[i] * n + rtaMeas[i]) * invN1;
          acc.rtaRef[i] = (acc.rtaRef[i] * n + rtaRef[i]) * invN1;
        }
        acc.count++;
        break;
      }

      default: // 'None'
        acc.sxx.set(sxx); acc.syy.set(syy);
        acc.sxyRe.set(sxyRe); acc.sxyIm.set(sxyIm);
        acc.rtaMeas.set(rtaMeas); acc.rtaRef.set(rtaRef);
        acc.count = 1;
    }
  }

  // ─── Transfer Function Extraction ─────────────────────────────────────────

  /**
   * Compute the transfer function H(f) = Sxy / Sxx.
   * Returns magnitude (dB), unwrapped phase (degrees), coherence [0-1].
   */
  getTransferFunction(smoothing: SmoothingType): TFData {
    const fftSize = this._fftSize;
    const acc = this.accumulators.get(fftSize);
    if (!acc || acc.count === 0) {
      return { magnitude: new Float32Array(0), phase: new Float32Array(0), coherence: new Float32Array(0) };
    }

    const bins = fftSize / 2 + 1;
    const magnitude = new Float32Array(bins);
    const phase = new Float32Array(bins);
    const coherence = new Float32Array(bins);
    const groupDelay = new Float32Array(bins);

    // H(f) = Sxy / Sxx
    for (let i = 0; i < bins; i++) {
      const sxx = acc.sxx[i];
      const syy = acc.syy[i];
      const sxyR = acc.sxyRe[i];
      const sxyI = acc.sxyIm[i];

      if (sxx < 1e-30) {
        magnitude[i] = -120;
        phase[i] = 0;
        coherence[i] = 0;
        continue;
      }

      // H = Sxy / Sxx (complex division by real)
      const hRe = sxyR / sxx;
      const hIm = sxyI / sxx;

      // Magnitude in dB: 20*log10(|H|)
      const magSq = hRe * hRe + hIm * hIm;
      magnitude[i] = magSq > 1e-30 ? 10 * Math.log10(magSq) : -120;

      // Phase in degrees: atan2(im, re) * (180/pi)
      phase[i] = Math.atan2(hIm, hRe) * (180 / Math.PI);

      // Coherence: gamma^2 = |Sxy|^2 / (Sxx * Syy)
      const sxySq = sxyR * sxyR + sxyI * sxyI;
      const denom = sxx * syy;
      coherence[i] = denom > 1e-30 ? Math.min(1, sxySq / denom) : 0;
    }

    // Phase unwrapping
    this.unwrapPhase(phase);

    // Apply delay compensation to phase
    const totalDelaySec = (this.currentDelaySamples + this.currentDelayFractional) / SAMPLE_RATE
      + this.phaseOffsetMs / 1000;
    if (totalDelaySec !== 0) {
      for (let i = 0; i < bins; i++) {
        const freq = (i * SAMPLE_RATE) / fftSize;
        phase[i] += 360 * freq * totalDelaySec;
      }
      // Re-wrap to +-180 for display
      for (let i = 0; i < bins; i++) {
        phase[i] = ((phase[i] % 360) + 540) % 360 - 180;
      }
    }

    // Group delay: -d(phase)/d(freq) in ms
    const df = SAMPLE_RATE / fftSize;
    for (let i = 1; i < bins - 1; i++) {
      // Central difference
      let dp = phase[i + 1] - phase[i - 1];
      // Handle wrapping
      while (dp > 180) dp -= 360;
      while (dp < -180) dp += 360;
      groupDelay[i] = -(dp / (2 * df)) / 360 * 1000; // ms
    }
    groupDelay[0] = groupDelay[1];
    groupDelay[bins - 1] = groupDelay[bins - 2];

    // Apply octave smoothing if requested
    const smoothedMag = this.applySmoothing(magnitude, smoothing);

    return {
      magnitude: smoothedMag,
      phase,
      coherence,
      groupDelay,
    };
  }

  // ─── MTW Transfer Function ────────────────────────────────────────────────

  /**
   * Get transfer function using Multi-Time Windowing.
   * Merges results from 3 FFT sizes across frequency bands.
   */
  getTransferFunctionMTW(smoothing: SmoothingType): TFData {
    // Use the primary FFT size for output resolution
    const outBins = this._fftSize / 2 + 1;
    const magnitude = new Float32Array(outBins);
    const phase = new Float32Array(outBins);
    const coherence = new Float32Array(outBins);

    for (let i = 0; i < outBins; i++) {
      const freq = (i * SAMPLE_RATE) / this._fftSize;

      // Find which MTW band this frequency belongs to
      let bestCfg = MTW_CONFIGS[1]; // default to mid
      for (const cfg of MTW_CONFIGS) {
        if (freq >= cfg.freqLow && freq < cfg.freqHigh) {
          bestCfg = cfg;
          break;
        }
      }

      const acc = this.accumulators.get(bestCfg.fftSize);
      if (!acc || acc.count === 0) continue;

      // Map frequency to bin in the source FFT
      const srcBin = Math.round((freq * bestCfg.fftSize) / SAMPLE_RATE);
      const srcBins = bestCfg.fftSize / 2 + 1;
      if (srcBin >= srcBins) continue;

      const sxx = acc.sxx[srcBin];
      const syy = acc.syy[srcBin];
      const sxyR = acc.sxyRe[srcBin];
      const sxyI = acc.sxyIm[srcBin];

      if (sxx < 1e-30) {
        magnitude[i] = -120;
        continue;
      }

      const hRe = sxyR / sxx;
      const hIm = sxyI / sxx;
      const magSq = hRe * hRe + hIm * hIm;
      magnitude[i] = magSq > 1e-30 ? 10 * Math.log10(magSq) : -120;
      phase[i] = Math.atan2(hIm, hRe) * (180 / Math.PI);

      const sxySq = sxyR * sxyR + sxyI * sxyI;
      const denom = sxx * syy;
      coherence[i] = denom > 1e-30 ? Math.min(1, sxySq / denom) : 0;
    }

    this.unwrapPhase(phase);

    // Apply delay compensation
    const totalDelaySec = (this.currentDelaySamples + this.currentDelayFractional) / SAMPLE_RATE
      + this.phaseOffsetMs / 1000;
    if (totalDelaySec !== 0) {
      for (let i = 0; i < outBins; i++) {
        const freq = (i * SAMPLE_RATE) / this._fftSize;
        phase[i] += 360 * freq * totalDelaySec;
      }
      for (let i = 0; i < outBins; i++) {
        phase[i] = ((phase[i] % 360) + 540) % 360 - 180;
      }
    }

    return {
      magnitude: this.applySmoothing(magnitude, smoothing),
      phase,
      coherence,
    };
  }

  // ─── RTA (Single Channel Magnitude) ───────────────────────────────────────

  /**
   * Get processed RTA data for a single channel.
   * Returns magnitude in dB with smoothing applied.
   */
  getRTAData(smoothing: SmoothingType, isRef: boolean = false, visualGain: number = 0): Float32Array {
    const fftSize = this._fftSize;
    const acc = this.accumulators.get(fftSize);
    if (!acc || acc.count === 0) return new Float32Array(0);

    const bins = fftSize / 2 + 1;
    const data = isRef ? acc.rtaRef : acc.rtaMeas;
    const out = new Float32Array(bins);

    // Convert linear power to dB
    for (let i = 0; i < bins; i++) {
      out[i] = data[i] > 1e-30 ? 10 * Math.log10(data[i]) : -150;
      out[i] += visualGain;
    }

    return this.applySmoothing(out, smoothing);
  }

  // ─── Delay Finder (FFT-based cross-correlation) ───────────────────────────

  /**
   * Find delay between ref and meas channels using FFT cross-correlation.
   * Uses GCC-PHAT weighting for robustness against noise.
   * Returns delay in ms and meters.
   */
  computeAutoDelay(): { ms: number; meters: number } {
    const n = 16384; // Use full buffer for best resolution
    const refBuf = new Float32Array(n);
    const measBuf = new Float32Array(n);

    if (!this.refBuffer.read(n, refBuf) || !this.measBuffer.read(n, measBuf)) {
      return { ms: 0, meters: 0 };
    }

    // Apply window
    const win = this.getWindow(n, 'hann');

    // FFT both channels
    const X = new Float64Array(n * 2);
    const Y = new Float64Array(n * 2);
    realToComplex(refBuf, X, win);
    realToComplex(measBuf, Y, win);
    fftForward(X);
    fftForward(Y);

    // GCC-PHAT: R = conj(X)*Y / |conj(X)*Y|
    // For standard xcorr: R = conj(X)*Y
    const R = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      const xr = X[2 * i], xi = X[2 * i + 1];
      const yr = Y[2 * i], yi = Y[2 * i + 1];

      // conj(X) * Y
      const cr = xr * yr + xi * yi;
      const ci = xr * yi - xi * yr;

      // PHAT weighting: normalize by magnitude
      const mag = Math.sqrt(cr * cr + ci * ci);
      if (mag > 1e-20) {
        // Blend: 70% PHAT + 30% standard (better peak definition in practice)
        const phatWeight = 0.7;
        const weight = phatWeight / mag + (1 - phatWeight);
        R[2 * i] = cr * weight;
        R[2 * i + 1] = ci * weight;
      } else {
        R[2 * i] = 0;
        R[2 * i + 1] = 0;
      }
    }

    // IFFT to get cross-correlation in time domain
    fftInverse(R);

    // Find peak in positive lags only (0 to N/2)
    let maxVal = -1;
    let peakIdx = 0;
    const ir = new Float32Array(n);

    for (let i = 0; i < n / 2; i++) {
      const val = Math.abs(R[2 * i]);
      ir[i] = val;
      if (val > maxVal) {
        maxVal = val;
        peakIdx = i;
      }
    }
    // Also check negative lags (wrapped to end of array)
    for (let i = n / 2; i < n; i++) {
      ir[i] = Math.abs(R[2 * i]);
    }

    // Parabolic interpolation for sub-sample precision
    let fractional = 0;
    if (peakIdx > 0 && peakIdx < n / 2 - 1) {
      const alpha = Math.abs(R[2 * (peakIdx - 1)]);
      const beta = Math.abs(R[2 * peakIdx]);
      const gamma = Math.abs(R[2 * (peakIdx + 1)]);
      const denom = 2 * (2 * beta - alpha - gamma);
      if (Math.abs(denom) > 1e-10) {
        fractional = (alpha - gamma) / denom;
      }
    }

    // Normalize IR for display
    if (maxVal > 0) {
      for (let i = 0; i < n; i++) ir[i] /= maxVal;
    }
    this.lastImpulseResponse = ir;
    this.currentDelaySamples = peakIdx;
    this.currentDelayFractional = fractional;

    const totalSamples = peakIdx + fractional;
    const ms = (totalSamples / SAMPLE_RATE) * 1000;

    // Compute real acoustic metrics from the impulse response
    this.acousticMetrics = this.computeAcousticMetrics(ir, peakIdx);

    return { ms, meters: ms * 0.343 };
  }

  // ─── Acoustic Metrics from IR ─────────────────────────────────────────────

  private computeAcousticMetrics(ir: Float32Array, directArrival: number): AcousticMetricsData {
    const n = ir.length;

    // Energy in the IR (squared values)
    const energy = new Float64Array(n);
    let totalEnergy = 0;
    for (let i = directArrival; i < n; i++) {
      energy[i] = ir[i] * ir[i];
      totalEnergy += energy[i];
    }

    if (totalEnergy < 1e-20) {
      return { c80: 0, d50: 0, rt60: 0 };
    }

    // C80: Clarity = 10*log10(E_0_80ms / E_80ms_inf)
    const samples80ms = Math.round(0.08 * SAMPLE_RATE);
    const samples50ms = Math.round(0.05 * SAMPLE_RATE);
    let earlyEnergy80 = 0, lateEnergy80 = 0;
    let earlyEnergy50 = 0;

    for (let i = directArrival; i < n; i++) {
      const relSample = i - directArrival;
      if (relSample < samples80ms) {
        earlyEnergy80 += energy[i];
      } else {
        lateEnergy80 += energy[i];
      }
      if (relSample < samples50ms) {
        earlyEnergy50 += energy[i];
      }
    }

    const c80 = lateEnergy80 > 1e-20
      ? 10 * Math.log10(earlyEnergy80 / lateEnergy80)
      : 99;

    // D50: Definition = E_0_50ms / E_total * 100
    const d50 = (earlyEnergy50 / totalEnergy) * 100;

    // RT60 via Schroeder backward integration
    const rt60 = this.computeRT60(energy, directArrival, n);

    return {
      c80: parseFloat(c80.toFixed(1)),
      d50: parseFloat(d50.toFixed(0)),
      rt60: parseFloat(rt60.toFixed(2)),
    };
  }

  private computeRT60(energy: Float64Array, start: number, end: number): number {
    // Schroeder backward integration
    const schroeder = new Float64Array(end - start);
    let cumSum = 0;
    for (let i = end - 1; i >= start; i--) {
      cumSum += energy[i];
      schroeder[i - start] = cumSum;
    }

    if (schroeder[0] < 1e-20) return 0;

    // Convert to dB
    const schroederDb = new Float64Array(schroeder.length);
    for (let i = 0; i < schroeder.length; i++) {
      schroederDb[i] = schroeder[i] > 0 ? 10 * Math.log10(schroeder[i] / schroeder[0]) : -100;
    }

    // Linear regression on -5dB to -25dB range (T20 method, then extrapolate to -60dB)
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, count = 0;
    for (let i = 0; i < schroederDb.length; i++) {
      if (schroederDb[i] <= -5 && schroederDb[i] >= -25) {
        const x = i / SAMPLE_RATE;
        const y = schroederDb[i];
        sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
        count++;
      }
    }

    if (count < 10) return 0;

    const slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX);
    if (slope >= 0) return 0; // Invalid: decay must be negative

    // RT60 = -60 / slope
    return Math.min(10, Math.max(0, -60 / slope));
  }

  // ─── Phase Unwrapping ─────────────────────────────────────────────────────

  private unwrapPhase(phase: Float32Array): void {
    let cumOffset = 0;
    for (let i = 1; i < phase.length; i++) {
      let diff = phase[i] - phase[i - 1];
      if (diff > 180) cumOffset -= 360;
      else if (diff < -180) cumOffset += 360;
      phase[i] += cumOffset;
    }
  }

  // ─── Octave Smoothing (in linear power domain) ───────────────────────────

  applySmoothing(magnitudesDb: Float32Array, type: SmoothingType): Float32Array {
    if (type === 'none' || !magnitudesDb.length) return magnitudesDb;

    const fractionMap: Record<string, number> = {
      '1/1': 1, '1/3': 3, '1/6': 6, '1/12': 12, '1/24': 24, '1/48': 48
    };
    const octaveFraction = fractionMap[type] || 3;
    const bins = magnitudesDb.length;
    const smoothed = new Float32Array(bins);

    // Convert to linear power for correct averaging
    const linear = new Float64Array(bins);
    for (let i = 0; i < bins; i++) {
      linear[i] = Math.pow(10, magnitudesDb[i] / 10);
    }

    for (let i = 0; i < bins; i++) {
      const freq = (i * SAMPLE_RATE) / (this._fftSize);
      if (freq < 20) { smoothed[i] = magnitudesDb[i]; continue; }

      const ratio = Math.pow(2, 1 / (2 * octaveFraction));
      const freqLow = freq / ratio;
      const freqHigh = freq * ratio;

      const lowBin = Math.max(0, Math.floor((freqLow * this._fftSize) / SAMPLE_RATE));
      const highBin = Math.min(bins - 1, Math.ceil((freqHigh * this._fftSize) / SAMPLE_RATE));

      let sum = 0;
      let count = 0;
      for (let j = lowBin; j <= highBin; j++) {
        sum += linear[j];
        count++;
      }

      // Convert back to dB
      smoothed[i] = count > 0 ? 10 * Math.log10(sum / count) : magnitudesDb[i];
    }
    return smoothed;
  }

  // ─── Sweep Capture ────────────────────────────────────────────────────────

  startSweepCapture(): void {
    // We'll capture peak RTA during sweep
    const bins = this._fftSize / 2 + 1;
    this.sweepPeakBuffer = new Float32Array(bins).fill(-150);
    this.isSweepCapturing = true;
  }

  stopSweepCapture(): Float32Array {
    this.isSweepCapturing = false;
    const buf = this.sweepPeakBuffer ? this.sweepPeakBuffer.slice() : new Float32Array(0);
    this.sweepPeakBuffer = null;
    return buf;
  }

  private updateSweepCapture(): void {
    if (!this.sweepPeakBuffer) return;
    const rta = this.getRTAData('none', false, 0);
    if (rta.length === 0) return;
    const len = Math.min(rta.length, this.sweepPeakBuffer.length);
    for (let i = 0; i < len; i++) {
      if (rta[i] > this.sweepPeakBuffer[i]) {
        this.sweepPeakBuffer[i] = rta[i];
      }
    }
  }

  // ─── Window Cache ─────────────────────────────────────────────────────────

  private getWindow(size: number, type: WindowType): Float64Array {
    const key = `${size}-${type}`;
    let win = this.windowCache.get(key);
    if (!win) {
      win = createWindow(size, type);
      this.windowCache.set(key, win);
    }
    return win;
  }

  // ─── Raw Sample Access ─────────────────────────────────────────────────────

  /** Read last N samples from measurement ring buffer (for watermark extraction etc). */
  readMeasSamples(length: number): Float32Array {
    const out = new Float32Array(length);
    this.measBuffer.read(length, out);
    return out;
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  resetAveraging(): void {
    for (const [fftSize, acc] of this.accumulators) {
      const bins = fftSize / 2 + 1;
      acc.sxx.fill(0); acc.syy.fill(0);
      acc.sxyRe.fill(0); acc.sxyIm.fill(0);
      acc.rtaMeas.fill(0); acc.rtaRef.fill(0);
      acc.count = 0;
    }
    for (const fifo of this.fifoBuffers.values()) {
      fifo.length = 0;
    }
    this.blockCounter = 0;
    this.currentDelaySamples = 0;
    this.currentDelayFractional = 0;
    this.phaseOffsetMs = 0;
    this.lastImpulseResponse = new Float32Array(0);
    this.acousticMetrics = null;
  }
}

// ─── Acoustic Metrics Type ──────────────────────────────────────────────────────

export interface AcousticMetricsData {
  c80: number;  // Clarity C80 (dB)
  d50: number;  // Definition D50 (%)
  rt60: number; // Reverberation time (seconds)
}
